---
name: webai-app
description: webAI Apogee shell app architecture and APIs. Reference for building single-file React/Vue apps that run inside the Apogee iframe with SDK intelligence, storage, room, personas, identity, and shell APIs.
---

# webAI App Skill

## Overview

webAI (Apogee shell) apps are **single HTML files** uploaded and run inside an iframe. The shell injects `window.apogeeSDK` — a frozen bridge object — so your app can call AI inference, storage, navigation, collaboration, personas, and identity APIs.

## Critical constraints

- **Output must be a single self-contained HTML file.** No external asset dependencies at runtime.
- All JS and CSS must be inlined or bundled into the HTML file.
- No server-side runtime — everything runs client-side.
- For React/Vue: use a bundler (Vite) to produce a single `dist/index.html` with all assets inlined. Use `vite-plugin-singlefile`.

## Shell manifest (required)

Every app must declare a `<script type="application/apogee-shell-manifest+json">` block. The shell reads it before injecting the SDK. Declare only the managers the app actually uses.

```html
<script type="application/apogee-shell-manifest+json" id="apogee-shell-manifest">
{
  "schemaVersion": 1,
  "name": "My App",
  "version": "1.0.0",
  "provides": { "hasOwnRouting": true },
  "requires": {
    "managers": ["shell", "intelligence"]
  }
}
</script>
```

Available managers: `shell`, `identity`, `crypto`, `theme`, `files`, `people`, `messaging`, `notifications`, `profile`, `contentIndex`, `searchIndex`, `intelligence`, `windows`, `apps`, `storage`, `flags`, `liminal`, `settings`, `context`, `browser`, `idn`, `viewOrchestration`, `interfaces`, `interfaceAdmin`, `room`, `canvas`, `personas`

Only list what you use — unlisted managers won't be injected.

## SDK access pattern

```javascript
const sdk = window.apogeeSDK || null;
// sdk is null in standalone file preview / local dev — always guard
if (!sdk) { /* show dev-mode notice */ }
```

Platform metadata (always available, no SDK needed):
```javascript
const platform = window.__APOGEE_PLATFORM;
// platform.apiLevel, platform.syncProtocol
```

## `src/webai.js` — canonical integration layer

Always create this file. It provides null-safe access for both Apogee (prod) and local dev.

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
 * Subscribe to intelligence state changes.
 * Returns an unsubscribe function — call it on unmount.
 */
