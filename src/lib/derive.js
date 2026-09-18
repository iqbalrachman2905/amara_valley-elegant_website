// ============================================================================
// derive.js — pusat TURUNAN DATA.
// ----------------------------------------------------------------------------
// Semua angka & fakta yang DULU ditulis mati (hardcode) di komponen — luas
// tanah/bangunan, jumlah unit, harga mulai, highlight material, asumsi
// kalkulator KPR — kini dihitung di sini dari data spreadsheet.
//
// Sumber kebenaran TUNGGgal adalah sheet; kalau isi sheet berubah (harga,
// luas, jumlah unit, promo, dsb.) seluruh situs ikut berubah otomatis,
// tanpa menyentuh kode.
// ============================================================================

import { priceShortLabel } from './format.js';

// Asumsi terakhir simulasi KPR — HANYA dipakai kalau key sheet belum diisi
// (kpr_rate_default / kpr_tenor_default / kpr_dp_default). Nilai normal di
// kelola lewat spreadsheet, bukan lewat file ini.
export const KPR_FALLBACK = Object.freeze({
  dpPercent: 0,
  ratePercent: 7.5,
  tenorYears: 15,
  tenorOptions: Object.freeze([5, 10, 15, 20]),
});

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Statistik agregat dari sheet Unit — dipakai Hero (unit tersedia),
 * Tentang (rentang luas), Promo/CTA (harga mulai), Siteplan (jumlah rumah).
 */
export function unitStats(units = []) {
  const list = Array.isArray(units) ? units : [];
  const prices = list.map(u => toNumber(u.harga)).filter(n => n > 0);
  const lts = list.map(u => toNumber(u.luas_tanah)).filter(n => n > 0);
  const lbs = [...new Set(list.map(u => toNumber(u.luas_bangunan)).filter(n => n > 0))].sort((a, b) => a - b);
  const kamars = list.map(u => toNumber(u.kamar)).filter(n => n > 0);
  const sold = list.filter(u => /sold/i.test(String(u.status || ''))).length;

  return {
    total: list.length,
    available: list.length - sold,
    sold,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    ltMin: lts.length ? Math.min(...lts) : null,
    ltMax: lts.length ? Math.max(...lts) : null,
    lbValues: lbs,
    kamarMax: kamars.length ? Math.max(...kamars) : null,
  };
}

/**
 * Parse key "rumah" ("2 Lantai::Desain Modern::3 Kamar Tidur::…") menjadi
 * daftar fitur. Entri yang diawali angka → { value, label }; selain itu
 * { value: null, label } (dipakai juga oleh strip fitur di Hero).
 */
export function parseHouseFeatures(raw) {
  return String(raw || '')
    .split('::')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const m = s.match(/^(\d+)\s+(.+)$/);
      return m ? { value: m[1], label: m[2] } : { value: null, label: s };
    });
}

