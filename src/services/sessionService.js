// Session service: the bridge between the UI and either the backend or
// local storage. Every function tries the backend when it's configured AND
// reachable AND the user is signed in; otherwise it transparently falls
// back to the existing localStorage behavior. This is what lets the app
// keep working exactly as before when there's no backend, while using real
// persistence when there is.

import { api } from './api';
import { auth } from '../firebase';
import {
  saveDebateEntry,
  saveInterviewEntry,
  getDebateHistory,
} from '../utils/debateHistory';

// Backend is "usable" only when configured and someone is signed in
// (the backend requires auth). Signed-out users always use local storage.
function backendUsable() {
  return api.isConfigured() && Boolean(auth?.currentUser);
}

// ---- Saving a completed session ----
// Returns { persisted: 'backend' | 'local' } so callers can optionally
// reflect where it went. Falls back to local on ANY backend failure, so a
// finished debate is never lost.
export async function saveCompletedDebate({ topic, side, personality, aiModel, score, messages, sessionId }) {
  if (backendUsable()) {
    try {
      // If the debate already created an active session (the normal path
      // now), complete THAT one rather than creating a duplicate. Only
      // create a fresh session if we somehow don't have an id.
      let id = sessionId;
      if (!id) {
        const created = await api.createSession({
          kind: 'debate',
          topic,
          ai_model: aiModel,
          side,
          personality,
        });
        id = created.id;
      }
      const completed = await api.completeSession(
        id,
        messages.map((m) => ({ sender: m.sender, content: m.text })),
      );
      // Surface the backend's authoritative scores + AI feedback so the
      // report can display them (richer than the local heuristic).
      return { persisted: 'backend', session: completed };
    } catch {
      // fall through to local
    }
  }
  saveDebateEntry({ topic, side, personality, aiModel, score });
  return { persisted: 'local', session: null };
}

export async function saveCompletedInterview({ topic, category, company, aiModel, score, messages, sessionId }) {
  if (backendUsable()) {
    try {
      let id = sessionId;
      if (!id) {
        const created = await api.createSession({
          kind: 'interview',
          topic,
          ai_model: aiModel,
          category,
          company,
        });
        id = created.id;
      }
      const completed = await api.completeSession(
        id,
        messages.map((m) => ({ sender: m.sender, content: m.text })),
      );
      return { persisted: 'backend', session: completed };
    } catch {
      // fall through to local
    }
  }
  saveInterviewEntry({ topic, category, company, aiModel, score });
  return { persisted: 'local', session: null };
}

// ---- Loading history ----
// Normalizes backend rows into the SAME shape the local utils produce, so
// downstream components (Progress, History) don't care about the source.
function backendRowToLocal(row) {
  return {
    id: String(row.id),
    kind: row.kind,
    completedAt: row.completed_at || row.created_at,
    topic: row.topic,
    side: row.side,
    personality: row.personality,
    category: row.category,
    company: row.company,
    aiModel: row.ai_model,
    // local code reads either entry.score.overall (debate report) or
    // entry.overall (preview); provide both for safety.
    overall: row.score_overall,
    score: { overall: row.score_overall },
  };
}

export async function loadHistory() {
  if (backendUsable()) {
    try {
      const rows = await api.listSessions();
      const completed = rows.filter((r) => r.status === 'completed');
      return { source: 'backend', entries: completed.map(backendRowToLocal) };
    } catch {
      // fall through to local
    }
  }
  return { source: 'local', entries: getDebateHistory() };
}

// ---- Live-session lifecycle (enables Resume) ----
// Creates an ACTIVE session server-side at the start of a debate/interview,
// so its transcript can be persisted turn-by-turn and resumed later. Returns
// the new session id, or null when there's no backend (the session simply
// isn't tracked server-side, and the chat runs purely in local state).
export async function startSession({ kind, topic, aiModel, side, personality, category, company }) {
  if (!backendUsable()) return null;
  try {
    const created = await api.createSession({
      kind,
      topic,
      ai_model: aiModel,
      side,
      personality,
      category,
      company,
    });
    return created.id;
  } catch {
    return null;
  }
}

// Persists the conversation-so-far for an active session. Fire-and-forget:
// a failure here must never interrupt the live conversation, so it swallows
// errors (the full transcript is re-sent on completion regardless).
export async function persistTurns(sessionId, messages) {
  if (!sessionId || !backendUsable()) return;
  try {
    await api.appendMessages(
      sessionId,
      messages.map((m) => ({ sender: m.sender, content: m.text })),
    );
  } catch {
    /* non-fatal — completion will re-send the authoritative transcript */
  }
}

// Loads a session + its stored transcript for resuming. Returns
// { id, kind, config, messages } shaped for the chat components, or null if
// unavailable / not resumable / not owned by the user.
export async function loadSessionForResume(sessionId) {
  if (!sessionId || !backendUsable()) return null;
  try {
    const s = await api.getSession(sessionId);
    if (!s || s.status !== 'active') return null; // only unfinished sessions
    return {
      id: s.id,
      kind: s.kind,
      config: {
        topic: s.topic,
        side: s.side,
        personality: s.personality,
        aiModel: s.ai_model,
        category: s.category,
        company: s.company,
        role: s.role,
      },
      // Map stored transcript rows into the chat's message shape.
      messages: (s.messages || []).map((m, i) => ({
        id: `r-${i}`,
        sender: m.sender,
        text: m.content,
      })),
    };
  } catch {
    return null;
  }
}
