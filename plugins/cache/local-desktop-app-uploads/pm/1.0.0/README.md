# PM Plugin for Claude Code

A Claude Code plugin for product management workflows, focused on PRD writing and review.

## Commands

| Command | Description |
|---------|-------------|
| `/pm:prd` | Draft a PRD from a problem statement or feature idea |
| `/pm:review-prd` | Review and critique an existing PRD |
| `/pm:notes-to-prd` | Convert rough notes or brain dumps into a structured PRD |
| `/pm:tech-spec` | Generate a technical spec section from a PRD |
| `/pm:notion-format` | Format a PRD for clean paste into Notion |
| `/pm:stories` | Break a PRD into Jira-ready user stories |

## Skills

| Skill | Description |
|-------|-------------|
| `pm:prd-writing` | Structured PRD writing workflow with Classic and OST templates |

## Agents

| Agent | Description |
|-------|-------------|
| `@pm:prd-critic` | Skeptical stakeholder who pressure-tests PRDs |
| `@pm:eng-reader` | Senior engineer assessing if a PRD is implementable |

## Installation

### From GitHub (recommended)

```bash
/plugin marketplace add https://github.com/YOUR_USERNAME/pm-plugin
/plugin install pm
```

### Local

Copy this directory to `~/.claude/plugins/pm/`.

## Usage

```bash
# Draft a new PRD
/pm:prd Add real-time collaboration to the editor

# Convert meeting notes into a PRD
/pm:notes-to-prd notes/collab-feature-brainstorm.md

# Review before sharing
/pm:review-prd prd-real-time-collab.md

# Get the engineer perspective
@pm:eng-reader prd-real-time-collab.md

# Break into tickets
/pm:stories prd-real-time-collab.md

# Format for Notion
/pm:notion-format prd-real-time-collab.md
```
