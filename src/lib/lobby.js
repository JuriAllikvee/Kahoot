export function watchLobby(pb, gameId, onChange, onError = () => {}) {
  let stopped = false;
  let revision = 0;
  const subscriptions = [];
  const refresh = async () => {
    const current = ++revision;
    try {
      const [game, players] = await Promise.all([
        pb.collection('games').getOne(gameId, { requestKey: null }),
        pb.collection('players').getFullList({ filter: pb.filter('game = {:game}', { game: gameId }), sort: 'created,id', requestKey: null }),
      ]);
      if (!stopped && current === revision) onChange({ game, players });
    } catch (error) { if (!stopped && current === revision) onError(error); }
  };
  const subscribe = async (collection, topic, callback) => {
    const unsubscribe = await pb.collection(collection).subscribe(topic, callback);
    if (stopped) unsubscribe(); else subscriptions.push(unsubscribe);
  };
  (async () => {
    try {
      await subscribe('games', gameId, refresh);
      if (stopped) return;
      await subscribe('players', '*', event => { if (event.record.game === gameId) refresh(); });
    } catch (error) { if (!stopped) onError(new Error(`Live updates unavailable; retry or refresh. ${error.message}`)); }
    if (!stopped) await refresh();
  })();
  return () => { stopped = true; subscriptions.forEach(unsubscribe => unsubscribe()); };
}

export async function joinLobby(pb, rawCode, rawNickname) {
  const code = rawCode.trim().toUpperCase();
  const nickname = rawNickname.trim();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Enter a 6-character game code (letters and numbers).');
  if (!nickname || nickname.length > 20) throw new Error('Choose a nickname of 1–20 characters.');
  const result = await pb.collection('games').getList(1, 1, {
    filter: pb.filter('code = {:code}', { code }), requestKey: null,
  });
  const game = result.items[0];
  if (!game || game.status !== 'lobby') throw new Error('No open lobby found for this code.');
  const session = await pb.send(`/api/quiz/${game.id}/join`, { method: 'POST', body: { nickname } });
  await restoreSession(pb, session);
  return session;
}

export async function restoreSession(pb, session) {
  if (!session?.gameId || !session?.playerId || !session?.token) throw new Error('Invalid or old saved session. Clear it and rejoin.');
  return pb.send(`/api/quiz/${session.gameId}/state`, { method: 'POST', body: { playerId: session.playerId, token: session.token }, requestKey: null });
}

export async function createLobby(pb, quizId, host) {
  const quiz = await pb.collection('quizzes').getOne(quizId, { requestKey: null });
  if (quiz.owner !== host || !quiz.isPublished) throw new Error('Select your own published quiz to create a lobby.');
  const created = await pb.collection('games').create({ quiz: quizId, host, status: 'lobby' });
  const game = await pb.collection('games').getOne(created.id, { requestKey: null });
  if (!/^[A-Z0-9]{6}$/.test(game.code) || game.status !== 'lobby' || game.host !== host || game.quiz !== quizId) {
    throw new Error('The lobby could not be verified. Install the backend lobby hook and check the games record before retrying.');
  }
  return game;
}
