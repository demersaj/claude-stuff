---
description: Review and improve an existing PRD or spec document
argument-hint: "<file-path>"
allowed-tools: Bash, Read, Grep, Glob
---

# PRD Review

Read the specified document and provide a structured review. Do NOT rewrite the document unprompted - provide feedback first.

## Review Checklist

Evaluate against these criteria and report findings:

### Clarity
- Is the problem statement specific and falsifiable?
- Would an engineer know exactly what to build from this?
- Are there ambiguous terms that need definitions?

### Completeness
- Are success metrics measurable and time-bound?
- Is scope explicitly defined (in-scope AND out-of-scope)?
- Are dependencies and assumptions called out?
- Are edge cases and error states addressed?
- Is there a rollback or failure plan?

### Technical Feasibility
- Are there technical constraints or risks not addressed?
- Does the technical approach section match the requirements?
- Are there scalability or performance considerations missing?

### Stakeholder Readiness
- Would this pass exec review without follow-up questions?
- Are trade-offs and alternatives documented?
- Is the "why now" clear?

## Output Format

Organize feedback into three categories:
1. **Blockers** - Must fix before this is ready for review
2. **Improvements** - Would strengthen the doc significantly
3. **Nitpicks** - Minor issues, nice to fix

End with: "Want me to fix any of these? Point me at what to tackle first."
