import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadHistory } from '../services/sessionService';
import {
  computeStreak,
  computeAverageScore,
  computeTopicExtremes,
  computeWeeklyAverages,
} from '../utils/debateHistory';

// Loads debate/interview history from the backend when the user is signed
// in (and the backend is configured), otherwise from localStorage. Both
// sources are normalized to the same entry shape by sessionService, so the
// derived-stat helpers below work identically regardless of source.
export function useDebateHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { entries } = await loadHistory();
      setHistory(Array.isArray(entries) ? entries : []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever auth state changes -- signing in/out switches the
  // source between backend and local storage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { entries } = await loadHistory();
        if (!cancelled) setHistory(Array.isArray(entries) ? entries : []);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Cross-tab sync for the local-storage fallback path.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'debateai_history_v1') refresh();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  return {
    history,
    loading,
    refresh,
    streak: computeStreak(history),
    averageScore: computeAverageScore(history),
    topicExtremes: computeTopicExtremes(history),
    weeklyAverages: computeWeeklyAverages(history),
    totalDebates: history.length,
  };
}