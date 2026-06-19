// Debate history storage — localStorage for now, since there's no backend
// yet. Every function here is the seam to swap when the FastAPI backend
// exists: replace the body of each function with a fetch() call to
// /api/history, keep the same function signatures, and nothing else in
// the app needs to change.
//
// Known limitation, stated honestly: this only persists on the current
// device/browser, and is wiped if the user clears site data. That's fine
// for a local-first MVP, not fine for a real multi-device product.

const STORAGE_KEY = 'debateai_history_v1';

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt JSON, storage disabled (private browsing in some browsers),
    // or quota exceeded — fail closed to an empty history rather than
    // throwing and breaking the whole Progress page.
    return [];
  }
}

function writeRaw(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

// Saves one completed debate. Returns the saved entry (with its generated
// id and timestamp) so callers can use it immediately if needed.
export function saveDebateEntry({ topic, side, personality, aiModel, score }) {
  const entry = {
    id: `debate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    completedAt: new Date().toISOString(),
    topic,
    side,
    personality,
    aiModel,
    score, // the full { overall, logic, evidence, clarity, persuasiveness, messageCount } object
  };

  const existing = readRaw();
  writeRaw([...existing, entry]);
  return entry;
}

// Saves one completed interview session. Tagged with kind: 'interview' so
// the History page's filter tabs can separate it from debates. Shares the
// same storage as debates — same swap point applies for a real backend.
export function saveInterviewEntry({ topic, category, company, aiModel, score }) {
  const entry = {
    id: `interview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: 'interview',
    completedAt: new Date().toISOString(),
    topic, // the question text
    category, // 'Behavioral' | 'Technical' | 'System Design'
    company, // display label, e.g. 'Google'
    aiModel,
    score,
  };

  const existing = readRaw();
  writeRaw([...existing, entry]);
  return entry;
}

// Returns all saved debates, most recent first.
export function getDebateHistory() {
  return readRaw()
    .slice()
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}

export function clearDebateHistory() {
  return writeRaw([]);
}

// ---- Derived stats, computed from raw history ----
// Kept here rather than scattered across components so the Progress page
// and any future "mini stats" widget compute things identically.

function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date, reference) {
  const yest = new Date(reference);
  yest.setDate(yest.getDate() - 1);
  return isSameCalendarDay(date, yest);
}

// Current streak: consecutive calendar days (ending today or yesterday)
// with at least one completed debate. Breaks to 0 if the most recent
// debate isn't from today or yesterday.
export function computeStreak(history) {
  if (history.length === 0) return 0;

  const days = [...new Set(history.map((h) => {
    const d = new Date(h.completedAt);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }))].sort((a, b) => b - a); // most recent first

  const today = new Date();
  const mostRecentDay = new Date(days[0]);

  const startsActiveStreak =
    isSameCalendarDay(mostRecentDay, today) || isYesterday(mostRecentDay, today);

  if (!startsActiveStreak) return 0;

  let streak = 1;
  for (let i = 0; i < days.length - 1; i++) {
    const current = new Date(days[i]);
    const next = new Date(days[i + 1]);
    if (isYesterday(next, current)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function computeAverageScore(history) {
  if (history.length === 0) return 0;
  const sum = history.reduce((acc, h) => acc + (h.score?.overall || 0), 0);
  return Math.round(sum / history.length);
}

// Groups by topic, returns the topic with the highest and lowest average
// score (only considering topics with at least one entry). Returns nulls
// if there's no history yet.
export function computeTopicExtremes(history) {
  if (history.length === 0) return { strongest: null, weakest: null };

  const byTopic = {};
  history.forEach((h) => {
    if (!byTopic[h.topic]) byTopic[h.topic] = [];
    byTopic[h.topic].push(h.score?.overall || 0);
  });

  const averaged = Object.entries(byTopic).map(([topic, scores]) => ({
    topic,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  averaged.sort((a, b) => b.avg - a.avg);

  return {
    strongest: averaged[0] || null,
    weakest: averaged[averaged.length - 1] || null,
  };
}

// Buckets history into the last N calendar weeks (default 5, matching the
// blueprint's "Wk 1...Wk 5" progress chart) and averages the score within
// each week. Weeks with no debates show null so the chart can render a gap
// rather than a misleading 0.
export function computeWeeklyAverages(history, weekCount = 5) {
  const now = new Date();
  const weeks = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7 - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const inWeek = history.filter((h) => {
      const d = new Date(h.completedAt);
      return d >= weekStart && d < weekEnd;
    });

    weeks.push({
      label: `Wk ${weekCount - i}`,
      average: inWeek.length > 0
        ? Math.round(inWeek.reduce((a, h) => a + (h.score?.overall || 0), 0) / inWeek.length)
        : null,
      count: inWeek.length,
    });
  }

  return weeks;
}
