// src/webai.js — webAI Apogee shell integration helpers

const getShellAPI = (name) => window[name] ?? window.parent?.[name] ?? null;

export const getOasisHost = () => getShellAPI('OasisHost');
export const getApogeeShell = () => getShellAPI('ApogeeShell');

/** Returns 'ready' | 'loading' | 'waiting' */
export function getOasisState() {
  const host = getOasisHost();
  if (!host?.getStatus) return 'waiting';
  const s = host.getStatus();
  if (s?.lastModel) return 'ready';
  if (s?.loadingModel || s?.isGenerating) return 'loading';
  return 'waiting';
}

/** Stream a completion. onToken(chunk) is called for each token. */
export async function streamCompletion(prompt, { systemPrompt = '', maxTokens = 2048, temperature = 0.7, onToken } = {}) {
  const host = getOasisHost();
  if (!host) throw new Error('OasisHost not available — is the Apogee shell running?');
  const release = await host.acquire({ warmRuntime: true });
  try {
    return await host.request(prompt, { systemPrompt, maxTokens, temperature, onToken });
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
