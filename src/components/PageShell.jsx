import { Link, NavLink } from 'react-router-dom';

export default function PageShell({ children, actions }) {
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner">
      <Link className="brand" to="/" aria-label="Quiz Game home"><span className="brand-mark" aria-hidden="true">Q<span>·</span></span>Quiz Game</Link>
      <nav aria-label="Main navigation"><NavLink to="/play">Join game</NavLink><NavLink to="/host">Host space</NavLink>{actions}</nav>
    </div></header>
    {children}
    <footer className="site-footer"><span>Quiz Game</span><span>A little curiosity. A little competition.</span></footer>
  </div>;
}
