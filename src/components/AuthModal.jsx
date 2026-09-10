import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageShell from './PageShell';

export default function AuthModal({ onSuccess }) {
  const { login, register, error, setError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setLocalError(''); setError(null);
    if (isRegister && password !== passwordConfirm) { setLocalError('Passwords do not match.'); return; }
    if (isRegister && password.length < 8) { setLocalError('Use at least 8 characters for your password.'); return; }
    setSubmitting(true);
    try {
      if (isRegister) await register(email, password, passwordConfirm, name);
      else await login(email, password);
      onSuccess?.();
    } catch { /* The auth context provides the error message. */ }
    finally { setSubmitting(false); }
  };
  const displayError = localError || error;
  return <PageShell><main id="main" className="form-main">
    <Link to="/" className="back-link">← Back to home</Link>
    <section className="form-card"><p className="eyebrow">HOST SPACE</p><h1>{isRegister ? 'Make yourself at home.' : 'Welcome back.'}</h1>
      <p className="form-intro">{isRegister ? 'Create an account for your host space.' : 'Sign in to access your quiz dashboard.'}</p>
      {displayError && <div className="error-message" role="alert" id="auth-error">{displayError}</div>}
      <form onSubmit={handleSubmit} className="form-stack" aria-busy={submitting} aria-describedby={displayError ? 'auth-error' : undefined}>
        {isRegister && <div className="field"><label htmlFor="name">Display name</label><input id="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" /></div>}
        <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={isRegister ? 8 : undefined} aria-describedby={isRegister ? 'password-help' : undefined} placeholder="Enter your password" />{isRegister && <p id="password-help" className="field-help">Use at least 8 characters.</p>}</div>
        {isRegister && <div className="field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required placeholder="Re-enter your password" /></div>}
        <button type="submit" disabled={submitting} className="button primary full-width">{submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}<span aria-hidden="true">→</span></button>
      </form>
      <div className="form-switch"><p>{isRegister ? 'Already have an account?' : 'New here?'}</p><button type="button" className="text-button" disabled={submitting} onClick={() => { setIsRegister(!isRegister); setError(null); setLocalError(''); }}>{isRegister ? 'Sign in' : 'Create an account'}</button></div>
    </section><p className="below-form">Here to play? <Link to="/play">Join with a game code</Link></p>
  </main></PageShell>;
}
