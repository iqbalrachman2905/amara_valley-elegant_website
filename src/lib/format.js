export function formatRupiah(num) {
  if (num === null || num === undefined || num === '') return '';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Harga versi pendek untuk headline/CTA ("Rp 0,9 M", "Rp 900 jutaan").
 * Mengembalikan null bila angka tidak valid — pemanggil bisa menyusun
 * teks cadangan dari data lain, bukan dari konstanta.
 */
export function priceShortLabel(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1_000_000_000) {
    return `Rp ${(n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  }
  return `Rp ${Math.round(n / 1e6)} jutaan`;
}

/**
 * Bersih-bersih sel narasi yang kena artefak paste kode JS di spreadsheet
 * (mis. about_description yang isinya ada sisa `',` dan `'` di tiap
 * pergantian paragraf). Mengembalikan array paragraf bersih.
 * Sel yang bersih tetap bersih — fungsi ini tidak mengubah isi substantif.
 */
export function splitNarrativeParagraphs(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .map(line => line
      .replace(/^['"“”]+/, '')
      .replace(/['"“”]+,?$/, '')
      .trim())
    .filter(Boolean);
}

/**
 * Bersihin nomor telepon dari karakter aneh - di sheet Content kolom
 * whatsapp_number kadang kesimpen sebagai "=6285691235723" (artefak dari
 * Google Sheets), jadi kita jaga-jaga strip semua yang bukan digit.
 */
export function cleanPhoneNumber(raw) {
  if (!raw) return '';
  return String(raw).replace(/[^0-9]/g, '');
}

export function buildWaLink(phoneRaw, message) {
  const phone = cleanPhoneNumber(phoneRaw);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Rumus anuitas standar. Dipakai bareng oleh KprCalculator.vue dan fitur
 * compare unit - sengaja 1 fungsi bersama biar kalau nanti asumsi bunga
 * berubah, cukup diubah di 1 tempat, gak perlu inget update di 2 file beda.
 */
export function estimateMonthlyInstallment(price, { dpPercent = 0, ratePercent = 7.5, tenorYears = 20 } = {}) {
  if (!price) return 0;
  const dpAmount = Math.round((price * dpPercent) / 100);
  const loanAmount = price - dpAmount;
  const monthlyRate = ratePercent / 100 / 12;
  const n = tenorYears * 12;
  if (monthlyRate === 0) return Math.round(loanAmount / n);
  const factor = Math.pow(1 + monthlyRate, n);
  return Math.round((loanAmount * monthlyRate * factor) / (factor - 1));
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_STYLE = {
  'Available': { color: 'var(--color-status-available)', label: 'Tersedia' },
  'Sold': { color: 'var(--color-status-sold)', label: 'Terjual' },
  'Ready Unit': { color: 'var(--color-status-ready)', label: 'Ready Unit' },
  'Progress (Ready Stock)': { color: 'var(--color-status-progress)', label: 'Progress' }
};

export function statusStyle(status) {
  return STATUS_STYLE[status] || { color: 'var(--color-navy-soft)', label: status || '-' };
}
