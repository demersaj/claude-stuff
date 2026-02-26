---
name: understand
description: Codebase understanding phase for development work. Use this skill before writing any code or plan when the user asks to "understand the codebase", "read the repo", "orient yourself", or when starting implementation work that requires grounding in existing patterns, architecture, and conventions.
version: 1.0.0
---

# Understand — Codebase Orientation

Ground yourself in the codebase before touching anything. The goal is to understand what exists, how it's structured, and what patterns to follow — so that everything written afterward is native to the codebase, not bolted on.

---

## Step 1 — Project instructions

Read `CLAUDE.md` (or `.claude/CLAUDE.md`) if it exists. This is the authoritative source for:
- Build and test commands
- Architecture overview
- Conventions and patterns
- Things to avoid

If multiple `CLAUDE.md` files exist (root + subdirectory), read both. The subdirectory one takes precedence for work in that area.

---

## Step 2 — Identify affected subsystems

From the PRD, feature spec, or task description, identify:
- Which directories and files will need to change
- Which modules they depend on
- Which modules depend on them (downstream impact)

Use `Glob` and `Grep` to find relevant files. Don't guess file locations — confirm them.

```
Glob: src/**/*.ts filtered by the feature name or related keywords
Grep: for existing usage of the interface, hook, or API being modified
```

---

## Step 3 — Read key files

For each affected subsystem, read enough to understand:

| What to learn | What to read |
|---------------|--------------|
| File structure and exports | Index files, barrel exports |
| Naming conventions | 2–3 representative files in the area |
| State management approach | Existing slices, hooks, or stores |
| Error handling patterns | How errors are caught, surfaced, typed |
| Test structure | Existing test files for the area |
| Type definitions | Shared types, interfaces, enums |

Do not skim. Read the actual code. Patterns that aren't obvious from file names often matter most.

---

## Step 4 — Map dependencies

Before planning any changes, understand:
- What does the affected code import from?
- What imports from the affected code?
- Are there shared types or interfaces that will need updating?
- Are there integration points (IPC, API boundaries, event systems) that are affected?

Use `Grep` to find all imports of the relevant modules.

---

## Step 5 — Note constraints and conventions

Record anything that will constrain implementation:

- **Forbidden patterns** — things the codebase explicitly avoids (e.g. no `any`, no `useEffect` for data fetching, no `git add -A`)
- **Required patterns** — things that must be used (e.g. `useAppDispatch`, `RTK Query`, `RunE` in cobra commands)
- **Test conventions** — what test utilities exist, what query priorities are used, what gets mocked
- **Build constraints** — anything that affects how the output is structured

---

## Step 6 — Clarify blocking ambiguities

After reading the codebase, surface only the questions that would meaningfully change the implementation approach. Avoid asking about things inferable from the code or PRD.

Use `AskUserQuestion` with:
- Clear option labels
- Tradeoff descriptions for each option
- `multiSelect: true` for independent choices, single-select for mutually exclusive ones

**One round of questions max. Batch everything.**

If nothing is genuinely ambiguous, skip this step entirely.

---

## Output

After completing the understand phase, produce a brief orientation summary:

```
## Codebase orientation

**Affected subsystems:** <list>
**Key files:** <list with paths>
**Patterns to follow:** <2–4 bullet points>
**Constraints:** <anything that will shape the implementation>
**Open questions:** <only if genuinely unresolvable from the code>
```

This summary feeds directly into the `dev:plan` skill.
