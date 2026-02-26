---
description: Scaffold and generate a new React or Vue app for the webAI Apogee shell from a description
argument-hint: "<app-name> \"<description>\" [react|vue]"
allowed-tools: Bash, Read, Write, Glob
---

# webAI New App

Scaffold and generate a new app for the webAI Apogee shell based on a description.

## Process

1. **Parse arguments** from the user's input:
   - `app-name` — kebab-case identifier (e.g. `word-counter`)
   - `description` — what the app should do (e.g. `"a word and character counter with live stats"`)
   - `framework` — `react` or `vue` (optional; ask if not provided)

   Example: `/webai:new-app word-counter "a word and character counter with live stats" react`

   If description is not provided, ask the user what the app should do before proceeding.

2. **Read the webai-app skill** to understand the shell APIs, constraints, and globals before writing any code.

3. **Scaffold the project** inside the `apps/` directory at the repo root:

   **For React:**
   ```bash
   npm create vite@latest apps/<app-name> -- --template react
   cd apps/<app-name>
   npm install
   npm install --save-dev vite-plugin-singlefile
   ```

   **For Vue:**
   ```bash
   npm create vite@latest apps/<app-name> -- --template vue
   cd apps/<app-name>
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
     build: { outDir: 'dist' },
   });
   ```

5. **Set `description` in `package.json`** to a short display name derived from the user's description — this is what appears in the Apogee launcher:
   ```json
   {
     "name": "<app-name>",
     "description": "<Display Name>",
     ...
   }
   ```

6. **Create `src/webai.js`** — shell API helpers (copy verbatim):
   ```javascript
   // src/webai.js - webAI shell integration helpers
   export const getShellAPI = (name) =>
     window[name] ?? window.parent?.[name] ?? null;

   export const getOasisHost = () => getShellAPI('OasisHost');
   export const getApogeeShell = () => getShellAPI('ApogeeShell');
   export const getCollaborationManager = () => getShellAPI('CollaborationManager');
   export const getUserIdentityManager = () => getShellAPI('UserIdentityManager');

   export function getOasisState() {
     const host = getOasisHost();
     if (!host?.getStatus) return 'waiting';
     const s = host.getStatus();
     if (s?.lastModel) return 'ready';
     if (s?.loadingModel || s?.isGenerating) return 'loading';
     return 'waiting';
   }

   export async function streamCompletion(prompt, systemPrompt, onToken) {
     const host = getOasisHost();
     if (!host) throw new Error('Oasis AI not available in this environment.');
     const release = await host.acquire({ warmRuntime: true });
     try {
       return await host.request(prompt, {
         systemPrompt: systemPrompt ?? '',
         maxTokens: 2048,
         temperature: 0.7,
         onToken,
       });
     } finally {
       if (release) release();
     }
   }

   export function goToLauncher() {
     if (typeof window.backToLauncher === 'function') {
       window.backToLauncher();
     } else {
       const shell = getApogeeShell();
       if (shell?.setView) shell.setView('launcher');
       else window.parent?.postMessage({ type: 'backToLauncher' }, '*');
     }
   }
   ```

7. **Add npm scripts** to `package.json` — the `upload` script points to `scripts/upload.js` at the repo root (two levels up from `apps/<app-name>/`):
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

8. **Generate the app** — replace the boilerplate `src/App.jsx` (React) or `src/App.vue` (Vue) with a **fully functional implementation** based on the description. This is the main creative step.

   Design principles:
   - Build the complete, working app described — not a placeholder or skeleton
   - Import `goToLauncher`, `getOasisState`, `streamCompletion` etc. from `./webai.js` as needed
   - Include an AI status indicator in the header only if the app uses AI (poll `getOasisState()` every 1.2s)
   - Always include a back-to-launcher button (call `goToLauncher()`)
   - Show a subtle "⚠ Not running in Apogee shell" banner when `getApogeeShell()` returns null (dev mode)
   - Use clean, modern inline styles — no external CSS dependencies
   - Keep the component tree flat and simple; this is a single-page tool

   If the description implies AI features (chat, summarize, generate, explain, etc.):
   - Use `streamCompletion()` from `./webai.js`
   - Show loading/streaming state while AI is generating
   - Handle the case where OasisHost is null (dev mode) with a clear notice

9. **Print next steps**:
   ```
   ✅ Created <display-name> in apps/<app-name>/

   Next steps:
     cd apps/<app-name>
     npm run dev          # local dev server
     npm run build        # build single-file HTML
     npm run upload       # install directly into running Apogee

   Upload behaviour:
     • Apogee running → installed instantly, refresh the launcher
     • Apogee not running → prints a DevTools console paste script
   ```

## Rules

- **Always generate a real, functional app** — never produce a placeholder or "coming soon" stub.
- Always use `vite-plugin-singlefile` — non-negotiable for Apogee compatibility.
- Always create `src/webai.js` verbatim as the integration layer.
- Set `package.json` `description` to a clean display name derived from the user's description.
- Never hardcode app IDs — always derive from `package.json` `name`.
- Always scaffold inside `apps/` so `../../scripts/upload.js` resolves to the repo-root upload script.
- Never create a per-app copy of `upload.js`.
- In dev mode, gracefully handle null shell APIs with a visible notice.
