export function formatRupiah(num) {
  if (num === null || num === undefined || num === '') return '';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
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
  'available': { color: 'var(--color-status-available)', label: 'Tersedia' },
  'tersedia': { color: 'var(--color-status-available)', label: 'Tersedia' },
  'sold': { color: 'var(--color-status-sold)', label: 'Terjual' },
  'terjual': { color: 'var(--color-status-sold)', label: 'Terjual' },
  'booked': { color: 'var(--color-status-progress)', label: 'Booked' },
  'booking': { color: 'var(--color-status-progress)', label: 'Booking' },
  'ready unit': { color: 'var(--color-status-ready)', label: 'Ready Unit' },
  'ready': { color: 'var(--color-status-ready)', label: 'Ready Unit' },
  'progress (ready stock)': { color: 'var(--color-status-progress)', label: 'Progress' },
  'progress': { color: 'var(--color-status-progress)', label: 'Progress' },
};

export function statusStyle(status) {
  const raw = String(status || '').trim();
  if (!raw) return { color: 'var(--color-navy-soft)', label: '-' };
  const key = raw.toLowerCase();
  if (STATUS_STYLE[key]) return STATUS_STYLE[key];
  // fallback: cari yang mengandung kata kunci
  if (key.includes('sold') || key.includes('terjual')) return STATUS_STYLE['sold'];
  if (key.includes('book')) return STATUS_STYLE['booked'];
  if (key.includes('ready')) return STATUS_STYLE['ready unit'];
  if (key.includes('progress')) return STATUS_STYLE['progress'];
  if (key.includes('avail') || key.includes('tersedia')) return STATUS_STYLE['available'];
  return { color: 'var(--color-navy-soft)', label: raw };
}
