---
name: add-collab
description: Add CollaborationManager (P2P rooms, CRDT state sync, presence, chat, voice, file sharing) wiring to an existing webAI app
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Collaboration

Add real-time P2P collaboration via CollaborationManager to a webAI app.

## What CollaborationManager provides

CollaborationManager is a full P2P collaboration layer injected by Apogee. Apps can use as little or as much as needed:

| Feature | Key methods | Good for |
|---------|-------------|----------|
| **Room** | `hostRoom`, `joinRoom`, `leaveRoom` | Any multi-user app |
| **CRDT state** | `updateField`, `getState`, `requestLock` | Shared documents, whiteboards, kanban |
| **Presence** | `getUsers`, `getPresenceMap` | Showing who's online, cursors |
| **Events** | `addListener(type, fn)` | Reacting to any of the above |
| **Chat** | `sendChatMessage`, `sendDirectMessage` | In-app messaging |
| **Voice** | `joinVoice`, `toggleMute` | Audio rooms |
| **Files** | `shareFile`, `getSharedFiles` | Asset/document sharing |
| **Crypto** | `window.E2ECrypto.encrypt/decrypt` | Encrypted DMs |

## Process

1. **Read the target file** (provided as argument, or ask). Understand what the app does — this determines which collaboration features make sense.

2. **Create `src/collab.js`** — a null-safe wrapper. Include only the sections relevant to what the app needs. The full template is below; trim unused sections.

3. **Wire the target component** with the patterns below, adapting to what the app actually needs.

4. **Remind the user** that CollaborationManager is only injected when running inside Apogee. In local dev it's null — the helpers handle this gracefully.

---

## `src/collab.js` template

```javascript
// src/collab.js — webAI CollaborationManager & E2ECrypto helpers
// Trim unused sections for your app.

const getCollab = () =>
  window.CollaborationManager ?? window.parent?.CollaborationManager ?? null;

const getCrypto = () =>
  window.E2ECrypto ?? window.parent?.E2ECrypto ?? null;

// ── Room ─────────────────────────────────────────────────────────────────────

/**
 * Host a new collaboration room.
 * @param {string} roomCode - Short code peers use to join (e.g. "abc-123")
 * @param {object} [settings] - Optional: { roomName, password, isPublic }
 * @returns {Promise<object|null>} Room state or null if unavailable
 */
export async function hostRoom(roomCode, settings = {}) {
  const collab = getCollab();
  if (!collab) { console.warn('[collab] CollaborationManager not available'); return null; }
  return collab.hostRoom(roomCode, settings);
}

/**
 * Join an existing room by code.
 * @param {string} roomCode
 * @param {string} [password]
 */
export async function joinRoom(roomCode, password = null) {
  const collab = getCollab();
  if (!collab) return null;
  return collab.joinRoom(roomCode, password);
}

export function leaveRoom() {
  getCollab()?.leaveRoom?.();
}

export function getRoomSettings() {
  return getCollab()?.getRoomSettings?.() ?? null;
}

/** true when connected to a room */
export function isConnected() {
  return getCollab()?.isConnected ?? false;
}

// ── Presence & Users ─────────────────────────────────────────────────────────

/** Returns array of connected users */
export function getUsers() {
  return getCollab()?.getUsers?.() ?? [];
}

/** Returns presence map: { [odid]: { displayName, appId, ... } } */
export function getPresenceMap() {
  return getCollab()?.getPresenceMap?.() ?? {};
}

/** Returns users currently in a specific app (by sourceId) */
export function getUsersInApp(appSourceId) {
  return getCollab()?.getUsersInApp?.(appSourceId) ?? [];
}

// ── CRDT State Sync ───────────────────────────────────────────────────────────
// CRDT fields are key-value pairs broadcast to all peers instantly.
// Use requestLock before editing to prevent conflicts in competitive scenarios.

/** Broadcast a field update to all peers */
export function updateField(key, value) {
  getCollab()?.updateField?.(key, value);
}

/** Get the current shared state snapshot */
export function getState() {
  return getCollab()?.getState?.() ?? {};
}

/**
 * Request an exclusive edit lock on a field.
 * Returns a promise that resolves to true (lock granted) or false (denied).
 */
export async function requestLock(fieldKey) {
  const collab = getCollab();
  if (!collab) return false;
  return collab.requestLock(fieldKey);
}

export function releaseLock(fieldKey) {
  getCollab()?.releaseLock?.(fieldKey);
}

export function isFieldLocked(fieldKey) {
  return getCollab()?.isFieldLocked?.(fieldKey) ?? false;
}

// ── Events ────────────────────────────────────────────────────────────────────
// Subscribe to collaboration events. Always call the returned cleanup fn on unmount.
//
// Event types:
//   'connected'      — joined a room
//   'disconnected'   — left/lost room
//   'userJoined'     — { user } a peer arrived
//   'userLeft'       — { user } a peer left
//   'usersUpdated'   — full user list changed
//   'stateUpdated'   — { state } CRDT state changed
//   'chatMessage'    — { message } chat received
//   'voiceJoined'    — { user } someone joined voice
//   'voiceLeft'      — { user } someone left voice
//   'lockAcquired'   — { fieldKey } lock granted
//   'lockDenied'     — { fieldKey } lock denied
//   'lockReleased'   — { fieldKey } lock released

/**
 * Subscribe to a collaboration event.
 * @returns {function} cleanup function — call on unmount
 */
export function onCollabEvent(eventType, handler) {
  const collab = getCollab();
  if (!collab) return () => {};
  collab.addListener(eventType, handler);
  return () => collab.removeListener(handler);
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export function sendChatMessage(text) {
  getCollab()?.sendChatMessage?.(text);
}

/** Send an encrypted direct message to a specific user (by odid) */
export async function sendDirectMessage(toOdid, text) {
  const collab = getCollab();
  if (!collab) return;
  return collab.sendDirectMessage(toOdid, text);
}

export function sendTypingIndicator(isTyping, dmToOdid = null) {
  getCollab()?.sendTypingIndicator?.(isTyping, dmToOdid);
}

// ── Voice ─────────────────────────────────────────────────────────────────────

export async function joinVoice() {
  return getCollab()?.joinVoice?.();
}

export function leaveVoice() {
  getCollab()?.leaveVoice?.();
}

export function toggleMute() {
  getCollab()?.toggleMute?.();
}

export function getVoiceParticipants() {
  return getCollab()?.getVoiceParticipants?.() ?? [];
}

// ── File Sharing ──────────────────────────────────────────────────────────────

/** Share a File object with everyone in the room */
export async function shareFile(file) {
  return getCollab()?.shareFile?.(file);
}

export function getSharedFiles() {
  return getCollab()?.getSharedFiles?.() ?? [];
}

export async function requestFile(fileId) {
  return getCollab()?.requestFile?.(fileId);
}

// ── Identity & Crypto ─────────────────────────────────────────────────────────

export async function getIdentity() {
  const im = window.UserIdentityManager ?? window.parent?.UserIdentityManager;
  if (!im) return { odid: 'local', displayName: 'You', profileImage: null };
  return im.getOrCreateIdentity();
}

/** Encrypt a string for a specific recipient (using their public key JWK) */
export async function encryptFor(text, recipientPublicKeyJwk) {
  const crypto = getCrypto();
  if (!crypto) throw new Error('E2ECrypto not available');
  return crypto.encrypt(text, recipientPublicKeyJwk);
}

/** Decrypt a string using the local user's private key */
export async function decrypt(encryptedBase64, privateKeyJwk) {
  const crypto = getCrypto();
  if (!crypto) throw new Error('E2ECrypto not available');
  return crypto.decrypt(encryptedBase64, privateKeyJwk);
}
```

