---
name: create-app
description: >
  Build a complete, working webAI Apogee shell app from a plain-English description — scaffold, implement full UI and logic, build, and upload to the running shell in one shot.
  Use this skill whenever the user describes an app idea and wants it built for webAI/Apogee, says things like "build me an app that does X", "create a webAI app for Y", "make an Apogee app that Z", or wants to go from idea to deployed app without doing it step by step themselves.
  This skill does everything: picks the right APIs, writes real UI (not placeholder), builds the single-file bundle, and installs it.
argument-hint: "<description of what the app should do>"
allowed-tools: Bash, Read, Write, Glob
---

# webAI Create App

Turn a plain-English idea into a fully-working Apogee shell app — scaffolded, implemented, built, and uploaded — in one workflow.

## Step 1 — Understand the idea

Parse the argument (or ask if missing). Figure out:
- **What the app does** — the core loop a user would go through
- **Which shell APIs it needs** (see API reference below) — most apps need AI; some need collab or identity too
- **App name** — derive a short `kebab-case` slug (e.g. "Pomodoro Coach" → `pomodoro-coach`)
- **Display name** — the human-readable title shown in the Apogee launcher

If the description is vague (fewer than ~10 words), ask one clarifying question before proceeding. Otherwise, proceed directly — don't ask unnecessary questions.

## Step 2 — Scaffold

Apps live in `apps/<app-name>/` relative to the repo root. Scaffold there:

```bash
cd apps
npm create vite@latest <app-name> -- --template react
cd <app-name>
npm install
npm install --save-dev vite-plugin-singlefile
```

Patch `vite.config.js` to this exact config (non-negotiable for Apogee compatibility):

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
```

Patch `package.json` — set `"type": "module"` and `"description"` to the display name:

```json
{
  "name": "<app-name>",
  "description": "<Display Name>",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "upload": "node ../../scripts/upload.js"
  }
}
```

## Step 3 — Write `src/webai.js`

This is the integration layer between the app and the shell. Always create it — it makes API access safe in both Apogee (prod) and local dev (where all shell globals are null).

```javascript
// src/webai.js — webAI Apogee shell integration helpers

const getShellAPI = (name) => window[name] ?? window.parent?.[name] ?? null;

export const getOasisHost = () => getShellAPI('OasisHost');
export const getApogeeShell = () => getShellAPI('ApogeeShell');
export const getCollaborationManager = () => getShellAPI('CollaborationManager');
export const getUserIdentityManager = () => getShellAPI('UserIdentityManager');

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
```

Only export additional helpers (collaboration, identity) if the app actually needs them.

## Step 4 — Implement the app

Replace the boilerplate `src/App.jsx` with a **real, working implementation** based on the description. This is the most important step — the goal is that when the user refreshes Apogee, they see a functional app, not a skeleton.

### Every app must have

**Header** — a thin bar at the top with:
- App title (left)
- AI status badge: a small colored dot + label (`● ready` / `◌ loading…` / `○ waiting`) driven by polling `getOasisState()` every 1200ms
- Back button (right): `← Launcher` that calls `goToLauncher()`

**Shell-aware dev mode notice** — when `getOasisHost()` returns null, show a subtle banner: `"Running outside Apogee — AI features disabled"`. This lets the app work on `npm run dev` without crashing.

**Oasis state polling** — always wire this up, even if AI isn't immediately visible in the UI, so the status badge works:

```jsx
const [oasisState, setOasisState] = useState('waiting');
useEffect(() => {
  const id = setInterval(() => setOasisState(getOasisState()), 1200);
  setOasisState(getOasisState());
  return () => clearInterval(id);
}, []);
```

### AI streaming pattern

For any AI generation, stream tokens into state as they arrive so the UI feels responsive:

```jsx
const [output, setOutput] = useState('');
const [isGenerating, setIsGenerating] = useState(false);

