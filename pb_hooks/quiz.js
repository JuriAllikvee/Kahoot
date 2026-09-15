// Custom route callbacks load this module inside each isolated PocketBase JS VM.
function rows(app, collection, filter, params, sort) {
  return app.findRecordsByFilter(collection, filter, sort || '', 1000, 0, params);
}
function snapshot(game) { const data = JSON.parse(game.getString('questionSnapshot') || '[]'); return Array.isArray(data) ? data : []; }
function current(game) { return snapshot(game)[game.getInt('questionPosition')]; }
function identity(app, game, body, auth) {
  if (auth && auth.collection().name === 'users' && auth.id === game.getString('host')) return null;
  if (!body.playerId || !body.token) throw new ForbiddenError('A valid player session is required.');
  let player;
  try { player = app.findRecordById('players', body.playerId); } catch { throw new ForbiddenError('Invalid player session.'); }
  if (player.getString('game') !== game.id || !$security.equal(player.getString('capabilityHash'), $security.sha256(body.token))) throw new ForbiddenError('Invalid player session.');
  return player;
}
function finishQuestion(app, game) {
  const answers = rows(app, 'answers', 'game = {:g} && question = {:q}', { g: game.id, q: game.getString('currentQuestion') });
  for (const answer of answers) {
    const player = app.findRecordById('players', answer.getString('player'));
    player.set('score', player.getInt('score') + answer.getInt('points'));
    app.save(player);
  }
  game.set('status', 'results'); app.save(game);
}
function expire(app, game) {
  if (game.getString('status') === 'question' && Date.now() >= Date.parse(game.getString('questionDeadline'))) finishQuestion(app, game);
}
function openQuestion(app, game, position) {
  const q = snapshot(game)[position];
  if (!q) { game.set('status', 'finished'); app.save(game); return; }
  const now = Date.now();
  game.set('questionPosition', position); game.set('currentQuestion', q.id);
  game.set('questionStartedAt', new Date(now).toISOString());
  game.set('questionDeadline', new Date(now + q.timeLimit * 1000).toISOString());
  game.set('status', 'question'); app.save(game);
}
function join(app, game, body, auth) {
  if (game.getString('status') !== 'lobby') throw new BadRequestError('This lobby is not open.');
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  if (!nickname || nickname.length > 20) throw new BadRequestError('Nickname must contain 1–20 characters.');
  if (rows(app, 'players', 'game = {:g}', {g:game.id}).length >= 500) throw new BadRequestError('Lobby is full.');
  const token = $security.randomString(64);
  const player = new Record(app.findCollectionByNameOrId('players'));
  player.set('game', game.id); player.set('nickname', nickname); player.set('score', 0);
  player.set('user', auth && auth.collection().name === 'users' ? auth.id : '');
  player.set('capabilityHash', $security.sha256(token)); app.save(player);
  return { gameId:game.id, playerId:player.id, token };
}
function state(app, game, body, auth) {
  const player = identity(app, game, body, auth);
  expire(app, game);
  const status = game.getString('status');
  const q = current(game);
  const result = {
    game: {id:game.id, quiz:game.getString('quiz'), host:game.getString('host'), code:game.getString('code'), status, currentQuestion:game.getString('currentQuestion')},
    serverNow:Date.now(), deadline:Date.parse(game.getString('questionDeadline')) || null,
    position:game.getInt('questionPosition') + 1, total:snapshot(game).length,
    players:rows(app,'players','game = {:g}',{g:game.id},'-score,created,id').map(p=>({id:p.id,nickname:p.getString('nickname'),score:p.getInt('score')})),
    question:null, me: player ? {id:player.id,answer:null} : null,
  };
  if (q && status !== 'lobby') {
    result.question = {id:q.id,text:q.text,options:q.options};
    const answers=rows(app,'answers','game = {:g} && question = {:q}',{g:game.id,q:q.id});
    result.answerCount=answers.length;
    const revealed = status === 'results' || status === 'finished';
    if (revealed) { result.question.correctIndex=q.correctIndex; result.distribution=q.options.map((_,i)=>answers.filter(a=>a.getInt('optionIndex')===i).length); }
    if (player) {
      const a=answers.find(a=>a.getString('player')===player.id);
      if (a) { result.me.answer={optionIndex:a.getInt('optionIndex')}; if(revealed) {result.me.answer.points=a.getInt('points');result.me.answer.isCorrect=a.getBool('isCorrect');} }
    }
  }
  return result;
}
function control(app,game,body,auth) {
  if (!auth || auth.collection().name !== 'users' || auth.id !== game.getString('host')) throw new ForbiddenError('Only the host can control this game.');
  if (body.expectedStatus !== game.getString('status') || body.expectedQuestion !== game.getString('currentQuestion')) throw new BadRequestError('Game changed; refresh before retrying.');
  const status=game.getString('status');
  if (body.action==='start' && status==='lobby') {
    const questions=rows(app,'questions','quiz = {:q}',{q:game.getString('quiz')},'order,id');
    if (!questions.length || questions.length>=1000) throw new BadRequestError('Quiz needs 1–999 questions.');
    const data=questions.map(q=>({id:q.id,text:q.getString('text'),options:JSON.parse(q.getString('options')),correctIndex:q.getInt('correctIndex'),timeLimit:q.getInt('timeLimit')}));
    for (const q of data) if (!q.text.trim() || !Array.isArray(q.options) || q.options.length<2 || q.options.length>4 || q.options.some(o=>typeof o!=='string'||!o.trim()) || q.correctIndex<0 || q.correctIndex>=q.options.length || q.timeLimit<5 || q.timeLimit>300) throw new BadRequestError('Quiz contains an incomplete question.');
    game.set('questionSnapshot',data); openQuestion(app,game,0);
  } else if (body.action==='results' && status==='question') finishQuestion(app,game);
  else if (body.action==='next' && status==='results') openQuestion(app,game,game.getInt('questionPosition')+1);
  else throw new BadRequestError('Invalid game transition.');
  return {ok:true};
}
function answer(app,game,body,auth) {
  // Even authenticated hosts must prove the player capability for submissions.
  const player=identity(app,game,body,null);
  if (game.getString('status')!=='question' || Date.now()>=Date.parse(game.getString('questionDeadline'))) throw new BadRequestError('The answer window is closed.');
  const q=current(game);
  if (body.question!==q.id || !Number.isInteger(body.optionIndex) || body.optionIndex<0 || body.optionIndex>=q.options.length) throw new BadRequestError('Invalid question or answer option.');
  if (rows(app,'answers','player = {:p} && question = {:q}',{p:player.id,q:q.id}).length) throw new BadRequestError('You already answered.');
  const correct=body.optionIndex===q.correctIndex;
  const remaining=Math.max(0,Date.parse(game.getString('questionDeadline'))-Date.now());
  const a=new Record(app.findCollectionByNameOrId('answers'));
  a.set('game',game.id);a.set('player',player.id);a.set('question',q.id);a.set('optionIndex',body.optionIndex);
  a.set('isCorrect',correct);a.set('points',correct ? Math.min(1000,500+Math.floor(500*remaining/(q.timeLimit*1000))) : 0);app.save(a);
  // Auto-advance once every joined player has answered, instead of waiting out the timer.
  const total=rows(app,'answers','game = {:g} && question = {:q}',{g:game.id,q:q.id}).length;
  if (total>=rows(app,'players','game = {:g}',{g:game.id}).length) finishQuestion(app,game);
  return {accepted:true,finished:game.getString('status')!=='question'};
}
module.exports = {join,state,control,answer,expire};
