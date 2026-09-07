// ============================================================================
// api.gs — Amara Valley (LENGKAP, termasuk dukungan sheet "Person")
// ----------------------------------------------------------------------------
// CARA PAKAI:
//  1. File ini adalah versi UTUH dari api.gs Anda + tambahan action "persons".
//  2. SEBELUM mengganti isi file api.gs lama dengan file ini, pastikan semua
//     konstanta & fungsi pembantu berikut TETAP ADA di project Apps Script
//     (kalau ada di bagian atas api.gs lama Anda, atau di file .gs lain
//     seperti Config.gs/Helpers.gs, tidak perlu diapa-apakan):
//        - konstanta: REQUIRE_BUILD_TOKEN, BUILD_TOKEN, SPREADSHEET_ID,
//          SHEET_NAMES
//        - helper: getImageUrl(), getDriveThumbnailUrl(), extractDriveFileId(),
//          resolveGalleryItem(), toIsoString(), getPublishedDocHtml()
//     Jika konstanta-constanta itu ada DI DALAM file api.gs lama Anda di atas
//     fungsi doGet, tempel kembali blok konfigurasi tersebut ke file baru ini
//     (atau pakai cara "tambahan kecil" di README/chat — lebih aman).
// ============================================================================

// ----------------------------------------------------------------------------
// KONFIGURASI — HAPUS blok ini jika konstanta sudah didefinisikan di tempat
// lain (file yang sama / file .gs lain). Jangan sampai terduplikasi!
// ----------------------------------------------------------------------------
// const SPREADSHEET_ID = 'ISI_ID_SPREADSHEET_DI_SINI';
// const SHEET_NAMES = {
//   CONTENT: 'Content',
//   UNITS: 'Unit',
//   GALLERY: 'Galeri',
//   ARTICLES: 'Artikel',
//   TESTIMONIALS: 'Testimoni',
//   PERSON: 'Person'          // opsional — getPersons() memakai nama literal
// };
// const REQUIRE_BUILD_TOKEN = false;
// const BUILD_TOKEN = '';

function doGet(e) {
  const action = e.parameter.action;

  if (REQUIRE_BUILD_TOKEN && e.parameter.token !== BUILD_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' });
  }

  let data;
  switch (action) {
    case 'content':
      data = getContent();
      break;
    case 'units':
      data = getUnits();
      break;
    case 'gallery':
      data = getGallery();
      break;
    case 'articles':
      data = getArticles();
      break;
    case 'testimonials':
      data = getTestimonials();
      break;
    case 'persons':                                  // BARU — sheet Person
      data = getPersons();
      break;
    case 'article':
      data = getArticleBySlug(e.parameter.slug);
      break;
    case 'all':
      // Satu panggilan buat build script Astro ambil semuanya sekaligus -
      // lebih efisien daripada 4x request terpisah tiap build jalan.
      data = {
        content: getContent(),
        units: getUnits(),
        gallery: getGallery(),
        articles: getArticles(),
        testimonials: getTestimonials(),
        persons: getPersons(),                       // BARU
        generated_at: new Date().toISOString()
      };
      break;
    default:
      data = { error: 'Unknown action: ' + action };
  }

  return jsonResponse(data);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1);
  return rows
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

// ============================================================================
// BARU — PEMBACA SHEET "PERSON"
// Kolom: name | position | experience | quote | strength | photo
// - Mencari sheet dengan nama: Person / Persons / People / Team / Staff / Tim
// - Baris tanpa "name" dilewati otomatis
// - Link Google Drive di kolom photo dikonversi ke URL thumbnail (supaya bisa
//   langsung dimuat browser), link non-Drive dibiarkan apa adanya
// ============================================================================
function getPersons() {
  const candidateNames = ['Person', 'Persons', 'People', 'Team', 'Staff', 'Tim'];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = null;
  for (const name of candidateNames) {
    sheet = ss.getSheetByName(name);
    if (sheet) break;
  }
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const idx = key => {
    const i = headers.indexOf(key);
    return i >= 0 ? i : null;
  };
  if (idx('name') === null) return []; // sheet tidak punya kolom name

  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = String(row[idx('name')] ?? '').trim();
    if (!name) continue;

    const photoRaw = idx('photo') !== null ? String(row[idx('photo')] ?? '').trim() : '';
    const isDrive = /drive\.google\.com/.test(photoRaw);
    const fileId = isDrive ? (photoRaw.match(/[-\w]{25,}/) || [])[0] : null;

    out.push({
      id: r + 1,
      name: name,
      position: idx('position') !== null ? String(row[idx('position')] ?? '').trim() : '',
      experience: idx('experience') !== null ? String(row[idx('experience')] ?? '').trim() : '',
      quote: idx('quote') !== null ? String(row[idx('quote')] ?? '').trim() : '',
      strength: idx('strength') !== null ? String(row[idx('strength')] ?? '').trim() : '',
      photo: fileId
        ? 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800'
        : photoRaw
    });
  }
  return out;
}

