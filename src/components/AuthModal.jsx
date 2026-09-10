import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ onSuccess }) {
  const { login, register, loading, error, setError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setError(null);

    try {
      if (isRegister) {
        if (password !== passwordConfirm) {
          setLocalError('Passwords do not match');
          return;
        }
        if (password.length < 8) {
          setLocalError('Password must be at least 8 characters');
          return;
        }
        await register(email, password, passwordConfirm, name);
      } else {
        await login(email, password);
      }
      onSuccess?.();
    } catch (err) {
      // Error handled in context
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#0e1621] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#17212b] border border-[#1c2733] rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-white mb-2">
            {isRegister ? 'Sign Up' : 'Sign In'}
          </h1>
          <p className="text-[#707579] text-sm">
            {isRegister ? 'Create your account' : 'Enter your credentials'}
          </p>
        </div>

        {displayError && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm text-[#707579] mb-1.5">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full px-4 py-2.5 bg-[#0e1621] border border-[#1c2733] rounded-lg text-white placeholder-[#707579] text-[15px] focus:outline-none focus:border-[#5288c1] transition"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-[#707579] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 bg-[#0e1621] border border-[#1c2733] rounded-lg text-white placeholder-[#707579] text-[15px] focus:outline-none focus:border-[#5288c1] transition"
            />
          </div>

          <div>
            <label className="block text-sm text-[#707579] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#0e1621] border border-[#1c2733] rounded-lg text-white placeholder-[#707579] text-[15px] focus:outline-none focus:border-[#5288c1] transition"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm text-[#707579] mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#0e1621] border border-[#1c2733] rounded-lg text-white placeholder-[#707579] text-[15px] focus:outline-none focus:border-[#5288c1] transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-[#5288c1] hover:bg-[#6b9fd3] text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#1c2733] text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setLocalError('');
            }}
            className="text-sm text-[#5288c1] hover:text-[#6b9fd3] font-medium transition cursor-pointer"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
