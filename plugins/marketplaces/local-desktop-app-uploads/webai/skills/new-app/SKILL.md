---
name: new-app
description: >
  Scaffold a new React or Vue app for the webAI Apogee shell — or build a complete, working app from a plain-English description, scaffolded, implemented, built, and uploaded in one shot.
  Use this skill when the user wants to scaffold a new webAI app, or when they describe an app idea and want it built ("build me an app that does X", "create a webAI app for Y", "make an Apogee app that Z").
argument-hint: "<app-name> [react|vue] [--description \"What this app does\"]  OR  \"<plain-English description of what to build\""
allowed-tools: Bash, Read, Write, Glob
---

# webAI New App

Scaffold — or fully build and deploy — a webAI Apogee shell app.

## Two modes

**Scaffold mode** — user provides an explicit app name:
> `/webai:new-app <app-name> [react|vue] [--description "..."]`
> Scaffolds the project. If `--description` is given, implements a real starting UI. Does not auto-upload.

**Create mode** — user provides only a plain-English description:
> `/webai:new-app "A Pomodoro timer with AI coaching"`
> Derives the app name, scaffolds, implements a fully working app, builds, and uploads in one shot.

Parse the argument to determine which mode applies. If neither an app name nor a description is clear, ask one question before proceeding. If in create mode and the description is vague (fewer than ~10 words), ask one clarifying question before proceeding.

---

## Step 1 — Parse & plan

Determine:
- **Mode** — scaffold (explicit name) or create (plain description)
- **App name** — explicit (`<app-name>`) or derived from description (e.g. "Pomodoro Coach" → `pomodoro-coach`)
- **Display name** — human-readable title shown in the Apogee launcher
- **Framework** — `react` (default) or `vue`; ask if not specified and the user hasn't implied one
- **Description** — what the app does; drives implementation in Step 6
- **Which SDK APIs are needed** — most apps need `intelligence`; some need `storage`, `room`, `personas`, `identity`

---

## Step 2 — Scaffold

Apps live in `apps/<app-name>/`. Scaffold there:

**For React:**
```bash
cd apps
npm create vite@latest <app-name> -- --template react
cd <app-name>
npm install
npm install --save-dev vite-plugin-singlefile
```

**For Vue:**
```bash
cd apps
npm create vite@latest <app-name> -- --template vue
cd <app-name>
npm install
npm install --save-dev vite-plugin-singlefile
```

---

## Step 3 — Patch `vite.config.js`

Non-negotiable for Apogee compatibility:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // or vue
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

---

## Step 4 — Patch `package.json`

Set `"type": "module"`, `"description"`, and scripts:

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

---

## Step 5 — Add shell manifest to `index.html`

The Apogee shell parses this before injecting the SDK. Insert as the first `<script>` in `<head>`:

```html
<script id="apogee-shell-manifest" type="application/apogee-shell-manifest+json" data-apogee-shell-manifest>
{
  "schemaVersion": 1,
  "name": "<Display Name>",
  "version": "1.0.0",
  "provides": { "hasOwnRouting": true },
  "requires": {
    "managers": ["shell", "intelligence"]
  }
}
</script>
```

Add only the managers the app actually uses. Common additions: `"storage"` (persistence), `"room"` (collaboration), `"personas"` (persona support), `"identity"` (user info), `"theme"` (dark/light).

---

## Step 6 — Create `src/webai.js`

This is the integration layer. Always create it — never access `window.apogeeSDK` directly in components.

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

/** Subscribe to intelligence state changes. Returns unsubscribe fn. */
export function onIntelligenceChange(handler) {
  const sdk = getSDK();
  if (!sdk?.intelligence) return () => {};
  return sdk.intelligence.subscribe(handler);
}

/** Stream a completion. onToken(delta) called for each token. Returns full text. */
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

Only add additional exports (storage, room, identity) if the app actually uses them.

---

## Step 7 — Implement `src/App.jsx` / `src/App.vue`

Replace boilerplate with a webAI-ready implementation.

### Every app must have

**Header** — a thin bar at the top with:
- App title (left)
- AI status badge: `● ready` / `◌ loading…` / `○ waiting` driven by `onIntelligenceChange`
- Back button (right): `← Launcher` calling `goToLauncher()`

**SDK dev mode notice** — when `getSDK()` returns null, show a subtle banner: `"Running outside Apogee — AI features disabled"`.

**Intelligence state subscription** (subscribe, not polling):

```jsx
const [intelligenceState, setIntelligenceState] = useState('waiting');
useEffect(() => {
  setIntelligenceState(getIntelligenceState());
  return onIntelligenceChange(() => setIntelligenceState(getIntelligenceState()));
}, []);
```

### If a description was provided — build the real thing

Think about what the user actually wants to do in this app. Structure the UI around the actual task:
- A **Pomodoro timer** needs a prominent countdown, start/stop/reset, session counter, and an AI coach panel
- A **Kanban board** needs columns, draggable cards, an add-card flow, and AI suggestions per card
- A **Writing assistant** needs an editor area, a prompt form, and a streaming response panel

Implement the core loop fully. Stub secondary features with a TODO comment, but the primary value must work end to end.

### If no description — use a minimal placeholder

A minimal content area is fine. The user will fill it in later.

### AI streaming pattern

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

Use CSS custom properties and support both themes via the `data-theme` attribute (Apogee sets this on `<html>`):

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

---

## Step 8 — Build (create mode always; scaffold mode optional)

```bash
npm run build
```

Verify `dist/index.html` exists and is a single self-contained file. If the build fails, read the error, fix it, and rebuild. Show file size: `du -sh dist/index.html`. Warn if over 5 MB.

---

## Step 9 — Upload (create mode only)

```bash
node ../../scripts/upload.js
```

The script POSTs to `http://127.0.0.1:44280/install` (Tauri local server). If the Tauri app is running, the app installs directly. If not, it prints a DevTools paste script.

---

## Step 10 — Report

**Scaffold mode:**
```
✅ Scaffolded <app-name> (<framework>)

Next steps:
  cd apps/<app-name>
  npm run dev          # local dev server
  npm run build        # build single-file HTML

When ready to upload to Apogee:
  /webai:build-upload
```

**Create mode:**
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

Only import and use the APIs the app actually needs.

### Storage quick reference

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

- **Placeholder UI**: Don't ship `<h1>Welcome to {name}</h1>` with a text area and submit button as the whole app when a description was given. Build the actual thing.
- **Missing manifest**: Every app needs `<script type="application/apogee-shell-manifest+json">` — without it, the SDK may not inject the managers you need.
- **Using old window globals**: Never access `window.OasisHost`, `window.ApogeeShell`, or `window.CollaborationManager` directly. The current API is `window.apogeeSDK`. Always use `getSDK()` from `webai.js`.
- **External dependencies at runtime**: The built `dist/index.html` must be fully self-contained. No CDN links, no relative asset paths. `vite-plugin-singlefile` handles this if configured correctly.
- **Forgetting `"description"` in package.json**: The Apogee launcher uses this as the app's display name. Don't leave it as the default.
- **Forgetting to declare managers**: If `"storage"` isn't listed in the manifest, `sdk.storage` won't be available at runtime even though `sdk` exists.
- **Polling instead of subscribing**: Never call `getIntelligenceState()` on an interval. Use `onIntelligenceChange` to subscribe and update state reactively.
- **Hardcoding app IDs**: Derive from `package.json` name.
