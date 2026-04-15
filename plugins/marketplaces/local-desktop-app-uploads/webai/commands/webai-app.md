---
description: Full webAI Apogee SDK reference — shell manifest, all SDK facades, src/webai.js template, and Vite config. Use this to answer API questions or orient before building.
argument-hint: "[topic or facade name]"
allowed-tools: Read
---

This is the `webai:webai-app` command. Present the webAI Apogee SDK reference below to the user. If an argument was provided (e.g. `intelligence`, `storage`, `room`, `manifest`, `webai.js`, `vanilla`), focus on that section. For `vanilla`, also read `skills/webai-app/references/vanilla-template.html` and present it. Otherwise present the full reference.

---

# webAI Apogee SDK Reference

## How it works

webAI apps are **single self-contained HTML files** that run inside an Apogee shell iframe. The shell injects `window.apogeeSDK` before your app loads. Declare which managers you need in a shell manifest — only those facades are injected.

```javascript
const sdk = window.apogeeSDK || null; // null in local dev — always guard
const platform = window.__APOGEE_PLATFORM; // { apiLevel, syncProtocol } — always available
```

## Shell manifest (required)

```html
<script id="apogee-shell-manifest" type="application/apogee-shell-manifest+json" data-apogee-shell-manifest>
{
  "schemaVersion": 1,
  "name": "My App",
  "description": "What it does",
  "version": "1.0.0",
  "minPlatformApiLevel": 2,
  "provides": { "hasOwnRouting": true },
  "requires": {
    "managers": ["shell", "intelligence"]
  }
}
</script>
```

All available managers: `shell` `identity` `crypto` `theme` `files` `people` `messaging` `notifications` `profile` `contentIndex` `searchIndex` `intelligence` `windows` `apps` `storage` `flags` `liminal` `settings` `context` `browser` `idn` `viewOrchestration` `interfaces` `interfaceAdmin` `room` `canvas` `personas`

Only list managers you actually use — unlisted ones won't be injected.

## `src/webai.js` — canonical integration layer

Always create this file. Copy it verbatim into new apps.

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

/** Subscribe to intelligence state changes. Returns unsubscribe fn — call on unmount. */
export function onIntelligenceChange(handler) {
  const sdk = getSDK();
  if (!sdk?.intelligence) return () => {};
  return sdk.intelligence.subscribe(handler);
}

/**
 * Stream a chat completion. onToken(delta) called per token. Returns full text.
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
    if (chunk.delta) { fullText += chunk.delta; onToken?.(chunk.delta); }
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

/** Navigate to any shell view. */
export function setView(viewId) {
  getSDK()?.shell?.setView?.(viewId);
}
```

## AI inference — `sdk.intelligence` (manager: `intelligence`)

```javascript
// Streaming — preferred
const stream = sdk.intelligence.chatCompletionStream({
  model: 'auto',   // or sdk.intelligence.getState().selectedModel
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
  ],
  max_tokens: 2048,
  temperature: 0.7,
});
for await (const chunk of stream) {
  // chunk: { delta: string, finish_reason?: string | null }
  process(chunk.delta);
}

// Non-streaming
const result = await sdk.intelligence.chatCompletion({ model, messages, max_tokens, temperature });
// result: { content, usage: { prompt_tokens, completion_tokens }, model, backend_id }

// State & control
const s = sdk.intelligence.getState();
// s: { isModelLoaded, loadingModel, isGenerating, lastModel, selectedModel, backend, hasRuntime }
const ready = sdk.intelligence.isAvailable();          // boolean
const backends = await sdk.intelligence.listBackends(); // [{ id, label, available, modelCount }]
sdk.intelligence.cancelGeneration?.();

// Subscribe (returns unsubscribe fn)
const unsub = sdk.intelligence.subscribe(() => { /* re-check getState() */ });

