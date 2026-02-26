---
name: build-upload
description: Build the current webAI app to a single HTML file and upload it directly to the running Apogee Tauri shell
argument-hint: "[--open]"
allowed-tools: Bash, Read, Write
---

# webAI Build & Upload

Build the current app and install it directly into the running Apogee shell.

## Process

1. **Verify we're in a webAI app directory** — check for `package.json` and `vite-plugin-singlefile` in devDependencies. If not found, warn the user and suggest running `/webai:new-app` first.

2. **Verify vite.config** uses `vite-plugin-singlefile`. If not, patch it automatically.

3. **Run the build:**
   ```bash
   npm run build
   ```
   If the build fails, show the error and stop.

4. **Verify output** - check that `dist/index.html` exists and is a self-contained file (no external script/link tags pointing to relative paths).

5. **Run the upload script:**
   ```bash
   node ../../scripts/upload.js
   ```
   The upload script lives at `<repo-root>/scripts/upload.js`. It:
   - POSTs `{ name, html }` to `http://127.0.0.1:44280/install` — the local install server the Tauri app exposes
   - The Tauri server calls `window.ApogeeShell.uploadApp()` in the running shell webview directly
   - If the Tauri app isn't running, the script automatically falls back to printing a DevTools paste script

   If `scripts/upload.js` is missing, tell the user it should be at `<repo-root>/scripts/upload.js` — it was added alongside the Tauri install server and they may need to pull latest.

6. **Report the outcome clearly:**

   When Tauri app is running (direct install):
   ```
   ✅ Build complete: dist/index.html (<size> KB)
   ✅ "<display-name>" installed directly into Apogee — refresh the launcher.
   ```

   When Tauri app is not running (fallback paste):
   ```
   ✅ Build complete: dist/index.html (<size> KB)
   ⚠️  Tauri app not running — paste the script printed above into:
       Apogee → Cmd+Option+I → Console → Enter
   ```

7. **If `--open` flag is passed**, also run `npm run preview` to open a local preview of the built file.

## Rules

- Do not modify the HTML output after build - the upload script uses it verbatim.
- Always show file size of the built HTML so the user knows if it's getting large.
- If `dist/index.html` is larger than 5 MB, warn the user - large apps may have performance issues in Apogee.
- The `scripts/upload.js` path is relative to the repo root, not the app directory. Apps live in `apps/<name>/` so the path from there is `../../scripts/upload.js`.