async function generate(prompt) {
  setIsGenerating(true);
  setOutput('');
  try {
    await streamCompletion(prompt, {
      systemPrompt: 'You are a helpful assistant.',
      onToken: (token) => setOutput(prev => prev + token),
    });
  } catch (e) {
    setOutput(`Error: ${e.message}`);
  } finally {
    setIsGenerating(false);
  }
}
```

### CSS approach

Inline a `<style>` block or use a separate `src/App.css` with CSS custom properties. Dark mode support is expected — use `@media (prefers-color-scheme: dark)` or a data attribute toggle. Keep it clean and minimal; Apogee apps run in a constrained iframe.

```css
:root {
  --bg: #ffffff;
  --surface: #f5f5f5;
  --text: #111111;
  --accent: #2563eb;
  --radius: 8px;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0f0f0f; --surface: #1a1a1a; --text: #f0f0f0; }
}
```

### Build for the description

Think about what the user actually wants to do in this app. Don't just add a text input and a submit button and call it done. Structure the UI around the actual task:
- A **Pomodoro timer** needs a prominent countdown, start/stop/reset, session counter, and an AI "coach" panel for encouragement
- A **Kanban board** needs columns, draggable cards, an add-card flow, and an AI suggestion per card
- A **Writing assistant** needs an editor area, a prompt form, and a streaming response panel beside it
- A **Flashcard app** needs card display, flip animation, difficulty rating, and an AI "explain this" button

Implement the core loop fully. It's fine to stub out secondary features with a TODO comment, but the primary value of the app must work end to end.

## Step 5 — Build

```bash
npm run build
```

Verify `dist/index.html` exists and is a single self-contained file (no external URLs in script/link tags). If the build fails, read the error, fix it, and rebuild — don't give up after one failure.

Show the file size: `du -sh dist/index.html`. Warn the user if it's over 5 MB.

## Step 6 — Upload

```bash
node ../../scripts/upload.js
```

The script POSTs to `http://127.0.0.1:44280/install` (Tauri local server). If the Tauri app is running, the app installs directly. If not, it prints a DevTools paste script.

## Step 7 — Report

```
✅ Built: dist/index.html (XXX KB)
✅ "<Display Name>" uploaded to Apogee.

Refresh the Apogee launcher to see your app.

Dev server (for local iteration):
  cd apps/<app-name>
  npm run dev

To rebuild and re-upload after changes:
  /webai:build-upload
```

---

## Shell API reference

| API | Access | Use for |
|-----|--------|---------|
| `OasisHost` | `getOasisHost()` | AI inference, streaming |
| `ApogeeShell` | `getApogeeShell()` | Navigation between views |
| `CollaborationManager` | `getCollaborationManager()` | P2P rooms, CRDT, real-time sync |
| `UserIdentityManager` | `getUserIdentityManager()` | User display name, avatar, ODID |

Only import and use the APIs the app actually needs. If the description says nothing about collaboration or identity, don't wire those in.

### CollaborationManager quick reference (only if needed)
```javascript
const collab = getCollaborationManager();
const room = await collab.createRoom('my-room-name');    // returns { roomId, joinCode }
await collab.joinRoom(joinCode);
collab.onMessage((roomId, data) => { /* handle */ });
await collab.sendMessage(roomId, { type: 'update', payload });
```

### UserIdentityManager quick reference (only if needed)
```javascript
const identity = getUserIdentityManager();
const me = await identity.getOrCreateIdentity();  // { displayName, avatarUrl, odid }
```

---

## Common mistakes to avoid

- **Placeholder UI**: Don't ship `<h1>Welcome to {name}</h1>` with a text area and submit button as the whole app. Build the actual thing.
- **Missing release()**: Always call `release()` in a `finally` block after `host.acquire()`, or you'll lock the AI runtime.
- **Assuming shell APIs exist**: Always use `getOasisHost()` etc. from `webai.js` — never access `window.OasisHost` directly. The null-safety matters for local dev.
- **External dependencies at runtime**: The built `dist/index.html` must be fully self-contained. No CDN links, no relative asset paths. `vite-plugin-singlefile` handles this if configured correctly.
- **Forgetting `"description"` in package.json**: The Apogee launcher uses this as the app's display name. Don't leave it as the default.
