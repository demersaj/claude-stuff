---
description: Write a structured, agent-executable implementation plan from a PRD or feature description and save it to plans/
argument-hint: "[prd-file or feature description]"
allowed-tools: Bash, Read, Write, Glob, Grep
---

# Plan

You are writing an implementation plan. Follow the `dev:plan` skill for the full workflow.

## Quick Start

1. **If an argument was provided**, treat it as the input — a feature description, path to a PRD file, or inline PRD content.
   - If it's a file path, read it.
   - If it's a description or inline PRD, use it directly.
2. **If no argument**, ask: "Paste your PRD or describe what you want built."

Then follow the `dev:plan` skill to produce a structured plan saved to `plans/YYYY-MM-DD-<feature-slug>.md`. Wait for user approval before handing off to execution.
