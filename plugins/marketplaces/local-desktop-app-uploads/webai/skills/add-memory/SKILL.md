---
name: add-memory
description: >
  Add persistent AI conversation memory to an existing webAI app — the AI remembers previous exchanges across sessions, displayed as a chat history the user can scroll and clear.
  Use this skill when the user wants their app to remember previous conversations, says "add memory", "remember chat history", "persist conversations", "show previous messages", or wants the AI to have context from prior sessions.
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Memory

Add persistent AI conversation memory to a webAI app using `sdk.storage`.

## How it works

Conversation history is stored in `sdk.storage` under a key scoped to the app (e.g. `chat_history`). On mount, load the history. On each exchange, append the user turn and the assistant reply, then save. Pass prior turns as `priorMessages` to `streamCompletion` so the AI has context from previous sessions.

The 60-turn limit is enforced by trimming the array before saving — oldest turns are evicted first.

---

## Step 1 — Read the target file

Read the component specified (or ask). Understand how the app currently calls `streamCompletion` — the main changes are:

1. Adding `sdk.storage` for persistence
2. Passing `priorMessages` to `streamCompletion` for context

---

## Step 2 — Check the shell manifest

Ensure `"storage"` is in `requires.managers` in `index.html`. If missing, add it:

```html
"requires": {
  "managers": ["shell", "intelligence", "storage"]
}
```

---

## Step 3 — Create `src/memory.js`

```javascript
// src/memory.js — Persistent conversation memory using sdk.storage

const STORAGE_KEY = 'chat_history';
const MAX_TURNS = 60;

const getSDK = () => window.apogeeSDK || null;

/**
 * Load conversation history from storage.
 * Returns an array of { role: 'user'|'assistant', content: string, at: string }
 * Returns [] in local dev (sdk.storage is null).
 */
export async function loadHistory() {
  const sdk = getSDK();
  if (!sdk?.storage) return [];
  const raw = await sdk.storage.get(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Save conversation history (auto-trims to MAX_TURNS).
 * Values must be strings — JSON-serialize before saving.
 */
export async function saveHistory(turns) {
  const sdk = getSDK();
  if (!sdk?.storage) return;
  await sdk.storage.set(STORAGE_KEY, JSON.stringify(turns.slice(-MAX_TURNS)));
}

/**
 * Append a user + assistant turn pair and save.
 * Call this after the assistant reply is complete.
 */
export async function appendAndSave(turns, userText, assistantText) {
  const now = new Date().toISOString();
  const next = [
    ...turns,
    { role: 'user', content: userText, at: now },
    { role: 'assistant', content: assistantText, at: now },
  ];
  await saveHistory(next);
  return next.slice(-MAX_TURNS);
}

/**
 * Clear all conversation history.
 */
export async function clearHistory() {
  const sdk = getSDK();
  if (!sdk?.storage) return;
  await sdk.storage.delete(STORAGE_KEY);
}

/**
 * Convert stored turns into the messages[] format for chatCompletionStream.
 * Trims to the most recent N turns to stay within context limits.
 */
export function toMessageContext(turns, limit = 20) {
  return turns.slice(-limit).map(t => ({ role: t.role, content: t.content }));
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

```jsx
import { loadHistory, appendAndSave, clearHistory, toMessageContext, formatTurnTime } from './memory.js';
import { streamCompletion } from './webai.js';

// Load history on mount
const [turns, setTurns] = useState([]);
useEffect(() => {
  loadHistory().then(setTurns);
}, []);

const [input, setInput] = useState('');
const [isGenerating, setIsGenerating] = useState(false);

async function handleSend() {
  if (!input.trim()) return;
  const userText = input.trim();
  setInput('');

  // Optimistically add user turn to UI
  const userTurn = { role: 'user', content: userText, at: new Date().toISOString() };
  setTurns(prev => [...prev, userTurn]);

  setIsGenerating(true);
  let assistantText = '';
  const assistantTurn = { role: 'assistant', content: '', at: new Date().toISOString() };
  setTurns(prev => [...prev, assistantTurn]);

  try {
    await streamCompletion(userText, {
      systemPrompt: 'You are a helpful assistant.',
      priorMessages: toMessageContext(turns),   // ← inject history as context
      onToken: (token) => {
        assistantText += token;
        setTurns(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...assistantTurn, content: assistantText };
          return next;
        });
      },
    });
    // Save the completed exchange
    const saved = await appendAndSave(turns, userText, assistantText);
    setTurns(saved);
  } catch (e) {
    setTurns(prev => {
      const next = [...prev];
      next[next.length - 1] = { ...assistantTurn, content: `Error: ${e.message}` };
      return next;
    });
  } finally {
    setIsGenerating(false);
  }
}

