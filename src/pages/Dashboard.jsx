import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { loadAnalytics, emptyStats } from '../services/analyticsService';
import './Dashboard.css';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function scoreTone(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'low';
}

export default function Dashboard() {
  const { user } = useAuth();
  const name =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'there');

  const [stats, setStats] = useState(emptyStats());
  const [source, setSource] = useState('local');
  const [loading, setLoading] = useState(true);
  const [resumable, setResumable] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { stats: s, source: src } = await loadAnalytics();
      if (cancelled) return;
      setStats(s);
      setSource(src);
      setLoading(false);
    })();

    // Resume Session: only meaningful when the backend is reachable (active
    // sessions live server-side). Fails silently to an empty list otherwise.
    (async () => {
      if (!api.isConfigured() || !user) return;
      try {
        const active = await api.listActiveSessions();
        if (!cancelled) setResumable(active);
      } catch {
        /* no backend / not signed in — no resume prompt */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasActivity = stats.totalSessions > 0;
  const maxWeekly = Math.max(...stats.weekly.map((w) => w.average || 0), 1);

  return (
    <main className="dash">
      <div className="container">
        <header className="dash-header">
          <div>
            <h1 className="dash-greeting">
              {greeting()}, {name}
            </h1>
            <p className="dash-subtitle">
              {hasActivity
                ? "Here's how your practice is going."
                : 'Ready to sharpen your thinking? Start your first session below.'}
            </p>
          </div>
          <div className="dash-cta-row">
            <Link to="/debate" className="dash-cta dash-cta-primary">Start a debate</Link>
            <Link to="/interview" className="dash-cta dash-cta-ghost">Practice interview</Link>
          </div>
        </header>

        {/* Resume Session prompt */}
        {resumable.length > 0 && (
          <section className="dash-resume">
            <div className="dash-resume-icon" aria-hidden="true">⏸️</div>
            <div className="dash-resume-body">
              <h2 className="dash-resume-title">
                You have {resumable.length} unfinished {resumable.length === 1 ? 'session' : 'sessions'}
              </h2>
              <p className="dash-resume-text">
                Pick up where you left off: <strong>{resumable[0].topic}</strong>
                {resumable[0].kind === 'interview' ? ' (interview)' : ''}.
              </p>
            </div>
            <Link
              to={
                resumable[0].kind === 'interview'
                  ? `/interview?resume=${resumable[0].id}`
                  : `/debate?resume=${resumable[0].id}`
              }
              className="dash-resume-btn"
            >
              Resume
            </Link>
          </section>
        )}

        {loading ? (
          <div className="dash-loading">Loading your stats…</div>
        ) : !hasActivity ? (
          <section className="dash-empty">
            <p className="dash-empty-text">
              No sessions yet. Once you finish a debate or interview, your scores,
              streak, and progress will appear here.
            </p>
          </section>
        ) : (
          <>
            {/* Stat cards */}
            <section className="dash-stats">
              <div className="dash-stat">
                <span className="dash-stat-label">Sessions</span>
                <span className="dash-stat-value">{stats.totalSessions}</span>
                <span className="dash-stat-sub">
                  {stats.totalDebates} debates · {stats.totalInterviews} interviews
                </span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat-label">Average score</span>
                <span className={`dash-stat-value tone-${scoreTone(stats.averageScore)}`}>
                  {stats.averageScore}%
                </span>
                <span className="dash-stat-sub">across all sessions</span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat-label">Streak</span>
                <span className="dash-stat-value">
                  {stats.streakDays}
                  {stats.streakDays > 0 && <span className="dash-flame"> 🔥</span>}
                </span>
                <span className="dash-stat-sub">{stats.streakDays === 1 ? 'day' : 'days'} in a row</span>
              </div>
            </section>

            {/* Topics */}
            {(stats.strongestTopic || stats.weakestTopic) && (
              <section className="dash-topics">
                {stats.strongestTopic && (
                  <div className="dash-topic dash-topic-strong">
                    <span className="dash-topic-label">Strongest topic</span>
                    <span className="dash-topic-name">{stats.strongestTopic}</span>
                  </div>
                )}
                {stats.weakestTopic && (
                  <div className="dash-topic dash-topic-weak">
                    <span className="dash-topic-label">Needs work</span>
                    <span className="dash-topic-name">{stats.weakestTopic}</span>
                  </div>
                )}
              </section>
            )}

            {/* Weekly trend */}
            <section className="dash-section">
              <div className="dash-section-head">
                <h2 className="dash-section-title">Score over time</h2>
                <Link to="/progress" className="dash-section-link">Full progress →</Link>
              </div>
              <div className="dash-chart">
                {stats.weekly.map((w) => (
                  <div className="dash-chart-col" key={w.label}>
                    <div className="dash-chart-track">
                      {w.average !== null && (
                        <div
                          className="dash-chart-fill"
                          style={{ height: `${(w.average / maxWeekly) * 100}%` }}
                          title={`${w.average}% across ${w.count} ${w.count === 1 ? 'session' : 'sessions'}`}
                        />
                      )}
                    </div>
                    <span className="dash-chart-value">{w.average !== null ? `${w.average}%` : '—'}</span>
                    <span className="dash-chart-label">{w.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Explore the platform */}
        <section className="dash-section">
          <h2 className="dash-section-title">Explore</h2>
          <div className="dash-nav-grid">
            <Link to="/debate" className="dash-nav-card">
              <span className="dash-nav-icon" aria-hidden="true">⚔️</span>
              <span className="dash-nav-title">Debate</span>
              <span className="dash-nav-desc">Argue any topic against an AI that takes the other side.</span>
            </Link>
            <Link to="/interview" className="dash-nav-card">
              <span className="dash-nav-icon" aria-hidden="true">💼</span>
              <span className="dash-nav-title">Interview</span>
              <span className="dash-nav-desc">FAANG-style behavioral, technical, and system design rounds.</span>
            </Link>
            <Link to="/progress" className="dash-nav-card">
              <span className="dash-nav-icon" aria-hidden="true">📈</span>
              <span className="dash-nav-title">Progress</span>
              <span className="dash-nav-desc">Track scores, streaks, and your trend over time.</span>
            </Link>
            <Link to="/leaderboard" className="dash-nav-card">
              <span className="dash-nav-icon" aria-hidden="true">🏆</span>
              <span className="dash-nav-title">Leaderboard</span>
              <span className="dash-nav-desc">See where you rank by average score.</span>
            </Link>
            <Link to="/achievements" className="dash-nav-card">
              <span className="dash-nav-icon" aria-hidden="true">🏅</span>
              <span className="dash-nav-title">Achievements</span>
              <span className="dash-nav-desc">Earn badges as you practice and improve.</span>
            </Link>
            <Link to="/history" className="dash-nav-card">
              <span className="dash-nav-icon" aria-hidden="true">🗂️</span>
              <span className="dash-nav-title">History</span>
              <span className="dash-nav-desc">Review past sessions and transcripts.</span>
            </Link>
            <Link to="/about" className="dash-nav-card">
              <span className="dash-nav-icon" aria-hidden="true">ℹ️</span>
              <span className="dash-nav-title">About</span>
              <span className="dash-nav-desc">What DebateAI is and how it works.</span>
            </Link>
          </div>
        </section>

        {source === 'local' && hasActivity && (
          <p className="dash-source-note">
            Showing stats saved on this device. Connect the backend and sign in to sync across devices.
          </p>
        )}
      </div>
    </main>
  );
}
