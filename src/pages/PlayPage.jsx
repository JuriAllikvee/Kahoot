import React, { useState } from 'react';
import JoinGame from '../components/JoinGame';

export default function PlayPage() {
  const [gameId, setGameId] = useState(null);
  const [playerId, setPlayerId] = useState(null);

  if (!gameId) {
    return <JoinGame onJoin={(id, pId) => {
      setGameId(id);
      setPlayerId(pId);
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#0e1621] text-white flex items-center justify-center p-4">
      <div className="text-center">
        <p>Game: {gameId}</p>
        <p>Player: {playerId}</p>
      </div>
    </div>
  );
}
