import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from './PageShell';
import { pb } from '../lib/pocketbase';

export default function JoinGame({ onJoin }) {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Find game by code
      const games = await pb.collection('games').getList(1, 1, {
        filter: `code = "${code.toUpperCase()}"`,
      });

      if (games.items.length === 0) {
        setError('Invalid game code');
        setLoading(false);
        return;
      }

      const game = games.items[0];

      // Create player
      const player = await pb.collection('players').create({
        game: game.id,
        nickname: nickname.trim(),
      });

      // Store player ID in localStorage
      localStorage.setItem('playerId', player.id);
      localStorage.setItem('gameId', game.id);

      onJoin(game.id, player.id);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return <PageShell><main id="main" className="form-main">
    <Link to="/" className="back-link">← Back to home</Link>
    <section className="form-card"><p className="eyebrow">LET’S PLAY</p><h1>You’re in good company.</h1><p className="form-intro">Enter the code from your host and choose a name everyone will recognize.</p>
      {error && <div className="error-message" role="alert" id="join-error">{error}</div>}
      <form onSubmit={handleJoin} className="form-stack" aria-busy={loading} aria-describedby={error ? 'join-error' : undefined}>
        <div className="field"><label htmlFor="game-code">Game code</label><input id="game-code" className="code-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} required placeholder="K7F2QX" autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-describedby="code-help" /><p id="code-help" className="field-help">The 6-character code shared by your host.</p></div>
        <div className="field"><label htmlFor="nickname">Nickname</label><input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20} required placeholder="What should we call you?" autoComplete="nickname" /><p className="field-help">Up to 20 characters. Make it yours.</p></div>
        <button type="submit" disabled={loading || code.length !== 6 || !nickname.trim()} className="button primary full-width">{loading ? 'Joining…' : 'Join game'}<span aria-hidden="true">→</span></button>
      </form>
      <p className="form-footnote">No account needed. Just a little curiosity.</p>
    </section><p className="below-form">Running the quiz? <Link to="/host">Go to host space</Link></p>
  </main></PageShell>;
}
