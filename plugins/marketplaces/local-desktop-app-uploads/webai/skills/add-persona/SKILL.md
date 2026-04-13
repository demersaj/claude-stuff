---
name: add-persona
description: >
  Add Apogee persona support to an existing webAI app — lets the app use a specific AI persona, request user permission to access personas, or show a persona picker UI.
  Use this skill when the user wants their app to use a named AI persona, route to a specialty (coding/writing/etc.), let users choose a persona, or when the user says "add persona support", "use the coding persona", "let users pick an AI personality", or similar.
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Persona

Add Apogee persona support to an existing webAI app via `sdk.personas`.

## What personas are

Personas are AI identities stored in Apogee — each has a name, description, and a list of specialties (e.g. `"coding"`, `"writing"`, `"general"`). Apps can use them in several ways:

- **By ID** (`sdk.personas.setActive(id)`) — targets a specific persona directly; no permission needed
- **By specialty + permission** (`sdk.personas.requestAccess(appId, 'coding')`) — routes to whichever persona the user has configured for that specialty slot; triggers an approval modal the first time
- **Active persona** (`sdk.intelligence.getActivePersona(appId)`) — reads which persona is currently active for this app, without setting it

When a persona with a system prompt template is active, it influences the model's behavior automatically. You don't need to fight it — just omit or leave `systemPrompt` empty if using persona routing.

---

## Step 1 — Read the target file

Read the component or file specified. Understand what the app does and what kind of persona integration fits:

- **Single hardcoded persona** — app always uses one specialty (e.g. a coding helper always uses `"coding"`)
- **User-selectable picker** — app lists available personas and lets the user choose
- **Active persona display** — app reads and shows which persona is active without changing it

Pick the right pattern for the app. Most apps need just one.

---

## Step 2 — Check the shell manifest

Ensure `"personas"` is in `requires.managers` in `index.html`. If missing, add it:

```html
"requires": {
  "managers": ["shell", "intelligence", "personas"]
}
```

---

## Step 3 — Create `src/persona.js`

```javascript
// src/persona.js — Apogee persona helpers via sdk.personas

const getSDK = () => window.apogeeSDK || null;

/**
 * List all personas installed in this Apogee instance.
 * Returns [{ id, name, description, specialties: string[] }]
 * Returns [] in local dev or if "personas" not in manifest.
 */
export function listPersonas() {
  return getSDK()?.personas?.listPersonas?.() ?? [];
}

/**
 * Get the currently active persona (global shell selection).
 * Returns { id, name } | null
 */
export function getActivePersona() {
  return getSDK()?.personas?.getActivePersona?.() ?? null;
}

/**
 * Get the active persona scoped to this specific app.
 * Returns { id, name } | null
 */
export function getAppActivePersona(appId) {
  return getSDK()?.intelligence?.getActivePersona?.(appId) ?? null;
}

/**
 * Set the active persona by ID (no permission needed).
 * Returns true if set successfully.
 */
export function setActivePersona(personaId) {
  return getSDK()?.personas?.setActive?.(personaId) ?? false;
}

/**
 * Request access to a persona by specialty (e.g. "coding", "writing", "general").
 * Apogee shows the user an approval modal the first time — subsequent calls are instant.
 * Returns true if access was granted, false if denied.
 */
export async function requestPersonaAccess(personaType, appId) {
  const sdk = getSDK();
  if (!sdk?.personas?.requestAccess) return false;
  return sdk.personas.requestAccess(appId, personaType);
}

/**
 * Get all persona permissions for this app.
 * Returns { [specialty]: { id, name, type } }
 */
export function getPersonaPermissions(appId) {
  return getSDK()?.personas?.getPermissions?.(appId) ?? {};
}

/**
 * Remove this app's permission to use a persona specialty.
 */
export async function removePersonaAccess(personaType, appId) {
  const sdk = getSDK();
  if (!sdk?.personas?.removePermission) return;
  return sdk.personas.removePermission(appId, personaType);
}

/**
 * Subscribe to persona state changes.
 * Returns unsubscribe fn — call on unmount.
 */
export function onPersonasChange(handler) {
  const sdk = getSDK();
  if (!sdk?.personas) return () => {};
  return sdk.personas.subscribe(handler);
}
```

