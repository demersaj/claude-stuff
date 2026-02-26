// webai.js - webAI Apogee shell integration helpers
// This file is the single integration point between your app and the shell APIs.
// In local dev (outside Apogee), all getX() calls return null - handle gracefully.

export const getShellAPI = (name) =>
  window[name] ?? window.parent?.[name] ?? null;

export const getOasisHost = () => getShellAPI('OasisHost');
export const getApogeeShell = () => getShellAPI('ApogeeShell');
export const getCollaborationManager = () => getShellAPI('CollaborationManager');
export const getUserIdentityManager = () => getShellAPI('UserIdentityManager');
export const getE2ECrypto = () => getShellAPI('E2ECrypto');

/**
 * Returns the current OasisHost status.
 * @returns {'ready' | 'loading' | 'waiting'}
 */
export function getOasisState() {
  const host = getOasisHost();
  if (!host?.getStatus) return 'waiting';
  const s = host.getStatus();
  if (s?.lastModel) return 'ready';
  if (s?.loadingModel || s?.isGenerating) return 'loading';
  return 'waiting';
}

/**
 * Stream a completion from the local Oasis AI model.
 *
 * @param {string} prompt - The user-side prompt
 * @param {string} systemPrompt - The system prompt for this request
 * @param {(token: string) => void} onToken - Called with each incremental token
 * @returns {Promise<string>} The full accumulated response text
 */
export async function streamCompletion(prompt, systemPrompt, onToken) {
  const host = getOasisHost();
  if (!host) throw new Error('Oasis AI is not available in this environment.');

  const release = await host.acquire({ warmRuntime: true });
  try {
    return await host.request(prompt, {
      systemPrompt: systemPrompt ?? '',
      maxTokens: 2048,
      temperature: 0.7,
      onToken,
    });
  } finally {
    if (release) release();
  }
}

/**
 * Navigate back to the Apogee launcher.
 */
export function goToLauncher() {
  if (typeof window.backToLauncher === 'function') {
    window.backToLauncher();
    return;
  }
  const shell = getApogeeShell();
  if (shell?.setView) {
    shell.setView('launcher');
    return;
  }
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'backToLauncher' }, '*');
  }
}

/**
 * Navigate to another Apogee view.
 * @param {'launcher' | 'whiteboard' | 'browse-web' | 'collab-editor'} viewId
 */
export function setView(viewId) {
  const shell = getApogeeShell();
  if (shell?.setView) shell.setView(viewId);
}
