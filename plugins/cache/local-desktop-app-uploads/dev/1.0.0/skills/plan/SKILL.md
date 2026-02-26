---
name: plan
description: Implementation planning skill for development work. Use this skill when the user asks to "write a plan", "plan this out", "create an implementation plan", or after completing codebase understanding and before writing any code. Produces a structured, agent-executable plan saved to a file.
version: 1.0.0
---

# Plan — Implementation Planning

Write a structured implementation plan before touching any code. The plan is the contract between understanding and execution — it should be specific enough that a sub-agent can execute a task group without asking questions.

---

## Plan format

Save to `plans/YYYY-MM-DD-<feature-slug>.md`.

```markdown
# Plan: <feature name>
Date: YYYY-MM-DD
Status: IN PROGRESS

## Problem
<One paragraph. What needs to exist and why. Ground it in user or system need, not implementation detail.>

## Scope
**In scope:**
- <explicit list>

**Out of scope:**
- <explicit list — things that might seem related but aren't being done now>

## Success criteria
1. <Observable outcome — something you can verify with a command or by looking at the UI>
2. <Another observable outcome>
3. <...>

## Context to load
Before starting, read:
- `path/to/relevant/file.ts` — <why>
- `path/to/other/file.ts` — <why>

## Tasks

### Group A — <subsystem name>  [parallel with Group B]
- [ ] Task 1: <imperative verb> `path/to/file.ts`
  verify: `<shell command>` or <observable check>
- [ ] Task 2: <imperative verb> `path/to/file.ts`
  verify: `<shell command>` or <observable check>

### Group B — <subsystem name>  [parallel with Group A]
- [ ] Task 3: <imperative verb> `path/to/file.ts`
  verify: `<shell command>` or <observable check>

### Group C — <subsystem name>  [depends on A and B]
- [ ] Task 4: <imperative verb> `path/to/file.ts`
  verify: `<shell command>` or <observable check>
```

---

## Grouping rules

**Group by subsystem, not by type.** One agent handles one subsystem end-to-end: implementation + types + tests + exports together.

| Wrong | Right |
|-------|-------|
| Group: "all TypeScript types" | Group: "auth module — types, hooks, tests" |
| Group: "all test files" | Group: "billing module — component, store slice, tests" |

**Parallelise across subsystems.** Groups that touch different directories run simultaneously.

**Sequence for dependencies.** If Group B needs types, interfaces, or exports produced by Group A, Group A runs first. Mark this explicitly: `[depends on A]`.

**3–4 tasks per group max.** Split larger groups rather than packing them.

---

## Task rules

Every task must have:
1. **An imperative action** — "Add", "Update", "Refactor", "Delete", "Wire up"
2. **An explicit file path** — never "the auth module" or "the relevant file"
3. **A verify step** — a shell command, a curl, a test filter, or a specific observable check

Never write a verify step that says "check that it works" or "confirm the feature is functional". Be specific:
- `yarn test --testPathPattern=auth`
- `curl -X POST localhost:3000/api/login -d '{"email":"test@test.com","password":"pw"}'`
- `make verify`
- "The settings panel renders the toggle and persists state across refresh"

---

## Self-review checklist

Before presenting the plan, run through this internally:

- [ ] Are all file paths explicit and confirmed to exist?
- [ ] Does each task have a concrete verify step?
- [ ] Are group dependencies correctly sequenced?
- [ ] Is anything implied by the PRD but missing from the tasks?
- [ ] Are there unstated assumptions about existing interfaces or APIs?
- [ ] Would a sub-agent be able to execute each task group without asking questions?

Fix issues before presenting. Only surface unresolvable blockers to the user.

---

## After presenting the plan

Wait for user approval before handing off to `dev:execute`. If the user requests changes, update the plan file and re-present. Do not begin execution until the plan is confirmed.
