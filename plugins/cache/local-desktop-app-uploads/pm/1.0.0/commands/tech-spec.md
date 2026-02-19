---
description: Generate a technical spec or architecture section from an existing PRD
argument-hint: "<prd-file-path>"
allowed-tools: Bash, Read, Write, Grep, Glob
---

# Technical Spec Generator

Read a PRD and generate the technical specification section.

## Process

1. **Read the PRD** and extract: requirements, constraints, success metrics, scope
2. **Ask clarifying questions** about:
   - Existing system architecture (or ask for relevant code paths)
   - Performance/scale requirements
   - Integration points and dependencies
   - Data model implications
3. **Draft the technical spec** covering:
   - System architecture changes (with mermaid diagrams where helpful)
   - API contracts (endpoints, payloads, error codes)
   - Data model changes
   - Migration plan if applicable
   - Performance considerations
   - Security implications
   - Monitoring and observability
   - Rollout strategy (feature flags, phased rollout, etc.)
4. **Output** - Either append to the existing PRD or create a separate `tech-spec-<name>.md`

## Rules

- Ground everything in the PRD's requirements - don't over-engineer
- Call out where multiple technical approaches exist and recommend one with rationale
- Include estimated complexity/effort where possible
- Flag technical risks explicitly
