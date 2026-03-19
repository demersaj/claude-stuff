# Claude configuration

Personal [Claude](https://claude.ai) configuration and plugins, synced via Git so settings and custom commands stay consistent across machines.

## What's in this repo

| Path | Description |
|------|-------------|
| **`plugins/`** | Installed plugins and marketplace config. |
| **`skills/`** | Custom agent skills (instructions the model can load for specific tasks). |
| **`plugins/known_marketplaces.json`** | Registered plugin marketplaces (official + local). |

Other folders like `tools/`, `prompts/`, `scripts/`, `references/`, and `examples/` are allowed by `.gitignore` so you can add them later if needed.

## Plugins

Five custom plugins live under `plugins/marketplaces/local-desktop-app-uploads/`:

| Plugin | Path | Description |
|--------|------|-------------|
| **PM** | `pm/` | Product management: PRDs, technical specs, stories, review. |
| **Resume** | `resume/` | Resume tailoring, cover letters, and improvement suggestions. |
| **webai** | `webai/` | Build and deploy React/Vue apps to the webAI Apogee shell. |
| **Dev** | `dev/` | Developer persona: understand codebase, plan, and execute. |
| **Student Assistant** | `student-assistant/` | Socratic tutor: hints and guiding questions for homework, assignments, debugging (Python by default). |

---

### PM plugin

Product management workflows for PRDs and planning:

- **Commands:** `/pm:prd`, `/pm:review-prd`, `/pm:notes-to-prd`, `/pm:tech-spec`, `/pm:notion-format`, `/pm:stories`
- **Skills:** `pm:prd-writing` — PRD writing with Classic and OST templates
- **Agents:** `@pm:prd-critic`, `@pm:eng-reader`

See `plugins/marketplaces/local-desktop-app-uploads/pm/README.md` for full usage.

---

### Resume plugin

Resume and job-application workflows (tailored to Andrew Demers’ resume):

- **Commands:** `/resume:tailor`, `/resume:improve`, `/resume:cover-letter`
- **Skills:** `resume:resume-writer` — resume as source of truth for tailoring, cover letters, and section improvements

Plugin files: `plugins/marketplaces/local-desktop-app-uploads/resume/`.

---

### webai plugin

Build and deploy React or Vue apps to the webAI Apogee shell:

- **Commands:** `/webai:new-app`, `/webai:build-upload`, `/webai:add-oasis`, `/webai:add-collab`
- **Skills:** `build-upload`, `webai-app`, `new-app`, `add-oasis`, `add-collab`

See `plugins/marketplaces/local-desktop-app-uploads/webai/README.md` for full usage.

---

### Dev plugin

Developer persona: takes a PRD or instructions, understands the codebase, plans, and executes:

- **Commands:** `/dev:dev`
- **Skills:** `dev:dev` (full workflow), `dev:understand`, `dev:plan`, `dev:execute`

See `plugins/marketplaces/local-desktop-app-uploads/dev/README.md` for full usage.

---

### Student Assistant plugin

Socratic learning assistant for homework, coursework, and debugging — guides toward answers with hints and questions instead of giving solutions. Assumes Python unless otherwise stated.

- **Commands:** `/student:tutor`
- **Skills:** `student:student-assistant` — tutor persona, Python default, no direct answers unless asked

See `plugins/marketplaces/local-desktop-app-uploads/student-assistant/README.md` for full usage. Also available as a Cursor skill at `~/.cursor/skills/student-assistant/SKILL.md`.

## Sync / setup

1. Clone this repo into `~/.claude` (or merge into an existing `~/.claude`).
2. Restart Claude (or reload) so it picks up plugins and skills.

If you already have a `~/.claude` with local changes, copy or link the contents of this repo into it and resolve any conflicts (e.g. keep your local `cache/` or `session-env/` if you don’t want them overwritten).

## What isn’t tracked

- **`plugins/marketplaces/claude-plugins-official`** — official marketplace is an embedded repo; add as a submodule or manage separately if you want it in Git.
- **`cache/`**, **`session-env/`**, **`projects/`**, etc. — local/runtime data; excluded so the repo stays portable.

## License

Use and adapt for your own Claude setup. Plugin contents may have their own terms where applicable.
