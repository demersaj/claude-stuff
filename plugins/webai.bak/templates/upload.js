#!/usr/bin/env node
// scripts/upload.js
// Generates a browser console script to upload your built app to the Apogee shell.
//
// Usage:
//   npm run build   (first)
//   node scripts/upload.js   (then paste output into browser console)
//
// Or add to package.json:
//   "upload": "node scripts/upload.js"

import { readFileSync } from 'fs';
import { resolve } from 'path';

const htmlPath = resolve('./dist/index.html');

let html;
try {
  html = readFileSync(htmlPath, 'utf8');
} catch {
  console.error('ERROR: dist/index.html not found.');
  console.error('Run `npm run build` first, then re-run this script.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const appId = pkg.name;
const displayName = pkg.description || pkg.name;

const sizeKb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
if (sizeKb > 5120) {
  console.warn(`WARNING: Built HTML is ${sizeKb}KB - this may be slow to load in Apogee.`);
}

const uploadScript = `
(async function uploadToApogee() {
  const htmlContent = ${JSON.stringify(html)};
  const appId = ${JSON.stringify(appId)};
  const displayName = ${JSON.stringify(displayName)};

  // Compute a content hash as sourceId (matches ApogeeShellManager's approach)
  const normalized = htmlContent.replace(/\\s+/g, ' ').replace(/<!--[\\s\\S]*?-->/g, '');
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  const sourceId = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const stored = JSON.parse(localStorage.getItem('apogee-uploaded-apps') || '[]');
  const filtered = stored.filter(app => app.appId !== appId);
  filtered.push({
    appId,
    displayName,
    htmlContent,
    sourceId,
    uploadedAt: Date.now(),
    version: 1,
  });
  localStorage.setItem('apogee-uploaded-apps', JSON.stringify(filtered));

  console.log('%c[webAI] Upload complete!', 'color: green; font-weight: bold;');
  console.log('App: ' + displayName + ' (' + appId + ')');
  console.log('Size: ${sizeKb}KB | Source ID: ' + sourceId.slice(0, 8) + '...');
  console.log('Refresh the Apogee launcher to see your app.');
})();
`.trim();

console.log('\n=================================================================');
console.log('  webAI App Upload Script');
console.log(`  App: ${displayName} (${appId})  |  Size: ${sizeKb}KB`);
console.log('=================================================================');
console.log('\nInstructions:');
console.log('  1. Open your Apogee shell in Chrome');
console.log('  2. Open DevTools (F12 / Cmd+Option+I)');
console.log('  3. Click the "Console" tab');
console.log('  4. Paste the script below and press Enter');
console.log('  5. Refresh the Apogee launcher\n');
console.log('--- COPY FROM HERE ---\n');
console.log(uploadScript);
console.log('\n--- COPY TO HERE ---\n');
