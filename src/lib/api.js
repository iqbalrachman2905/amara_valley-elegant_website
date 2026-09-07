// Cache in-memory - build Astro itu satu proses Node.js yang sama dipakai
// bareng buat semua halaman (index, listing artikel, tiap halaman artikel).
// Tanpa ini, getSiteData() bisa kepanggil belasan kali dalam 1 build =
// belasan request ke Apps Script yang sebenernya nanya hal yang sama.
let cachedSiteData = null;
const articleCache = new Map();

const API_URL = 'https://script.google.com/macros/s/AKfycbyLnKTEuhejWK2KmNHisXKkJrnTmMa_fZ00yUnkzuFN4ItoSlS7awYhqImdyKUVaZPZ/exec';

// Snapshot data terakhir yang berhasil diambil (disimpan manual di
// data/snapshot.json). Dipakai sebagai fallback kalau Apps Script lagi
// down / cold start kelewatin timeout - jadi build situs tetap jalan
// dengan data terakhir yang diketahui baik, bukan gagal total.
import snapshot from '../../data/snapshot.json';
let usingSnapshot = false;
export function isUsingSnapshot() { return usingSnapshot; }

// Timeout 30 detik - Google Apps Script kadang lambat cold start
const FETCH_TIMEOUT_MS = 30000;

/** Fetch dengan timeout - mencegah build hang karena API tidak respons */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout setelah ${FETCH_TIMEOUT_MS / 1000} detik. Apps Script mungkin sedang cold start.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Dipanggil di frontmatter halaman .astro (jalan di Node.js pas build,
 * BUKAN di browser visitor) - jadi visitor akhir nggak pernah nunggu API ini.
 */
export async function getSiteData() {
  if (cachedSiteData) return cachedSiteData;

  try {
    const res = await fetchWithTimeout(`${API_URL}?action=all`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    cachedSiteData = data;
    return data; // { content, units, gallery, articles, generated_at }
  } catch (err) {
    // Apps Script gagal dijangkau - fallback ke snapshot lokal biar build/
    // dev tetap jalan (data mungkin stale, tapi lebih baik daripada error).
    if (snapshot?.content) {
      console.warn(`⚠️  Fetch Apps Script gagal (${err.message}). Memakai snapshot lokal dari ${snapshot.generated_at}.`);
      usingSnapshot = true;
      cachedSiteData = snapshot;
      return snapshot;
    }
    throw new Error(`Gagal fetch data dari Apps Script: ${err.message}. Cek apakah deployment masih aktif: ${API_URL}`);
  }
}

/** 
 * Ambil 1 artikel lengkap (termasuk body_html dari Google Doc) by slug. 
 */
export async function getArticleBySlug(slug) {
  if (articleCache.has(slug)) return articleCache.get(slug);

  try {
    const res = await fetchWithTimeout(`${API_URL}?action=article&slug=${encodeURIComponent(slug)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    articleCache.set(slug, data);
    return data;
  } catch (err) {
    // Fallback ke artikel di snapshot lokal (kalau ada) saat API gagal.
    const local = snapshot?.articles?.find(a => a.slug === slug);
    if (local) {
      console.warn(`⚠️  Fetch artikel "${slug}" gagal (${err.message}). Memakai snapshot lokal.`);
      articleCache.set(slug, local);
      return local;
    }
    throw new Error(`Gagal fetch artikel "${slug}": ${err.message}`);
  }
}

/** Cari foto pertama (sesuai urutan) untuk kategori & unit_id tertentu. */
export function findCoverImage(gallery, kategori, unitId) {
  return gallery
    .filter(g => g.kategori === kategori && g.unit_id === unitId && g.image_url)
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))[0] || null;
}
