import { slugify } from './format.js';

/**
 * Ambil semua <h2>...</h2> dari HTML artikel, kasih id ke masing-masing
 * (biar bisa dituju link), dan kembalikan daftar isinya.
 *
 * Pendekatan regex ini sengaja dipilih daripada parser HTML penuh - lebih
 * ringan (gak nambah dependency), dan cukup buat kasus kita karena HTML
 * yang diproses selalu berasal dari 1 sumber yang konsisten (Google Docs
 * publish-to-web), bukan HTML sembarangan dari internet.
 */
/**
 * Google Docs otomatis nge-tag judul dokumen (atau teks pertama yang
 * di-style "Title"/"Heading 1") jadi <h1> pas di-publish ke web. Tapi
 * halaman artikel kita UDAH nampilin judul sendiri (dari kolom title di
 * sheet) sebagai <h1> di header. Kalau body_html juga bawa <h1>, jadinya
 * ada 2 H1 dalam 1 halaman - Google nganggep itu sinyal SEO yang jelek
 * (halaman dianggap gak punya 1 topik utama yang jelas). Ini buang H1
 * PERTAMA doang dari body_html (asumsinya itu judul duplikat dari Doc).
 */
export function stripLeadingH1(html) {
  if (!html) return html;
  let removed = false;
  return html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, (match) => {
    if (removed) return match;
    removed = true;
    return '';
  });
}

export function extractToc(html) {
  if (!html) return { html, toc: [] };

  const toc = [];
  const usedIds = new Set();

  const newHtml = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (match, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (!text) return match;

    let id = slugify(text);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${slugify(text)}-${suffix}`;
      suffix++;
    }
    usedIds.add(id);
    toc.push({ id, text });

    // Kalau h2 aslinya udah punya atribut lain (jarang, tapi jaga-jaga),
    // tambahin id di depan tanpa nimpa yang udah ada.
    return `<h2 id="${id}"${attrs}>${inner}</h2>`;
  });

  return { html: newHtml, toc };
}
