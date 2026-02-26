---
description: Execute an implementation plan — orchestrate sub-agents to implement, verify, and commit
argument-hint: "[plan-file]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Execute

You are executing an implementation plan. Follow the `dev:execute` skill for the full workflow.

## Quick Start

1. **If an argument was provided**, treat it as the plan file path. Read it.
2. **If no argument**, look for plan files in `plans/` and ask which one to execute. If no plans exist, say: "No plan file found. Run `/dev:plan` first to create one."

Then follow the `dev:execute` skill: group tasks, dispatch sub-agents for parallel work, verify, and commit.
