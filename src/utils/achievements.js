// Achievements engine. Pure functions: given the user's session history (or
// the analytics summary), it derives which badges are earned, which are
// locked, and progress toward the locked ones. No backend needed — it reads
// the same data the dashboard already has, so it works online or offline.
//
// Each achievement defines a `check(stats)` predicate and a `progress(stats)`
// returning { current, target } for a progress bar. Keeping the rules
// data-driven makes adding new badges a one-line change.

// `stats` shape (from analyticsService / local compute):
//   { totalSessions, totalDebates, totalInterviews, averageScore,
//     streakDays, bestScore, perfectish, topicsCount }

export const ACHIEVEMENTS = [
  {
    id: 'first-steps',
    icon: '🎯',
    name: 'First Steps',
    description: 'Complete your first session.',
    tier: 'bronze',
    check: (s) => s.totalSessions >= 1,
    progress: (s) => ({ current: Math.min(s.totalSessions, 1), target: 1 }),
  },
  {
    id: 'getting-warmed-up',
    icon: '🔥',
    name: 'Getting Warmed Up',
    description: 'Complete 5 sessions.',
    tier: 'bronze',
    check: (s) => s.totalSessions >= 5,
    progress: (s) => ({ current: Math.min(s.totalSessions, 5), target: 5 }),
  },
  {
    id: 'seasoned',
    icon: '🎖️',
    name: 'Seasoned',
    description: 'Complete 25 sessions.',
    tier: 'silver',
    check: (s) => s.totalSessions >= 25,
    progress: (s) => ({ current: Math.min(s.totalSessions, 25), target: 25 }),
  },
  {
    id: 'centurion',
    icon: '🏛️',
    name: 'Centurion',
    description: 'Complete 100 sessions.',
    tier: 'gold',
    check: (s) => s.totalSessions >= 100,
    progress: (s) => ({ current: Math.min(s.totalSessions, 100), target: 100 }),
  },
  {
    id: 'debater',
    icon: '⚔️',
    name: 'Debater',
    description: 'Finish 10 debates.',
    tier: 'silver',
    check: (s) => s.totalDebates >= 10,
    progress: (s) => ({ current: Math.min(s.totalDebates, 10), target: 10 }),
  },
  {
    id: 'interviewee',
    icon: '💼',
    name: 'Interviewee',
    description: 'Finish 10 interviews.',
    tier: 'silver',
    check: (s) => s.totalInterviews >= 10,
    progress: (s) => ({ current: Math.min(s.totalInterviews, 10), target: 10 }),
  },
  {
    id: 'well-rounded',
    icon: '🧭',
    name: 'Well Rounded',
    description: 'Do at least one debate AND one interview.',
    tier: 'bronze',
    check: (s) => s.totalDebates >= 1 && s.totalInterviews >= 1,
    progress: (s) => ({
      current: (s.totalDebates >= 1 ? 1 : 0) + (s.totalInterviews >= 1 ? 1 : 0),
      target: 2,
    }),
  },
  {
    id: 'sharp',
    icon: '📈',
    name: 'Sharp',
    description: 'Reach a 70+ average score.',
    tier: 'silver',
    check: (s) => s.averageScore >= 70,
    progress: (s) => ({ current: Math.min(s.averageScore, 70), target: 70 }),
  },
  {
    id: 'masterful',
    icon: '👑',
    name: 'Masterful',
    description: 'Reach an 85+ average score.',
    tier: 'gold',
    check: (s) => s.averageScore >= 85,
    progress: (s) => ({ current: Math.min(s.averageScore, 85), target: 85 }),
  },
  {
    id: 'high-scorer',
    icon: '🌟',
    name: 'High Scorer',
    description: 'Score 90+ in a single session.',
    tier: 'gold',
    check: (s) => s.bestScore >= 90,
    progress: (s) => ({ current: Math.min(s.bestScore, 90), target: 90 }),
  },
  {
    id: 'streak-3',
    icon: '📅',
    name: 'On a Roll',
    description: 'Practice 3 days in a row.',
    tier: 'bronze',
    check: (s) => s.streakDays >= 3,
    progress: (s) => ({ current: Math.min(s.streakDays, 3), target: 3 }),
  },
  {
    id: 'streak-7',
    icon: '🗓️',
    name: 'Dedicated',
    description: 'Practice 7 days in a row.',
    tier: 'gold',
    check: (s) => s.streakDays >= 7,
    progress: (s) => ({ current: Math.min(s.streakDays, 7), target: 7 }),
  },
  {
    id: 'explorer',
    icon: '🗺️',
    name: 'Explorer',
    description: 'Practice across 5 different topics.',
    tier: 'silver',
    check: (s) => s.topicsCount >= 5,
    progress: (s) => ({ current: Math.min(s.topicsCount, 5), target: 5 }),
  },
];

// Derive the richer stats the achievements need from raw history entries.
// Works with the same entry shape used everywhere (entry.score.overall or
// entry.overall, entry.kind, entry.topic).
export function deriveStatsFromHistory(history) {
  const entries = Array.isArray(history) ? history : [];
  const scoreOf = (e) => e?.score?.overall ?? e?.overall ?? 0;
  const debates = entries.filter((e) => (e.kind || 'debate') === 'debate');
  const interviews = entries.filter((e) => e.kind === 'interview');
  const scores = entries.map(scoreOf);
  const topics = new Set(entries.map((e) => e.topic).filter(Boolean));

  const total = entries.length;
  const avg = total ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;

  return {
    totalSessions: total,
    totalDebates: debates.length,
    totalInterviews: interviews.length,
    averageScore: avg,
    bestScore: scores.length ? Math.max(...scores) : 0,
    streakDays: 0, // filled in by caller (needs the streak helper / backend)
    topicsCount: topics.size,
  };
}

// Evaluate all achievements against a stats object. Returns each definition
// annotated with { earned, progress: {current, target, pct} }, plus a count.
export function evaluateAchievements(stats) {
  const s = {
    totalSessions: 0,
    totalDebates: 0,
    totalInterviews: 0,
    averageScore: 0,
    bestScore: 0,
    streakDays: 0,
    topicsCount: 0,
    ...stats,
  };

  const evaluated = ACHIEVEMENTS.map((a) => {
    const earned = a.check(s);
    const p = a.progress(s);
    const pct = p.target > 0 ? Math.min(100, Math.round((p.current / p.target) * 100)) : 0;
    return { ...a, earned, progress: { ...p, pct } };
  });

  return {
    achievements: evaluated,
    earnedCount: evaluated.filter((a) => a.earned).length,
    total: evaluated.length,
  };
}
