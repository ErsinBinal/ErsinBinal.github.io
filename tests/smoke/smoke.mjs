#!/usr/bin/env node
/**
 * Hafif smoke testleri: dis uclari yoklar, bagimliligi yoktur (Node 18+ fetch).
 * Calistir:  node tests/smoke/smoke.mjs
 * Env ile hedef degistir:
 *   SITE_BASE   (varsayilan: https://ersinbinal.github.io)
 *   WORKER_BASE (varsayilan: https://convivium-oracle.convivium.workers.dev)
 *   SUPABASE_URL(varsayilan: https://airmhxfgtslsgrdhvfin.supabase.co)
 *   SKIP_WORKER=1  -> worker (AI arama) kontrollerini atla
 */

const SITE = (process.env.SITE_BASE || 'https://ersinbinal.github.io').replace(/\/$/, '');
const WORKER = (process.env.WORKER_BASE || 'https://convivium-oracle.convivium.workers.dev').replace(/\/$/, '');
const SUPABASE = (process.env.SUPABASE_URL || 'https://airmhxfgtslsgrdhvfin.supabase.co').replace(/\/$/, '');
const ORIGIN = 'https://ersinbinal.github.io';
const SKIP_WORKER = process.env.SKIP_WORKER === '1';

const results = [];
const record = (name, ok, detail = '') => results.push({ name, ok, detail });

async function withTimeout(promise, ms, label) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await promise(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

async function checkPage(path) {
  const url = `${SITE}${path}`;
  try {
    const res = await withTimeout(s => fetch(url, { signal: s }), 15000);
    record(`GET ${path}`, res.ok, `HTTP ${res.status}`);
  } catch (e) {
    record(`GET ${path}`, false, e.message || String(e));
  }
}

async function checkWorkerEnrich() {
  try {
    const res = await withTimeout(s => fetch(`${WORKER}/enrich-profile`, {
      method: 'POST', signal: s,
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ first_name: 'Cem', last_name: 'Yilmaz' })
    }), 35000);
    const data = await res.json().catch(() => ({}));
    const validProviders = ['tavily', 'google-cse', 'gemini-grounded', 'unavailable'];
    const ok = res.ok && typeof data.provider === 'string' && validProviders.includes(data.provider);
    record('POST /enrich-profile', ok, `HTTP ${res.status} provider=${data.provider} grounded=${data.grounded}`);
  } catch (e) {
    record('POST /enrich-profile', false, e.message || String(e));
  }
}

async function checkWorkerOracle() {
  try {
    const res = await withTimeout(s => fetch(`${WORKER}`, {
      method: 'POST', signal: s,
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ question: 'Bu site ne yapar?' })
    }), 30000);
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && typeof data.answer === 'string' && data.answer.length > 0;
    record('POST /oracle (question)', ok, `HTTP ${res.status} provider=${data.provider}`);
  } catch (e) {
    record('POST /oracle (question)', false, e.message || String(e));
  }
}

async function checkSupabase() {
  try {
    const res = await withTimeout(s => fetch(`${SUPABASE}/auth/v1/health`, { signal: s }), 15000);
    // 200 veya 401 (apikey ister) = sunucu ayakta. 5xx/baglanti hatasi = sorun.
    record('Supabase erisilebilir', res.status === 200 || res.status === 401, `HTTP ${res.status}`);
  } catch (e) {
    record('Supabase /auth/v1/health', false, e.message || String(e));
  }
}

async function main() {
  const pages = [
    '/', '/account/auth.html', '/account/dashboard.html', '/oracle/index.html',
    '/legal/kvkk-aydinlatma.html', '/legal/kullanim-kosullari.html', '/pages/makaleler.html'
  ];
  for (const p of pages) await checkPage(p);
  await checkSupabase();
  if (!SKIP_WORKER) {
    await checkWorkerOracle();
    await checkWorkerEnrich();
  }

  let failed = 0;
  console.log('\nConvivium smoke testleri\n========================');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
    if (!r.ok) failed++;
  }
  console.log('------------------------');
  console.log(`${results.length - failed}/${results.length} gecti${failed ? ` — ${failed} BASARISIZ` : ''}\n`);
  process.exit(failed ? 1 : 0);
}

main();
