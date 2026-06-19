import { useDebateHistory } from '../hooks/useDebateHistory';
import { PERSONALITIES } from '../data/personalities';
import './Progress.css';

function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function scoreTone(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'low';
}

export default function ProgressPage() {
  const { history, streak, averageScore, topicExtremes, weeklyAverages, totalDebates } =
    useDebateHistory();

  if (totalDebates === 0) {
    return (
      <main className="progress-page">
        <div className="container progress-empty">
          <h1 className="progress-empty-title">No debates yet</h1>
          <p className="progress-empty-sub">
            Finish your first debate and your scores, streak, and progress will show up here.
          </p>
          <a href="/debate" className="progress-empty-cta">Start your first debate</a>
        </div>
      </main>
    );
  }

  const maxWeeklyAvg = Math.max(...weeklyAverages.map((w) => w.average || 0), 1);

  return (
    <main className="progress-page">
      <div className="container">
        <div className="progress-head">
          <h1 className="progress-title">Your progress</h1>
          <p className="progress-sub">Tracked locally on this device — sign in later to sync across devices.</p>
        </div>

        <div className="progress-stat-grid">
          <div className="progress-stat-card">
            <span className="progress-stat-label">Debates completed</span>
            <span className="progress-stat-value">{totalDebates}</span>
          </div>
          <div className="progress-stat-card">
            <span className="progress-stat-label">Average score</span>
            <span className="progress-stat-value">{averageScore}%</span>
          </div>
          <div className="progress-stat-card">
            <span className="progress-stat-label">Current streak</span>
            <span className="progress-stat-value">
              {streak} {streak === 1 ? 'day' : 'days'}
              {streak > 0 && <span className="progress-stat-flame" aria-hidden="true">🔥</span>}
            </span>
          </div>
        </div>

        <div className="progress-topic-row">
          <div className="progress-topic-card strongest">
            <span className="progress-topic-label">Strongest topic</span>
            <span className="progress-topic-name">{topicExtremes.strongest?.topic || '—'}</span>
            {topicExtremes.strongest && (
              <span className="progress-topic-avg">Avg {Math.round(topicExtremes.strongest.avg)}%</span>
            )}
          </div>
          <div className="progress-topic-card weakest">
            <span className="progress-topic-label">Needs work</span>
            <span className="progress-topic-name">{topicExtremes.weakest?.topic || '—'}</span>
            {topicExtremes.weakest && (
              <span className="progress-topic-avg">Avg {Math.round(topicExtremes.weakest.avg)}%</span>
            )}
          </div>
        </div>

        <section className="progress-section">
          <h2 className="progress-section-title">Score over time</h2>
          <div className="progress-chart">
            {weeklyAverages.map((w) => (
              <div className="progress-chart-col" key={w.label}>
                <div className="progress-chart-bar-track">
                  {w.average !== null && (
                    <div
                      className="progress-chart-bar-fill"
                      style={{ height: `${(w.average / maxWeeklyAvg) * 100}%` }}
                      title={`${w.average}% average across ${w.count} ${w.count === 1 ? 'debate' : 'debates'}`}
                    />
                  )}
                </div>
                <span className="progress-chart-value">{w.average !== null ? `${w.average}%` : '—'}</span>
                <span className="progress-chart-label">{w.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="progress-section">
          <h2 className="progress-section-title">Recent debates</h2>
          <div className="progress-history-list">
            {history.slice(0, 10).map((entry) => {
              const persona = PERSONALITIES.find((p) => p.id === entry.personality);
              const tone = scoreTone(entry.score?.overall || 0);
              return (
                <div className="progress-history-row" key={entry.id}>
                  <div className="progress-history-main">
                    <span className="progress-history-topic">{entry.topic}</span>
                    <span className="progress-history-meta">
                      {persona?.icon} {persona?.name} · {formatRelativeDate(entry.completedAt)}
                    </span>
                  </div>
                  <span className={`progress-history-score tone-${tone}`}>{entry.score?.overall || 0}%</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