function featureNumber(features, re) {
  const f = features.find(f => re.test(f.label));
  if (!f) return null;
  // Angka di awal entri ("3 Kamar Mandi") sudah dipindah ke f.value oleh
  // parseHouseFeatures; angka di tengah ("Carport 2 Mobil") tinggal dicari
  // di labelnya.
  if (f.value !== null) return Number(f.value);
  const m = String(f.label).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Angka "N" dari total_unit ("28 Exclusive" → 28); fallback ke jumlah
 * baris sheet Unit (boleh dikirim sebagai array unit atau angka jumlah).
 */
export function totalUnitNumber(content = {}, units = []) {
  const fromContent = toNumber(String(content.total_unit || '').replace(/[^\d.,]/g, ''));
  if (fromContent && fromContent > 0) return fromContent;
  if (Array.isArray(units)) return units.length;
  return toNumber(units) || 0;
}

/**
 * Fakta ringkas section Tentang (dulunya ditulis mati di About.astro).
 * Luas dihitung dari sheet Unit; kamar mandi & carport diparse dari key
 * "rumah". Item yang datanya tidak ada otomatis hilang.
 */
export function aboutFacts(content = {}, units = []) {
  const stats = unitStats(units);
  const features = parseHouseFeatures(content.rumah);
  const facts = [];

  if (stats.ltMin !== null) {
    facts.push({
      label: 'Luas Tanah',
      value: stats.ltMin === stats.ltMax
        ? `${stats.ltMin} m²`
        : `${stats.ltMin} – ${stats.ltMax} m²`,
    });
  }
  if (stats.lbValues.length > 0) {
    facts.push({
      label: 'Luas Bangunan',
      value: stats.lbValues.length === 1
        ? `${stats.lbValues[0]} m²`
        : `${stats.lbValues[0]} – ${stats.lbValues[stats.lbValues.length - 1]} m²`,
    });
  }

  const kt = featureNumber(features, /kamar\s*tidur/i) ?? stats.kamarMax;
  const km = featureNumber(features, /kamar\s*mandi/i);
  if (kt || km) {
    facts.push({
      label: 'Kamar',
      value: [kt ? `${kt} KT` : null, km ? `${km} KM` : null].filter(Boolean).join(' · '),
    });
  }

  const carport = featureNumber(features, /carport|garasi|mobil/i);
  if (carport) {
    facts.push({ label: 'Carport', value: `${carport} Mobil` });
  }

  return facts;
}

/**
 * Highlight material di section Spesifikasi (dulunya 3 baris hardcode yang
 * menduplikasi spec_3/spec_4/spec_10). Kini dipilih dari daftar spec_*
 * sesuai judul yang paling relevan; sisanya menyusul urutan sheet.
 */
export function specHighlights(specs = [], max = 3) {
  if (!Array.isArray(specs) || specs.length === 0) return [];
  const preferred = [/lantai/i, /pintu/i, /listrik/i];
  const picked = [];
  for (const re of preferred) {
    const s = specs.find(s => re.test(String(s.title)) && !picked.includes(s));
    if (s) picked.push(s);
  }
  for (const s of specs) {
    if (picked.length >= max) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.slice(0, max);
}

/**
 * Asumsi awal kalkulator KPR & simulasi compare — SEMUA bisa diatur dari
 * sheet Content (tab Content):
 *   kpr_dp_default     → angka persen DP awal, mis. 0
 *   kpr_rate_default   → suku bunga %/tahun, mis. 7.5
 *   kpr_tenor_default  → tenor awal (tahun), mis. 15
 * Kalau key belum ada: DP diturunkan dari promo_dp ("DP 0%" → 0), harga
 * dari price_from atau unit termurah, bunga/tenor memakai KPR_FALLBACK.
 */
export function kprDefaults(content = {}, units = []) {
  const stats = unitStats(units);

  let dpPercent = toNumber(content.kpr_dp_default);
  if (dpPercent === null) {
    const m = String(content.promo_dp || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
    dpPercent = m ? Number(m[1].replace(',', '.')) : KPR_FALLBACK.dpPercent;
  }

  const ratePercent = toNumber(content.kpr_rate_default) ?? KPR_FALLBACK.ratePercent;
  const tenorYears = toNumber(content.kpr_tenor_default) ?? KPR_FALLBACK.tenorYears;

  // Opsi tenor selalu menyertakan nilai default dari sheet.
  const tenorOptions = [...new Set([...KPR_FALLBACK.tenorOptions, tenorYears])].sort((a, b) => a - b);

  return {
    price: toNumber(content.price_from) ?? stats.minPrice ?? 0,
    dpPercent,
    ratePercent,
    tenorYears,
    tenorOptions,
  };
}

/**
 * Meta description cadangan kalau meta_description kosong di sheet —
 disusun dari data (nama, tagline, jumlah unit, promo, harga mulai),
 bukan teks tetap.
 */
export function fallbackMetaDescription(content = {}, units = []) {
  const stats = unitStats(units);
  const price = priceShortLabel(toNumber(content.price_from) ?? stats.minPrice);
  const parts = [
    String(content.hero_title || '').trim(),
    String(content.tagline || '').trim(),
    stats.total ? `${totalUnitNumber(content, units)} unit` : '',
    String(content.promo_dp || '').trim(),
    price ? `mulai ${price}` : '',
  ].filter(Boolean);
  return parts.length > 1 ? parts.join(' · ') + '.' : parts.join('');
}

/**
 * Ringkasan angka untuk narasi section Siteplan (dulunya "28 rumah dua
 * lantai" ditulis mati).
 */
export function siteplanSummary(content = {}, units = []) {
  const features = parseHouseFeatures(content.rumah);
  const lantai = toNumber(content.jumlah_lantai) ?? featureNumber(features, /lantai/i);
  return {
    total: totalUnitNumber(content, units),
    lantai: lantai && lantai > 0 ? lantai : null,
  };
}
