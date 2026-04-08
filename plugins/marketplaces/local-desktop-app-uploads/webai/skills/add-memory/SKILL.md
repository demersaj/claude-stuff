---
name: add-memory
description: >
  Add persistent AI conversation memory to an existing webAI app — the AI remembers previous exchanges across sessions, displayed as a chat history the user can scroll and clear.
  Use this skill when the user wants their app to remember previous conversations, says "add memory", "remember chat history", "persist conversations", "show previous messages", or wants the AI to have context from prior sessions.
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Memory

Add persistent AI conversation memory to a webAI app.

## How it works

Apogee stores up to 60 conversation turns per app in IndexedDB (key: `oasis_app_history:{appId}`). When you pass `appId` to `host.request()`, turns are saved automatically — no manual append needed. On the next request, prior turns are injected as context so the AI remembers what was said.

The memory system has two controls:
- **`appId`** — scopes history to this app. Required for any persistence.
- **`memoryContext`** — controls whether history is *injected* as context. `'auto'` (default) respects the user's shell Memory toggle; `true` forces it on; `false` disables injection for that request only.
- **`chatSession`** (optional) — a string that isolates turns into separate threads. Useful for multi-conversation apps.

Saving is always automatic when `appId` is present. `memoryContext` only controls retrieval.

---

## Step 1 — Read the target file

Read the component specified (or ask). Understand how the app currently calls `streamCompletion` — the main change is adding `appId` and loading history on mount.

---

## Step 2 — Update `src/webai.js` to pass options through

If `streamCompletion` doesn't already spread `...rest` into `host.request()`, patch it now. This is the same fix as `add-persona` — without it, `appId` is silently dropped.

**Find this in `src/webai.js`:**
```javascript
export async function streamCompletion(prompt, { systemPrompt = '', maxTokens = 2048, temperature = 0.7, onToken } = {}) {
  ...
  return await host.request(prompt, { systemPrompt, maxTokens, temperature, onToken });
```

**Replace with:**
```javascript
export async function streamCompletion(prompt, { systemPrompt = '', maxTokens = 2048, temperature = 0.7, onToken, ...rest } = {}) {
  ...
  return await host.request(prompt, { systemPrompt, maxTokens, temperature, onToken, ...rest });
```

---

## Step 3 — Create `src/memory.js`

```javascript
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
```

---

## Step 4 — Wire memory into the component

### Pattern A — Persistent single-thread chat (most common)

The app remembers everything across sessions. History loads on mount, new turns auto-save on every request.

```jsx
import { loadHistory, clearHistory, getAppId, formatTurnTime } from './memory.js';
import { streamCompletion } from './webai.js';

const appId = getAppId();

// Load history on mount
const [turns, setTurns] = useState([]);
useEffect(() => {
  loadHistory(appId).then(mem => setTurns(mem.recentTurns));
}, []);

// Generate — appId causes auto-save; no manual turn management needed
const [input, setInput] = useState('');
const [isGenerating, setIsGenerating] = useState(false);

async function handleSend() {
  if (!input.trim()) return;
  const userText = input.trim();
  setInput('');

  // Optimistically add user turn to UI
  const userTurn = { role: 'user', text: userText, at: new Date().toISOString() };
  setTurns(prev => [...prev, userTurn]);

  setIsGenerating(true);
  let assistantText = '';
  const assistantTurn = { role: 'assistant', text: '', at: new Date().toISOString() };
  setTurns(prev => [...prev, assistantTurn]);

  try {
    await streamCompletion(userText, {
      appId,                      // ← enables auto-save + history context
      memoryContext: 'auto',      // respects shell memory toggle
      onToken: (token) => {
        assistantText += token;
        setTurns(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...assistantTurn, text: assistantText };
          return next;
        });
      },
    });
  } catch (e) {
    setTurns(prev => {
      const next = [...prev];
      next[next.length - 1] = { ...assistantTurn, text: `Error: ${e.message}` };
      return next;
    });
  } finally {
    setIsGenerating(false);
  }
}

async function handleClear() {
  await clearHistory(appId);
  setTurns([]);
}
```

