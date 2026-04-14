# Vocab Flashcards App — Build Summary

## App location

`/Users/huxley-47/dev/webai/webai/apps/vocab-flashcards/`

## Build output

`apps/vocab-flashcards/dist/index.html` — 158.60 kB (gzip: 50.55 kB), fully self-contained single HTML file.

## Features implemented

- **Word management (My Words view)**
  - Add words with a word/phrase field and definition textarea (Enter key submits)
  - Inline edit any word or definition
  - Delete words
  - Word list with count displayed
  - 3 default example words pre-loaded on first use

- **Quiz mode**
  - Shuffled deck drawn from the full word list
  - Progress bar and card counter (e.g. "Card 2 of 10")
  - Click card to reveal definition
  - Easy / Hard rating buttons advance to the next card
  - Quiz ends when all cards are rated

- **Results screen**
  - Shows Easy/Hard counts with colored stat boxes
  - Lists all "Hard" words with definitions for focused review
  - "Quiz Again" (reshuffles) and "Manage Words" buttons

- **AI example sentence**
  - "✦ AI Example Sentence" button appears on each revealed card
  - Uses `window.OasisHost.acquire()` + `host.request()` with streaming `onToken` callback
  - Streams the sentence in real-time as tokens arrive
  - Graceful error message if OasisHost is unavailable

- **localStorage persistence**
  - All words saved to `vocab-flashcards-words` key
  - Loaded on startup; falls back to 3 default words if empty

## Tech stack

- React 18 + Vite 5
- `vite-plugin-singlefile` → single self-contained `dist/index.html`
- Pure CSS (dark theme, no external UI library)
- `window.OasisHost` for AI (webAI shell API)

## Files

- `src/App.jsx` — all app logic and components (~220 LOC)
- `src/index.css` — full dark-theme stylesheet
- `src/main.jsx` — React root mount
- `index.html` — HTML shell
- `vite.config.js` — singlefile build config
- `package.json` — includes `upload` script
