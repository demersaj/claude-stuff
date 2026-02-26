# webai Claude Code Plugin

Build and deploy React or Vue apps to the webAI Apogee shell.

## Commands

| Command | What it does |
|---------|-------------|
| `/webai:new-app <name> [react\|vue] [--description "..."]` | Scaffold a new Vite app wired to Apogee shell APIs |
| `/webai:build-upload [--open]` | Build to single HTML, install into running Apogee Tauri shell (or paste script) |
| `/webai:add-oasis [file]` | Add OasisHost AI inference wiring to a component |
| `/webai:add-collab [file]` | Add CollaborationManager P2P wiring to a component |

## Skills

Agent skills (auto-triggered in Cursor/Claude Code when relevant):

| Skill | What it does |
|-------|---------------|
| **build-upload** | Build the current webAI app to a single HTML file and upload it directly to the running Apogee Tauri shell |
| **webai-app** | webAI Apogee shell app architecture and APIs. Reference for building single-file React/Vue apps with OasisHost AI, navigation, collaboration, and identity APIs |
| **new-app** | Scaffold a new React or Vue app for the webAI Apogee shell |
| **add-oasis** | Add OasisHost AI inference wiring to an existing webAI app |
| **add-collab** | Add CollaborationManager (P2P rooms, CRDT, chat) wiring to an existing webAI app |

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
