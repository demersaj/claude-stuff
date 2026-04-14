#!/usr/bin/env node
/**
 * webai evaluation suite (reference: app-start-kit.html)
 *
 * 1. Parses the shell manifest from skills/webai-app/references/app-start-kit.html
 *    and compares it to evaluations/contract.json canonicalShellManifest.
 * 2. Asserts HTML documentation signals exist in the start kit (SDK bridge, platform, MIME).
 * 3. Asserts plugin templates and skill docs still align with contract.json signal lists.
 * 4. Optional: --workspace <repo> runs per-skill evals under skills/.../evals/evals.json.
 *
 * Run from webai plugin root:
 *   node evaluations/run-eval.mjs
 *   node evaluations/run-eval.mjs --workspace /path/to/monorepo
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { extractShellManifestFromHtml } from './manifest-extract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, '..');

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveUnder(base, rel) {
  return join(base, rel.replace(/\//g, '/'));
}

function assertFileContains(base, rel, pattern, name) {
  const full = resolveUnder(base, rel);
  if (!existsSync(full)) return { ok: false, name, message: `missing file: ${rel}` };
  const text = readFileSync(full, 'utf8');
  if (!text.includes(pattern)) return { ok: false, name, message: `pattern not found in ${rel}: ${pattern}` };
  return { ok: true, name };
}

function assertFileExists(base, rel, name) {
  const full = resolveUnder(base, rel);
  if (!existsSync(full)) return { ok: false, name, message: `missing file: ${rel}` };
  return { ok: true, name };
}

function runWorkspaceAssertion(workspaceRoot, assertion) {
  const rel = assertion.file;
  const full = resolveUnder(workspaceRoot, rel);
  const name = assertion.name || rel;
  if (!existsSync(full)) {
    if (assertion.check === 'file_exists') return { ok: false, name, message: `expected file missing: ${rel}` };
    return { ok: false, name, message: `file not found: ${rel}` };
  }
  const content = readFileSync(full, 'utf8');
  switch (assertion.check) {
    case 'file_exists':
      return { ok: true, name };
    case 'file_contains':
      return content.includes(assertion.pattern)
        ? { ok: true, name }
        : { ok: false, name, message: `missing pattern in ${rel}` };
    case 'file_not_contains':
      return !content.includes(assertion.pattern)
        ? { ok: true, name }
        : { ok: false, name, message: `forbidden pattern in ${rel}` };
    case 'file_contains_any': {
      const ok = (assertion.patterns || []).some((p) => content.includes(p));
      return ok ? { ok: true, name } : { ok: false, name, message: `no pattern matched in ${rel}` };
    }
    default:
      return { ok: false, name, message: `unknown check: ${assertion.check}` };
  }
}

function collectSkillEvalFiles() {
  const skillsDir = join(PLUGIN_ROOT, 'skills');
  const out = [];
  if (!existsSync(skillsDir)) return out;
  for (const name of readdirSync(skillsDir)) {
    const p = join(skillsDir, name, 'evals', 'evals.json');
    if (existsSync(p)) out.push(p);
  }
  return out;
}

function printResults(results) {
  let fail = 0;
  for (const r of results) {
    if (r.ok) console.log(`  OK   ${r.name}`);
    else {
      fail++;
      console.log(`  FAIL ${r.name}${r.message ? `: ${r.message}` : ''}`);
    }
  }
  return fail;
}

function main() {
  const args = process.argv.slice(2);
  let workspace = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--workspace' && args[i + 1]) {
      workspace = args[i + 1];
      i++;
    }
  }

  const contract = readJson(join(__dirname, 'contract.json'));
  const startKitPath = resolveUnder(PLUGIN_ROOT, contract.referenceHtml);
  const results = [];

  console.log('webai evaluation suite (reference: app-start-kit.html)\n');

  // --- Phase 1: start kit file exists ---
  results.push({
    name: 'start_kit_html_exists',
    ok: existsSync(startKitPath),
    message: existsSync(startKitPath) ? undefined : `not found: ${contract.referenceHtml}`,
  });

  if (!results[results.length - 1].ok) {
    printResults(results);
    process.exit(1);
  }

  const startKitHtml = readFileSync(startKitPath, 'utf8');

  // --- Phase 2: manifest parse + match contract ---
  let extracted;
  try {
    extracted = extractShellManifestFromHtml(startKitHtml);
  } catch (e) {
    results.push({ name: 'start_kit_manifest_parse', ok: false, message: String(e.message || e) });
    printResults(results);
    process.exit(1);
  }

  results.push({
    name: 'start_kit_manifest_matches_contract',
    ok: deepEqual(extracted, contract.canonicalShellManifest),
    message: deepEqual(extracted, contract.canonicalShellManifest)
      ? undefined
      : 'Parsed manifest differs from evaluations/contract.json canonicalShellManifest. Run: node evaluations/refresh-contract.mjs',
  });

  for (const row of contract.startKitHtmlSignals || []) {
    const hit = startKitHtml.includes(row.pattern);
    results.push({
      name: `start_kit_html:${row.name}`,
      ok: hit,
      message: hit ? undefined : `start kit HTML missing: ${row.pattern}`,
    });
  }

  // --- Phase 3: plugin templates & skill docs ---
  for (const row of contract.pluginTemplateSignals || []) {
    results.push(assertFileContains(PLUGIN_ROOT, row.file, row.pattern, `template:${row.name}`));
  }

  for (const row of contract.skillDocSignals || []) {
    results.push(assertFileContains(PLUGIN_ROOT, row.file, row.pattern, `skill_doc:${row.name}`));
  }

  for (const row of contract.commandSkillRefs || []) {
    results.push(assertFileContains(PLUGIN_ROOT, row.file, row.pattern, `command:${row.file}`));
  }

  // --- Phase 4: eval packs exist (golden scenarios) ---
  const evalPacks = collectSkillEvalFiles();
  for (const p of evalPacks) {
    const rel = p.slice(PLUGIN_ROOT.length + 1);
    results.push(assertFileExists(PLUGIN_ROOT, rel, `eval_pack:${rel}`));
  }

  console.log('== Reference + plugin alignment ==\n');
  let failed = printResults(results);

  console.log(`\nFound ${evalPacks.length} skill eval pack(s).`);

  if (workspace) {
    const ws = workspace.replace(/\/$/, '');
    if (!existsSync(ws) || !statSync(ws).isDirectory()) {
      console.error(`\nERROR: --workspace is not a directory: ${workspace}`);
      process.exit(1);
    }
    console.log(`\n== Workspace golden assertions (${ws}) ==\n`);
    for (const evalPath of evalPacks) {
      const data = readJson(evalPath);
      const skill = data.skill_name || evalPath;
      const cases = data.evals || [];
      for (const ev of cases) {
        for (const a of ev.assertions || []) {
          const r = runWorkspaceAssertion(ws, { ...a, name: `${skill}#${ev.id}:${a.name || a.file}` });
          if (r.ok) console.log(`  OK   ${r.name}`);
          else {
            failed++;
            console.log(`  FAIL ${r.name}${r.message ? `: ${r.message}` : ''}`);
          }
        }
      }
    }
  } else {
    console.log('\n(Skipping workspace evals; pass --workspace /path/to/repo for apps/... golden checks.)');
  }

  console.log('');
  if (failed > 0) {
    console.error(`Done: ${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('Done: all checks passed.');
}

main();
