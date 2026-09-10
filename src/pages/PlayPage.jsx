import { useState } from 'react';
import { Link } from 'react-router-dom';
import JoinGame from '../components/JoinGame';
import PageShell from '../components/PageShell';

export default function PlayPage() {
  const [session, setSession] = useState(null);
  if (!session) return <JoinGame onJoin={(gameId, playerId) => setSession({ gameId, playerId })} />;
  return <PageShell><main id="main" className="form-main"><section className="form-card session-card">
    <p className="eyebrow">PLAYER SPACE</p><h1>You’re registered.</h1><p className="form-intro">Your player has joined this game. The live question and answer screen is not available yet.</p>
    <dl className="session-details"><div><dt>Game ID</dt><dd>{session.gameId}</dd></div><div><dt>Player ID</dt><dd>{session.playerId}</dd></div></dl>
    <Link to="/" className="button secondary full-width">Back to home</Link>
  </section></main></PageShell>;
}
