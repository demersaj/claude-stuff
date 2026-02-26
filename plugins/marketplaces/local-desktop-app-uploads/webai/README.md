# webai Claude Code Plugin

Build and deploy React or Vue apps to the webAI Apogee shell.

## Commands

| Command | What it does |
|---------|-------------|
| `/webai:new-app <name> [react\|vue]` | Scaffold a new Vite app wired to Apogee shell APIs |
| `/webai:build-upload` | Build to a single HTML file and generate the upload script |
| `/webai:add-oasis [file]` | Add OasisHost AI inference wiring to a component |
| `/webai:add-collab [file]` | Add CollaborationManager P2P wiring to a component |

## Skills

Agent skills (auto-triggered in Cursor/Claude Code when relevant):

| Skill | Triggers on | What it does |
|-------|-------------|---------------|
| **build-upload** | Build, upload, deploy webAI app | Build to single HTML, install directly into running Apogee Tauri shell (or fallback paste script) |
| **webai-app** | webAI, Apogee, shell app | Reference for architecture, APIs, OasisHost, navigation, collaboration |
| **new-app** | Scaffold, new app, webAI app | Scaffold React or Vue app wired to Apogee shell |
| **add-oasis** | OasisHost, AI inference | Add OasisHost AI wiring to a component |
| **add-collab** | CollaborationManager, P2P, collab | Add CollaborationManager (rooms, CRDT, chat) wiring to a component |

## Installation

### Local (recommended for development)

```bash
cp -r webai-plugin ~/.claude/plugins/webai
```

Or from inside Claude Code:
```
/plugin add ./webai-plugin
```

### From GitHub

```
/plugin marketplace add https://github.com/YOUR_ORG/webai-plugin
/plugin install webai
```

## Typical workflow

```bash
# 1. Scaffold a new app
/webai:new-app my-tool react

# 2. Build your app in Claude Code (or manually)
cd my-tool
# ... edit src/App.jsx ...

# 3. Build and upload
/webai:build-upload

# 4. If Apogee Tauri app is running: app installs directly — refresh the launcher.
#    If not: paste the generated script into the Apogee browser console, then refresh.
```

## How uploads work

Apps are stored in the browser's `localStorage` under the key `apogee-uploaded-apps`. The Apogee shell reads this on startup and registers each entry as a user app in the launcher. The upload script generates a `sourceId` (SHA-256 content hash) that the shell uses for cross-device sync and version tracking - matching the same approach used by `ApogeeShellManager`.

## Shell APIs available to your app

| API | Access | Key methods |
|-----|--------|-------------|
| `OasisHost` | `window.OasisHost ?? window.parent?.OasisHost` | `acquire()`, `request()`, `release()`, `getStatus()` |
| `ApogeeShell` | `window.ApogeeShell ?? window.parent?.ApogeeShell` | `setView(viewId)` |
| `CollaborationManager` | `window.CollaborationManager ?? window.parent?.CollaborationManager` | Room, CRDT, chat, voice |
| `UserIdentityManager` | `window.UserIdentityManager ?? window.parent?.UserIdentityManager` | `getOrCreateIdentity()`, `getAuthHeaders()` |
| `E2ECrypto` | `window.E2ECrypto ?? window.parent?.E2ECrypto` | Encrypt/decrypt helpers |

All APIs are null in local dev (outside Apogee). The `src/webai.js` helper handles this gracefully.

## Templates

The `templates/` directory contains:
- `webai.js` - Shell API helpers (copied to `src/webai.js` in new apps)
- `react/App.jsx` - React starter with Oasis polling and back button
- `vue/App.vue` - Vue starter with Oasis polling and back button
- `upload.js` - Upload script generator (copied to `scripts/upload.js` in new apps)
