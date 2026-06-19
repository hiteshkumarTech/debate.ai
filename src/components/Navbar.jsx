import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const LINKS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Debate', to: '/debate' },
  { label: 'Interview', to: '/interview' },
  { label: 'Personas', to: '/personas' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Progress', to: '/progress' },
  { label: 'History', to: '/history' },
  { label: 'About', to: '/about' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

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
          <Link to="/signup" className="navbar-signup">
            Sign up free
          </Link>
        )}
      </div>
    </header>
  );
}
