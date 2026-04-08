// src/persona.js — Apogee persona helpers

const getHost = () => window.OasisHost ?? window.parent?.OasisHost ?? null;

/**
 * The app's Apogee ID — used for persona permission scoping.
 * Apogee injects __APOGEE_APP_ID__ at runtime; falls back to null in dev.
 */
export function getAppId() {
  return window.__APOGEE_APP_ID__ ?? null;
}

/**
 * List all personas available in this Apogee installation.
 * Returns an array of { id, name, description, specialties, systemPromptTemplate, ... }
 */
export function getPersonas() {
  return getHost()?.getPersonas?.() ?? [];
}

/**
 * List personas the app has explicit permission to use, keyed by specialty.
 * Returns e.g. { coaching: { id, name, type }, general: { id, name, type } }
 */
export function getPermittedPersonas(appId) {
  const id = appId ?? getAppId();
  return getHost()?.getPersonasWithPermissions?.(id) ?? {};
}

/**
 * Request access to a persona by specialty (e.g. "coaching", "general").
 * Apogee shows the user an approval modal the first time — subsequent calls are instant.
 * Returns true if access was granted, false if denied.
 */
export async function requestPersonaAccess(personaType, appId) {
  const host = getHost();
  const id = appId ?? getAppId();
  if (!host?.requestPersonaAccess) return false;
  return host.requestPersonaAccess(id, personaType);
}

/**
 * Remove this app's permission to use a persona specialty.
 */
export async function removePersonaAccess(personaType, appId) {
  const host = getHost();
  const id = appId ?? getAppId();
  if (!host?.removePersonaPermission) return;
  return host.removePersonaPermission(id, personaType);
}

/**
 * Built-in coaching persona definitions used when Apogee personas aren't available.
 * These drive the systemPrompt and prompt style when no live personas are configured.
 */
export const BUILTIN_PERSONAS = [
  {
    id: 'motivational',
    name: 'Motivational Coach',
    description: 'Warm, uplifting encouragement to keep you energised',
    systemPrompt: 'You are an enthusiastic and warm productivity coach. Celebrate wins with energy, use positive language, and help the user feel proud of their progress. Be genuine, not cheesy.',
    promptStyle: 'Give an uplifting, warm, and enthusiastic message celebrating their achievement.',
  },
  {
    id: 'strict',
    name: 'Strict Coach',
    description: 'Direct, no-nonsense feedback focused on results',
    systemPrompt: 'You are a no-nonsense, results-focused productivity coach. Be direct and concise. Acknowledge progress briefly then immediately redirect focus to next steps and maintaining discipline.',
    promptStyle: 'Give a brief, direct acknowledgement of their progress, then push them to keep their discipline and focus on the next session.',
  },
];
