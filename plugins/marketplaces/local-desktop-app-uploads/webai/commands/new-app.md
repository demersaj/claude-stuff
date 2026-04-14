---
description: Scaffold a new React or Vue app for the webAI Apogee shell
argument-hint: "<app-name> [react|vue]"
allowed-tools: Bash, Read, Write, Glob
---

# webAI New App

Scaffold a new app for the webAI Apogee shell.

## Process

1. **Parse arguments** - Get app name and framework from the user's input (e.g. `/webai:new-app my-tool react`). If framework is not specified, ask the user to choose between React and Vue.

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

5. **Create `src/webai.js`** — shell API integration helpers:
   ```javascript
   // src/webai.js - webAI Apogee SDK integration helpers

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
     if (!sdk?.intelligence) return () => {};
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
       model, messages, max_tokens: maxTokens, temperature, ...rest,
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

6. **Add the shell manifest to `index.html`** — add as the first `<script>` in `<head>`:
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

7. **Add npm scripts** to `package.json`:
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

8. **Replace boilerplate** in `src/App.jsx` (React) or `src/App.vue` (Vue) with a minimal webAI-ready starter that:
   - Imports `getIntelligenceState`, `onIntelligenceChange`, `goToLauncher` from `./webai.js`
   - Subscribes to `onIntelligenceChange` (not polling) and shows AI status in the header
   - Has a back-to-launcher button calling `goToLauncher()`
   - Includes a placeholder main content area
   - Shows a "Not running in Apogee — AI features disabled" notice in dev mode (when `getSDK()` returns null)

9. **Print next steps** for the user:
   ```
   ✅ Scaffolded <app-name> (<framework>)

   Next steps:
     cd <app-name>
     npm run dev          # local dev server
     npm run build        # build single-file HTML
     npm run upload       # build and upload to Apogee

   API quick reference (from src/webai.js):
     getIntelligenceState()      → 'ready' | 'loading' | 'waiting'
     onIntelligenceChange(fn)    → unsubscribe fn
     streamCompletion(prompt, { systemPrompt, onToken })
     cancelGeneration()
     goToLauncher()
   ```

## Rules

- Always use `vite-plugin-singlefile` — non-negotiable for Apogee compatibility.
- Always create `src/webai.js` as the integration layer — never access `window.apogeeSDK` directly in components.
- Never use `window.OasisHost`, `window.ApogeeShell`, or `window.CollaborationManager` — the current API is `window.apogeeSDK`.
- Use `onIntelligenceChange` to subscribe to state changes — never poll on an interval.
- In dev mode, gracefully handle null SDK (the app runs outside the iframe during development).
- Always declare the shell manifest and list only the managers the app actually uses.
