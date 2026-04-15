---
name: debug-app
description: >
  Diagnose and fix a broken webAI Apogee app — build failures, runtime crashes, AI not working, app not appearing in launcher, upload errors, or any other problem with an app in apps/.
  Use this skill when the user says their app is broken, "the build failed", "the AI isn't working", "app won't load", "nothing happens when I click", "it's not showing up in Apogee", or pastes an error message related to a webAI app.
argument-hint: "<app-name-or-path> [error message or symptom]"
allowed-tools: Bash, Read, Write, Glob, Grep
---

# webAI Debug App

Diagnose and fix a broken Apogee shell app.

## Step 1 — Understand the symptom

Identify what kind of failure this is. The user may have told you directly, or you'll need to ask:

- **Build error** — `npm run build` failed with an error message
- **Upload error** — build succeeded but `scripts/upload.js` failed or app didn't install
- **App not in launcher** — app installed but doesn't appear, or has wrong name
- **App won't load** — blank screen, error overlay, or crash on open in Apogee
- **AI does nothing** — clicking generate/submit has no effect; no output, no error
- **AI hangs or is unavailable** — generation never starts, or `intelligenceState` stuck on 'waiting'
- **Storage not persisting** — data doesn't survive app reload
- **Wrong behavior** — app loads and AI responds but something specific is broken

If the user pasted an error message, read it carefully — the symptom type is usually obvious from it.

## Step 2 — Locate and read the app

Find the app in `apps/<name>/`. Read:

```
apps/<name>/package.json
apps/<name>/vite.config.js
apps/<name>/index.html              (check for shell manifest)
apps/<name>/src/webai.js            (if it exists)
apps/<name>/src/App.jsx             (or App.vue)
```

Read any other files mentioned in the error. Don't guess — read the actual code.

## Step 3 — Run diagnostics

Based on the symptom, check the known failure patterns below.

---

## Known failure patterns

### BUILD FAILURES

**"Cannot find module 'vite-plugin-singlefile'"**

```bash
cd apps/<name> && npm install --save-dev vite-plugin-singlefile
```

**"Cannot find module './webai.js'" or similar missing import**
Check if `src/webai.js` exists. If not, create it from the canonical template (see the `new-app` or `webai-app` skill reference). Also check for typos in import paths — casing matters on Linux.

**"X is declared but never used" / "Y is assigned but value never used"**
Remove the unused variable or import. In strict Vite builds these are errors, not warnings.

**JSX/syntax error — "Unexpected token", "Expected closing tag"**
Read the file around the line number in the error. Common causes: unclosed JSX tag, missing return parentheses around multi-line JSX, `{` / `}` mismatch.

**"Failed to resolve import" for a relative path**
The import path is wrong. Check the file actually exists at that path relative to the importing file.

---

### APP NOT IN LAUNCHER / WRONG NAME

**App doesn't appear after upload**

- Verify `dist/index.html` exists: `ls apps/<name>/dist/index.html`
- Check the upload script output — did it say "Uploaded" or fall back to a paste script?
- If paste script: copy it and run it in Apogee DevTools (Cmd+Option+I → Console)

**Wrong display name in launcher (shows package name, not a readable title)**
`package.json` is missing the `"description"` field, or it's empty. The Apogee launcher uses `description` as the app's display name.

```json
{
  "name": "my-app",
  "description": "My App",   ← add or fix this
  ...
}
```

Rebuild and re-upload after fixing.

---

### APP WON'T LOAD (blank screen / crash on open)

**App loads but shows blank white screen**
Almost always an uncaught JS error at startup. Open Apogee DevTools (Cmd+Option+I) and check the Console for the actual error, then trace it back to the source.

**"Cannot read properties of null" or "window.apogeeSDK is null" at startup**
The app is accessing SDK methods without a null guard. Fix: always access via `getSDK()` from `webai.js`, and guard before calling:

```javascript
// Bad — throws if sdk is null (local dev, or manager not declared)
window.apogeeSDK.intelligence.chatCompletionStream(...)

// Good — safe in all environments
const sdk = getSDK();
if (!sdk) { /* show dev-mode notice */ return; }
```

**"window.OasisHost is not defined" or similar old API reference**
The app was written using the old globals API. Migrate to `window.apogeeSDK`:

- `window.OasisHost` → `sdk.intelligence`
- `window.ApogeeShell` → `sdk.shell`
- `window.CollaborationManager` → `sdk.room`
- `window.UserIdentityManager` → `sdk.identity`
- `window.E2ECrypto` → `sdk.crypto`

See the `webai-app` skill for the full new API reference.

**App is not a single file (loads but breaks with asset errors)**
`vite.config.js` is missing or misconfigured. It must match this exactly:

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

Verify with: `grep -c "viteSingleFile\|assetsInlineLimit" apps/<name>/vite.config.js` — should return 2.

---

### AI DOES NOTHING (no output, no error)

**Clicking generate has no visible effect**
Usually one of:

1. `getSDK()` returns null (local dev or `"intelligence"` not in manifest) and the app doesn't show an error
2. The event handler isn't connected to the button
3. `streamCompletion` is throwing but the error is swallowed

