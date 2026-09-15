// PocketBase 0.23+ request hooks. Deploy on the BACKEND, not the static site.
// Lobby-only release: no question progression or scoring is implemented.
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
  e.next();
}, 'games');

onRecordUpdateRequest(() => {
  throw new BadRequestError('Game updates are not supported in this lobby-only release.');
}, 'games');

onRecordCreateRequest((e) => {
  const game = e.app.findRecordById('games', e.record.getString('game'));
  if (game.getString('status') !== 'lobby') throw new BadRequestError('This lobby is not open.');
  const nickname = e.record.getString('nickname').trim();
  if (!nickname || nickname.length > 20) throw new BadRequestError('Nickname must contain 1–20 characters.');
  e.record.set('nickname', nickname);
  e.record.set('score', 0);
  e.record.set('user', e.auth ? e.auth.id : '');
  e.next();
}, 'players');

onRecordUpdateRequest(() => {
  throw new BadRequestError('Player updates are not supported in this lobby-only release.');
}, 'players');

onRecordCreateRequest(() => {
  throw new BadRequestError('Answers and scoring are not supported in this lobby-only release.');
}, 'answers');
onRecordUpdateRequest(() => {
  throw new BadRequestError('Answers and scoring are not supported in this lobby-only release.');
}, 'answers');
