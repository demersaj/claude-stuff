// src/memory.js — App conversation memory helpers

const getHost = () => window.OasisHost ?? window.parent?.OasisHost ?? null;

/**
 * The app's Apogee ID — scopes memory to this app.
 * Injected at runtime by Apogee; null in local dev (memory calls are no-ops).
 */
export function getAppId() {
  return window.__APOGEE_APP_ID__ ?? null;
}

/**
 * Load the app's conversation history.
 * Returns { recentTurns, summary, preferences, updatedAt }
 *
 * recentTurns is an array of { role, text, at, turnId, chatSession }
 * Up to 60 turns are stored; oldest are evicted automatically.
 */
export async function loadHistory(appId) {
  const id = appId ?? getAppId();
  const host = getHost();
  if (!host || !id) return { recentTurns: [], summary: '', preferences: {}, updatedAt: null };
  return host.loadAppChatHistory(id);
}

/**
 * Clear all conversation history for this app.
 */
export async function clearHistory(appId) {
  const id = appId ?? getAppId();
  const host = getHost();
  if (!host || !id) return;
  return host.clearAppChatHistory(id);
}

/**
 * Filter turns to a specific chat session (if your app uses multiple threads).
 * Pass null/undefined to get all turns.
 */
export function filterSession(turns, chatSession) {
  if (!chatSession) return turns;
  return turns.filter(t => t.chatSession === chatSession);
}

/**
 * Format a turn timestamp for display (e.g. "2:34 PM" or "Jan 5").
 */
export function formatTurnTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
