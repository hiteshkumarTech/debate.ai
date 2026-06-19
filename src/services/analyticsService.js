// Analytics service: returns dashboard stats from the backend when it's
// reachable (and the user is signed in), otherwise computes the same shape
// from localStorage. Either way the dashboard gets one consistent object,
// plus a `source` flag so the UI can note where the numbers came from.

import { api } from './api';
import { auth } from '../firebase';
import {
  getDebateHistory,
  computeStreak,
  computeAverageScore,
  computeTopicExtremes,
  computeWeeklyAverages,
} from '../utils/debateHistory';

function backendUsable() {
  return api.isConfigured() && Boolean(auth?.currentUser);
}

// Shape returned to the dashboard (matches backend AnalyticsOut, plus the
// fields the local utils provide).
function emptyStats() {
  return {
    totalSessions: 0,
    totalDebates: 0,
    totalInterviews: 0,
    averageScore: 0,
    streakDays: 0,
    strongestTopic: null,
    weakestTopic: null,
    weekly: [],
  };
}

// Compute the same stats locally from the saved history entries.
function computeLocalStats() {
  const history = getDebateHistory();
  const debates = history.filter((h) => (h.kind || 'debate') === 'debate');
  const interviews = history.filter((h) => h.kind === 'interview');
  const extremes = computeTopicExtremes(history);
  const weekly = computeWeeklyAverages(history).map((w) => ({
    label: w.label,
    average: w.average,
    count: w.count,
  }));
  return {
    totalSessions: history.length,
    totalDebates: debates.length,
    totalInterviews: interviews.length,
    averageScore: computeAverageScore(history),
    streakDays: computeStreak(history),
    strongestTopic: extremes.strongest?.topic ?? null,
    weakestTopic: extremes.weakest?.topic ?? null,
    weekly,
  };
}

export async function loadAnalytics() {
  if (backendUsable()) {
    try {
      const a = await api.analytics();
      return {
        source: 'backend',
        stats: {
          totalSessions: a.total_sessions,
          totalDebates: a.total_debates,
          totalInterviews: a.total_interviews,
          averageScore: a.average_score,
          streakDays: a.streak_days,
          strongestTopic: a.strongest_topic ?? null,
          weakestTopic: a.weakest_topic ?? null,
          weekly: a.weekly ?? [],
        },
      };
    } catch {
      // fall through to local
    }
  }
  return { source: 'local', stats: computeLocalStats() };
}

export { emptyStats };
