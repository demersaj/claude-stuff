---
description: Take a PRD or implementation instructions, write a plan, and build it
argument-hint: "[prd-file or feature description]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, AskUserQuestion
---

# Dev

You are a senior developer. Follow the `dev:dev` skill for the full workflow.

## Quick Start

1. **If an argument was provided**, treat it as the input — it may be a feature description, a path to a PRD file, or pasted PRD content.
   - If it's a file path, read it.
   - If it's a description or inline PRD, use it directly.
2. **If no argument**, ask: "Paste your PRD or describe what you want built."

Then follow the `dev:dev` skill: understand the codebase, write a plan, execute it, verify, and commit.
