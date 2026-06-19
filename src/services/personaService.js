// Persona service: manages a user's custom AI opponents. Backend-first
// (synced, shared across devices) when configured and signed in; otherwise
// falls back to a localStorage store so the feature works fully offline.
//
// Both paths return personas in the same shape:
//   { id, name, icon, instruction, intensity }

import { api } from './api';
import { auth } from '../firebase';

const LOCAL_KEY = 'debateai_personas_v1';

function backendUsable() {
  return api.isConfigured() && Boolean(auth?.currentUser);
}

// ---- localStorage helpers ----
function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// ---- public API ----
export async function listPersonas() {
  if (backendUsable()) {
    try {
      const rows = await api.listPersonas();
      return rows;
    } catch {
      /* fall through to local */
    }
  }
  return readLocal();
}

export async function createPersona({ name, icon, instruction, intensity }) {
  if (backendUsable()) {
    try {
      return await api.createPersona({ name, icon, instruction, intensity });
    } catch {
      /* fall through to local */
    }
  }
  // Local fallback: generate a client-side id.
  const persona = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    icon: icon || null,
    instruction,
    intensity: intensity || null,
  };
  const list = readLocal();
  list.unshift(persona);
  writeLocal(list);
  return persona;
}

export async function deletePersona(id) {
  if (backendUsable() && !String(id).startsWith('local_')) {
    try {
      await api.deletePersona(id);
      return true;
    } catch {
      /* fall through to local */
    }
  }
  writeLocal(readLocal().filter((p) => String(p.id) !== String(id)));
  return true;
}
