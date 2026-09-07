#!/usr/bin/env node
/**
 * Perbarui data/snapshot.json dari endpoint Apps Script.
 *
 * Snapshot dipakai sebagai cadangan (fallback) saat build tidak bisa
 * menjangkau Apps Script — sehingga situs tetap bisa di-build dengan data
 * terakhir yang diketahui baik.
 *
 * Pemakaian:
 *   node scripts/fetch-snapshot.mjs
 *   CI=1 node scripts/fetch-snapshot.mjs   (ikuti base path GitHub Pages)
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API_URL = 'https://script.google.com/macros/s/AKfycbyLnKTEuhejWK2KmNHisXKkJrnTmMa_fZ00yUnkzuFN4ItoSlS7awYhqImdyKUVaZPZ/exec';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'snapshot.json');

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms));

async function getJson(action) {
  const url = `${API_URL}?action=${action}`;
  const res = await Promise.race([fetch(url), timeout(30000)]);
  if (!res.ok) throw new Error(`HTTP ${res.status} untuk action=${action}`);
  return res.json();
}

const [content, units, gallery, articles, testimonials] = await Promise.all([
  getJson('content').catch(() => null),
  getJson('units').catch(() => null),
  getJson('gallery').catch(() => null),
  getJson('articles').catch(() => null),
  getJson('testimonials').catch(() => null)
]);

// Sheet "Person" opsional — backend belum mengeksposnya; bila suatu saat
// tersedia (mis. action=persons), data ikut disimpan ke snapshot.
const PERSON_ACTIONS = ['persons', 'person', 'people', 'team', 'staff'];
let persons = null;
for (const action of PERSON_ACTIONS) {
  try {
    const res = await getJson(action);
    if (res && !res.error) { persons = res; break; }
  } catch { /* coba action berikutnya */ }
}

const snapshot = {
  content: content?.content || content || {},
  units: units || [],
  gallery: gallery || [],
  articles: articles || [],
  testimonials: testimonials || [],
  persons: persons || [],
  generated_at: new Date().toISOString()
};

writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
console.log(`✔ data/snapshot.json ditulis (${new Date().toISOString()})`);
console.log(`  content: ${Object.keys(snapshot.content).length} keys`);
console.log(`  units: ${snapshot.units.length} · gallery: ${snapshot.gallery.length} · articles: ${snapshot.articles.length} · testimonials: ${snapshot.testimonials.length} · persons: ${snapshot.persons.length}`);
