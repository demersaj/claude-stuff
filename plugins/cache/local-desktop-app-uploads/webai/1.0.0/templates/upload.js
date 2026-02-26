#!/usr/bin/env node
/**
 * scripts/upload.js — upload a built webAI app directly into the running Apogee shell.
 *
 * Run from your app directory (apps/<app-name>/):
 *   node ../../scripts/upload.js
 *
 * Or via npm script:
 *   npm run upload
 *
 * How it works:
 *   1. Tries POST http://127.0.0.1:44280/install — the Tauri install server.
 *      If Apogee is running, the app appears in the launcher immediately.
 *   2. Falls back to printing a DevTools console paste script if Apogee isn't running.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load built HTML ──────────────────────────────────────────────────────────

const htmlPath = resolve('./dist/index.html');
let html;
try {
  html = readFileSync(htmlPath, 'utf8');
} catch {
  console.error('ERROR: dist/index.html not found.');
  console.error('Run `npm run build` first, then re-run this script.');
  process.exit(1);
}

// ── Read app metadata ────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const appId = pkg.name;
const displayName = pkg.description || pkg.name;
const sizeKb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);

if (sizeKb > 5120) {
  console.warn(`WARNING: Built HTML is ${sizeKb} KB — this may be slow to load in Apogee.`);
}

console.log(`\nApp: ${displayName} (${appId})  |  Size: ${sizeKb} KB`);

// ── Try Tauri install server ─────────────────────────────────────────────────

const INSTALL_URL = 'http://127.0.0.1:44280/install';

async function tryDirectInstall() {
  const body = JSON.stringify({ name: displayName, html });
  const response = await fetch(INSTALL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Server responded ${response.status}: ${text}`);
  }
  return await response.json();
}

// ── Fallback: console paste script ──────────────────────────────────────────

function printFallbackScript() {
  const uploadScript = `
(async function uploadToApogee() {
  const htmlContent = ${JSON.stringify(html)};
  const appId = ${JSON.stringify(appId)};
  const displayName = ${JSON.stringify(displayName)};

  const normalized = htmlContent.replace(/\\s+/g, ' ').replace(/<!--[\\s\\S]*?-->/g, '');
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  const sourceId = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  await window.ApogeeShell.uploadApp({ name: displayName, html: htmlContent, sourceId });

  console.log('%c[webAI] Upload complete!', 'color: green; font-weight: bold;');
  console.log('App: ' + displayName + ' (' + appId + ')');
  console.log('Size: ${sizeKb} KB | Source ID: ' + sourceId.slice(0, 8) + '...');
  console.log('Refresh the Apogee launcher to see your app.');
})();
`.trim();

  console.log('\n⚠️  Apogee is not running — paste this into DevTools console:');
  console.log('   Apogee → Cmd+Option+I → Console → Enter\n');
  console.log('--- COPY FROM HERE ---\n');
  console.log(uploadScript);
  console.log('\n--- COPY TO HERE ---\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

try {
  await tryDirectInstall();
  console.log(`✅ "${displayName}" installed directly into Apogee — refresh the launcher.`);
} catch {
  printFallbackScript();
}
