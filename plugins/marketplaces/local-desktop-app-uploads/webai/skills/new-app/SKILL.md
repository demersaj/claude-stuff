---
name: new-app
description: Scaffold a new React or Vue app for the webAI Apogee shell
argument-hint: "<app-name> [react|vue] [--description \"What this app does\"]"
allowed-tools: Bash, Read, Write, Glob
---

# webAI New App

Scaffold a new app for the webAI Apogee shell.

## Process

1. **Parse arguments** - Get app name, framework, and optional description from the user's input (e.g. `/webai:new-app my-tool react --description "A kanban board with AI task suggestions"`). If framework is not specified, ask the user to choose between React and Vue. If `--description` is provided, capture it for use in steps 5 and 9.

2. **Read the webai-app skill** to understand the constraints and APIs before generating any code.

3. **Scaffold the project**:

   **For React:**
   ```bash
   npm create vite@latest <app-name> -- --template react
   cd <app-name>
   npm install
   npm install --save-dev vite-plugin-singlefile
   ```

   **For Vue:**
   ```bash
   npm create vite@latest <app-name> -- --template vue
   cd <app-name>
   npm install
   npm install --save-dev vite-plugin-singlefile
   ```

4. **Patch `vite.config.js`** to use `vite-plugin-singlefile`:
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

5. **Add the shell manifest to `index.html`** — insert as the first `<script>` in `<head>`:
   ```html
   <script type="application/apogee-shell-manifest+json" id="apogee-shell-manifest">
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
   Add more managers as needed: `"storage"`, `"room"`, `"personas"`, `"identity"`, `"theme"`.

6. **Create `src/webai.js`** - SDK integration layer:
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
     if (!sdk) return () => {};
     return sdk.intelligence.subscribe(handler);
   }

   /** Stream a completion. onToken(delta) called for each token. */
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

7. **Add npm scripts** to `package.json`:
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "upload": "node ../../scripts/upload.js"
     }
   }
   ```

   Also set `"description"` in `package.json` to the value provided via `--description` (or a sensible default derived from the app name). This is picked up automatically by the build-upload skill.

8. **Replace boilerplate** in `src/App.jsx` (React) or `src/App.vue` (Vue) with a webAI-ready starter that:
   - Imports `getSDK`, `getIntelligenceState`, `onIntelligenceChange`, `goToLauncher` from `./webai.js`
   - Subscribes to intelligence state changes on mount (not polling — uses `onIntelligenceChange`)
   - Shows AI status badge in the header
   - Has a back-to-launcher button
   - Shows a "Not running in Apogee" notice in dev mode (when `getSDK()` returns null)
   - **If `--description` was provided**: generate a meaningful initial UI and logic that reflects what the app is supposed to do — real components, real state, real layout — not a generic placeholder.
   - **If no description**: use a minimal placeholder main content area.

   **React intelligence state pattern (subscribe, not polling):**
   ```jsx
   const [intelligenceState, setIntelligenceState] = useState('waiting');
   useEffect(() => {
     setIntelligenceState(getIntelligenceState());
     return onIntelligenceChange(() => setIntelligenceState(getIntelligenceState()));
   }, []);
   ```

9. **Print next steps** for the user:
   ```
   ✅ Scaffolded <app-name> (<framework>)

   Next steps:
     cd <app-name>
     npm run dev          # local dev server
     npm run build        # build single-file HTML

   When ready to upload to Apogee:
     /webai:build-upload
   ```

## Rules

- Always use `vite-plugin-singlefile` - this is non-negotiable for Apogee compatibility.
- Always create `src/webai.js` as the integration layer. Never access `window.apogeeSDK` directly in components.
- Always add the shell manifest to `index.html` — without it the shell may not inject needed managers.
- Never use `window.OasisHost`, `window.ApogeeShell`, or `window.CollaborationManager` — these are old globals replaced by `window.apogeeSDK`.
- Use `onIntelligenceChange` (subscribe) instead of polling `getIntelligenceState` on an interval.
- Never hardcode app IDs — derive from `package.json` name.
- Always set `"description"` in `package.json`.
- When a description is provided, generate a real starting UI that reflects it — not a generic placeholder.
- In dev mode, gracefully handle null SDK (the app runs outside the iframe during development).
