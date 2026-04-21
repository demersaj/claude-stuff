---
name: update-app
description: >
  Modify an existing webAI Apogee app — add a feature, fix a bug, restyle, or extend functionality — then rebuild and upload in one shot.
  Use this skill whenever the user wants to change an app that already exists: "add X to my app", "update the pomodoro timer to also...", "fix the bug where...", "change the styling of...", "my app needs to also...", or any request to modify rather than create from scratch.
  This skill reads the current code first, makes targeted edits, rebuilds, and uploads.
argument-hint: "<app-name-or-path> <description of change>"
allowed-tools: Bash, Read, Write, Glob, Grep
---

# webAI Update App

Modify an existing Apogee app, rebuild, and upload — without rewriting what already works.

## Step 1 — Locate the app

Parse the argument for the app name or path. Apps live in `apps/<name>/` relative to the repo root.

- If a name is given (e.g. `pomodoro-timer`), look for `apps/pomodoro-timer/`
- If no name is given, check if the current directory is an app (has `package.json` with `vite-plugin-singlefile` in devDependencies)
- If still ambiguous, list `apps/` and ask the user which one

Verify the app exists before proceeding.

## Step 2 — Read the current code

Read all relevant source files before touching anything. At minimum:

```
apps/<name>/package.json          — app name, description, dependencies
apps/<name>/index.html            — shell manifest (check declared managers)
apps/<name>/src/App.jsx           — main component (or App.vue)
apps/<name>/src/webai.js          — SDK integration layer (if exists)
apps/<name>/vite.config.js        — build config
```

Also read any other files that the change will touch.

**Do not skip this step.** Making changes without reading the current implementation leads to broken imports, duplicated state, and overwritten logic.

## Step 3 — Understand the change

Parse the requested change carefully. Identify:

- **What to add** — new feature, new UI element, new API integration
- **What to modify** — existing behaviour, styling, logic, copy
- **What to fix** — a specific bug, broken behaviour
- **What to remove** — a feature the user no longer wants

If the description is ambiguous (e.g. "make it better"), ask one focused question before proceeding.

**Check if the change requires a manager the app doesn't yet declare:**

| Need | Manager | Also add |
|------|---------|----------|
| AI inference | `intelligence` | `src/webai.js` with `streamCompletion` |
| Persistence | `storage` | `src/memory.js` helpers |
| Personas | `personas` | `src/persona.js` helpers |
| Collaboration | `room` | `src/collab.js` helpers |
| User profile | `identity` | `sdk.identity.getState()` |

If a manager is needed but not in the manifest, add it to `requires.managers` in `index.html`.

**Check if the app uses Signal Design System.** Look for `@webai/signal-ui` in `package.json` dependencies:

- **Signal present** — every new UI element MUST use Signal components (`Button`, `Card`, `Input`, `Dialog`, etc.) and token-backed Tailwind classes (`bg-background`, `text-foreground`, `bg-primary`, `border-border`). Before adding UI, read `node_modules/@webai/signal-ui/llms.txt` for the current API. Never hardcode colors, never invent component names.
- **Signal absent, UI change requested, and app is React** — offer to add Signal as part of the change (install `@webai/signal-ui @webai/signal-token tailwindcss @tailwindcss/vite`, update `vite.config.js`, wrap in `ThemeProvider`, import styles). If the user declines or it would bloat the diff, stay consistent with the app's existing CSS approach.
- **Signal absent, non-UI change** — leave styling alone.

**Check the webai.js version** — if the app has an old-style `webai.js` using `window.OasisHost`, `window.ApogeeShell`, etc., migrate it to the current `window.apogeeSDK` pattern before adding new features. The canonical template is in the `new-app` skill (full API reference in `webai-app`). This is a prerequisite, not optional.

## Step 4 — Make targeted edits

Edit only what needs to change. Preserve all existing logic, state, and styling that isn't being modified.