// Persona
const persona = sdk.intelligence.getActivePersona(appId); // { id, name } | null
```

React streaming pattern:
```jsx
const [intelligenceState, setIntelligenceState] = useState('waiting');
useEffect(() => {
  setIntelligenceState(getIntelligenceState());
  return onIntelligenceChange(() => setIntelligenceState(getIntelligenceState()));
}, []);

async function generate(prompt) {
  setIsGenerating(true); setOutput('');
  try {
    await streamCompletion(prompt, {
      systemPrompt: 'You are a helpful assistant.',
      onToken: (t) => setOutput(prev => prev + t),
    });
  } catch (e) { setOutput(`Error: ${e.message}`); }
  finally { setIsGenerating(false); }
}
```

## Storage — `sdk.storage` (manager: `storage`)

App-scoped key/value. Values must be strings — JSON-serialize objects.

```javascript
const val  = await sdk.storage.get('key');             // string | null
await sdk.storage.set('key', JSON.stringify(obj));
await sdk.storage.delete('key');
const keys = await sdk.storage.list();                 // string[]
```

## Navigation — `sdk.shell` (manager: `shell`)

```javascript
sdk.shell.setView('launcher');   // navigate to a view
sdk.shell.getView();             // current view id
sdk.shell.listApps();            sdk.shell.listFavorites();
sdk.shell.toggleFavorite(appId); sdk.shell.isFavorite(appId);
sdk.shell.listRecents();
const unsub = sdk.shell.subscribe(handler);
```

## Room / Collaboration — `sdk.room` (manager: `room`)

```javascript
const roomCode = await sdk.room.host({ userName: 'Alice' }); // string | null
await sdk.room.join({ roomCode, userName: 'Bob', password: '' });
sdk.room.disconnect();
const state = sdk.room.getState();        // ApogeeRoomState
const users = sdk.room.getUsers?.() ?? [];
const list  = sdk.room.listPublicRooms(); // [{ roomCode, roomName, userCount, isPublic }]
sdk.room.sendChatMessage?.('Hello');
const unsub = sdk.room.subscribe((event) => { /* event.type, event.data */ });
```

## Personas — `sdk.personas` (manager: `personas`)

```javascript
const list   = sdk.personas.listPersonas();      // [{ id, name, description, specialties }]
const active = sdk.personas.getActivePersona();  // { id, name } | null
sdk.personas.setActive(personaId);               // boolean
const granted = await sdk.personas.requestAccess?.(appId, 'coding');
const perms   = sdk.personas.getPermissions?.(appId);
const unsub   = sdk.personas.subscribe(handler);
```

## Identity — `sdk.identity` (manager: `identity`)

```javascript
const id = await sdk.identity.getState();
// { displayName, peerId, odid, profileImage, ... }
const authed = sdk.identity.isAuthenticated();
const token  = sdk.identity.getAccessToken();
const unsub  = sdk.identity.subscribe(() => reload());
```

## Context — `sdk.context` (manager: `context`)

Injects personalized user context into AI prompts.

```javascript
const policy = sdk.context.getContextPolicy();
const pack   = await sdk.context.getContextPack();
// Use: systemPrompt: `You are helpful.\n\nUser context:\n${pack?.summary ?? ''}`
const unsub  = sdk.context.subscribe(() => refresh());
```

## Profile — `sdk.profile` (manager: `profile`)

```javascript
const profile = sdk.profile.getState();         // own profile
const other   = sdk.profile.getProfile(odid);
sdk.profile.openProfile(odid);
sdk.profile.setHeader({ displayName: 'Name', bio: '...' });
sdk.profile.setActivity({ status: 'Building' });
const unsub   = sdk.profile.subscribe(() => reload());
```

## Feature Flags — `sdk.flags` (manager: `flags`)

```javascript
const on  = sdk.flags.isEnabled('my-flag');     // boolean
const all = sdk.flags.getState();               // { [flag]: boolean }
sdk.flags.setEnabled('my-flag', true);
const unsub = sdk.flags.subscribe(() => check());
```

## Browser — `sdk.browser` (manager: `browser`)

```javascript
const tabId = await sdk.browser.createTab('https://example.com');
await sdk.browser.navigateTo(tabId, 'https://other.com');
await sdk.browser.focusTab(tabId);
await sdk.browser.closeTab(tabId);
await sdk.browser.goBack(tabId);
const history = sdk.browser.listHistory();
sdk.browser.recordHistory('https://example.com', 'Title');
const unsub = sdk.browser.subscribe(() => refreshTabs());
```

## Theme — `sdk.theme` (manager: `theme`)

```javascript
const theme = sdk.theme.getState();   // 'dark' | 'light'
sdk.theme.setTheme('dark');
const unsub = sdk.theme.subscribe(() => applyTheme(sdk.theme.getState()));
```

## Messaging — `sdk.messaging` (manager: `messaging`)

```javascript
const convos    = sdk.messaging.listConversations();
const messages  = sdk.messaging.listMessages(convoId);
await sdk.messaging.send(convoId, 'Hello');
const result    = await sdk.messaging.sendAi(convoId, prompt, {
  stream: true, onToken, systemPrompt: '...', model: 'auto',
});
const convo     = await sdk.messaging.create([], { name: 'Chat' });
await sdk.messaging.delete(convoId);
const unsub     = sdk.messaging.subscribe(handler);
```

## Other facades (quick ref)

```javascript
// Crypto (manager: crypto)
const enc = await sdk.crypto.encrypt(plaintext, recipientPublicKeyJwk);
const dec = await sdk.crypto.decrypt(encryptedBase64, privateKeyJwk);

