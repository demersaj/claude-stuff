# PM Plugin for Claude Code

A Claude Code plugin for product management workflows — product discovery, PRD writing and review, and handoff to engineering.

## Commands

| Command | Description |
|---------|-------------|
| `/pm:prd` | Draft a PRD from a problem statement or feature idea |
| `/pm:discovery` | Run a discovery cycle from problem hypothesis to GO/PIVOT/KILL decision |
| `/pm:review-prd` | Review and critique an existing PRD |
| `/pm:notes-to-prd` | Convert rough notes or brain dumps into a structured PRD |
| `/pm:tech-spec` | Generate a technical spec section from a PRD |
| `/pm:notion-format` | Format a PRD for clean paste into Notion |
| `/pm:stories` | Break a PRD into Jira-ready user stories |

## Skills

| Skill | Description |
|-------|-------------|
| `pm:prd-writing` | Structured PRD writing workflow with Classic and OST templates |
| `pm:discovery-process` | Full discovery cycle from problem hypothesis to validated GO/PIVOT/KILL decision |

## Agents

| Agent | Description |
|-------|-------------|
| `@pm:prd-critic` | Skeptical stakeholder who pressure-tests PRDs |
| `@pm:eng-reader` | Senior engineer assessing if a PRD is implementable |

## Installation

Copy this directory to `~/.claude/plugins/pm/`.

## Usage

### Discovery first (validate the problem before writing a PRD)

```bash
# Kick off a discovery cycle from a hypothesis
/pm:discovery B2B customers are churning at the onboarding step

# Resume at a specific phase (1: frame, 2: plan, 3: research, 4: synthesize, 5: validate, 6: decide)
/pm:discovery discovery-onboarding-churn.md
```

The command produces/updates `discovery-<topic>.md` and walks the 6-phase cycle to a GO / PIVOT / KILL decision. On GO, hand off to `/pm:prd`.

### PRD flow

```bash
# Draft a new PRD (from discovery output, a problem statement, or a feature idea)
/pm:prd Add real-time collaboration to the editor

# Convert meeting notes into a PRD
/pm:notes-to-prd notes/collab-feature-brainstorm.md

# Review before sharing
/pm:review-prd prd-real-time-collab.md

# Pressure-test with the skeptic and the engineer
@pm:prd-critic prd-real-time-collab.md
@pm:eng-reader prd-real-time-collab.md

# Generate a technical spec section
/pm:tech-spec prd-real-time-collab.md

# Break into tickets
/pm:stories prd-real-time-collab.md

# Format for Notion
/pm:notion-format prd-real-time-collab.md
```

### Typical end-to-end flow

```
/pm:discovery  →  /pm:prd  →  @pm:prd-critic  →  @pm:eng-reader  →  /pm:stories  →  /pm:notion-format
```
