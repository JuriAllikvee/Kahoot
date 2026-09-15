import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import JoinGame from '../components/JoinGame';
import LobbyPanel from '../components/LobbyPanel';
import PageShell from '../components/PageShell';
import { pb } from '../lib/pocketbase';
import { restoreSession } from '../lib/lobby.js';

export default function PlayPage() {
  const [session, setSession] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('quizSession') || 'null');
      if (saved?.gameId && saved?.playerId) return saved;
      const gameId = localStorage.getItem('gameId');
      const playerId = localStorage.getItem('playerId');
      return gameId && playerId ? { gameId, playerId } : null;
    } catch { return null; }
  });
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    setVerified(false); setError('');
    restoreSession(pb, session).then(() => { if (active) setVerified(true); })
      .catch(err => { if (active) setError(`Unable to restore this session. ${err.message}`); });
    return () => { active = false; };
  }, [session, attempt]);
  function joined(next) {
    try { localStorage.setItem('quizSession', JSON.stringify(next)); }
    catch { setError('Browser storage is unavailable. This session will not survive a reload.'); }
    setSession(next);
  }
  function clearSession() {
    try { ['quizSession', 'gameId', 'playerId'].forEach(key => localStorage.removeItem(key)); } catch { /* Storage may be disabled. */ }
    setSession(null); setVerified(false); setError('');
  }
  if (!session) return <JoinGame onJoin={joined} />;
  return <PageShell><main id="main" className="form-main">
    {error && <p className="error-message" role="alert">{error} <button className="text-button" onClick={() => setAttempt(value => value + 1)}>Retry</button></p>}
    {verified ? <LobbyPanel key={session.gameId} gameId={session.gameId} session={session} /> : !error && <p role="status">Restoring your session…</p>}
    <p><button className="button secondary" onClick={clearSession}>Clear this session</button></p>
    <p className="field-help">Clearing only forgets this browser’s session. Your nickname remains on the host’s player list.</p>
    <Link to="/" className="back-link">Back to home</Link>
  </main></PageShell>;
}