export function onIntelligenceChange(handler) {
  const sdk = getSDK();
  if (!sdk) return () => {};
  return sdk.intelligence.subscribe(handler);
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

## AI inference — `sdk.intelligence`

```javascript
// Non-streaming (awaits full response)
const result = await sdk.intelligence.chatCompletion({
  model: 'auto',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  max_tokens: 512,
  temperature: 0.7,
});
// result: { content, usage: { prompt_tokens, completion_tokens }, model, backend_id }

// Streaming (AsyncGenerator)
const stream = sdk.intelligence.chatCompletionStream({
  model: 'auto',
  messages: [...],
  max_tokens: 2048,
});
for await (const chunk of stream) {
  // chunk: { delta: string, finish_reason?: string | null }
  process(chunk.delta);
}

// Check availability
const ready = sdk.intelligence.isAvailable(); // boolean

// Get detailed state
const s = sdk.intelligence.getState();
// s: { isModelLoaded, loadingModel, isGenerating, lastModel, backend, hasRuntime, ... }

// List available backends
const backends = await sdk.intelligence.listBackends();

// Cancel in-progress generation
sdk.intelligence.cancelGeneration?.();

// Subscribe to state changes (returns unsubscribe fn)
const unsub = sdk.intelligence.subscribe(() => { /* re-check getState() */ });
```

## AI streaming pattern in React

```jsx
const [output, setOutput] = useState('');
const [isGenerating, setIsGenerating] = useState(false);
const [intelligenceState, setIntelligenceState] = useState('waiting');

// Subscribe to intelligence state (replaces polling)
useEffect(() => {
  setIntelligenceState(getIntelligenceState());
  const unsub = onIntelligenceChange(() => setIntelligenceState(getIntelligenceState()));
  return unsub;
}, []);

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

## Storage — `sdk.storage`

App-scoped key/value store. Requires `"storage"` in the manifest managers. Values are strings — JSON-serialize objects yourself.

```javascript
// All async
const val  = await sdk.storage.get('key');           // string | null
await sdk.storage.set('key', JSON.stringify(obj));   // value must be a string
await sdk.storage.delete('key');
const keys = await sdk.storage.list();               // string[]
```

## Navigation — `sdk.shell`

```javascript
sdk.shell.setView('launcher');        // go to launcher
sdk.shell.getView();                  // current view id
sdk.shell.listApps();                 // all installed apps
sdk.shell.listFavorites();            // favorited apps
sdk.shell.toggleFavorite(appId);
sdk.shell.isFavorite(appId);          // boolean
sdk.shell.listRecents();
sdk.shell.subscribe(handler);         // returns unsubscribe fn
```

## Room / Collaboration — `sdk.room`

Requires `"room"` in the manifest managers.

```javascript
// Host a new room (returns roomCode string | null)
const roomCode = await sdk.room.host({ userName: 'Alice', options: {} });

// Join an existing room
await sdk.room.join({ roomCode, userName: 'Bob', password: '', hostPeerId: '' });

// Disconnect
sdk.room.disconnect();

// Read state
const state = sdk.room.getState();          // ApogeeRoomState
const users = sdk.room.getUsers?.() ?? [];
const publicRooms = sdk.room.listPublicRooms();
// [{ roomCode, roomName, userCount, isPublic, requiresPassword }]

// Chat
sdk.room.sendChatMessage?.('Hello everyone');

// Subscribe to events (returns unsubscribe fn)
const unsub = sdk.room.subscribe((event) => {
  // event.type: 'connected' | 'disconnected' | 'state' | ...
  // event.data: ApogeeRoomState
});
```

## Personas — `sdk.personas`

Requires `"personas"` in the manifest managers.

```javascript
// List all installed personas
const list = sdk.personas.listPersonas();
// [{ id, name, description, specialties: string[] }]

// Get the currently active persona
const active = sdk.personas.getActivePersona(); // { id, name } | null

// Set active persona by ID
sdk.personas.setActive(personaId);  // returns boolean

// Permission-based access (for specialty routing)
const granted = await sdk.personas.requestAccess?.(appId, 'coding');
const permissions = sdk.personas.getPermissions?.(appId);
// { coding: { id, name, type }, writing: { id, name, type } }
await sdk.personas.removePermission?.(appId, 'coding');

// Subscribe to persona changes (returns unsubscribe fn)
const unsub = sdk.personas.subscribe(handler);

// Get active persona from the intelligence domain (no permission needed)
const persona = sdk.intelligence.getActivePersona(appId); // { id, name } | null
```

## Identity — `sdk.identity`

Requires `"identity"` in the manifest managers.

```javascript
const state = await sdk.identity.getState();  // async
// { displayName, peerId, odid, profileImage, ... }

const authenticated = sdk.identity.isAuthenticated(); // boolean
const token = sdk.identity.getAccessToken();

// Subscribe to identity changes (returns unsubscribe fn)
const unsub = sdk.identity.subscribe(() => loadIdentity());
```

## Theme — `sdk.theme`

Requires `"theme"` in the manifest managers.

```javascript
const theme = sdk.theme.getState();   // 'dark' | 'light'
const isDark = sdk.theme.isDark();    // boolean
sdk.theme.setTheme('dark');

// Subscribe (returns unsubscribe fn)
const unsub = sdk.theme.subscribe(() => applyTheme(sdk.theme.getState()));
```

## Crypto — `sdk.crypto`

Requires `"crypto"` in the manifest managers.

```javascript
const encrypted = await sdk.crypto.encrypt(plaintext, recipientPublicKeyJwk);
const decrypted = await sdk.crypto.decrypt(encryptedBase64, privateKeyJwk);
```

## People — `sdk.people`

Requires `"people"` in the manifest managers.

```javascript
const contacts = sdk.people.listContacts();
const presence = sdk.people.getPresence(peerId);
```

## Files — `sdk.files`

Requires `"files"` in the manifest managers.

```javascript
const files = sdk.files.listFolder(folderId);
const content = await sdk.files.readFile(fileId);
await sdk.files.writeFile(folderId, 'name.txt', content);
```

## Notifications — `sdk.notifications`

Requires `"notifications"` in the manifest managers.

```javascript
sdk.notifications.push({ title: 'Done', body: 'Task completed' });
const feed = sdk.notifications.listFeed();
```

## Canvas — `sdk.canvas`

Requires `"canvas"` in the manifest managers. Persistent shared state for project-scoped apps.

```javascript
const state = sdk.canvas.getAppState(appId, projectId);
sdk.canvas.updateAppState(appId, partialState, projectId);
const unsub = sdk.canvas.subscribeAppState(appId, fn, projectId);
```

## Context — `sdk.context`

Requires `"context"` in the manifest managers. Injects personalized user context into AI prompts — the easiest way to make the AI aware of who the user is without managing that data yourself.

```javascript
// Get the context policy (what the user has opted in to sharing)
const policy = sdk.context.getContextPolicy();

// Get a ready-to-inject context pack for AI prompts
// Returns a structured object with relevant signals about the user's environment
const pack = await sdk.context.getContextPack();
// pack: { summary?: string, signals?: object[], ... }

// Inject into a streamCompletion call:
const ctx = await sdk.context.getContextPack();
await streamCompletion(prompt, {
  systemPrompt: `You are a helpful assistant.\n\nUser context:\n${ctx?.summary ?? ''}`,
  onToken,
});

// Subscribe to policy changes (returns unsubscribe fn)
const unsub = sdk.context.subscribe(() => refreshPolicy());
```

## Profile — `sdk.profile`

Requires `"profile"` in the manifest managers. Read user profiles, navigate to profile views, and subscribe to profile changes.

```javascript
// Get the current user's own profile state
const profile = sdk.profile.getState();
// profile: { odid, displayName, bio, sections, ... }

// Get another user's profile by their odid
const other = sdk.profile.getProfile(odid);

// Navigate the shell to show a profile
sdk.profile.openProfile(odid);

// Update the current user's header fields
sdk.profile.setHeader({ displayName: 'New Name', bio: 'Short bio' });

// Update activity/status
sdk.profile.setActivity({ status: 'Building something cool' });

// Subscribe to profile state changes (returns unsubscribe fn)
const unsub = sdk.profile.subscribe(() => reload());
```

## Feature Flags — `sdk.flags`

Requires `"flags"` in the manifest managers. Read and toggle shell feature flags at runtime.

```javascript
// Check if a flag is enabled
const enabled = sdk.flags.isEnabled('my-feature');

// Get the full flag state map
const all = sdk.flags.getState();
// all: { [flagKey: string]: boolean }

// Enable or disable a flag
sdk.flags.setEnabled('my-feature', true);

// Subscribe to flag changes (returns unsubscribe fn)
const unsub = sdk.flags.subscribe(() => checkFlags());
```

## Browser — `sdk.browser`

Requires `"browser"` in the manifest managers. Open, navigate, and manage browser tabs within the Apogee shell.

```javascript
// Open a new browser tab (returns tab id)
const tabId = await sdk.browser.createTab('https://example.com');

// Navigate an existing tab
await sdk.browser.navigateTo(tabId, 'https://other.com');

// Browser history
const history = sdk.browser.listHistory();
sdk.browser.recordHistory('https://example.com', 'Example Site');

// Tab lifecycle
await sdk.browser.focusTab(tabId);
await sdk.browser.closeTab(tabId);
await sdk.browser.goBack(tabId);

// Subscribe to tab state changes (returns unsubscribe fn)
const unsub = sdk.browser.subscribe(() => refreshTabs());
```

## Messaging — `sdk.messaging`

Requires `"messaging"` in the manifest managers. Full conversation management including AI threads.

```javascript
const convos = sdk.messaging.listConversations();
const messages = sdk.messaging.listMessages(convoId);
await sdk.messaging.send(convoId, 'Hello');

// AI message with streaming
const result = await sdk.messaging.sendAi(convoId, prompt, {
  stream: true,
  onToken: (token) => process(token),
  systemPrompt: '...',
  model: 'auto',
  webSearch: false,
});
// result: { content, citations?, model?, backendId? }

// Create a new conversation
const convo = await sdk.messaging.create([], { name: 'My Chat' });
await sdk.messaging.delete(convoId);
const unsub = sdk.messaging.subscribe(handler);
```

## Vite config for single-file output (required)

```javascript
// vite.config.js
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

## Getting the selected model

```javascript
const state   = sdk.intelligence.getState();
const modelId = state?.selectedModel || 'auto';  // use 'auto' as fallback
```

## API summary table

| API | Access | Manager required | Use for |
|-----|--------|-----------------|---------|
| AI inference | `sdk.intelligence` | `intelligence` | Chat, streaming, state |
| App storage | `sdk.storage` | `storage` | Persistent key/value data |
| Navigation | `sdk.shell` | `shell` | Views, launcher, apps |
| Collaboration | `sdk.room` | `room` | P2P rooms, user presence |
| Personas | `sdk.personas` | `personas` | AI persona selection |
| Identity | `sdk.identity` | `identity` | User profile, auth |
| Theme | `sdk.theme` | `theme` | Dark/light mode |
| Crypto | `sdk.crypto` | `crypto` | E2E encryption |
| Messaging | `sdk.messaging` | `messaging` | Conversations, AI threads |
| People | `sdk.people` | `people` | Contacts, presence |
| Files | `sdk.files` | `files` | File read/write |
| Notifications | `sdk.notifications` | `notifications` | Push, feed |
| Canvas | `sdk.canvas` | `canvas` | Project-scoped shared state |
| Context | `sdk.context` | `context` | Inject user context into AI prompts |
| Profile | `sdk.profile` | `profile` | Read/display/navigate user profiles |
| Feature flags | `sdk.flags` | `flags` | Runtime feature flag reads and toggles |
| Browser | `sdk.browser` | `browser` | Open and manage in-shell browser tabs |

## Default values

- Default `max_tokens`: 2048
- Default `temperature`: 0.7
- Default `model`: use `sdk.intelligence.getState().selectedModel || 'auto'`

---

## Full SDK reference

For the complete interactive SDK documentation, live code examples, TypeScript signatures, and recipes for every available facade, see:

`references/app-start-kit.html`

This is the official webAI SDK Starter Kit. Open it in a browser or read it directly. It covers all managers (`shell`, `identity`, `intelligence`, `room`, `messaging`, `files`, `people`, `storage`, `windows`, `personas`, `canvas`, and more) with runnable examples for every method.

---

## Vanilla JS app template

For apps that don't need a build step, use this self-contained HTML template. It demonstrates the manifest, theme bootstrap, design tokens, AI streaming, storage, and identity — all in vanilla JS.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My webAI App</title>

  <!--
  MANIFEST — declare your app identity and required managers.
  The shell reads this block before injecting the SDK.
  Only list managers you actually use.

  Available managers:
    shell, identity, crypto, theme, files, people, messaging,
    notifications, profile, contentIndex, searchIndex, intelligence,
    windows, apps, storage, flags, liminal, settings, context,
    browser, idn, viewOrchestration, interfaces, interfaceAdmin,
    room, canvas, personas
  -->
  <script id="apogee-shell-manifest" type="application/apogee-shell-manifest+json" data-apogee-shell-manifest>
  {
    "schemaVersion": 1,
    "name": "My webAI App",
    "description": "Short description of what this app does",
    "author": "Your Name",
    "version": "1.0.0",
    "minPlatformApiLevel": 2,
    "provides": {
      "hasOwnRouting": false
    },
    "requires": {
      "managers": [
        "shell",
        "identity",
        "theme",
        "intelligence",
        "storage"
      ]
    }
  }
  </script>

  <!--
  THEME BOOTSTRAP — sync dark/light before first paint.
  Runs inline to avoid flash of unstyled content.
  -->
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

  <style>
    /*
    DESIGN TOKENS
    The shell injects these CSS variables automatically when your app runs
    inside Apogee. Define them here as fallbacks for standalone preview.
    */
    :root {
      color-scheme: dark;
      --bg-primary:    #181818;
      --bg-secondary:  #262626;
      --bg-tertiary:   #303030;
      --border:        rgba(255,255,255,0.1);
      --border-focus:  rgba(37,99,235,0.4);
      --text:          #fafafa;
      --muted:         #a3a3a3;
      --accent:        #2563eb;
      --accent-soft:   rgba(37,99,235,0.14);
      --surface:       rgba(38,38,38,0.92);
      --surface-soft:  rgba(255,255,255,0.04);
      --green:         #34d399;
      --green-soft:    rgba(52,211,153,0.12);
      --rose:          #fb7185;
      --rose-soft:     rgba(251,113,133,0.12);
      --amber:         #fbbf24;
      --amber-soft:    rgba(251,191,36,0.12);
      --radius-lg:     12px;
      --radius-md:     8px;
      --radius-sm:     4px;
      --font-ui:       "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      --font-mono:     "SF Mono", ui-monospace, monospace;
      --shadow-lg:     0 10px 28px rgba(0,0,0,0.32);
      --ease:          cubic-bezier(.4,0,.2,1);
    }

    [data-theme="light"] {
      color-scheme: light;
      --bg-primary:    #fafafa;
      --bg-secondary:  #f0f0f0;
      --border:        rgba(0,0,0,0.1);
      --text:          #171717;
      --muted:         #525252;
      --surface:       rgba(255,255,255,0.94);
      --surface-soft:  rgba(0,0,0,0.03);
      --green:         #059669;
      --green-soft:    rgba(5,150,105,0.08);
      --rose:          #e11d48;
      --rose-soft:     rgba(225,29,72,0.08);
      --amber:         #d97706;
      --amber-soft:    rgba(217,119,6,0.08);
      --shadow-lg:     0 10px 24px rgba(0,0,0,0.12);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    *::-webkit-scrollbar { width: 4px; }
    *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

    body {
      font-family: var(--font-ui);
      font-size: 14px;
      line-height: 1.5;
      background: var(--bg-primary);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    #app {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }

    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      height: 48px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .app-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
    .app-header-right { display: flex; align-items: center; gap: 8px; }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--muted);
    }
    .status-dot.connected { background: var(--green); }
    .status-label { font-size: 11px; color: var(--muted); }

    .app-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .card-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-title { font-size: 13px; font-weight: 600; }
    .card-badge {
      font-size: 10px; font-weight: 600;
      padding: 2px 8px; border-radius: 20px;
      background: var(--accent-soft); color: var(--accent);
    }
    .card-body { padding: 18px; }

    .identity-row { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--accent-soft); border: 1px solid var(--border-focus);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 600; color: var(--accent); flex-shrink: 0;
    }
    .identity-info .name { font-size: 14px; font-weight: 600; }
    .identity-info .peer-id {
      font-size: 10px; font-family: var(--font-mono);
      color: var(--muted); margin-top: 2px;
    }

    .chat-messages {
      display: flex; flex-direction: column; gap: 12px;
      min-height: 80px; max-height: 280px;
      overflow-y: auto; margin-bottom: 12px;
    }
    .message { display: flex; flex-direction: column; gap: 2px; }
    .message-role {
      font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted);
    }
    .message-content {
      font-size: 13px; line-height: 1.55;
      padding: 10px 13px; border-radius: var(--radius-md);
      border: 1px solid var(--border); background: var(--surface-soft);
    }
    .message.assistant .message-content {
      background: var(--accent-soft); border-color: var(--border-focus);
    }
    .message.streaming .message-content::after {
      content: "▌";
      animation: blink 0.8s step-end infinite;
      margin-left: 1px;
    }
    @keyframes blink { 50% { opacity: 0; } }

    .input-row { display: flex; gap: 8px; }
    .input-row input, .input-row textarea {
      flex: 1; padding: 8px 12px;
      font-family: var(--font-ui); font-size: 13px;
      border: 1px solid var(--border); border-radius: var(--radius-md);
      background: var(--surface-soft); color: var(--text);
      outline: none; transition: border-color 0.15s var(--ease); resize: none;
    }
    .input-row input:focus, .input-row textarea:focus { border-color: var(--border-focus); }

    .btn {
      font-family: var(--font-ui); font-size: 12px; font-weight: 600;
      padding: 8px 16px; border-radius: var(--radius-md);
      border: 1px solid var(--border); background: var(--surface-soft);
      color: var(--text); cursor: pointer;
      transition: all 0.15s var(--ease); white-space: nowrap;
    }
    .btn:hover { background: var(--accent-soft); border-color: var(--border-focus); color: var(--accent); }
    .btn:active { transform: scale(0.97); }
    .btn:disabled { opacity: 0.4; pointer-events: none; }
    .btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn-primary:hover { filter: brightness(1.12); background: var(--accent); color: #fff; }

    .kv-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .kv-row input {
      flex: 1; padding: 6px 10px;
      font-family: var(--font-mono); font-size: 12px;
      border: 1px solid var(--border); border-radius: var(--radius-sm);
      background: var(--surface-soft); color: var(--text); outline: none;
    }
    .kv-row input:focus { border-color: var(--border-focus); }
    .kv-label {
      font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--muted); width: 32px; flex-shrink: 0; text-align: right;
    }
    .kv-output {
      font-family: var(--font-mono); font-size: 11px;
      color: var(--green); padding: 8px 10px;
      border-radius: var(--radius-sm); background: var(--green-soft);
      border: 1px solid rgba(52,211,153,0.2);
      min-height: 34px; word-break: break-all;
    }

    .no-sdk-banner {
      background: var(--amber-soft);
      border: 1px solid rgba(251,191,36,0.25);
      border-radius: var(--radius-md);
      padding: 12px 16px; font-size: 13px; color: var(--amber); display: none;
    }
    .no-sdk-banner.visible { display: block; }
  </style>