**Prefer surgical edits over rewrites.** If you're adding a button, add the button and its handler — don't reconstruct the whole component. If you're fixing a bug in one function, fix that function.

**Rewrite only when:**

- The existing code uses the old OasisHost/ApogeeShell/CollaborationManager API — migrate to apogeeSDK fully
- The change is structural enough that targeted edits would leave the code inconsistent
- The user explicitly asks for a refactor or restyle

**Common change patterns:**

Adding AI to an existing non-AI flow:

- Add `intelligenceState` state and `onIntelligenceChange` subscription in `useEffect`
- Add `isGenerating` state and output state
- Import `streamCompletion` and `onIntelligenceChange` from `./webai.js`
- Wire a button click to the generate function
- Ensure `"intelligence"` is in the manifest managers

Adding persistence:

- Add `"storage"` to manifest managers
- Create `src/memory.js` from the `add-memory` skill template
- Load on mount, save on change

Adding a feature:

- Add state, handler, and JSX for the new feature
- Import any new helpers from `webai.js`, `persona.js`, `memory.js`, or `collab.js`
- Don't disturb existing state/handlers unless they conflict

Fixing a bug:

- Read the exact broken code, diagnose the root cause
- Fix the specific logic — don't reorganize surrounding code

## Step 5 — Check `webai.js` completeness

If the change involves any SDK API, verify `src/webai.js`:

1. **Exists** — if not, create it from the canonical template (see `new-app` or `webai-app` skill)
2. **Uses `window.apogeeSDK`** — not `window.OasisHost` or any old globals
3. **Exports what's needed** — `getSDK`, `streamCompletion`, `getIntelligenceState`, `onIntelligenceChange`, `cancelGeneration`, `goToLauncher`

If the existing `webai.js` still uses `window.OasisHost`, rewrite it entirely to the current template — partial migration causes subtle bugs.

## Step 6 — Build

```bash
cd apps/<name>
npm run build
```

If the build fails, read the error, fix it, and rebuild. Don't give up after one failure — common issues:

- Missing import → add the import
- Unused variable warning treated as error → remove the variable
- JSX syntax error → check unclosed tags or missing braces
- `vite-plugin-singlefile` not installed → `npm install --save-dev vite-plugin-singlefile`

Show the built file size: `du -sh dist/index.html`. Warn if over 5 MB.

## Step 7 — Upload

```bash
node ../../scripts/upload.js
```

The script POSTs to `http://127.0.0.1:44280/install`. If the Tauri app is running, it installs directly. If not, it prints a DevTools paste script.

## Step 8 — Report

Summarise exactly what changed:

```
✅ Updated: <App Name> (dist/index.html — XXX KB)
✅ Uploaded to Apogee — refresh the launcher.

Changes made:
- <concise bullet describing what was added/fixed/changed>
- <another bullet if multiple things changed>

To keep iterating:
  /webai:update-app <name> <next change>
```

---

## Rules

- Read before you write — always read the current code in Step 2 before making any edits.
- Touch only what's needed — don't reorganise, rename, or clean up code that isn't part of the change.
- Preserve the single-file build — `vite.config.js` must keep `viteSingleFile()`. Don't add CDN links or external assets.
- Keep `package.json` description intact — the Apogee launcher uses it as the display name.
- If the app uses old globals (`window.OasisHost`, etc.), migrate `webai.js` fully to `window.apogeeSDK` before building on top of it — don't mix the two APIs.
- If the app doesn't have `webai.js` but the change needs SDK APIs, create it from the canonical template rather than inlining the logic in `App.jsx`.
- Don't add new features beyond what was asked. If you notice something broken while making the change, fix it only if it's in the same area of code you're already touching — otherwise note it in the report.
- If the app already uses Signal, all new UI must use Signal components and token-backed Tailwind classes — never mix in raw hex colors or another UI library. Read `node_modules/@webai/signal-ui/llms.txt` before adding any component.
