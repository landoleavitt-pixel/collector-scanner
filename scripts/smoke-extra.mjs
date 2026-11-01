// scripts/smoke-extra.mjs
//
// Extra smoke checks for a running site: the card checklist API
// (GET /api/checklist). No eBay calls.
//
//   node scripts/smoke-extra.mjs                         check http://localhost:3100
//   node scripts/smoke-extra.mjs --base https://fieldsandfloors.com
//
// scripts/smoke.mjs can run these too, with its own getJson and report:
//   import { runExtraChecks } from './smoke-extra.mjs';
//   await runExtraChecks({ getJson, report });
//
// Exit code 0 when every check passes, 1 otherwise (standalone only).

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Checklist API checks. getJson(path) → { status, body }; report(status, name, detail). */
export async function runExtraChecks({ getJson, report }) {
  // Whether any checklists are imported decides what "Paul Skenes" should return.
  let imported = 0;
  try { imported = fs.readdirSync(path.join(root, 'lib/checklists')).filter((f) => f.endsWith('.json')).length; } catch { /* none */ }

  const name = 'checklist "Paul Skenes" returns 200 with a sets list';
  try {
    const { status, body } = await getJson('/api/checklist?player=Paul%20Skenes');
    if (status !== 200) report('FAIL', name, `HTTP ${status}`);
    else if (!Array.isArray(body?.sets)) report('FAIL', name, 'no sets list');
    else if (!imported && body.sets.length) report('FAIL', name, `${body.sets.length} sets, but no checklists are imported`);
    else if (body.sets.some((s) => !s.set || !Array.isArray(s.cards) || s.cards.some((c) => !c.number || !Array.isArray(c.versions)))) report('FAIL', name, 'a set or card is missing fields');
    else report('PASS', name, imported ? `${body.sets.length} sets` : 'empty (no checklists imported yet)');
  } catch (e) { report('FAIL', name, e.message); }

  for (const [q, label] of [['', 'no player'], ['?player=a', 'a 1-letter name']]) {
    const n = `checklist with ${label} returns 400`;
    try {
      const { status } = await getJson(`/api/checklist${q}`);
      report(status === 400 ? 'PASS' : 'FAIL', n, status === 400 ? '' : `HTTP ${status}`);
    } catch (e) { report('FAIL', n, e.message); }
  }
}

// Standalone run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argBase = process.argv.indexOf('--base');
  const BASE = (argBase > -1 ? process.argv[argBase + 1] : 'http://localhost:3100').replace(/\/$/, '');
  let failed = 0;
  const report = (status, name, detail = '') => {
    if (status === 'FAIL') failed++;
    console.log(`${status.padEnd(13)} ${name}${detail ? ` — ${detail}` : ''}`);
  };
  const getJson = async (p) => {
    const res = await fetch(BASE + p, { cache: 'no-store', signal: AbortSignal.timeout(60000) });
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    return { status: res.status, body };
  };
  await runExtraChecks({ getJson, report });
  process.exit(failed ? 1 : 0);
}
