import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import PageShell from '../components/PageShell';

export default function HostPage() {
  const { user, isValid, logout, loading } = useAuth();
  if (loading) return <PageShell><main id="main" className="form-main"><p role="status">Loading your account…</p></main></PageShell>;
  if (!isValid) return <AuthModal />;
  return <PageShell actions={<button className="button secondary compact" onClick={logout}>Sign out</button>}>
    <main id="main" className="container dashboard">
      <div className="page-heading"><div><p className="eyebrow">HOST SPACE</p><h1>Your quizzes</h1><p>A home for your next round of questions.</p></div><span className="account-label">{user?.name || user?.email}</span></div>
      <section className="empty-state"><span className="empty-symbol" aria-hidden="true">＋</span><p className="eyebrow">A FRESH START</p><h2>No quizzes yet</h2><p>Quiz creation and publishing are still in development.<br />Your host account is ready for when they arrive.</p><button className="button primary" disabled>Create a quiz</button><span className="card-note">Not available yet</span></section>
    </main>
  </PageShell>;
}
