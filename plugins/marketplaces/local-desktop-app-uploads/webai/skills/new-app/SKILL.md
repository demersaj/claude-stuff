---
name: new-app
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
     build: { outDir: 'dist' },
   });
   ```

5. **Create `src/webai.js`** - shell API helpers:
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

6. **Create `scripts/upload.js`** - upload helper:
   ```javascript
   #!/usr/bin/env node
   // scripts/upload.js
   // Run: node scripts/upload.js
   // Then paste the output into the browser console on your Apogee shell page.
   import { readFileSync } from 'fs';
   import { resolve } from 'path';

   const htmlPath = resolve('./dist/index.html');
   let html;
   try {
     html = readFileSync(htmlPath, 'utf8');
   } catch {
     console.error('dist/index.html not found. Run `npm run build` first.');
     process.exit(1);
   }

   // Read app metadata from package.json
   const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
   const appId = pkg.name;
   const displayName = pkg.description || pkg.name;

   const uploadScript = `
   (async function uploadToApogee() {
     const htmlContent = ${JSON.stringify(html)};
     const appId = ${JSON.stringify(appId)};
     const displayName = ${JSON.stringify(displayName)};

     const hashBuffer = await crypto.subtle.digest(
       'SHA-256',
       new TextEncoder().encode(htmlContent.replace(/\\s+/g, ' ').replace(/<!--[\\s\\S]*?-->/g, ''))
     );
     const sourceId = Array.from(new Uint8Array(hashBuffer))
       .map(b => b.toString(16).padStart(2, '0')).join('');

     const stored = JSON.parse(localStorage.getItem('apogee-uploaded-apps') || '[]');
     const filtered = stored.filter(app => app.appId !== appId);
     filtered.push({ appId, displayName, htmlContent, sourceId, uploadedAt: Date.now(), version: 1 });
     localStorage.setItem('apogee-uploaded-apps', JSON.stringify(filtered));

     console.log('[webAI] Uploaded: ' + displayName + ' (' + appId + ')');
     console.log('[webAI] Refresh the Apogee launcher to see your app.');
   })();
   `.trim();

   console.log('=== Paste this in your browser console on the Apogee shell page ===\n');
   console.log(uploadScript);
   console.log('\n=== End of script ===');
   ```

7. **Add npm scripts** to `package.json`:
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "upload": "node scripts/upload.js"
     }
   }
   ```

8. **Replace boilerplate** in `src/App.jsx` (React) or `src/App.vue` (Vue) with a minimal webAI-ready starter that:
   - Imports from `./webai.js`
   - Polls `getOasisState()` every 1.2s and shows AI status in the header
   - Has a back-to-launcher button
   - Includes a placeholder main content area
   - Shows a "Not running in Apogee" notice in dev mode (when shell APIs are null)

9. **Print next steps** for the user:
   ```
   ✅ Scaffolded <app-name> (<framework>)

   Next steps:
     cd <app-name>
     npm run dev          # local dev server
     npm run build        # build single-file HTML
     npm run upload       # generate upload script

   When ready to upload:
     1. npm run build
     2. npm run upload   (outputs a browser console script)
     3. Open your Apogee shell in the browser
     4. Paste the script into DevTools console
     5. Refresh the launcher - your app will appear
   ```

## Rules

- Always use `vite-plugin-singlefile` - this is non-negotiable for Apogee compatibility.
- Always create `src/webai.js` as the integration layer.
- Never hardcode app IDs - derive from `package.json` name.
- The upload method is via `localStorage` key `apogee-uploaded-apps` - do not use any other method.
- In dev mode, gracefully handle null shell APIs (the app runs outside the iframe during development).
