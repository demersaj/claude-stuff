# webAI App Skill

## Overview

webAI (Apogee shell) apps are **single HTML files** uploaded and run inside an iframe. The shell injects globals into the iframe so your app can call into the AI runtime, navigation, collaboration, and identity APIs.

## Critical constraints

- **Output must be a single self-contained HTML file.** No external asset dependencies at runtime.
- All JS and CSS must be inlined or bundled into the HTML file.
- No server-side runtime - everything runs client-side.
- For React/Vue: use a bundler (Vite) to produce a single `dist/index.html` with all assets inlined. Use `vite-plugin-singlefile` or equivalent.

## Shell-injected globals

The shell injects these onto `window` before your app loads. Always check both `window.X` and `window.parent?.X` as a fallback:

```javascript
// Pattern for safe access
const getShellAPI = (name) => window[name] ?? window.parent?.[name] ?? null;

const OasisHost         = getShellAPI('OasisHost');         // AI inference
const ApogeeShell       = getShellAPI('ApogeeShell');       // Navigation/view routing
const CollaborationManager = getShellAPI('CollaborationManager'); // P2P collab
const UserIdentityManager  = getShellAPI('UserIdentityManager');  // ODID, auth
const E2ECrypto         = getShellAPI('E2ECrypto');         // E2E encryption
```

## OasisHost - AI inference (Pattern A)

```javascript
// 1. Check if AI is ready
function getOasisHost() {
  return window.OasisHost ?? window.parent?.OasisHost ?? null;
}

function getOasisState() {
  const host = getOasisHost();
  if (!host?.getStatus) return 'waiting';
  const s = host.getStatus();
  if (s?.lastModel) return 'ready';
  if (s?.loadingModel || s?.isGenerating) return 'loading';
  return 'waiting';
}

// 2. Stream a completion
async function streamCompletion(prompt, systemPrompt, onToken) {
  const host = getOasisHost();
  if (!host) throw new Error('Oasis AI not available.');

  const release = await host.acquire({ warmRuntime: true });
  try {
    const fullText = await host.request(prompt, {
      systemPrompt,
      maxTokens: 2048,
      temperature: 0.7,
      onToken, // receives incremental tokens; accumulate yourself for UI
    });
    return fullText;
  } finally {
    if (release) release();
  }
}
```

## Navigation

```javascript
// Back to launcher
function goToLauncher() {
  if (typeof window.backToLauncher === 'function') {
    window.backToLauncher();
  } else {
    const shell = window.ApogeeShell ?? window.parent?.ApogeeShell;
    if (shell?.setView) shell.setView('launcher');
    else window.parent.postMessage({ type: 'backToLauncher' }, '*');
  }
}

// Other views: 'whiteboard', 'browse-web', 'collab-editor'
```

## Uploading an app to the shell

Apps are stored in `localStorage` under the key `apogee-uploaded-apps`. The shell reads this on startup and registers each entry as a user app.

### Upload script (inject into your build output or run standalone)

```javascript
// upload-to-apogee.js - run this in the browser console OR inject into your app's dev build
async function uploadToApogee(htmlContent, appId, displayName) {
  // Generate a content hash as sourceId
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(htmlContent.replace(/\s+/g, ' ').replace(/<!--[\s\S]*?-->/g, ''))
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sourceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const stored = JSON.parse(localStorage.getItem('apogee-uploaded-apps') || '[]');

  // Remove existing entry with same appId if present
  const filtered = stored.filter(app => app.appId !== appId);

  filtered.push({
    appId,
    displayName,
    htmlContent,
    sourceId,
    uploadedAt: Date.now(),
    version: 1,
  });

  localStorage.setItem('apogee-uploaded-apps', JSON.stringify(filtered));
  console.log(`[webAI] Uploaded "${displayName}" (appId: ${appId})`);
  console.log('[webAI] Refresh the Apogee shell to see your app in the launcher.');
}
```

## Polling OasisHost state in React

```jsx
const [oasisState, setOasisState] = useState('waiting'); // 'ready' | 'loading' | 'waiting'

useEffect(() => {
  const probe = () => {
    const host = window.OasisHost ?? window.parent?.OasisHost;
    if (!host?.getStatus) return 'waiting';
    const s = host.getStatus();
    if (s?.lastModel) return 'ready';
    if (s?.loadingModel || s?.isGenerating) return 'loading';
    return 'waiting';
  };
  setOasisState(probe());
  const id = setInterval(() => setOasisState(probe()), 1200);
  return () => clearInterval(id);
}, []);
```

## Polling OasisHost state in Vue

```javascript
// In setup() or <script setup>
const oasisState = ref('waiting');
let oasisInterval = null;

onMounted(() => {
  const probe = () => {
    const host = window.OasisHost ?? window.parent?.OasisHost;
    if (!host?.getStatus) return 'waiting';
    const s = host.getStatus();
    if (s?.lastModel) return 'ready';
    if (s?.loadingModel || s?.isGenerating) return 'loading';
    return 'waiting';
  };
  oasisState.value = probe();
  oasisInterval = setInterval(() => { oasisState.value = probe(); }, 1200);
});

onUnmounted(() => clearInterval(oasisInterval));
```

## Vite config for single-file output (required for webAI upload)

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    // vite-plugin-singlefile handles inlining everything into index.html
  },
});
```

Install the plugin:
```bash
npm install --save-dev vite-plugin-singlefile
```

## Constants (from shell)

- Default maxTokens: 2048
- Default temperature: 0.7
- Request timeout: 150,000ms
- Tool turn max tokens: 800
- Max tool turns per user message: 3
