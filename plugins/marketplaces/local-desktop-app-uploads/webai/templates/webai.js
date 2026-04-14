// webai.js - webAI Apogee SDK integration helpers
// Single integration point between your app and the shell APIs.
// In local dev (outside Apogee), sdk is null — all helpers degrade gracefully.

export const getSDK = () => window.apogeeSDK || null;

/**
 * Returns the current intelligence status.
 * @returns {'ready' | 'loading' | 'waiting'}
 */
export function getIntelligenceState() {
  const sdk = getSDK();
  if (!sdk) return 'waiting';
  const s = sdk.intelligence?.getState?.();
  if (!s) return 'waiting';
  if (s.isModelLoaded) return 'ready';
  if (s.loadingModel || s.isGenerating) return 'loading';
  return 'waiting';
}

/**
 * Subscribe to intelligence state changes.
 * Returns an unsubscribe function — call it on unmount.
 * @param {() => void} handler
 * @returns {() => void} unsubscribe
 */
export function onIntelligenceChange(handler) {
  const sdk = getSDK();
  if (!sdk?.intelligence) return () => {};
  return sdk.intelligence.subscribe(handler);
}

/**
 * Stream a chat completion from the local Oasis AI model.
 * onToken(delta) is called for each incremental token.
 * Returns the full accumulated response text.
 *
 * @param {string} prompt - The user prompt
 * @param {object} [options]
 * @param {string} [options.systemPrompt]
 * @param {number} [options.maxTokens=2048]
 * @param {number} [options.temperature=0.7]
 * @param {string} [options.model='auto']
 * @param {(token: string) => void} [options.onToken]
 * @param {Array<{role: string, content: string}>} [options.priorMessages=[]]
 * @returns {Promise<string>}
 */
export async function streamCompletion(prompt, {
  systemPrompt = '',
  maxTokens = 2048,
  temperature = 0.7,
  model = 'auto',
  onToken,
  priorMessages = [],
  ...rest
} = {}) {
  const sdk = getSDK();
  if (!sdk) throw new Error('apogeeSDK not available — is the Apogee shell running?');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  for (const m of priorMessages) messages.push(m);
  messages.push({ role: 'user', content: prompt });

  let fullText = '';
  const stream = sdk.intelligence.chatCompletionStream({
    model, messages, max_tokens: maxTokens, temperature, ...rest,
  });
  for await (const chunk of stream) {
    if (chunk.delta) {
      fullText += chunk.delta;
      onToken?.(chunk.delta);
    }
  }
  return fullText;
}

/**
 * Cancel any in-progress generation.
 */
export function cancelGeneration() {
  getSDK()?.intelligence?.cancelGeneration?.();
}

/**
 * Navigate back to the Apogee launcher.
 */
export function goToLauncher() {
  const sdk = getSDK();
  if (sdk?.shell?.setView) {
    sdk.shell.setView('launcher');
    return;
  }
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'backToLauncher' }, '*');
  }
}

/**
 * Navigate to another Apogee view.
 * @param {string} viewId - e.g. 'launcher', 'whiteboard', 'browse-web'
 */
export function setView(viewId) {
  getSDK()?.shell?.setView?.(viewId);
}
