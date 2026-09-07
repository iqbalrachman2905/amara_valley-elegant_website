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
  'Available': { color: 'var(--color-status-available)', label: 'Tersedia' },
  'Sold': { color: 'var(--color-status-sold)', label: 'Terjual' },
  'Ready Unit': { color: 'var(--color-status-ready)', label: 'Ready Unit' },
  'Progress (Ready Stock)': { color: 'var(--color-status-progress)', label: 'Progress' }
};

export function statusStyle(status) {
  return STATUS_STYLE[status] || { color: 'var(--color-navy-soft)', label: status || '-' };
}
