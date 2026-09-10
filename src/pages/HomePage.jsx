import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageShell from '../components/PageShell';

export default function HomePage() {
  const { isValid } = useAuth();
  return <PageShell><main id="main" className="home-main container">
    <section className="hero"><p className="eyebrow">GOOD QUESTIONS. GREAT COMPANY.</p>
      <h1>Bring your<br />curiosity.</h1>
      <p className="hero-description">A simple space for a shared quiz.<br />Join your group, or head to your host space.</p>
    </section>
    <section className="entry-grid" aria-label="Choose how to take part">
      <article className="entry-card"><div className="card-top"><span className="step">01 / PLAY</span><span className="small-icon" aria-hidden="true">↗</span></div>
        <h2>Got a game code?</h2><p>Bring your nickname. Your host has the code.</p>
        <Link to="/play" className="button primary">Join a game <span aria-hidden="true">→</span></Link><span className="card-note">No account needed</span>
      </article>
      <article className="entry-card secondary-card"><div className="card-top"><span className="step">02 / HOST</span><span className="small-icon" aria-hidden="true">＋</span></div>
        <h2>Your host space.</h2><p>Sign in to your account and visit your quiz dashboard.</p>
        <Link to="/host" className="button secondary">{isValid ? 'Open dashboard' : 'Sign in to host'} <span aria-hidden="true">→</span></Link><span className="card-note">Quiz creation is still in development</span>
      </article>
    </section>
    <div className="home-caption"><span className="caption-line" />Less setup. More time together.<span className="caption-line" /></div>
  </main></PageShell>;
}