---

## React wiring patterns

### Basic room + CRDT (most common)

```jsx
import { hostRoom, joinRoom, leaveRoom, updateField, getState, onCollabEvent, getUsers, isConnected } from './collab.js';

const [roomCode, setRoomCode] = useState('');
const [connected, setConnected] = useState(false);
const [users, setUsers] = useState([]);
const [sharedState, setSharedState] = useState({});

useEffect(() => {
  const cleanups = [
    onCollabEvent('connected', () => setConnected(true)),
    onCollabEvent('disconnected', () => { setConnected(false); setUsers([]); }),
    onCollabEvent('usersUpdated', ({ users }) => setUsers(users)),
    onCollabEvent('stateUpdated', ({ state }) => setSharedState(state)),
  ];
  return () => cleanups.forEach(fn => fn());
}, []);

async function handleHost() {
  const code = Math.random().toString(36).slice(2, 8); // or let user pick
  await hostRoom(code, { roomName: 'My Room' });
  setRoomCode(code);
}

async function handleJoin(code) {
  await joinRoom(code);
  setRoomCode(code);
  setSharedState(getState()); // sync current state on join
}

// To sync a piece of state to all peers:
function handleChange(key, value) {
  setSharedState(prev => ({ ...prev, [key]: value }));
  updateField(key, value); // broadcasts to everyone
}
```

### Chat

```jsx
const [messages, setMessages] = useState([]);
const [draft, setDraft] = useState('');

useEffect(() => {
  return onCollabEvent('chatMessage', ({ message }) =>
    setMessages(prev => [...prev, message])
  );
}, []);

function handleSend() {
  if (!draft.trim()) return;
  sendChatMessage(draft);
  setDraft('');
}
```

### Voice

```jsx
const [inVoice, setInVoice] = useState(false);
const [muted, setMuted] = useState(false);

async function handleVoiceToggle() {
  if (inVoice) { leaveVoice(); setInVoice(false); }
  else { await joinVoice(); setInVoice(true); }
}
```

---

## Rules

- Always wrap CollaborationManager calls with the null guards in `collab.js` — it's null in local dev and Apogee provides it at runtime.
- Trim `collab.js` to only the features the app actually uses — don't ship the full template if the app only needs rooms and CRDT.
- Always return the `onCollabEvent` cleanup and call it on unmount to avoid listener leaks.
- Use `roomCode` (a short joinable code) as the first arg to `hostRoom`, not a display name — the display name goes in settings.
- For competitive editing (two users editing the same field), use `requestLock`/`releaseLock`. For append-only data (chat, activity logs), just `updateField` directly.
- Never expose room passwords in the UI or localStorage.
