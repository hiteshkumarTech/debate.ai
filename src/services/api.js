// Central API client for the DebateAI backend.
//
// Design: every call attaches the current Firebase user's ID token as a
// Bearer header (the backend verifies it). If VITE_API_URL isn't set, or
// the backend is unreachable, callers fall back to local behavior — so the
// app keeps working offline/without a backend exactly as it did before.
//
// Configure by setting VITE_API_URL in the frontend .env, e.g.
//   VITE_API_URL=http://localhost:8000

import { auth } from '../firebase';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export function isBackendConfigured() {
  return Boolean(BASE_URL);
}

// Grabs a fresh Firebase ID token for the signed-in user, or null if no
// one is signed in (callers then fall back to local-only behavior).
async function getAuthToken() {
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  if (!BASE_URL) {
    throw new ApiError('Backend not configured (VITE_API_URL unset).', 0);
  }

  const token = await getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let resp;
  try {
    resp = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkErr) {
    // Backend unreachable (down, CORS, offline) — surface as status 0 so
    // callers can fall back to local behavior cleanly.
    throw new ApiError(`Cannot reach backend: ${networkErr.message}`, 0);
  }

  if (!resp.ok) {
    let detail = `Request failed (${resp.status})`;
    try {
      const data = await resp.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(detail, resp.status);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

// ---- Typed endpoint wrappers ----
export const api = {
  isConfigured: isBackendConfigured,

  health: () => request('/api/health'),

  // AI turn
  aiReply: (payload, signal) =>
    request('/api/ai/reply', { method: 'POST', body: payload, signal }),

  // Sessions
  createSession: (payload) =>
    request('/api/sessions', { method: 'POST', body: payload }),
  appendMessages: (id, messages) =>
    request(`/api/sessions/${id}/messages`, { method: 'POST', body: { messages } }),
  completeSession: (id, messages) =>
    request(`/api/sessions/${id}/complete`, { method: 'POST', body: { messages } }),
  listSessions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/sessions${qs ? `?${qs}` : ''}`);
  },
  listActiveSessions: () => request('/api/sessions/active'),
  getSession: (id) => request(`/api/sessions/${id}`),
  deleteSession: (id) => request(`/api/sessions/${id}`, { method: 'DELETE' }),

  // Analytics + leaderboard
  analytics: () => request('/api/analytics'),
  leaderboard: () => request('/api/leaderboard'),

  // Personas (custom AI opponents)
  listPersonas: () => request('/api/personas'),
  createPersona: (payload) =>
    request('/api/personas', { method: 'POST', body: payload }),
  deletePersona: (id) => request(`/api/personas/${id}`, { method: 'DELETE' }),
};

export { ApiError };
