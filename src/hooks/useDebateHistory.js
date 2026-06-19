import { useState, useEffect, useCallback } from 'react';
import {
  getDebateHistory,
  computeStreak,
  computeAverageScore,
  computeTopicExtremes,
  computeWeeklyAverages,
} from '../utils/debateHistory';

export function useDebateHistory() {
  const [history, setHistory] = useState(() => getDebateHistory());

  // Re-read from storage if another tab/window writes to it (e.g. the
  // user has the Debate page and Progress page open side by side).
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'debateai_history_v1') {
        setHistory(getDebateHistory());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const refresh = useCallback(() => {
    setHistory(getDebateHistory());
  }, []);

  return {
    history,
    refresh,
    streak: computeStreak(history),
    averageScore: computeAverageScore(history),
    topicExtremes: computeTopicExtremes(history),
    weeklyAverages: computeWeeklyAverages(history),
    totalDebates: history.length,
  };
}
