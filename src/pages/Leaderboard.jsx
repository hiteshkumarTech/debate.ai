import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../utils/leaderboard';
import './Leaderboard.css';

function rankBadge(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'You');

  const board = useMemo(() => getLeaderboard(displayName), [displayName]);

  return (
    <main className="lb-page">
      <div className="container lb-container">
        <div className="lb-head">
          <h1 className="lb-title">Leaderboard</h1>
          <p className="lb-sub">Ranked by average debate score.</p>
        </div>

        <div className="lb-notice">
          Global ranking is coming once accounts sync to the cloud. For now, the rows marked
          <span className="lb-sample-pill">sample</span> are placeholder competitors — your own row is
          your real saved average.
        </div>

        {!board.hasRealUser && (
          <div className="lb-cta-card">
            <p className="lb-cta-text">You're not on the board yet — finish a debate to earn your real average and see where you land.</p>
            <a href="/debate" className="lb-cta-btn">Start a debate</a>
          </div>
        )}

        {board.hasRealUser && (
          <div className="lb-your-rank">
            You're currently <strong>#{board.userRank}</strong> on this board.
          </div>
        )}

        <div className="lb-table">
          <div className="lb-row lb-row-header">
            <span className="lb-col-rank">Rank</span>
            <span className="lb-col-name">Player</span>
            <span className="lb-col-debates">Debates</span>
            <span className="lb-col-score">Avg score</span>
          </div>

          {board.rows.map((row) => (
            <div
              key={`${row.name}-${row.rank}`}
              className={`lb-row ${row.isCurrentUser ? 'is-you' : ''}`}
            >
              <span className="lb-col-rank">
                <span className={`lb-rank-badge ${row.rank <= 3 ? 'is-medal' : ''}`}>{rankBadge(row.rank)}</span>
              </span>
              <span className="lb-col-name">
                {row.name}
                {row.isCurrentUser && <span className="lb-you-pill">you</span>}
                {row.isPlaceholder && <span className="lb-sample-pill">sample</span>}
              </span>
              <span className="lb-col-debates">{row.debates}</span>
              <span className="lb-col-score">
                <span className="lb-score-value">{row.score}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