// People (manager: people)
const contacts = sdk.people.listContacts();
const presence = sdk.people.getPresence(peerId);

// Files (manager: files)
const files   = sdk.files.listFolder(folderId);
const content = await sdk.files.readFile(fileId);
await sdk.files.writeFile(folderId, 'name.txt', content);

// Notifications (manager: notifications)
sdk.notifications.push({ title: 'Done', body: 'Task complete' });
const feed = sdk.notifications.listFeed();

// Canvas (manager: canvas) — project-scoped shared state
const state = sdk.canvas.getAppState(appId, projectId);
sdk.canvas.updateAppState(appId, partialState, projectId);
const unsub = sdk.canvas.subscribeAppState(appId, fn, projectId);
```

## Vite config (required for React/Vue apps)

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // or vue
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'esnext', assetsInlineLimit: 100000000, cssCodeSplit: false },
});
```

## API quick-reference table

| Facade | Manager | Use for |
|--------|---------|---------|
| `sdk.intelligence` | `intelligence` | AI chat, streaming, state |
| `sdk.storage` | `storage` | Persistent key/value per app |
| `sdk.shell` | `shell` | Navigation, apps, recents |
| `sdk.room` | `room` | P2P rooms, presence, chat |
| `sdk.personas` | `personas` | AI persona selection |
| `sdk.identity` | `identity` | User profile, peer ID |
| `sdk.context` | `context` | Inject user context into AI |
| `sdk.profile` | `profile` | Read/display user profiles |
| `sdk.flags` | `flags` | Feature flag reads/toggles |
| `sdk.browser` | `browser` | In-shell browser tabs |
| `sdk.theme` | `theme` | Dark/light mode |
| `sdk.crypto` | `crypto` | E2E encryption |
| `sdk.messaging` | `messaging` | Conversations, AI threads |
| `sdk.people` | `people` | Contacts, presence |
| `sdk.files` | `files` | File read/write |
| `sdk.notifications` | `notifications` | Push, feed |
| `sdk.canvas` | `canvas` | Project-scoped shared state |

## Defaults

- `max_tokens`: 2048  
- `temperature`: 0.7  
- `model`: `sdk.intelligence.getState().selectedModel || 'auto'`
