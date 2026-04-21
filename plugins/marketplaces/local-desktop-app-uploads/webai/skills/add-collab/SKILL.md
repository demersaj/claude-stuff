---
name: add-collab
description: Add sdk.room (P2P rooms, user presence, chat) wiring to an existing webAI app
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Collaboration

Add real-time P2P collaboration via `sdk.room` to a webAI app.

## What sdk.room provides

| Feature | Key methods | Good for |
|---------|-------------|----------|
| **Room** | `host`, `join`, `disconnect` | Any multi-user app |
| **State** | `getState` | Room metadata, connection status |
| **Presence** | `getUsers` | Showing who's online |
| **Discovery** | `listPublicRooms` | Browsing available rooms |
| **Events** | `subscribe` | Reacting to all room changes |
| **Chat** | `sendChatMessage` | In-room text messages |

## Process

1. **Read the target file** (provided as argument, or ask). Understand what the app does — this determines which collaboration features make sense.

2. **Check the shell manifest** in `index.html` — ensure `"room"` (and `"identity"` if showing user names) are listed in `requires.managers`. Add them if missing.

3. **Create `src/collab.js`** — a null-safe wrapper. Include only the sections relevant to what the app needs.

4. **Wire the target component** with the patterns below, adapting to what the app actually needs.

5. **Remind the user** that `sdk.room` is only available when running inside Apogee with the `"room"` manager declared. In local dev it's null — the helpers handle this gracefully.

---

## `src/collab.js` template

```javascript
// src/collab.js — webAI room collaboration helpers via apogeeSDK
// Trim unused sections for your app.

const getSDK = () => window.apogeeSDK || null;

// ── Room ─────────────────────────────────────────────────────────────────────

/**
 * Host a new collaboration room.
 * @param {object} opts - { userName?, options? }
 * @returns {Promise<string|null>} Room code (short join code) or null if unavailable
 */
export async function hostRoom(opts = {}) {
  const sdk = getSDK();
  if (!sdk?.room) { console.warn('[collab] sdk.room not available'); return null; }
  return sdk.room.host(opts);
}

/**
 * Join an existing room by code.
 * @param {string} roomCode
 * @param {object} opts - { userName?, password?, hostPeerId? }
 */
export async function joinRoom(roomCode, opts = {}) {
  const sdk = getSDK();
  if (!sdk?.room) return null;
  return sdk.room.join({ roomCode, ...opts });
}

export function disconnectRoom() {
  getSDK()?.room?.disconnect?.();
}

// ── State & Presence ──────────────────────────────────────────────────────────

/** Returns current ApogeeRoomState or null */
export function getRoomState() {
  return getSDK()?.room?.getState?.() ?? null;
}

/** Returns array of connected users */
export function getRoomUsers() {
  return getSDK()?.room?.getUsers?.() ?? [];
}

/** Returns list of public rooms: [{ roomCode, roomName, userCount, isPublic, requiresPassword }] */
export function listPublicRooms() {
  return getSDK()?.room?.listPublicRooms?.() ?? [];
}

// ── Events ────────────────────────────────────────────────────────────────────
// Subscribe to all room state changes.
// The handler receives ApogeeFacadeEvent<string, ApogeeRoomState>.
// Common event.type values: 'connected', 'disconnected', 'state', 'users'
//
// Returns an unsubscribe function — call it on unmount.

export function onRoomEvent(handler) {
  const sdk = getSDK();
  if (!sdk?.room) return () => {};
  return sdk.room.subscribe(handler);
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export function sendChatMessage(text) {
  getSDK()?.room?.sendChatMessage?.(text);
}

// ── Identity ─────────────────────────────────────────────────────────────────

/** Returns the local user's identity state or a fallback for dev mode */
export function getIdentity() {
  const sdk = getSDK();
  if (!sdk?.identity) return { displayName: 'You', peerId: 'local', odid: null };
  return sdk.identity.getState();
}
```

---

## React wiring patterns

### Basic room + presence (most common)

```jsx
import { hostRoom, joinRoom, disconnectRoom, getRoomState, getRoomUsers, onRoomEvent, listPublicRooms } from './collab.js';

const [roomCode, setRoomCode] = useState('');
const [connected, setConnected] = useState(false);
const [users, setUsers] = useState([]);
const [publicRooms, setPublicRooms] = useState([]);

useEffect(() => {
  // Load public rooms on mount
  setPublicRooms(listPublicRooms());

  // Subscribe to all room events
  const unsub = onRoomEvent((event) => {
    const state = getRoomState();
    setConnected(!!state?.connected);
    setUsers(getRoomUsers());
    // Refresh public rooms list on disconnect
    if (event.type === 'disconnected') setPublicRooms(listPublicRooms());
  });
  return unsub;
}, []);

async function handleHost() {
  const code = await hostRoom({ userName: getIdentity().displayName });
  if (code) setRoomCode(code);
}

async function handleJoin(code) {
  await joinRoom(code, { userName: getIdentity().displayName });
  setRoomCode(code);
}

function handleLeave() {
  disconnectRoom();
  setRoomCode('');
}
```

### Chat

```jsx
import { sendChatMessage, onRoomEvent } from './collab.js';

const [messages, setMessages] = useState([]);
const [draft, setDraft] = useState('');

useEffect(() => {
  return onRoomEvent((event) => {
    // Chat messages arrive as a state event — check the room state for new messages
    // or look for event.type === 'chat' depending on platform version
    if (event.type === 'chat' && event.data?.text) {
      setMessages(prev => [...prev, { text: event.data.text, from: event.data.from }]);
    }
  });
}, []);

function handleSend() {
  if (!draft.trim()) return;
  sendChatMessage(draft);
  setDraft('');
}
```

### Showing connected users

```jsx
<div className="users">
  {users.map((user, i) => (
    <div key={user.peerId ?? i} className="user">
      <span className="user-dot" />
      {user.displayName ?? user.userName ?? 'Anonymous'}
    </div>
  ))}
</div>
```

---

## Rules

- Always wrap `sdk.room` calls with the null guard in `collab.js` — it's null in local dev and when `"room"` isn't in the manifest.
- Always declare `"room"` in the manifest `requires.managers` — without it, `sdk.room` won't be injected even when running in Apogee.
- Trim `collab.js` to only the features the app actually uses — don't ship the full template if the app only needs `host/join`.
- Always return the `onRoomEvent` unsubscribe and call it on unmount to avoid listener leaks.
- The `roomCode` returned by `sdk.room.host()` is the short string peers use to join — show it to the user so they can share it.
- Never expose room passwords in the UI or localStorage.
- If the app uses Signal Design System (`@webai/signal-ui` in `package.json`), render room controls, user chips, and chat input with Signal components (`Button`, `Input`, `Card`, `Badge` — verify in `node_modules/@webai/signal-ui/llms.txt`) and token-backed Tailwind classes (`bg-card`, `border-border`, `text-muted-foreground`). Never hardcode colors.
