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
- **Which SDK APIs it needs** (see API reference below) — most apps need `intelligence`; some need `storage`, `room`, `personas`, or `identity`
- **App name** — derive a short `kebab-case` slug (e.g. "Pomodoro Coach" → `pomodoro-coach`)
- **Display name** — the human-readable title shown in the Apogee launcher

If the description is vague (fewer than ~10 words), ask one clarifying question before proceeding. Otherwise, proceed directly.

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

## Step 3 — Replace `src/index.css`

The Vite scaffold generates an `index.css` that breaks Apogee apps — it sets `#root { width: 1126px; text-align: center }` and conflicting CSS custom properties. Always overwrite it immediately after scaffolding:

```css
*, *::before, *::after { box-sizing: border-box; }

html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}
```

This ensures `height: 100vh` on the app root works correctly and the Vite scaffold's `--bg`, `--accent`, `--border` variables don't override the app's own design tokens.

## Step 4 — Write `src/webai.js`

This is the integration layer. Always create it — it provides null-safe access for both Apogee and local dev.

```javascript
// src/webai.js — webAI Apogee SDK integration helpers

export const getSDK = () => window.apogeeSDK || null;

/** Returns 'ready' | 'loading' | 'waiting' */
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
 * Stream a chat completion. onToken(delta) is called for each token.
 * Returns the full accumulated text.
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
    model, messages, max_tokens: maxTokens, temperature, ...rest
  });
  for await (const chunk of stream) {
    if (chunk.delta) {
      fullText += chunk.delta;
      onToken?.(chunk.delta);
    }
  }
  return fullText;
}

/** Cancel any in-progress generation. */
export function cancelGeneration() {
  getSDK()?.intelligence?.cancelGeneration?.();
}

/** Navigate back to the Apogee launcher. */
export function goToLauncher() {
  const sdk = getSDK();
  if (sdk?.shell?.setView) sdk.shell.setView('launcher');
  else window.parent?.postMessage({ type: 'backToLauncher' }, '*');
}
```

Only add additional exports (storage, room, identity) if the app actually needs them.

## Step 5 — Add the shell manifest and theme bootstrap to `index.html`

