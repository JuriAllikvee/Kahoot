import { useEffect, useState } from 'react';
import { pb } from '../lib/pocketbase';
import { watchLobby } from '../lib/lobby.js';

export default function LobbyPanel({ gameId, playerId }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setSnapshot(null); setError('');
    return watchLobby(pb, gameId, setSnapshot, err => setError(err.status === 404 ? 'This lobby is no longer available.' : err.message));
  }, [gameId, attempt]);
  return <section className="form-card session-card" aria-label="Live lobby">
    <p className="eyebrow">LIVE LOBBY</p>
    {error && <div className="error-message" role="alert">{error} <button className="text-button" onClick={() => setAttempt(value => value + 1)}>Retry connection</button></div>}
    {!snapshot ? <p role="status">Loading lobby…</p> : <>
      <h2>Game code: <strong className="lobby-code">{snapshot.game.code}</strong></h2>
      <p className="form-intro">Share this code with players at <a href="/play">/play</a>.</p>
      <p role="status">{snapshot.game.status === 'lobby' ? 'Waiting in the lobby' : `Game status: ${snapshot.game.status}`} · {snapshot.players.length} players</p>
      {playerId && !snapshot.players.some(player => player.id === playerId) && <p role="alert">Your player is no longer in this lobby. Clear this session to join again.</p>}
      {snapshot.players.length ? <ul>{snapshot.players.map(player => <li key={player.id}>{player.nickname}{player.id === playerId ? ' (you)' : ''}</li>)}</ul> : <p>No players yet. Share the code to invite someone.</p>}
      <p className="field-help">Lobby only: questions, answers and scoring are not available yet.</p>
    </>}
  </section>;
}
