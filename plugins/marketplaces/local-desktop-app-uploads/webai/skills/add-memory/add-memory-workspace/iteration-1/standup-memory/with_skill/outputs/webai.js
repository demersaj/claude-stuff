// src/webai.js — webAI Apogee shell integration helpers

const getShellAPI = (name) => window[name] ?? window.parent?.[name] ?? null;

export const getOasisHost = () => getShellAPI('OasisHost');
export const getApogeeShell = () => getShellAPI('ApogeeShell');
export const getCollaborationManager = () => getShellAPI('CollaborationManager');
export const getUserIdentityManager = () => getShellAPI('UserIdentityManager');

/** Returns the app's runtime ID injected by Apogee, or a fallback. */
export const getAppId = () =>
  window.__APOGEE_APP_ID__ ?? window.parent?.__APOGEE_APP_ID__ ?? 'daily-standup';

/**
 * Load saved chat history for this app.
 * Returns an array of { role, content, timestamp? } objects, or [].
 */
export async function loadChatHistory() {
  const host = getOasisHost();
  if (!host?.loadAppChatHistory) return [];
  try {
    const history = await host.loadAppChatHistory(getAppId());
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

/**
 * Clear saved chat history for this app.
 */
export async function clearChatHistory() {
  const host = getOasisHost();
  if (!host?.clearAppChatHistory) return;
  try {
    await host.clearAppChatHistory(getAppId());
  } catch {
    // silently ignore
  }
}

/** Returns 'ready' | 'loading' | 'waiting' */
export function getOasisState() {
  const host = getOasisHost();
  if (!host?.getStatus) return 'waiting';
  const s = host.getStatus();
  if (s?.lastModel) return 'ready';
  if (s?.loadingModel || s?.isGenerating) return 'loading';
  return 'waiting';
}

/**
 * Stream a completion. onToken(chunk) is called for each token.
 * Passing appId causes turns to auto-save in Apogee's history store.
 */
export async function streamCompletion(prompt, { systemPrompt = '', maxTokens = 2048, temperature = 0.7, onToken, ...rest } = {}) {
  const host = getOasisHost();
  if (!host) throw new Error('OasisHost not available — is the Apogee shell running?');
  const release = await host.acquire({ warmRuntime: true });
  try {
    return await host.request(prompt, {
      systemPrompt,
      maxTokens,
      temperature,
      onToken,
      appId: getAppId(),
      ...rest,
    });
  } finally {
    release?.();
  }
}

/** Navigate back to the Apogee launcher. */
export function goToLauncher() {
  const shell = getApogeeShell();
  if (shell?.setView) shell.setView('launcher');
  else if (typeof window.backToLauncher === 'function') window.backToLauncher();
  else window.parent?.postMessage({ type: 'backToLauncher' }, '*');
}
