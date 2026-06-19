import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadAnalytics } from '../services/analyticsService';
import { loadHistory } from '../services/sessionService';
import { computeStreak } from '../utils/debateHistory';
import {
  evaluateAchievements,
  deriveStatsFromHistory,
} from '../utils/achievements';
import './Achievements.css';

export default function Achievements() {
  const [result, setResult] = useState(() => evaluateAchievements({}));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Pull the canonical summary (backend when available) AND the raw
      // history (for the richer fields the summary doesn't carry, like
      // best single score and distinct topic count).
      const [{ stats: summary }, { entries }] = await Promise.all([
        loadAnalytics(),
        loadHistory(),
      ]);

      const derived = deriveStatsFromHistory(entries);
      // Prefer backend/summary numbers where they exist; fall back to the
      // locally derived equivalents. Streak comes from the summary or is
      // computed locally.
      const merged = {
        totalSessions: summary.totalSessions || derived.totalSessions,
        totalDebates: summary.totalDebates || derived.totalDebates,
        totalInterviews: summary.totalInterviews || derived.totalInterviews,
        averageScore: summary.averageScore || derived.averageScore,
        streakDays: summary.streakDays || computeStreak(entries),
        bestScore: derived.bestScore,
        topicsCount: derived.topicsCount,
      };

      if (cancelled) return;
      setResult(evaluateAchievements(merged));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { achievements, earnedCount, total } = result;
  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);
  const pct = total ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <main className="ach-page">
      <div className="container ach-container">
        <header className="ach-head">
          <h1 className="ach-title">Achievements</h1>
          <p className="ach-sub">Earn badges as you practice. Keep going to unlock them all.</p>
        </header>

        <section className="ach-summary">
          <div className="ach-summary-ring">
            <span className="ach-summary-count">{earnedCount}</span>
            <span className="ach-summary-total">/ {total}</span>
          </div>
          <div className="ach-summary-body">
            <div className="ach-summary-bar-track">
              <div className="ach-summary-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="ach-summary-text">
              {earnedCount === 0
                ? 'No badges yet — finish a session to earn your first.'
                : earnedCount === total
                ? 'Every badge unlocked. Outstanding work.'
                : `${earnedCount} of ${total} unlocked (${pct}%).`}
            </p>
          </div>
        </section>

        {loading ? (
          <div className="ach-loading">Loading your achievements…</div>
        ) : (
          <>
            {earned.length > 0 && (
              <section className="ach-section">
                <h2 className="ach-section-title">Unlocked</h2>
                <div className="ach-grid">
                  {earned.map((a) => (
                    <div className={`ach-card is-earned tier-${a.tier}`} key={a.id}>
                      <span className="ach-card-icon" aria-hidden="true">{a.icon}</span>
                      <span className="ach-card-name">{a.name}</span>
                      <span className="ach-card-desc">{a.description}</span>
                      <span className="ach-card-badge">✓ Earned</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {locked.length > 0 && (
              <section className="ach-section">
                <h2 className="ach-section-title">Locked</h2>
                <div className="ach-grid">
                  {locked.map((a) => (
                    <div className="ach-card is-locked" key={a.id}>
                      <span className="ach-card-icon" aria-hidden="true">{a.icon}</span>
                      <span className="ach-card-name">{a.name}</span>
                      <span className="ach-card-desc">{a.description}</span>
                      <div className="ach-card-progress">
                        <div className="ach-card-progress-track">
                          <div
                            className="ach-card-progress-fill"
                            style={{ width: `${a.progress.pct}%` }}
                          />
                        </div>
                        <span className="ach-card-progress-label">
                          {a.progress.current} / {a.progress.target}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="ach-cta">
          <Link to="/debate" className="ach-cta-btn">Practice to earn more</Link>
        </div>
      </div>
    </main>
  );
}
