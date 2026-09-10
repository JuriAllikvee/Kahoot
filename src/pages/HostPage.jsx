import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { pb } from '../lib/pocketbase';
import AuthModal from '../components/AuthModal';

export default function HostPage() {
  const { user, isValid, logout } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(!isValid);

  if (showAuthModal && !isValid) {
    return <AuthModal onSuccess={() => setShowAuthModal(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0e1621] text-white">
      {/* Header */}
      <header className="h-14 border-b border-[#1c2733] px-4 flex items-center justify-between bg-[#17212b]">
        <h1 className="text-xl font-medium">Quiz Host</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#707579]">{user?.name || user?.email}</span>
          <button
            onClick={logout}
            className="px-4 py-1.5 bg-[#232e3c] hover:bg-[#2b3d4a] text-white rounded-lg text-sm transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create New Quiz Card */}
          <div className="bg-[#17212b] border border-[#1c2733] rounded-lg p-6 cursor-pointer hover:bg-[#1f2a37] transition">
            <div className="w-12 h-12 rounded-full bg-[#5288c1] flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-medium text-white">Create New Quiz</h3>
            <p className="text-[#707579] text-sm mt-1">Build and publish a new quiz</p>
          </div>

          {/* Placeholder - Quizzes will appear here */}
          <div className="bg-[#17212b] border border-[#1c2733] rounded-lg p-6 opacity-50">
            <p className="text-[#707579] text-center">No quizzes yet</p>
          </div>
        </div>
      </main>
    </div>
  );
}
