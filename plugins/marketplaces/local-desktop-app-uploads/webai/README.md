# webai Claude Code Plugin

Build and deploy React or Vue apps to the webAI Apogee shell.

## Commands

| Command | What it does |
|---------|-------------|
| `/webai:create-app <description>` | Idea → full working app → upload in one shot |
| `/webai:new-app <name> [react\|vue]` | Scaffold a new Vite app wired to Apogee shell APIs |
| `/webai:update-app <app> <change>` | Modify an existing app, rebuild, and upload |
| `/webai:debug-app <app> [symptom]` | Diagnose and fix a broken app |
| `/webai:build-upload [--open]` | Build to single HTML, install into running Apogee Tauri shell (or paste script) |
| `/webai:add-oasis [file]` | Add `sdk.intelligence` AI inference wiring to a component |
| `/webai:add-collab [file]` | Add `sdk.room` P2P collaboration wiring to a component |
| `/webai:add-persona [file]` | Add Apogee persona support to an existing app |
| `/webai:add-memory [file]` | Add persistent AI conversation memory to an existing app |

## Skills

Agent skills (auto-triggered in Cursor/Claude Code when relevant):

| Skill | What it does |
|-------|---------------|
| **create-app** | Idea → full working app → upload in one shot. Scaffold, implement real UI, build, upload |
| **new-app** | Scaffold a new React or Vue app for the webAI Apogee shell |
| **update-app** | Modify an existing app (add feature, fix bug, restyle), rebuild, and upload |
| **debug-app** | Diagnose and fix broken apps — build failures, runtime crashes, AI not working, upload errors |
| **build-upload** | Build the current webAI app to a single HTML file and upload it directly to the running Apogee Tauri shell |
| **webai-app** | webAI Apogee shell app architecture and APIs. Reference for building single-file React/Vue apps with `sdk.intelligence`, storage, room, personas, identity, and shell APIs |
| **add-oasis** | Add `sdk.intelligence` AI inference wiring to an existing webAI app |
| **add-collab** | Add `sdk.room` (P2P rooms, user presence, chat) wiring to an existing webAI app |
| **add-persona** | Add Apogee persona support — hardcoded specialty, user-selectable picker, or full permission flow |
| **add-memory** | Add persistent AI conversation memory — scrollable history, auto-saved per app, clear button |

## Installation

### Local (recommended for development)

```bash
cp -r webai-plugin ~/.claude/plugins/webai
```

Or from inside Claude Code:

```
/plugin add ./webai-plugin
```

## Typical workflows

```bash
# Build a new app from scratch (recommended)
/webai:create-app a pomodoro timer with AI encouragement

# Or scaffold manually, then build
/webai:new-app my-tool react
# ... edit src/App.jsx ...
/webai:build-upload

# Add features to an existing app
/webai:add-oasis          # wire in AI inference
/webai:add-memory         # persistent chat history
/webai:add-persona        # persona selection
/webai:add-collab         # P2P collaboration

# Iterate on a built app
/webai:update-app pomodoro-timer add a dark mode toggle

# Fix a broken app
/webai:debug-app my-app the AI button does nothing
```

## How uploads work

Apps are POSTed to the Tauri local install server at `http://127.0.0.1:44280/install`. If the Tauri app is running, the app installs directly into the shell. If not, the upload script prints a DevTools paste script as a fallback.

## Shell APIs available to your app

Access everything via `window.apogeeSDK` (injected by the Apogee shell):

| API | Access | Use for |
|-----|--------|---------|
| AI inference | `sdk.intelligence` | Chat completion, streaming, state |
| App storage | `sdk.storage` | Persistent key/value data |
| Navigation | `sdk.shell` | Views, launcher, apps, recents |
| Collaboration | `sdk.room` | P2P rooms, user presence, chat |
| Personas | `sdk.personas` | AI persona selection |
| Identity | `sdk.identity` | User profile, peer ID |
| Theme | `sdk.theme` | Dark/light mode |
| Crypto | `sdk.crypto` | E2E encryption |
| Messaging | `sdk.messaging` | Conversations, AI threads |

All APIs are null in local dev (outside Apogee). The `src/webai.js` helper handles this gracefully.

## Templates

The `templates/` directory contains:

- `webai.js` - Shell API helpers (copied to `src/webai.js` in new apps)
- `react/App.jsx` - React starter with intelligence subscribe and back button
- `vue/App.vue` - Vue starter with intelligence subscribe and back button
- `upload.js` - Upload script (lives at `scripts/upload.js` in the repo root)

## Evaluation suite

Evaluations are **anchored to** `skills/webai-app/references/app-start-kit.html`: the runner parses the embedded shell manifest from that file and compares it to `evaluations/contract.json`, then checks that templates and skill docs still match the SDK patterns documented in the start kit.

| File | Purpose |
|------|---------|
| `evaluations/contract.json` | Expected manifest snapshot + lists of substring checks for the start kit, `templates/`, and key skills |
| `evaluations/manifest-extract.mjs` | Shared manifest parser (used by runner and refresh script) |
| `evaluations/run-eval.mjs` | Full suite (Node 18+) |
| `evaluations/refresh-contract.mjs` | Updates `canonicalShellManifest` in `contract.json` after `app-start-kit.html` changes |
| `evaluations/README.md` | Details and extension points |

**Run (from this plugin directory):**

```bash
node evaluations/run-eval.mjs
node evaluations/run-eval.mjs --workspace /path/to/your/webai-monorepo
```

See `evaluations/README.md` for the full checklist and how to extend `contract.json`.