**Render the history:**
```jsx
<div className="chat-history">
  {turns.map((turn, i) => (
    <div key={turn.turnId ?? i} className={`turn turn-${turn.role}`}>
      <span className="turn-role">{turn.role === 'user' ? 'You' : 'AI'}</span>
      <p className="turn-text">{turn.text}</p>
      <span className="turn-time">{formatTurnTime(turn.at)}</span>
    </div>
  ))}
  {isGenerating && <div className="turn turn-assistant generating">●●●</div>}
</div>

<div className="input-row">
  <textarea
    value={input}
    onChange={e => setInput(e.target.value)}
    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
    placeholder="Message..."
    disabled={isGenerating}
  />
  <button onClick={handleSend} disabled={isGenerating || !input.trim()}>Send</button>
  <button onClick={handleClear} disabled={isGenerating}>Clear history</button>
</div>
```

---

### Pattern B — Multiple independent threads

Best when the app has distinct conversations (e.g. per-document, per-task). Each thread gets its own `chatSession` string; all threads share the same 60-turn pool.

```jsx
import { loadHistory, clearHistory, filterSession, getAppId } from './memory.js';

const appId = getAppId();
const [sessionId] = useState(() => `session-${Date.now()}`); // new thread each mount
// Or persist session ID: useState(() => localStorage.getItem('sessionId') ?? `session-${Date.now()}`)

const [turns, setTurns] = useState([]);
useEffect(() => {
  loadHistory(appId).then(mem => {
    setTurns(filterSession(mem.recentTurns, sessionId));
  });
}, [sessionId]);

// Pass chatSession to scope turns
await streamCompletion(userText, {
  appId,
  chatSession: sessionId,   // turns for this thread only injected as context
  memoryContext: true,
  onToken: ...
});
```

---

### Pattern C — Memory summary display

Show the user a compact summary of what the AI remembers (turn count, last active, preferences if any).

```jsx
const [memStats, setMemStats] = useState(null);

useEffect(() => {
  loadHistory(appId).then(mem => {
    setMemStats({
      turnCount: mem.recentTurns.length,
      lastActive: mem.updatedAt,
      hasPreferences: Object.keys(mem.preferences).length > 0,
    });
  });
}, []);

// Render:
{memStats && memStats.turnCount > 0 && (
  <div className="memory-badge">
    {memStats.turnCount} turns remembered
    {memStats.lastActive && ` · last: ${formatTurnTime(memStats.lastActive)}`}
    <button onClick={handleClear}>Clear</button>
  </div>
)}
```

---

## Step 5 — Add minimal CSS

```css
.chat-history {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.turn { display: flex; flex-direction: column; gap: 4px; max-width: 80%; }
.turn-user { align-self: flex-end; align-items: flex-end; }
.turn-assistant { align-self: flex-start; }

.turn-role { font-size: 11px; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.05em; }
.turn-text {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 10px 14px;
  margin: 0;
  white-space: pre-wrap;
}
.turn-user .turn-text { background: var(--accent); color: #fff; }
.turn-time { font-size: 11px; opacity: 0.4; }

.generating { opacity: 0.5; }
```

---

## Step 6 — Rebuild

```bash
npm run build
node ../../scripts/upload.js
```

---

## Rules

- Always apply the `...rest` spread fix to `webai.js` before wiring `appId` — without it, `appId` is silently dropped and nothing is saved.
- `appId` is `null` in local dev (`__APOGEE_APP_ID__` is only injected by Apogee). `loadHistory` and `clearHistory` both guard against null and are safe no-ops in dev.
- History is always saved when `appId` is present — `memoryContext: false` only skips *injecting* prior turns as context, it doesn't stop saving the current turn.
- Optimistically update the UI (add user turn immediately, stream assistant turn in place) — don't wait for the request to finish before showing anything.
- The 60-turn limit is per app, not per session. If the app uses multiple `chatSession` values, all threads share the same pool.
- Don't call `clearHistory` without explicit user action (a button). Clearing is permanent.