// ----------------------------------------------------------------------------
// Kode lama Anda di bawah ini — TIDAK DIUBAH, dipertahankan apa adanya.
// ----------------------------------------------------------------------------
function getContent() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.CONTENT);
  const values = sheet.getDataRange().getValues().slice(1);
  const content = {};
  values.forEach(([key, value]) => {
    if (key) content[key] = value;
  });

  // Content itu sheet key-value generic, jadi beda dari Gallery/Articles
  // yang link Drive-nya otomatis diproses. Kolom yang isinya link Drive
  // (misal siteplan) perlu ditangani manual di sini - dipastiin publik +
  // dikonversi ke link download langsung, bukan link "view" biasa yang
  // nggak bisa dibaca langsung sebagai gambar oleh Astro pas build.
  if (content.siteplan) {
    const fileId = extractDriveFileId(content.siteplan);
    content.siteplan = getImageUrl(content.siteplan) || content.siteplan;
    content.siteplan_thumbnail = fileId ? getDriveThumbnailUrl(fileId) : content.siteplan;
  }

  return content;
}

function getUnits() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.UNITS);
  return sheetToObjects(sheet).filter(u => u.id);
}

function getGallery() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.GALLERY);
  return sheetToObjects(sheet)
    .filter(item => item.id && item.drive_link)
    .map(resolveGalleryItem)
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
}

function getTestimonials() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.TESTIMONIALS);
  if (!sheet) return []; // jaga-jaga kalau sheet belum sempat dibuat
  return sheetToObjects(sheet).filter(t => t.id && t.name && t.text);
}

// "kpr,lrt,cimanggis" -> ['kpr','lrt','cimanggis']. Dipisah spasi/koma,
// disamain lowercase biar matching gak kepeleset kapitalisasi.
function parseTags(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}

// "Q1::A1\nQ2::A2" -> [{question:'Q1', answer:'A1'}, {question:'Q2', answer:'A2'}]
function parseFaq(raw) {
  if (!raw) return [];
  return String(raw)
    .split('\n')
    .map(line => line.split('::'))
    .filter(parts => parts.length === 2 && parts[0].trim() && parts[1].trim())
    .map(([q, a]) => ({ question: q.trim(), answer: a.trim() }));
}

function getArticles() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTICLES);
  const now = new Date();

  return sheetToObjects(sheet)
    .filter(a => a.id && a.published_at && new Date(a.published_at) <= now)
    // ^ INI kuncinya: artikel dengan published_at di masa depan otomatis
    // TIDAK ikut ter-generate saat build. Begitu cron build jalan lagi
    // setelah tanggalnya lewat, artikel otomatis tayang - tanpa lo sentuh.
    .map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      cover_url: getImageUrl(a.cover_drive_link),
      published_at: toIsoString(a.published_at),
      meta_title: a.meta_title || null,
      meta_description: a.meta_description || null,
      tags: parseTags(a.tags),
      related_units: parseTags(a.related_units)
    }))
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
}

function getArticleBySlug(slug) {
  if (!slug) return { error: 'slug wajib diisi' };
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTICLES);
  const now = new Date();

  const article = sheetToObjects(sheet).find(a =>
    a.slug === slug && a.published_at && new Date(a.published_at) <= now
  );
  if (!article) return { error: 'Artikel tidak ditemukan atau belum waktunya tayang' };

  const bodyHtml = getPublishedDocHtml(article.doc_url);

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    cover_url: getImageUrl(article.cover_drive_link),
    published_at: toIsoString(article.published_at),
    meta_title: article.meta_title || null,
    meta_description: article.meta_description || null,
    tags: parseTags(article.tags),
    related_units: parseTags(article.related_units),
    faq: parseFaq(article.faq),
    body_html: bodyHtml
  };
}
