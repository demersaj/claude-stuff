---
description: Convert rough notes, bullets, or brain dumps into a polished PRD
argument-hint: "<file-with-notes>"
allowed-tools: Bash, Read, Write, Grep, Glob
---

# Notes to PRD

Transform unstructured input into a structured PRD.

## Process

1. **Read the input** - file path, or if none provided, ask the user to paste or describe their notes
2. **Identify the shape** - What's here? Problem statement? Feature list? Meeting notes? Slack thread dump?
3. **Surface gaps** - Before drafting, list what's missing and ask the user to fill in:
   - Who is the target user?
   - What's the desired outcome?
   - What constraints exist (timeline, technical, organizational)?
   - Any known alternatives considered?
4. **Ask format preference** - Classic PRD or OST-style?
5. **Draft** - Create the PRD using the `pm:prd-writing` skill templates
6. **Flag assumptions** - Clearly mark anything inferred from the notes vs. explicitly stated

## Rules

- Preserve the user's intent - don't add scope they didn't mention
- Mark inferred content with `[INFERRED - verify]` so the user can confirm or correct
- Keep the user's voice where possible, especially in problem statements
- Output to `prd-<descriptive-name>.md` in current directory
