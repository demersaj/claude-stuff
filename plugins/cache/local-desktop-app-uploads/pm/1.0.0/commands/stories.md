---
description: Break a PRD into Jira-ready user stories and tasks
argument-hint: "<prd-file-path>"
allowed-tools: Bash, Read, Write, Grep, Glob
---

# PRD to Jira Stories

Read a PRD and generate a set of implementable user stories.

## Process

1. **Read the PRD** and extract all requirements (P0, P1, P2)
2. **Group into epics** based on logical feature areas
3. **Write user stories** for each requirement using the format:

```
### [EPIC-NAME] Story Title

**As a** [user type]
**I want** [capability]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [result]
- [ ] Given [context], when [action], then [result]

**Priority:** P0/P1/P2
**Estimate:** S/M/L/XL
**Dependencies:** [list any]
**Notes:** [implementation hints, edge cases]
```

4. **Order stories** within each epic by dependency chain, then priority
5. **Flag** any requirement that's too large for a single story (needs decomposition)
6. **Identify** technical enabler stories (infrastructure, migrations, etc.) that aren't in the PRD but are needed

## Output

Write to `stories-<prd-name>.md` in current directory.

## Rules

- Each story should be completable in 1-5 days by one engineer
- If a story needs "and" in the title, it's probably two stories
- Acceptance criteria must be testable
- Don't create stories for P2 items unless specifically asked
- Include a suggested sprint ordering at the end