</head>
<body>
  <div id="app">

    <header class="app-header">
      <span class="app-title">My webAI App</span>
      <div class="app-header-right">
        <span class="status-dot" id="status-dot"></span>
        <span class="status-label" id="status-label">Connecting…</span>
      </div>
    </header>

    <main class="app-body">

      <div class="no-sdk-banner" id="no-sdk-banner">
        Running in standalone mode — <code>window.apogeeSDK</code> is not available.
        Open this file inside the webAI Apogee shell to use live SDK features.
      </div>

      <!-- Identity card -->
      <div class="card" id="identity-card">
        <div class="card-header">
          <span class="card-title">Identity</span>
          <span class="card-badge" id="identity-badge">—</span>
        </div>
        <div class="card-body">
          <div class="identity-row">
            <div class="avatar" id="identity-avatar">?</div>
            <div class="identity-info">
              <div class="name" id="identity-name">—</div>
              <div class="peer-id" id="identity-peer">—</div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI chat card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">AI Chat</span>
          <span class="card-badge" id="ai-badge">intelligence</span>
        </div>
        <div class="card-body">
          <div class="chat-messages" id="chat-messages"></div>
          <div class="input-row">
            <input type="text" id="chat-input" placeholder="Ask the AI anything…" autocomplete="off" />
            <button class="btn btn-primary" id="chat-send">Send</button>
          </div>
        </div>
      </div>

      <!-- Storage card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Storage</span>
          <span class="card-badge">storage</span>
        </div>
        <div class="card-body">
          <div class="kv-row">
            <span class="kv-label">Key</span>
            <input type="text" id="storage-key" value="my-key" />
          </div>
          <div class="kv-row">
            <span class="kv-label">Val</span>
            <input type="text" id="storage-val" placeholder="value to store" />
          </div>
          <div class="input-row" style="margin-bottom:12px;">
            <button class="btn" id="storage-get">Get</button>
            <button class="btn btn-primary" id="storage-set">Set</button>
            <button class="btn" id="storage-del">Delete</button>
          </div>
          <div class="kv-output" id="storage-output">—</div>
        </div>
      </div>

    </main>
  </div>

  <script>
    // ── SDK setup ────────────────────────────────────────────────────
    // Always guard with || null so standalone file preview doesn't throw.
    const sdk = window.apogeeSDK || null;

    const statusDot   = document.getElementById("status-dot");
    const statusLabel = document.getElementById("status-label");

    if (sdk) {
      statusDot.classList.add("connected");
      statusLabel.textContent = "SDK connected";
    } else {
      statusLabel.textContent = "Standalone mode";
      document.getElementById("no-sdk-banner").classList.add("visible");
    }

    // ── Theme ────────────────────────────────────────────────────────
    // sdk.theme.getState() → "dark" | "light"
    // sdk.theme.subscribe(fn) → unsubscribe fn
    function applyTheme() {
      if (!sdk) return;
      const t = sdk.theme.getState();
      document.documentElement.setAttribute("data-theme", t === "light" ? "light" : "dark");
      document.documentElement.style.colorScheme = t === "light" ? "light" : "dark";
    }
    if (sdk) { applyTheme(); sdk.theme.subscribe(applyTheme); }

    // ── Identity ─────────────────────────────────────────────────────
    // sdk.identity.getState() → Promise<{ displayName, peerId, ... }>
    // sdk.identity.subscribe(fn) → unsubscribe fn
    async function loadIdentity() {
      if (!sdk) return;
      try {
        const id   = await sdk.identity.getState();
        const name = id?.displayName || "Unknown";
        const peer = id?.peerId || "—";
        document.getElementById("identity-name").textContent = name;
        document.getElementById("identity-peer").textContent = peer.slice(0, 24) + "…";
        document.getElementById("identity-avatar").textContent = name.charAt(0).toUpperCase();
        document.getElementById("identity-badge").textContent = "online";
      } catch (err) {
        document.getElementById("identity-name").textContent = "Error reading identity";
      }
    }
    loadIdentity();
    if (sdk) { sdk.identity.subscribe(() => loadIdentity()); }

    // ── AI Chat — streaming ──────────────────────────────────────────
    // sdk.intelligence.chatCompletionStream(req) → AsyncGenerator
    // sdk.intelligence.chatCompletion(req)        → Promise (non-streaming)
    const chatMessages = document.getElementById("chat-messages");
    const chatInput    = document.getElementById("chat-input");
    const chatSend     = document.getElementById("chat-send");
    const history      = [];  // conversation history for multi-turn context

    function addMessage(role, content, isStreaming = false) {
      const div = document.createElement("div");
      div.className = `message ${role}${isStreaming ? " streaming" : ""}`;
      div.innerHTML = `<span class="message-role">${role}</span><div class="message-content"></div>`;
      div.querySelector(".message-content").textContent = content;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return div;
    }

    async function sendMessage() {
      if (!sdk) { addMessage("assistant", "SDK not available in standalone mode."); return; }
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = "";
      chatSend.disabled = true;

      history.push({ role: "user", content: text });
      addMessage("user", text);

      const state   = sdk.intelligence.getState();
      const modelId = state?.selectedModel || "auto";

      const assistantDiv = addMessage("assistant", "", true);
      const contentEl    = assistantDiv.querySelector(".message-content");
      let fullText = "";

      try {
        const stream = sdk.intelligence.chatCompletionStream({
          model: modelId,
          messages: history,
          max_tokens: 1024,
          temperature: 0.7,
        });
        for await (const chunk of stream) {
          fullText += chunk.delta || "";
          contentEl.textContent = fullText;
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        assistantDiv.classList.remove("streaming");
        history.push({ role: "assistant", content: fullText });
      } catch (err) {
        assistantDiv.classList.remove("streaming");
        contentEl.textContent = `Error: ${err.message || "AI request failed"}`;
        contentEl.style.color = "var(--rose)";
      }
      chatSend.disabled = false;
      chatInput.focus();
    }

    chatSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // ── Storage ──────────────────────────────────────────────────────
    // sdk.storage.get(key)        → Promise<string | null>
    // sdk.storage.set(key, value) → Promise<void>  (value must be a string)
    // sdk.storage.delete(key)     → Promise<void>
    // sdk.storage.list()          → Promise<string[]>
    // Storage is keyed per-app — data is isolated from other apps.
    const storageKey    = document.getElementById("storage-key");
    const storageVal    = document.getElementById("storage-val");
    const storageOutput = document.getElementById("storage-output");

    function setStorageOutput(text, isError = false) {
      storageOutput.textContent = text;
      storageOutput.style.color      = isError ? "var(--rose)"      : "var(--green)";
      storageOutput.style.background = isError ? "var(--rose-soft)" : "var(--green-soft)";
    }

    document.getElementById("storage-get").addEventListener("click", async () => {
      if (!sdk) return setStorageOutput("SDK not available", true);
      try {
        const val = await sdk.storage.get(storageKey.value);
        setStorageOutput(val !== null && val !== undefined ? val : "(no value)");
      } catch (err) { setStorageOutput(err.message, true); }
    });

    document.getElementById("storage-set").addEventListener("click", async () => {
      if (!sdk) return setStorageOutput("SDK not available", true);
      try {
        await sdk.storage.set(storageKey.value, storageVal.value);
        setStorageOutput(`Saved: "${storageVal.value}"`);
      } catch (err) { setStorageOutput(err.message, true); }
    });

    document.getElementById("storage-del").addEventListener("click", async () => {
      if (!sdk) return setStorageOutput("SDK not available", true);
      try {
        await sdk.storage.delete(storageKey.value);
        setStorageOutput(`Deleted key: "${storageKey.value}"`);
      } catch (err) { setStorageOutput(err.message, true); }
    });

    // ── Add your code below ──────────────────────────────────────────
    // Other SDK patterns:
    //
    // sdk.messaging.listConversations()
    // sdk.messaging.send(conversationId, content)
    // sdk.messaging.subscribe(fn)
    //
    // sdk.people.listContacts()
    // sdk.people.getPresence(peerId)
    //
    // sdk.files.listFolder(folderId)
    // sdk.files.readFile(fileId)
    // sdk.files.writeFile(folderId, name, content)
    //
    // sdk.notifications.push({ title, body })
    // sdk.notifications.listFeed()
    //
    // sdk.canvas.getAppState(appId, projectId?)
    // sdk.canvas.updateAppState(appId, state, projectId?)
    // sdk.canvas.subscribeAppState(appId, fn, projectId?)
    //
    // sdk.personas.listPersonas()
    // sdk.personas.getActivePersona()
    // sdk.intelligence.getActivePersona(appId?)
    //
    // sdk.shell.getView()
    // sdk.shell.setView(viewId)
    // sdk.shell.listProjects()
    // sdk.shell.listFavorites()
    //
    // window.__APOGEE_PLATFORM.apiLevel      // e.g. 2
    // window.__APOGEE_PLATFORM.syncProtocol  // e.g. 1

  </script>
</body>
</html>
```