---

## Step 4 — Implement the chosen pattern

### Pattern A — Single hardcoded specialty (simplest)

Best when the app has one clear purpose (coding helper, writing tool, etc.).

```jsx
import { requestPersonaAccess, getAppActivePersona } from './persona.js';
import { streamCompletion } from './webai.js';

const APP_ID = document.querySelector('[id="apogee-shell-manifest"]')
  ? JSON.parse(document.querySelector('[id="apogee-shell-manifest"]').textContent).name
  : null;

// On mount, request access once
useEffect(() => {
  requestPersonaAccess('coding', APP_ID);
}, []);

// Show which persona is active
const activePersona = getAppActivePersona(APP_ID);

async function generate(prompt) {
  setOutput('');
  try {
    await streamCompletion(prompt, {
      // No systemPrompt needed — active persona provides its own
      onToken: (t) => setOutput(prev => prev + t),
    });
  } catch (e) {
    setOutput(`Error: ${e.message}`);
  }
}
```

### Pattern B — User-selectable persona picker

Best when the app serves multiple purposes or users should control the personality.

```jsx
import { listPersonas, setActivePersona, getActivePersona, onPersonasChange } from './persona.js';
import { streamCompletion } from './webai.js';

const [personas, setPersonas] = useState([]);
const [activePersona, setActivePersonaState] = useState(null);

useEffect(() => {
  setPersonas(listPersonas());
  setActivePersonaState(getActivePersona());
  const unsub = onPersonasChange(() => {
    setPersonas(listPersonas());
    setActivePersonaState(getActivePersona());
  });
  return unsub;
}, []);

function handleSelectPersona(persona) {
  setActivePersona(persona.id);
  setActivePersonaState(persona);
}

async function generate(prompt) {
  setOutput('');
  try {
    await streamCompletion(prompt, {
      onToken: (t) => setOutput(prev => prev + t),
    });
  } catch (e) {
    setOutput(`Error: ${e.message}`);
  }
}

// Render a simple picker
<select onChange={e => {
  const p = personas.find(p => p.id === e.target.value);
  if (p) handleSelectPersona(p);
}} value={activePersona?.id ?? ''}>
  <option value="">Default (shell setting)</option>
  {personas.map(p => (
    <option key={p.id} value={p.id}>
      {p.name}{p.specialties?.length ? ` — ${p.specialties.join(', ')}` : ''}
    </option>
  ))}
</select>
```

### Pattern C — Active persona display only

Best when you just want to show the user which persona is responding, without letting them change it.

```jsx
import { getActivePersona, onPersonasChange } from './persona.js';

const [activePersona, setActivePersonaState] = useState(getActivePersona);

useEffect(() => {
  return onPersonasChange(() => setActivePersonaState(getActivePersona()));
}, []);

// Render:
{activePersona && <span className="persona-badge">Persona: {activePersona.name}</span>}
```

---

## Step 5 — Show the active persona name in the UI

Whichever pattern you use, always show the active persona name somewhere visible — users need to know which persona is responding.

```jsx
<span className="active-persona">
  {activePersona ? `🎭 ${activePersona.name}` : 'Default persona'}
</span>
```

---

## Step 6 — Rebuild

```bash
npm run build
node ../../scripts/upload.js
```

---

## Rules

- Always declare `"personas"` in the manifest managers — `sdk.personas` won't be injected without it.
- Personas are only available inside Apogee — `listPersonas()` returns `[]` in local dev, which is fine.
- `setActivePersona(id)` (direct ID) does not require permission. `requestPersonaAccess(type)` (specialty routing) triggers an approval modal the first time.
- When a persona is active, its system prompt overrides yours — don't pass a conflicting `systemPrompt` to `streamCompletion`.
- Don't show persona selection UI when `listPersonas()` returns an empty array — hide or disable it gracefully.
- Subscribe to `onPersonasChange` to keep the UI in sync when the user changes their persona settings in the shell.
- `getAppActivePersona(appId)` (from `sdk.intelligence`) gives the persona scoped to a specific app. `getActivePersona()` (from `sdk.personas`) gives the global shell selection.
