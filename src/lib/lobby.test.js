import test from 'node:test';
import assert from 'node:assert/strict';
import * as lobby from './lobby.js';

test('join validates input, verifies the player and restores a saved session', async () => {
  const game = { id: 'g', code: 'ABC123', status: 'lobby' };
  const player = { id: 'p', game: 'g', nickname: 'Ada' };
  let payload;
  const pb = { filter: (f, p) => { assert.equal(p.code, 'ABC123'); return f; }, collection: name => name === 'games' ? {
    getList: async () => ({ items: [game] }), getOne: async () => game,
  } : { create: async () => { throw new Error('Generic player creation is insecure'); } }, send: async (path, options) => {
    payload = options.body;
    if (path.endsWith('/join')) return { gameId: 'g', playerId: 'p', token: 'secret' };
    if (player.game !== 'g') throw new Error('Invalid session');
    assert.equal(options.body.token, 'secret');
    return { game, me: player };
  } };
  assert.equal(typeof lobby.joinLobby, 'function');
  await assert.rejects(lobby.joinLobby(pb, 'bad!', 'Ada'), /6/);
  const session = await lobby.joinLobby(pb, 'abc123', ' Ada ');
  assert.deepEqual(payload, { playerId: 'p', token: 'secret' });
  assert.deepEqual(session, { gameId: 'g', playerId: 'p', token: 'secret' });
  assert.deepEqual(await lobby.restoreSession(pb, session), { game, me: player });
  player.game = 'other';
  await assert.rejects(lobby.restoreSession(pb, session), /session/i);
  game.status = 'finished';
  await assert.rejects(lobby.joinLobby(pb, 'ABC123', 'Ada'), /lobby/i);
});

test('watch lobby subscribes before reading, refreshes and cleans up', async () => {
  const events = {}; const order = []; const snapshots = []; const removed = [];
  let players = [];
  const pb = { filter: () => 'game filter', collection: name => ({
    subscribe: async (topic, callback) => { order.push(name); events[name] = callback; return () => removed.push(name); },
    getOne: async () => { order.push('read'); return { id: 'g', status: 'lobby' }; },
    getFullList: async () => players,
  }) };
  assert.equal(typeof lobby.watchLobby, 'function');
  const stop = lobby.watchLobby(pb, 'g', value => snapshots.push(value), error => { throw error; });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(order.slice(0, 2), ['games', 'players']);
  assert.equal(snapshots.at(-1).players.length, 0);
  players = [{ id: 'p', game: 'g', nickname: 'Ada' }];
  events.players({ action: 'create', record: players[0] });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(snapshots.at(-1).players[0].nickname, 'Ada');
  stop();
  assert.deepEqual(removed.sort(), ['games', 'players']);
});

test('create lobby reads published owned quiz and verifies server code without sending a code', async () => {
  let payload;
  const game = { id: 'g', quiz: 'q', host: 'h', code: 'ABC123', status: 'lobby' };
  const pb = { collection: name => name === 'quizzes' ? { getOne: async () => ({ owner: 'h', isPublished: true }) } : {
    create: async data => { payload = data; return game; }, getOne: async () => game,
  } };
  assert.equal(typeof lobby.createLobby, 'function');
  assert.deepEqual(await lobby.createLobby(pb, 'q', 'h'), game);
  assert.equal('code' in payload, false);
  game.code = '';
  await assert.rejects(lobby.createLobby(pb, 'q', 'h'), /hook/i);
});
