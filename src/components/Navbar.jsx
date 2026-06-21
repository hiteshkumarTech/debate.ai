import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const LINKS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Debate', to: '/debate' },
  { label: 'Explore', to: '/explore' },
  { label: 'Interview', to: '/interview' },
  { label: 'Personas', to: '/personas' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Progress', to: '/progress' },
  { label: 'History', to: '/history' },
  { label: 'About', to: '/about' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSignUp = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      // popup closed/blocked etc. - the floating button surfaces detailed errors
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-mark" aria-hidden="true">D</span>
          <span className="navbar-brand-name">DebateAI</span>
        </Link>

        <nav className="navbar-links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`navbar-link ${pathname === l.to ? 'is-active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {!loading && !user && (
          <button
            type="button"
            className="navbar-signup"
            onClick={handleSignUp}
            disabled={busy}
            style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {busy ? 'Signing inâ€¦' : 'Sign up free'}
          </button>
        )}
      </div>
    </header>
  );
}