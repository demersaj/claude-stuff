# Dev Plugin for Claude Code

A Claude Code plugin that provides a developer persona: takes a PRD or implementation instructions, understands the codebase, writes a structured plan, and executes it.

## Commands

| Command | Description |
|---------|-------------|
| `/dev:dev` | Full workflow — understand, plan, and execute |
| `/dev:understand` | Orient in the codebase — map subsystems, patterns, constraints |
| `/dev:plan` | Write an implementation plan saved to `plans/` |
| `/dev:execute` | Execute a plan — dispatch agents, verify, commit |

## Skills

| Skill | Description |
|-------|-------------|
| `dev:dev` | Full developer persona — composes understand → plan → execute |
| `dev:understand` | Codebase orientation: read project instructions, map subsystems, identify patterns |
| `dev:plan` | Write a structured, agent-executable implementation plan saved to `plans/` |
| `dev:execute` | Orchestrate sub-agents to implement the plan, verify, and commit |

## Usage

```bash
# Full workflow — give it a PRD or feature description
/dev:dev Add a dark mode toggle to the settings panel

# Point at a PRD file
/dev:dev prd-dark-mode.md

# Use individual skills in your own workflow
dev:understand   # orient before planning
dev:plan         # write the plan
dev:execute      # run the plan
```

## Workflow

```
PRD / instructions
      │
      ▼
dev:understand  →  orientation summary (affected files, patterns, constraints)
      │
      ▼
  dev:plan      →  plans/YYYY-MM-DD-<feature>.md  (user approves)
      │
      ▼
 dev:execute    →  working, tested, committed code
```
