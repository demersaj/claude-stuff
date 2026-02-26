---
name: execute
description: Plan execution skill for development work. Use this skill when the user says "execute the plan", "implement this", "run the plan", or when handing off from the planning phase to actual implementation. Reads a plan file and orchestrates sub-agents to complete it.
version: 1.0.0
---

# Execute — Plan Execution

You are the orchestrator. You read the plan, group tasks intelligently, dispatch sub-agents for parallel work, and verify everything before marking it done.

---

## Step 1 — Setup

**Read the plan file** if not already in context. Confirm you understand all task groups and their dependencies.

**Create a branch** unless the change is trivial (single-file, cosmetic, no API surface change):
```bash
git checkout -b <feature-slug>
```

**Track progress with TodoWrite.** One todo per task group. Update status in real time — `in_progress` when starting a group, `completed` only when verified.

---

## Step 2 — Group and dispatch

### Identify what can run in parallel

Task groups marked `[parallel with X]` in the plan run simultaneously. Groups marked `[depends on Y]` must wait.

### Dispatch pattern for parallel groups

Spawn a Task agent per parallel group:

```
Task (general-purpose):
  description: "<Group name> — <subsystem> tasks"
  prompt: |
    You are implementing tasks from <plan-file-path>.

    Read the plan first, then execute these tasks IN ORDER:
    - Task N: <description> — <path>
    - Task N+1: <description> — <path>

    For each task:
    1. Read the relevant files before making changes
    2. Implement the change, matching existing patterns exactly
    3. Run the verify step and confirm it passes
    4. Stage and commit the changes for this task

    Report back: files changed, verify output, any blockers.
```

### Grouping heuristic

Group tasks that share the same directory prefix or domain into one agent. Avoid spawning one agent per task — fewer agents with broader scope converge faster.

```
Without grouping:  Task 1 (auth/login) → Agent 1 [reads auth/]
                   Task 2 (auth/logout) → Agent 2 [reads auth/ again]

With grouping:     Tasks 1–2 (auth/*) → Agent 1 [reads once, executes both]
```

### Sequential groups

Run dependent groups after their prerequisites complete. Confirm prerequisite outputs (types, interfaces, exported functions) exist before dispatching downstream agents.

---

## Step 3 — Monitor and recover

**Watch for failures.** When a sub-agent reports an error:
1. The agent attempts to fix it in context — it has the most relevant state
2. If it can't fix it, it escalates: reports the error with full output
3. Dispatch a focused fix agent with the error context
4. Same error twice on the same task → stop and ask the user

**Architectural fit.** If an agent reports that the implementation is fighting the existing patterns, stop. Refactor the pattern first, then re-execute the task. Don't bolt things on.

---

## Step 4 — Verify

All four checks must pass before the work is done. Do not mark tasks complete until verification is finished.

### 1. Automated tests
Run the full test suite. All tests must pass.
```bash
# Examples — use whatever the project's test command is
yarn test
make test
go test ./...
pytest
```
Fix failures. Never skip or suppress them.

### 2. Manual verification
Actually exercise the change with realistic inputs:

| Change type | How to verify |
|-------------|--------------|
| API endpoint | `curl` with a realistic payload, check response |
| CLI command | Run it, inspect output |
| UI component | Start dev server, interact with it |
| Library/util | Run against real data, not just test fixtures |
| External integration | Test against the real service |

### 3. DX quality
While manually testing, look for friction:
- Confusing error messages
- Inconsistent behavior across similar paths
- Noisy or verbose output
- Rough edges that technically work but feel bad

Fix DX issues inline. If non-trivial, document as a follow-up item. Don't ship friction.

### 4. Diff review
Review the full diff against the base branch before marking done:
- Error handling is complete and consistent with the codebase
- No debug artifacts: no `console.log`, no `// TODO`, no commented-out code
- Types are explicit — no `any`, no implicit `unknown`
- Tests cover the new behavior and edge cases, not just the happy path
- Naming is clear and matches codebase conventions

Fix everything found. Don't document issues to fix later.

---

## Step 5 — Commit and close

1. `git status` — confirm only plan-related files are modified
2. Stage files **by name**, not `git add -A` or `git add .`
3. Leave unrelated changes (pre-existing unstaged work) untouched
4. Write a commit message referencing the plan:
   ```
   feat: <what was implemented>

   Implements plan: plans/YYYY-MM-DD-<feature-slug>.md
   ```
5. Mark the plan file status as `[COMPLETED]`
6. Mark all todos as `completed`

---

## Operating principles

- **Fewer agents, broader scope.** One agent per subsystem, not one per task.
- **Read before writing.** Sub-agents must read relevant files before making changes.
- **Native code only.** Every change should be indistinguishable from existing code in style and patterns.
- **Zero tech debt.** Don't ship "fix later" comments, workarounds, or half-measures.
- **Honest status.** A task is not complete until its verify step passes. Never mark done speculatively.
