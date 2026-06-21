import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [pathname]);

  // While the drawer is open: lock page scroll and allow Escape to close.
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

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

        <div className="navbar-actions">
          {!loading && !user && (
            <button type="button" className="navbar-signup" onClick={handleSignUp} disabled={busy}>
              {busy ? 'Signing in\u2026' : 'Sign up free'}
            </button>
          )}
          <button
            type="button"
            className="navbar-burger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      <div
        className={`navbar-overlay ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside className={`navbar-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="navbar-drawer-head">
          <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
            <span className="navbar-brand-mark" aria-hidden="true">D</span>
            <span className="navbar-brand-name">DebateAI</span>
          </Link>
          <button
            type="button"
            className="navbar-drawer-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            {'\u00d7'}
          </button>
        </div>

        <nav className="navbar-drawer-links" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`navbar-drawer-link ${pathname === l.to ? 'is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {!loading && !user && (
          <button
            type="button"
            className="navbar-drawer-signup"
            onClick={() => { setOpen(false); handleSignUp(); }}
            disabled={busy}
          >
            {busy ? 'Signing in\u2026' : 'Sign up free'}
          </button>
        )}
      </aside>
    </header>
  );
}