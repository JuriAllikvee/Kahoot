import React, { useState } from 'react';
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

  return (
    <div className="min-h-screen bg-[#0e1621] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#17212b] border border-[#1c2733] rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#5288c1] text-white mb-4">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-medium text-white">Join Game</h1>
          <p className="text-[#707579] text-sm mt-2">Enter code and your nickname</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm text-[#707579] mb-1.5">Game Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength="6"
              required
              placeholder="e.g., K7F2QX"
              className="w-full px-4 py-2.5 bg-[#0e1621] border border-[#1c2733] rounded-lg text-white placeholder-[#707579] text-[15px] focus:outline-none focus:border-[#5288c1] transition tracking-widest text-center"
            />
          </div>

          <div>
            <label className="block text-sm text-[#707579] mb-1.5">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength="20"
              required
              placeholder="Your nickname"
              className="w-full px-4 py-2.5 bg-[#0e1621] border border-[#1c2733] rounded-lg text-white placeholder-[#707579] text-[15px] focus:outline-none focus:border-[#5288c1] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6 || !nickname.trim()}
            className="w-full mt-2 py-3 px-4 bg-[#5288c1] hover:bg-[#6b9fd3] text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}
