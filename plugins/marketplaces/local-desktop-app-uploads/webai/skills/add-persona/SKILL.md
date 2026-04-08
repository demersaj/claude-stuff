---
name: add-persona
description: >
  Add Apogee persona support to an existing webAI app — lets the app use a specific AI persona, request user permission to access personas, or show a persona picker UI.
  Use this skill when the user wants their app to use a named AI persona, route to a specialty (coding/writing/etc.), let users choose a persona, or when the user says "add persona support", "use the coding persona", "let users pick an AI personality", or similar.
argument-hint: "[component-or-file-path]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# webAI Add Persona

Add Apogee persona support to an existing webAI app.

## What personas are

Personas are AI identities stored in Apogee — each has a name, description, system prompt template, and optionally a specific model/LoRA adapter. Apps can use them in two ways:

- **By specialty** (`personaType: "coding"`) — routes to whichever persona the user has configured for that specialty slot. Requires permission (triggers an Apogee approval modal the first time).
- **By ID** (`personaId: "preset-code"`) — targets a specific persona directly, no permission needed.

When a persona is active, its `systemPromptTemplate` replaces any `systemPrompt` you pass to `host.request()`.

---

## Step 1 — Read the target file

Read the component or file specified. Understand what the app does and what kind of persona integration fits:

- **Single hardcoded persona** — app always uses one specialty (e.g. a coding helper always uses `"coding"`)
- **User-selectable picker** — app lists available personas and lets the user choose
- **Permission-request flow** — app explicitly requests access before using a persona by specialty

Pick the right pattern for the app. Most apps need just one.

---

## Step 2 — Update `src/webai.js` to pass persona options through

The standard `webai.js` `streamCompletion` only forwards `systemPrompt`, `maxTokens`, `temperature`, and `onToken`. Persona support requires passing `personaType` or `personaId` to `host.request()`.

Find the `streamCompletion` export in `src/webai.js` and update the options forwarding to spread additional options:

**Before:**
```javascript
export async function streamCompletion(prompt, { systemPrompt = '', maxTokens = 2048, temperature = 0.7, onToken } = {}) {
  ...
  return await host.request(prompt, { systemPrompt, maxTokens, temperature, onToken });
```

**After:**
```javascript
export async function streamCompletion(prompt, { systemPrompt = '', maxTokens = 2048, temperature = 0.7, onToken, ...rest } = {}) {
  ...
  return await host.request(prompt, { systemPrompt, maxTokens, temperature, onToken, ...rest });
```

The `...rest` spread lets callers pass `personaType`, `personaId`, `appId`, `thinking`, or any other `OasisRequestOptions` field without the helper needing to know about them explicitly.

---

## Step 3 — Create `src/persona.js`

```javascript
// src/persona.js — Apogee persona helpers

const getHost = () => window.OasisHost ?? window.parent?.OasisHost ?? null;

/**
 * The app's Apogee ID — used for persona permission scoping.
 * Apogee injects __APOGEE_APP_ID__ at runtime; falls back to package name.
 */
export function getAppId() {
  return window.__APOGEE_APP_ID__ ?? null;
}

/**
 * List all personas available in this Apogee installation.
 * Returns an array of { id, name, description, specialties, systemPromptTemplate, ... }
 */
export function getPersonas() {
  return getHost()?.getPersonas?.() ?? [];
}

/**
 * List personas the app has explicit permission to use, keyed by specialty.
 * Returns e.g. { coding: { id, name, type }, writing: { id, name, type } }
 */
export function getPermittedPersonas(appId) {
  const id = appId ?? getAppId();
  return getHost()?.getPersonasWithPermissions?.(id) ?? {};
}

/**
 * Request access to a persona by specialty (e.g. "coding", "writing", "general").
 * Apogee shows the user an approval modal the first time — subsequent calls are instant.
 * Returns true if access was granted, false if denied.
 *
 * Call this before the first time you use personaType in streamCompletion.
 */
export async function requestPersonaAccess(personaType, appId) {
  const host = getHost();
  const id = appId ?? getAppId();
  if (!host?.requestPersonaAccess) return false;
  return host.requestPersonaAccess(id, personaType);
}

/**
 * Remove this app's permission to use a persona specialty.
 * Useful for "disconnect persona" flows.
 */
export async function removePersonaAccess(personaType, appId) {
  const host = getHost();
  const id = appId ?? getAppId();
  if (!host?.removePersonaPermission) return;
  return host.removePersonaPermission(id, personaType);
}
```

