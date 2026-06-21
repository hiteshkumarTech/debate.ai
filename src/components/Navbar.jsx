import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className="navbar-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
      )}
    </button>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

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

  const drawer = createPortal(
    <>
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
    </>,
    document.body
  );

  return (
    <>
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
            <ThemeToggle />
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
      </header>
      {drawer}
    </>
  );
}