async function handleClear() {
  await clearHistory();
  setTurns([]);
}
```

**Render the history:**

```jsx
<div className="chat-history">
  {turns.map((turn, i) => (
    <div key={i} className={`turn turn-${turn.role}`}>
      <span className="turn-role">{turn.role === 'user' ? 'You' : 'AI'}</span>
      <p className="turn-text">{turn.content}</p>
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

### Pattern B — Memory stats display

Show the user a compact summary of what the AI remembers.

```jsx
const [turnCount, setTurnCount] = useState(0);
const [lastActive, setLastActive] = useState(null);

useEffect(() => {
  loadHistory().then(h => {
    setTurns(h);
    setTurnCount(h.length);
    setLastActive(h.at(-1)?.at ?? null);
  });
}, []);

{turnCount > 0 && (
  <div className="memory-badge">
    {turnCount} turns remembered
    {lastActive && ` · last: ${formatTurnTime(lastActive)}`}
    <button onClick={handleClear}>Clear</button>
  </div>
)}
```

---

## Step 5 — Styling

**If the app uses Signal Design System** (check `package.json` for `@webai/signal-ui`), use Signal components and token-backed Tailwind classes instead of raw CSS — no separate stylesheet needed. Render history with the token classes:

```jsx
import { Button, Textarea } from '@webai/signal-ui'; // use whatever Signal exports — verify in llms.txt

<div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">
  {turns.map((turn, i) => (
    <div
      key={i}
      className={`flex flex-col gap-1 max-w-[80%] ${turn.role === 'user' ? 'self-end items-end' : 'self-start'}`}
    >
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {turn.role === 'user' ? 'You' : 'AI'}
      </span>
      <p className={`rounded-md px-3.5 py-2.5 whitespace-pre-wrap ${
        turn.role === 'user'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground'
      }`}>
        {turn.content}
      </p>
      <span className="text-xs text-muted-foreground/60">{formatTurnTime(turn.at)}</span>
    </div>
  ))}
  {isGenerating && <div className="self-start opacity-50">●●●</div>}
</div>
```

Use Signal's `Button` and `Textarea` (or whatever the current `llms.txt` exports) for the input row instead of raw `<button>`/`<textarea>`.

**If the app does not use Signal** — add minimal CSS using design tokens from `@webai/signal-token` (or the app's existing custom properties):

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
  background: var(--muted, #f5f5f5);
  border-radius: var(--radius, 8px);
  padding: 10px 14px;
  margin: 0;
  white-space: pre-wrap;
}
.turn-user .turn-text { background: var(--primary, #2563eb); color: var(--primary-foreground, #fff); }
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

- Always declare `"storage"` in the manifest managers — `sdk.storage` won't be injected without it.
- `sdk.storage` is null in local dev. `loadHistory` and `clearHistory` both guard against this and are safe no-ops.
- Pass `priorMessages: toMessageContext(turns)` to `streamCompletion` — this is how context is injected. Without it, the AI won't remember previous turns.
- Only call `appendAndSave` after the assistant reply is fully complete (in the happy-path block, not the catch block). Don't save partial or error responses.
- `toMessageContext` limits history to 20 turns by default — this prevents exceeding the model's context window. Adjust the limit for long-context models.
- Don't call `clearHistory` without explicit user action (a button). Clearing is permanent.
- Optimistically update the UI (add user turn immediately, stream assistant turn in place) — don't wait for the request to finish before showing anything.
- If the app uses Signal Design System (`@webai/signal-ui` in `package.json`), use Signal components (`Button`, `Textarea`, etc. — verify names in `node_modules/@webai/signal-ui/llms.txt`) and token-backed Tailwind classes (`bg-muted`, `bg-primary`, `text-muted-foreground`). Never hardcode colors.
