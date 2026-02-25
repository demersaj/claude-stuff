---
description: Build the current webAI app to a single HTML file and generate the upload script
argument-hint: "[--open]"
allowed-tools: Bash, Read, Write
---

# webAI Build & Upload

Build the current app and generate an upload script for the Apogee shell.

## Process

1. **Verify we're in a webAI app directory** - check for `package.json` and `vite-plugin-singlefile` in devDependencies. If not found, warn the user and suggest running `/webai:new-app` first.

2. **Verify vite.config** uses `vite-plugin-singlefile`. If not, patch it automatically.

3. **Run the build:**
   ```bash
   npm run build
   ```
   If the build fails, show the error and stop.

4. **Verify output** - check that `dist/index.html` exists and is a self-contained file (no external script/link tags pointing to relative paths).

5. **Run the upload script generator:**
   ```bash
   node scripts/upload.js
   ```
   If `scripts/upload.js` doesn't exist, create it first using the template from the webai-app skill.

6. **Print the upload instructions** clearly:
   ```
   ✅ Build complete: dist/index.html (<size>)

   To upload to your Apogee shell:
   1. Open your Apogee shell in Chrome
   2. Open DevTools (F12 or Cmd+Option+I)
   3. Click the Console tab
   4. Paste the script above and press Enter
   5. Refresh the Apogee launcher

   Your app "<display-name>" will appear in the launcher.
   ```

7. **If `--open` flag is passed**, also run `npm run preview` to open a local preview of the built file.

## Rules

- Do not modify the HTML output after build - the upload script uses it verbatim.
- Always show file size of the built HTML so the user knows if it's getting large.
- If `dist/index.html` is larger than 5MB, warn the user - large apps may have performance issues in Apogee.