Check `webai.js` exists and the button's `onClick` calls the generate function. Add a visible error state if missing:

```jsx
} catch (e) {
  setOutput(`Error: ${e.message}`);  // ← make sure this exists
}
```

**`"intelligence"` not in manifest managers**
`sdk.intelligence` is null because the manager wasn't declared. Add it:

```html
"requires": { "managers": ["shell", "intelligence"] }
```

Without this, `sdk` exists but `sdk.intelligence` is `undefined`.

**`intelligenceState` stuck on 'waiting'**
The intelligence subscription isn't set up, or `"intelligence"` isn't in the manifest. Check `src/webai.js` has `onIntelligenceChange` and it's being called in a `useEffect`.

---

### AI HANGS / GENERATION STUCK

**Generation starts but never finishes; no error shown**
With the new SDK there is no `acquire()/release()` lock to manage — generation simply stops when `cancelGeneration()` is called or an error is thrown. If it hangs:

1. Check that the `for await (const chunk of stream)` loop is being awaited (not fire-and-forget)
2. Check the network tab in DevTools for stalled requests
3. Call `sdk.intelligence.cancelGeneration?.()` or reload the shell (Cmd+R)

**Old code with `host.acquire()` / `host.release()` pattern**
This is the legacy OasisHost API. Migrate to `streamCompletion` from `webai.js` which uses `chatCompletionStream` internally — no acquire/release needed.

---

### STORAGE NOT WORKING

**`sdk.storage.save` called but data not found on reload**

- Check `"storage"` is in `requires.managers` in `index.html`. Without it, `sdk.storage` is `undefined`.
- Check `await` is used: `await sdk.storage.set(key, value)` (async method).
- Check values are strings: `sdk.storage.set(key, JSON.stringify(obj))` — the storage API only accepts strings.
- Check the key is consistent: the same string on `set` and `get`.

**Storage works in Apogee but not in local dev**
Expected — `sdk.storage` is null outside Apogee. The helpers in `memory.js` guard for this. If you need dev-mode persistence, fall back to `localStorage`:

```javascript
const sdk = getSDK();
if (sdk?.storage) {
  await sdk.storage.set(key, JSON.stringify(value));
} else {
  localStorage.setItem(key, JSON.stringify(value)); // dev fallback
}
```

---

### UPLOAD / INSTALL ERRORS

**"dist/index.html not found"**
The build hasn't been run or failed silently. Run `npm run build` and check for errors.

**"scripts/upload.js not found"**
The upload script path is wrong. From an app directory, it should be `node ../../scripts/upload.js`. If the file genuinely doesn't exist at `<repo-root>/scripts/upload.js`, the user needs to pull the latest repo.

**Upload script runs but app doesn't install**
If the Tauri app isn't running, the POST to `127.0.0.1:44280` fails and the script falls back to a paste script. Copy the paste script output and run it in:
Apogee → Cmd+Option+I → Console → paste → Enter → reload launcher.

---

## Step 4 — Fix and verify

Apply the fix. Then:

1. **Rebuild:** `cd apps/<name> && npm run build`
2. **Check for errors** — read the full build output
3. **Re-upload:** `node ../../scripts/upload.js`

If the problem was a runtime issue (not a build error), check `dist/index.html` exists and is a single self-contained file:

```bash
grep -c "https\?://" apps/<name>/dist/index.html
```

Should return 0 (or only data URIs/inline sources).

## Step 5 — Report

```
✅ Fixed: <what the problem was>
✅ Rebuilt: dist/index.html (XXX KB)
✅ Uploaded to Apogee — refresh the launcher.

Root cause: <one sentence>
Fix applied: <one sentence>
```

If you couldn't fully diagnose the issue (e.g. the error only appears in Apogee at runtime and the user hasn't shared the DevTools output), tell them exactly what to look for:

```
To see the runtime error:
  Apogee → open the app → Cmd+Option+I → Console tab
  Paste the error here and I'll fix it.
```

---

## Checklist (run through for hard-to-diagnose issues)

When the symptom is vague ("it's broken", "something's wrong"), check these in order:

- [ ] `vite.config.js` has `viteSingleFile()` and correct build options
- [ ] `package.json` has `"description"` field
- [ ] `index.html` has `<script type="application/apogee-shell-manifest+json">` with required managers
- [ ] `src/webai.js` exists and exports `getSDK`, `streamCompletion`, `getIntelligenceState`, `onIntelligenceChange`
- [ ] No `window.OasisHost`, `window.ApogeeShell`, or `window.CollaborationManager` references (old API)
- [ ] `sdk.intelligence` is in manifest managers if using AI
- [ ] `sdk.storage` is in manifest managers if using storage
- [ ] `sdk.room` is in manifest managers if using collaboration
- [ ] `sdk.personas` is in manifest managers if using personas
- [ ] `onIntelligenceChange` subscription cleaned up on unmount (not polling with `setInterval`)
- [ ] Error state is shown in the UI (`catch (e) { setOutput(e.message) }`)
- [ ] `dist/index.html` exists and was built recently (`ls -lh apps/<name>/dist/`)
