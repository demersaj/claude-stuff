---
name: prd-writing
description: Structured PRD writing workflow with Classic and OST templates. Use when drafting, reviewing, or improving product requirement documents. Triggers on mentions of PRD, product spec, requirements doc, feature spec, or product brief.
---

# PRD Writing Skill

Guide the user through writing effective PRDs. This skill provides two templates (Classic and OST-style) and a structured workflow for producing PRDs that engineers can build from and stakeholders can approve.

## Core Principles

These apply regardless of template:

1. **Problem before solution** - The problem statement should be compelling enough that the reader is already thinking about solutions before you present yours
2. **Specific over comprehensive** - A tight scope with clear boundaries beats an exhaustive list of everything tangentially related
3. **Measurable outcomes** - Every success metric should be something you can actually query, measure, or observe. "Improve user experience" is not a metric.
4. **Honest about unknowns** - Open questions and assumptions sections are not weaknesses. They show rigor.
5. **Write for the skeptic** - Anticipate "why?" and "why now?" and "why not X instead?"

## Workflow

### Phase 1: Context Gathering

Before writing anything, establish:

- **Who is this for?** Target users/personas with specifics, not archetypes
- **What problem are we solving?** Stated from the user's perspective
- **How do we know this is a problem?** Data, user research, support tickets, competitive pressure
- **What does success look like?** Quantified where possible
- **What's the constraint envelope?** Timeline, technical debt, team capacity, dependencies
- **What have we already tried or considered?** Alternatives and why they were rejected

Ask these as questions. Don't assume. Let the user dump context in whatever form works for them.

### Phase 2: Draft

Select the appropriate template based on the work:

- **Classic PRD** - When the solution direction is reasonably clear and we need to specify it for implementation
- **OST-style** - When we're still exploring the problem space or evaluating multiple solution paths

Draft section by section. After each major section, check in: "Does this capture it? Anything to add or correct?"

### Phase 3: Sharpen

After the first pass:

1. Cut any sentence that doesn't help an engineer build or a stakeholder decide
2. Verify every metric is actually measurable with current or planned instrumentation
3. Ensure scope boundaries are explicit (what's IN, what's OUT, what's LATER)
4. Check that open questions are real questions, not hidden decisions

---

## Template: Classic PRD

For detailed template content, see `references/classic-prd-template.md`.

### Structure

```
# [Feature/Project Name]
## Problem Statement
## Goals & Success Metrics
## Target Users
## Requirements
### Must Have (P0)
### Should Have (P1)
### Nice to Have (P2)
## Scope
### In Scope
### Out of Scope
### Future Considerations
## Technical Approach (high-level)
## Dependencies
## Risks & Mitigations
## Open Questions
## Timeline & Milestones
## Appendix
```

---

## Template: Opportunity Solution Tree (OST)

For detailed template content, see `references/ost-prd-template.md`.

### Structure

```
# [Opportunity Area]
## Desired Outcome
## Opportunity Space
### Key Opportunities (problems/needs discovered)
## Solutions Evaluated
### Solution A
### Solution B
### Solution C
## Recommended Solution
### Why This Solution
### Requirements
### Success Metrics
### Assumptions to Validate
## Experiment Plan
## Open Questions
```

---

## Writing Style

- Use plain language. Avoid jargon unless it's precise and shared vocabulary with the audience.
- Prefer active voice: "The system sends a notification" not "A notification is sent by the system"
- Be direct. "We will do X" not "It is proposed that X be done"
- Use tables for comparisons, not prose
- Use bullet points for lists of requirements, prose for narratives and rationale
- Never use filler phrases: "It's worth noting that", "It should be mentioned", "As previously discussed"
