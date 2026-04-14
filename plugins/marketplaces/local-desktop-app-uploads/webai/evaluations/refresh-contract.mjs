#!/usr/bin/env node
/**
 * Re-read skills/webai-app/references/app-start-kit.html and rewrite
 * evaluations/contract.json canonicalShellManifest (+ reference path).
 *
 * Run from the webai plugin root:
 *   node evaluations/refresh-contract.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { extractShellManifestFromHtml } from './manifest-extract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, '..');
const START_KIT = join(PLUGIN_ROOT, 'skills', 'webai-app', 'references', 'app-start-kit.html');
const CONTRACT_OUT = join(__dirname, 'contract.json');

function main() {
  const html = readFileSync(START_KIT, 'utf8');
  const manifest = extractShellManifestFromHtml(html);

  const prev = JSON.parse(readFileSync(CONTRACT_OUT, 'utf8'));
  prev.canonicalShellManifest = manifest;
  prev.referenceHtml = 'skills/webai-app/references/app-start-kit.html';
  writeFileSync(CONTRACT_OUT, `${JSON.stringify(prev, null, 2)}\n`, 'utf8');
  console.log('Updated canonicalShellManifest in', CONTRACT_OUT);
}

main();
