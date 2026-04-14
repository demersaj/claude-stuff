# webai evaluation suite

**Canonical reference:** `skills/webai-app/references/app-start-kit.html`

This folder defines how we verify that the plugin (templates, skills, commands) stays aligned with the shipped SDK starter kit and that optional golden-app repos still satisfy per-skill eval JSON.

## Files

| File | Role |
|------|------|
| `manifest-extract.mjs` | Parses the `<script id="apogee-shell-manifest" type="application/apogee-shell-manifest+json">` block from HTML into a JSON object. |
| `contract.json` | Expected `canonicalShellManifest` (must match the parsed manifest from `app-start-kit.html`), plus substring checks for the start kit body and for plugin files (`templates/`, `skills/`). |
| `run-eval.mjs` | Runs all checks. Exit code `0` = pass, `1` = fail. |
| `refresh-contract.mjs` | Re-reads `app-start-kit.html` and rewrites `contract.json` `canonicalShellManifest`. Run after the Apogee team updates the starter kit manifest. |

## Commands

From the **webai plugin root** (the directory that contains `evaluations/` and `templates/`):

```bash
node evaluations/run-eval.mjs
```

With a monorepo that contains `apps/...` trees matching `skills/*/evals/evals.json`:

```bash
node evaluations/run-eval.mjs --workspace /path/to/repo
```

After `app-start-kit.html` manifest changes:

```bash
node evaluations/refresh-contract.mjs
node evaluations/run-eval.mjs
```

## What gets checked

1. **Start kit** - File exists; manifest JSON parses; **deep equality** with `contract.json` `canonicalShellManifest`; body contains `window.apogeeSDK`, `__APOGEE_PLATFORM`, and the manifest MIME type string.
2. **Templates** - `templates/webai.js` and related files contain the integration patterns listed in `contract.json` (`pluginTemplateSignals`).
3. **Skill docs** - `skills/webai-app/SKILL.md`, `skills/new-app/SKILL.md` contain the phrases in `contract.json` (`skillDocSignals`).
4. **Commands** - Selected `commands/*.md` files reference the correct `webai:*` skill ids (`commandSkillRefs`).
5. **Eval packs** - Each `skills/<name>/evals/evals.json` on disk (workspace assertions optional).

## Extending

- Add rows to `contract.json` under `pluginTemplateSignals`, `skillDocSignals`, or `commandSkillRefs`.
- Add scenarios under `skills/<skill>/evals/evals.json` using `file_contains`, `file_not_contains`, `file_contains_any`, or `file_exists` (see existing packs).
