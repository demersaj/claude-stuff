---
description: Draft a PRD from a problem statement, rough notes, or feature idea
argument-hint: "[problem-statement-or-topic]"
allowed-tools: Bash, Read, Write, Grep, Glob
---

# PRD Drafting

You are helping a Senior Technical PM draft a PRD. Follow the `pm:prd-writing` skill for the full workflow.

## Quick Start

1. **If an argument was provided**, treat it as the problem statement or feature idea. Ask 3-5 clarifying questions before drafting.
2. **If no argument**, ask: "What problem are we solving? Give me the rough version - bullet points, stream of consciousness, whatever you have."

## Format Selection

Ask which format fits this work:

- **Classic PRD** - Full problem/goals/requirements/scope structure. Use for new features, major changes, cross-team initiatives.
- **OST-style** - Opportunity Solution Tree format. Use when exploring a problem space, validating assumptions, or when multiple solutions are being evaluated.

## Output

Create the PRD as a markdown file in the current directory:
- Name it descriptively: `prd-<feature-name>.md`
- Use the appropriate template from `pm:prd-writing` skill

## Key Principles

- Write for engineers and stakeholders who will implement and approve this
- Be specific about what's in scope and what's not
- Include measurable success criteria, not vague goals
- Call out assumptions explicitly
- Flag open questions rather than hiding uncertainty
