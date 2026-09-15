// PocketBase 0.23+ request hooks. Deploy on the BACKEND, not the static site.
// All gameplay mutations use transactional capability-aware custom routes.
onRecordCreateRequest((e) => {
  if (!e.auth || e.record.getString('host') !== e.auth.id) {
    throw new ForbiddenError('The host must be the authenticated user.');
  }
  const quiz = e.app.findRecordById('quizzes', e.record.getString('quiz'));
  if (quiz.getString('owner') !== e.auth.id || !quiz.getBool('isPublished')) {
    throw new BadRequestError('Choose your own published quiz.');
  }
  let code = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = $security.randomStringWithAlphabet(6, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    const existing = e.app.findRecordsByFilter('games', 'code = {:code}', '', 1, 0, { code: candidate });
    if (existing.length === 0) { code = candidate; break; }
  }
  if (!code) throw new BadRequestError('Could not allocate a unique lobby code. Please retry.');
  // The unique games(code) index also protects concurrent creates.
  e.record.set('code', code);
  e.record.set('status', 'lobby');
  e.record.set('currentQuestion', '');
  e.record.set('questionStartedAt', '');
  e.record.set('questionDeadline', '');
  e.record.set('questionSnapshot', []);
  e.record.set('questionPosition', 0);
  e.next();
}, 'games');

// Block generic writes even if a deployment still has older API rules.
for (const collection of ['games', 'players', 'answers']) {
  onRecordUpdateRequest(() => { throw new BadRequestError('Direct updates are not supported; use gameplay routes.'); }, collection);
}
for (const collection of ['players', 'answers']) {
  onRecordCreateRequest(() => { throw new BadRequestError('Direct creates are not supported; use gameplay routes.'); }, collection);
  onRecordDeleteRequest(() => { throw new BadRequestError('Direct deletes are not supported.'); }, collection);
}
onRecordDeleteRequest((e) => {
  const games=e.app.findRecordsByFilter('games','quiz = {:quiz}', '',1,0,{quiz:e.record.getString('quiz')});
  if(games.length) throw new BadRequestError('This question belongs to a played quiz. Keep it for game history; create a new quiz instead.');
  e.next();
}, 'questions');
routerAdd('POST', '/api/quiz/{game}/{action}', (e) => {
  const action=e.request.pathValue('action');
  if (!['join','state','control','answer'].includes(action)) throw new NotFoundError();
  const body=e.requestInfo().body;
  let result;
  e.app.runInTransaction(app => {
    const game=app.findRecordById('games',e.request.pathValue('game'));
    result=require(`${__hooks}/quiz.js`)[action](app,game,body,e.auth);
  });
  return e.json(200,result);
});
// Also expire unattended games, independent of any browser timer.
cronAdd('quiz_deadlines','* * * * *', () => {
  $app.runInTransaction(app => {
    const games=app.findRecordsByFilter('games','status = "question"','',0,0);
    for (const game of games) require(`${__hooks}/quiz.js`).expire(app,game);
  });
});
