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

Two custom plugins live under `plugins/marketplaces/local-desktop-app-uploads/`:

| Plugin | Path | Description |
|--------|------|-------------|
| **PM** | `pm/` | Product management: PRDs, technical specs, stories, review. |
| **Resume** | `resume/` | Resume tailoring, cover letters, and improvement suggestions. |

---

### PM plugin

Product management workflows for PRDs and planning:

- **Commands:** `/pm:prd`, `/pm:review-prd`, `/pm:notes-to-prd`, `/pm:tech-spec`, `/pm:notion-format`, `/pm:stories`
- **Skills:** PRD writing with Classic and OST templates
- **Agents:** `@pm:prd-critic`, `@pm:eng-reader`

See `plugins/marketplaces/local-desktop-app-uploads/pm/README.md` for full usage.

---

### Resume plugin

Resume and job-application workflows (tailored to Andrew Demers’ resume):

- **Commands:** `/resume:tailor` (tailor resume to a job description), `/resume:improve`, `/resume:cover-letter`
- **Skills:** `resume:resume-writer` — resume as source of truth for tailoring, cover letters, and section improvements

Plugin files: `plugins/marketplaces/local-desktop-app-uploads/resume/`.

## Sync / setup

1. Clone this repo into `~/.claude` (or merge into an existing `~/.claude`).
2. Restart Claude (or reload) so it picks up plugins and skills.

If you already have a `~/.claude` with local changes, copy or link the contents of this repo into it and resolve any conflicts (e.g. keep your local `cache/` or `session-env/` if you don’t want them overwritten).

## What isn’t tracked

- **`plugins/marketplaces/claude-plugins-official`** — official marketplace is an embedded repo; add as a submodule or manage separately if you want it in Git.
- **`cache/`**, **`session-env/`**, **`projects/`**, etc. — local/runtime data; excluded so the repo stays portable.

## License

Use and adapt for your own Claude setup. Plugin contents may have their own terms where applicable.
