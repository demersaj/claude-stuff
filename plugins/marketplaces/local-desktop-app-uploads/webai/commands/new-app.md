---
description: Scaffold a new React or Vue app for the webAI Apogee shell, or build a complete app from a plain-English description
argument-hint: "<app-name> [react|vue] [--description \"...\"]  OR  \"<plain-English description>\""
allowed-tools: Bash, Read, Write, Glob
---

Follow the `webai:new-app` skill.

The skill has two modes — detect which applies from the argument:

- **Scaffold mode** — argument starts with a kebab-case app name (e.g. `my-tool`, optionally followed by `react`/`vue` and `--description "..."`). Scaffolds the project, does not auto-upload.
- **Create mode** — argument is a plain-English description in quotes or free text (e.g. `"a pomodoro timer with AI coaching"`). Derives the app name, scaffolds, implements a fully working app, builds, and uploads.

If the argument is ambiguous (neither a clear name nor a clear description), ask one clarifying question before proceeding.
