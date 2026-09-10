import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { isValid } = useAuth();

  return (
    <div className="min-h-screen bg-[#0e1621] text-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#5288c1] text-white mb-8">
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-2">Quiz Game</h1>
        <p className="text-[#707579] mb-8 text-lg">Real-time Kahoot-like quiz experience</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isValid ? (
            <Link
              to="/host"
              className="px-8 py-3 bg-[#5288c1] hover:bg-[#6b9fd3] text-white font-medium rounded-lg transition"
            >
              Create Quiz
            </Link>
          ) : (
            <Link
              to="/host"
              className="px-8 py-3 bg-[#5288c1] hover:bg-[#6b9fd3] text-white font-medium rounded-lg transition"
            >
              Sign In to Host
            </Link>
          )}
          <Link
            to="/play"
            className="px-8 py-3 bg-[#232e3c] hover:bg-[#2b3d4a] text-white font-medium rounded-lg transition border border-[#1c2733]"
          >
            Join Game
          </Link>
        </div>
      </div>
    </div>
  );
}
