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
import tailwindcss from '@tailwindcss/vite'; // only if using Signal/Tailwind
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
```

## Signal Design System (canonical UI layer)

Signal is the design system used across Apogee and the default UI toolkit for React apps. It ships token-backed components that automatically match the shell's light/dark theme — no custom theming required.

**Stack:** React 19+, TypeScript (optional), Tailwind CSS v4.

### Setup

Add `.npmrc` at the app root (public registry, no auth):

```
@webai:registry=https://gitlab.com/api/v4/projects/74115605/packages/npm/
```

Install:

```bash
npm install @webai/signal-ui @webai/signal-token
npm install --save-dev tailwindcss @tailwindcss/vite
```

### Styles

In the app entry CSS (e.g. `src/index.css`):

```css
@import "tailwindcss";
@import "@webai/signal-token/tailwind";
@import "@webai/signal-ui/styles";
```

Use `@webai/signal-ui/styles/full` only in non-Tailwind environments.

### Theme

Wrap the app root with `ThemeProvider` (skip if you're using `next-themes` or equivalent):

```jsx
import { ThemeProvider } from '@webai/signal-ui';

<ThemeProvider>
  <App />
</ThemeProvider>
```

`useTheme()` → `{ theme, setTheme, resolvedTheme }`.

### Component API

Read the full API before writing UI:

```bash
cat node_modules/@webai/signal-ui/llms.txt
```

**Only use component names, props, and tokens documented in `llms.txt` — do not invent.** If Signal doesn't have the component you need, compose existing Signal components first. For headless patterns, prefer `@base-ui/react`. `shadcn/ui` is last resort only; do not add any other UI library.

### Token-backed colors (never hardcode)

- `bg-background` / `text-foreground` — surface and primary text
- `bg-primary` / `text-primary-foreground` — brand
- `bg-muted` / `text-muted-foreground` — secondary
- `bg-card` / `text-card-foreground` — cards
- `border-border` — borders
- `bg-destructive` / `text-destructive-foreground` — errors

### Rules

1. Signal components first. Compose existing components before creating custom UI.
2. Never rebuild a component Signal already provides.
3. Tailwind for layout, spacing, typography, responsiveness. `@webai/signal-token` for color and radius.
4. Token-backed colors only — never hardcode hex.
5. Keep custom CSS minimal.
6. Semantic HTML and accessible interactions.
7. Mark unavoidable gaps with `/* SDS GAP: [description] */`.

### Priority order

1. `@webai/signal-ui` components
2. Composed Signal components
3. Tailwind + `@webai/signal-token`
4. `@base-ui/react` for headless patterns
5. Custom CSS (real gaps only)
6. `shadcn/ui` (last resort, not recommended)

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

For apps that don't need a build step, a complete self-contained HTML starter is available at:

`references/vanilla-template.html`

It demonstrates: shell manifest, theme bootstrap, design tokens, AI streaming (with multi-turn history), storage (get/set/delete), and identity — all in plain JS with no build step. Read that file when you need the full template; the key patterns are already shown in the API sections above.

