---
name: add-collab
description: Add CollaborationManager (P2P rooms, CRDT, chat) wiring to an existing webAI app
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Collaboration

Add real-time P2P collaboration via CollaborationManager to a webAI app.

## Process

1. **Read the webai-app skill** for CollaborationManager API details.

2. **Identify target** - use the provided file path or ask the user where collaboration should be added.

3. **Create `src/collab.js`** - a safe wrapper around CollaborationManager:
   ```javascript
   // src/collab.js - webAI CollaborationManager helpers

   export const getCollab = () =>
     window.CollaborationManager ?? window.parent?.CollaborationManager ?? null;

   export const getUserIdentity = () =>
     window.UserIdentityManager ?? window.parent?.UserIdentityManager ?? null;

   /**
    * Host a new collaboration room.
    * Returns the room code or null if CollaborationManager is unavailable.
    */
   export async function hostRoom(roomName, password = null) {
     const collab = getCollab();
     if (!collab) {
       console.warn('[collab] CollaborationManager not available.');
       return null;
     }
     return collab.hostRoom({ roomName, password });
   }

   /**
    * Join an existing room by code.
    */
   export async function joinRoom(roomCode, password = null) {
     const collab = getCollab();
     if (!collab) return null;
     return collab.joinRoom(roomCode, password);
   }

   /**
    * Leave the current room.
    */
   export function leaveRoom() {
     const collab = getCollab();
     collab?.leaveRoom();
   }

   /**
    * Get the current room state (code, peers, etc.)
    */
   export function getRoomState() {
     const collab = getCollab();
     return collab?.getRoomState?.() ?? null;
   }

   /**
    * Get the local user's ODID and display name.
    */
   export async function getIdentity() {
     const im = getUserIdentity();
     if (!im) return { odid: 'local', displayName: 'You' };
     return im.getOrCreateIdentity();
   }
   ```

4. **For React** - add room state management to the target component:
   ```jsx
   const [roomState, setRoomState] = useState(null);
   const [identity, setIdentity] = useState(null);

   useEffect(() => {
     getIdentity().then(setIdentity);
   }, []);

   async function handleHostRoom() {
     const state = await hostRoom('My Room');
     setRoomState(state);
   }

   async function handleJoinRoom(code) {
     const state = await joinRoom(code);
     setRoomState(state);
   }

   function handleLeaveRoom() {
     leaveRoom();
     setRoomState(null);
   }
   ```

5. **For Vue** - add to `<script setup>`:
   ```javascript
   const roomState = ref(null);
   const identity = ref(null);

   onMounted(async () => {
     identity.value = await getIdentity();
   });

   async function handleHostRoom() {
     roomState.value = await hostRoom('My Room');
   }

   async function handleJoinRoom(code) {
     roomState.value = await joinRoom(code);
   }

   function handleLeaveRoom() {
     leaveRoom();
     roomState.value = null;
   }
   ```

6. **Remind the user** that CollaborationManager is only injected when the app is running inside Apogee. In local dev, it will be null - handle gracefully with the null checks in `collab.js`.

7. **Print summary** of what was added and next steps.

## Rules

- Always wrap CollaborationManager calls with null guards - it may not be available.
- Never assume the user is already in a room - always check room state before calling room-specific methods.
- Do not expose room passwords in the UI or localStorage.