Replace the entire contents of `index.html` with the following (do not keep the Vite scaffold default):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><Display Name></title>
    <script id="apogee-shell-manifest" type="application/apogee-shell-manifest+json" data-apogee-shell-manifest>
{
  "schemaVersion": 1,
  "name": "<Display Name>",
  "description": "<short description>",
  "author": "webAI",
  "version": "1.0.0",
  "minPlatformApiLevel": 2,
  "provides": { "hasOwnRouting": true },
  "requires": {
    "managers": ["shell", "intelligence"]
  }
}
    </script>
    <script>
      (function () {
        try {
          var parentTheme = null;
          if (window.parent && window.parent !== window && window.parent.document) {
            parentTheme = window.parent.document.documentElement.getAttribute("data-theme");
          }
          var resolved =
            parentTheme === "light" || parentTheme === "dark"
              ? parentTheme
              : window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
              ? "light"
              : "dark";
          document.documentElement.setAttribute("data-theme", resolved);
          document.documentElement.style.colorScheme = resolved;
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Critical requirements for the manifest — all four are required or the app will fail to load in the Tauri shell:**
- `data-apogee-shell-manifest` attribute on the `<script>` tag (not just `id`)
- `"minPlatformApiLevel": 2` — tells the shell to use the API level 2 sandbox mode that allows SDK injection; without this the shell creates a sandboxed iframe it cannot access, causing a `preview_setup_window_error` at preboot
- `"description"` and `"author"` fields in the JSON
- The `id="apogee-shell-manifest"` attribute

Add only the managers the app actually uses. Common additions: `"storage"` (persistence), `"room"` (collaboration), `"personas"` (persona support), `"identity"` (user info).

## Step 6 — Implement the app

Replace the boilerplate `src/App.jsx` with a **real, working implementation** based on the description. This is the most important step — the goal is that when the user refreshes Apogee, they see a functional app, not a skeleton.

### Every app must have

**Header** — a thin bar at the top with:

- App title (left)
- AI status badge: a small colored dot + label (`● ready` / `◌ loading…` / `○ waiting`) driven by subscribing to `onIntelligenceChange`
- Back button (right): `← Launcher` that calls `goToLauncher()`

**SDK dev mode notice** — when `getSDK()` returns null, show a subtle banner: `"Running outside Apogee — AI features disabled"`. This lets the app work on `npm run dev` without crashing.

**Intelligence state polling** — always wire this up so the status badge works. Use polling, not `subscribe()` — `subscribe` triggers an SDK relay call that times out if the intelligence manager isn't ready yet:

```jsx
const [intelligenceState, setIntelligenceState] = useState('waiting');
useEffect(() => {
  setIntelligenceState(getIntelligenceState());
  const id = setInterval(() => setIntelligenceState(getIntelligenceState()), 1000);
  return () => clearInterval(id);
}, []);
```

### AI streaming pattern

For any AI generation, stream tokens into state as they arrive:

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

Inline a `<style>` block or use a separate `src/App.css` with CSS custom properties. Always support both themes using the `data-theme` attribute (Apogee sets this on `<html>`):

```css
:root {
  --bg: #ffffff;
  --surface: #f5f5f5;
  --text: #111111;
  --accent: #2563eb;
  --radius: 8px;
}
[data-theme="dark"] {
  --bg: #181818;
  --surface: #262626;
  --text: #fafafa;
}
```

### Build for the description

Think about what the user actually wants to do in this app. Don't just add a text input and a submit button and call it done. Structure the UI around the actual task:

- A **Pomodoro timer** needs a prominent countdown, start/stop/reset, session counter, and an AI "coach" panel for encouragement
- A **Kanban board** needs columns, draggable cards, an add-card flow, and an AI suggestion per card
- A **Writing assistant** needs an editor area, a prompt form, and a streaming response panel beside it

Implement the core loop fully. Stub secondary features with a TODO comment, but the primary value of the app must work end to end.

## Step 7 — Build

```bash
npm run build
```

Verify `dist/index.html` exists and is a single self-contained file. If the build fails, read the error, fix it, and rebuild.

Show the file size: `du -sh dist/index.html`. Warn the user if it's over 5 MB.

## Step 8 — Upload

```bash
node ../../scripts/upload.js
```

The script POSTs to `http://127.0.0.1:44280/install` (Tauri local server). If the Tauri app is running, the app installs directly. If not, it prints a DevTools paste script.

## Step 9 — Report

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

| API | Access | Manager | Use for |
|-----|--------|---------|---------|
| AI inference | `sdk.intelligence` | `intelligence` | Chat, streaming, state |
| App storage | `sdk.storage` | `storage` | Persistent key/value data |
| Navigation | `sdk.shell` | `shell` | Views, launcher, apps |
| Collaboration | `sdk.room` | `room` | P2P rooms, user presence |
| Personas | `sdk.personas` | `personas` | AI persona selection |
| Identity | `sdk.identity` | `identity` | User profile, auth |
| Theme | `sdk.theme` | `theme` | Dark/light mode |
| Messaging | `sdk.messaging` | `messaging` | Conversations, AI threads |

Only import and use the APIs the app actually needs. If the description says nothing about collaboration or identity, don't wire those in.

### Storage quick reference (for state persistence)

Values must be strings — JSON-serialize objects before saving.

```javascript
const sdk = getSDK();
if (sdk) {
  await sdk.storage.set('my-key', JSON.stringify({ data: 'value' }));
  const raw = await sdk.storage.get('my-key');   // string | null
  const obj = raw ? JSON.parse(raw) : null;
  await sdk.storage.delete('my-key');
  const keys = await sdk.storage.list();          // string[]
}
```

### Room quick reference (only if collaboration needed)

```javascript
import { getSDK } from './webai.js';
const sdk = getSDK();
const roomCode = await sdk.room.host({ userName: 'Alice' });
await sdk.room.join({ roomCode, userName: 'Bob' });
sdk.room.disconnect();
const unsub = sdk.room.subscribe((event) => { /* handle state change */ });
```

### Identity quick reference (only if needed)

```javascript
const sdk = getSDK();
const user = sdk?.identity?.getState?.(); // { displayName, peerId, odid }
```

---

## Common mistakes to avoid

- **Placeholder UI**: Don't ship `<h1>Welcome to {name}</h1>` with a text area and submit button as the whole app. Build the actual thing.
- **Incomplete manifest**: The manifest `<script>` tag MUST have `data-apogee-shell-manifest` attribute AND the JSON must include `"minPlatformApiLevel": 2`. Missing either causes `preview_setup_window_error` at preboot and a sandbox access violation — the shell creates an iframe it cannot inject the SDK into.
- **Not replacing `src/index.css`**: The Vite scaffold's `index.css` sets `#root { width: 1126px; text-align: center }` and overrides CSS custom properties (`--bg`, `--accent`, etc.). Always replace it with the minimal reset from Step 3.
- **Using old window globals**: Never access `window.OasisHost`, `window.ApogeeShell`, or `window.CollaborationManager` directly. The current API is `window.apogeeSDK`. Always use `getSDK()` from `webai.js`.
- **External dependencies at runtime**: The built `dist/index.html` must be fully self-contained. No CDN links, no relative asset paths. `vite-plugin-singlefile` handles this if configured correctly.
- **Forgetting `"description"` in package.json**: The Apogee launcher uses this as the app's display name. Don't leave it as the default.
- **Forgetting to declare managers**: If `"storage"` isn't listed in the manifest, `sdk.storage` won't be available at runtime even though `sdk` exists.