---

## Step 4 — Implement the chosen pattern

### Pattern A — Single hardcoded specialty (simplest)

Best when the app has one clear purpose (coding helper, writing tool, etc.).

```jsx
import { requestPersonaAccess, getAppId } from './persona.js';
import { streamCompletion } from './webai.js';

// On mount or first AI use, request access once
useEffect(() => {
  requestPersonaAccess('coding'); // or 'writing', 'general', etc.
}, []);

// Then pass personaType to every streamCompletion call
async function generate(prompt) {
  setOutput('');
  try {
    await streamCompletion(prompt, {
      personaType: 'coding',        // routes to user's configured coding persona
      appId: getAppId(),
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
import { getPersonas, requestPersonaAccess, getAppId } from './persona.js';
import { streamCompletion } from './webai.js';

const [personas, setPersonas] = useState([]);
const [selectedPersona, setSelectedPersona] = useState(null); // { id, name, specialties }

useEffect(() => {
  setPersonas(getPersonas());
}, []);

async function handleSelectPersona(persona) {
  // Request access by first specialty (or use personaId directly — no permission needed)
  if (persona.specialties?.[0]) {
    await requestPersonaAccess(persona.specialties[0]);
  }
  setSelectedPersona(persona);
}

async function generate(prompt) {
  setOutput('');
  const opts = selectedPersona
    ? { personaId: selectedPersona.id, appId: getAppId() }   // direct ID — no permission needed
    : {};                                                      // no persona — uses shell default
  try {
    await streamCompletion(prompt, {
      ...opts,
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
}}>
  <option value="">Default (shell setting)</option>
  {personas.map(p => (
    <option key={p.id} value={p.id}>
      {p.name} — {p.description}
    </option>
  ))}
</select>
```

### Pattern C — Permission-request flow with status display

Best when the app needs to show which persona is active and let users grant/revoke access.

```jsx
import { getPersonas, getPermittedPersonas, requestPersonaAccess, removePersonaAccess, getAppId } from './persona.js';
import { streamCompletion } from './webai.js';

const appId = getAppId();
const [personas, setPersonas] = useState([]);
const [permitted, setPermitted] = useState({}); // { specialty: { id, name } }
const [activeType, setActiveType] = useState(null);

useEffect(() => {
  setPersonas(getPersonas());
  setPermitted(getPermittedPersonas(appId));
}, []);

async function handleRequest(personaType) {
  const granted = await requestPersonaAccess(personaType, appId);
  if (granted) {
    setPermitted(getPermittedPersonas(appId));
    setActiveType(personaType);
  }
}

async function handleRevoke(personaType) {
  await removePersonaAccess(personaType, appId);
  setPermitted(getPermittedPersonas(appId));
  if (activeType === personaType) setActiveType(null);
}

// In the generate call:
await streamCompletion(prompt, {
  personaType: activeType,   // null means shell default
  appId,
  onToken: (t) => setOutput(prev => prev + t),
});
```

---

## Step 5 — Add persona name to the UI

Whichever pattern you use, show the active persona name somewhere in the header or near the generate button — users need to know which persona is responding.

```jsx
// For Pattern A (hardcoded):
<span>Using: {getPermittedPersonas()[selectedType]?.name ?? selectedType}</span>

// For Pattern B (picker):
<span>{selectedPersona ? `Persona: ${selectedPersona.name}` : 'Default persona'}</span>
```

---

## Step 6 — Rebuild

```bash
npm run build
node ../../scripts/upload.js
```

---

## Rules

- Always update `streamCompletion` to spread `...rest` before wiring persona options — otherwise `personaType`/`personaId` are silently dropped.
- `personaType` (specialty routing) requires calling `requestPersonaAccess` first; `personaId` (direct ID) does not.
- Personas are only available inside Apogee — `getPersonas()` returns `[]` in local dev, which is fine.
- The persona's `systemPromptTemplate` replaces any `systemPrompt` you pass — don't fight it. If you need to combine them, use `personaId` to target by ID and leave `systemPrompt` empty.
- `getAppId()` returns `null` in local dev (`__APOGEE_APP_ID__` is only injected by Apogee at runtime). Persona permission calls are no-ops when the host is null, so this is safe.
- Don't show persona selection UI when `getPersonas()` returns an empty array — just hide or disable it gracefully.
