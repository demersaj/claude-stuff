---
description: Add sdk.room (P2P rooms, user presence, chat) wiring to an existing webAI app
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Collaboration

Add real-time P2P collaboration via `sdk.room` to a webAI app.

## Process

1. **Read the webai-app skill** for the full `sdk.room` API contract.

2. **Identify target** — use the provided file path or ask the user where collaboration should be added.

3. **Check the shell manifest** in `index.html` — ensure `"room"` (and `"identity"` if showing user names) are listed in `requires.managers`. Add them if missing.

4. **Create `src/collab.js`** — a null-safe wrapper around `sdk.room`:
   ```javascript
   // src/collab.js - webAI room collaboration helpers via apogeeSDK

   const getSDK = () => window.apogeeSDK || null;

   /**
    * Host a new collaboration room.
    * @param {object} opts - { userName?, options? }
    * @returns {Promise<string|null>} Room code or null if unavailable
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

   /** Returns current room state or null */
   export function getRoomState() {
     return getSDK()?.room?.getState?.() ?? null;
   }

   /** Returns array of connected users */
   export function getRoomUsers() {
     return getSDK()?.room?.getUsers?.() ?? [];
   }

   /** Returns list of public rooms */
   export function listPublicRooms() {
     return getSDK()?.room?.listPublicRooms?.() ?? [];
   }

   /**
    * Subscribe to all room state changes.
    * Returns an unsubscribe function — call it on unmount.
    */
   export function onRoomEvent(handler) {
     const sdk = getSDK();
     if (!sdk?.room) return () => {};
     return sdk.room.subscribe(handler);
   }

   export function sendChatMessage(text) {
     getSDK()?.room?.sendChatMessage?.(text);
   }

   /** Returns the local user's identity or a dev-mode fallback */
   export function getIdentity() {
     const sdk = getSDK();
     if (!sdk?.identity) return { displayName: 'You', peerId: 'local', odid: null };
     return sdk.identity.getState();
   }
   ```

5. **For React** — add room state management to the target component:
   ```jsx
   import { hostRoom, joinRoom, disconnectRoom, getRoomState, getRoomUsers, onRoomEvent, getIdentity } from './collab.js';

   const [roomCode, setRoomCode] = useState('');
   const [connected, setConnected] = useState(false);
   const [users, setUsers] = useState([]);

   useEffect(() => {
     const unsub = onRoomEvent((event) => {
       setConnected(!!getRoomState()?.connected);
       setUsers(getRoomUsers());
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
     setConnected(false);
   }
   ```

6. **For Vue** — add to `<script setup>`:
   ```javascript
   import { hostRoom, joinRoom, disconnectRoom, getRoomState, getRoomUsers, onRoomEvent, getIdentity } from './collab.js';

   const roomCode = ref('');
   const connected = ref(false);
   const users = ref([]);
   let unsub = null;

   onMounted(() => {
     unsub = onRoomEvent(() => {
       connected.value = !!getRoomState()?.connected;
       users.value = getRoomUsers();
     });
   });

   onUnmounted(() => unsub?.());

   async function handleHost() {
     const code = await hostRoom({ userName: getIdentity().displayName });
     if (code) roomCode.value = code;
   }

   async function handleJoin(code) {
     await joinRoom(code, { userName: getIdentity().displayName });
     roomCode.value = code;
   }

   function handleLeave() {
     disconnectRoom();
     roomCode.value = '';
     connected.value = false;
   }
   ```

7. **Remind the user** that `sdk.room` is only available when running inside Apogee with `"room"` declared in the manifest. In local dev it's null — the helpers handle this gracefully.

8. **Print summary** of what was added and next steps.

## Rules

- Always wrap `sdk.room` calls with null guards — it's null in local dev and when `"room"` isn't in the manifest.
- Always declare `"room"` in the manifest `requires.managers` — without it, `sdk.room` won't be injected.
- Always return the `onRoomEvent` unsubscribe and call it on unmount to avoid listener leaks.
- The `roomCode` returned by `sdk.room.host()` is the short string peers use to join — always surface it to the user.
- Never expose room passwords in the UI or localStorage.
- Never use `window.CollaborationManager` or `window.UserIdentityManager` — the current API is `sdk.room` and `sdk.identity` via `window.apogeeSDK`.
