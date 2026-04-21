---
description: Run a product discovery cycle from problem hypothesis to validated GO/PIVOT/KILL decision
argument-hint: "[problem-hypothesis-or-topic]"
allowed-tools: Bash, Read, Write, Grep, Glob
---

# Discovery Process

You are helping a Senior Technical PM run a discovery cycle. Follow the `pm:discovery-process` skill for the full workflow and `references/template.md` for the capture structure.

## Quick Start

1. **If an argument was provided**, treat it as the initial problem hypothesis or topic. Reflect it back as a structured hypothesis ("We believe [persona] struggles with [problem] because [root cause]...") and ask the user to confirm or refine.
2. **If no argument**, ask: "What are we investigating? Give me the rough version — who you think is struggling, with what, and how you know."

## Phase Selection

Ask where the user is starting from. Do not assume Phase 1.

- **Phase 1 — Frame:** No hypothesis yet, or hypothesis is fuzzy
- **Phase 2 — Plan research:** Hypothesis is solid, need interview guide and recruiting plan
- **Phase 3 — Conduct research:** Interviews scheduled, need note-taking structure or a mid-cycle check
- **Phase 4 — Synthesize:** Interviews done, raw notes in hand, need to pull out patterns
- **Phase 5 — Validate solutions:** Problem validated, need to design the smallest experiment
- **Phase 6 — Decide & document:** Experiment data in, need to commit GO / PIVOT / KILL

Jump in at the phase the user names. Do not re-run earlier phases unless the user asks.

## Output

Create or update a discovery summary markdown file in the current directory:

- Name it descriptively: `discovery-<topic>.md`
- Use the structure from `pm:discovery-process` → `references/template.md`
- Fill only the sections the user has evidence for. Leave the rest as scaffolding with `TODO` markers — partial is expected, false certainty is not.

If the user already has a discovery file, read it first and update in place rather than starting over.

## Key Principles (from the skill)

- **Problem before solution** — do not generate solutions until customer interviews confirm the problem
- **Past behavior over hypotheticals** — Mom Test questions only
- **Saturation over sample size** — push for 3+ customers confirming the same pain
- **Smallest experiment, riskiest assumption** — concierge / prototype / fake door before code
- **Time-box** — flag if the cycle is drifting past 4 weeks

## Handoffs

- **GO decision:** suggest `/pm:prd` to draft the PRD, then `/pm:stories` to break it down
- **Synthesis pressure-test:** suggest `@pm:prd-critic` on the validated problem statement
- **Feasibility sanity check on solutions:** suggest `@pm:eng-reader`
- **Readout for Notion:** suggest `/pm:notion-format` on the final summary
