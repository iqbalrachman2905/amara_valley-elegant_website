import { getImage } from 'astro:assets';

/**
 * Bungkus getImage() dengan try/catch. Kalau 1 foto gagal diproses (format
 * aneh, corrupt, dll), build TIDAK berhenti total - foto itu aja yang
 * dilewati (fallback ke placeholder di komponen masing-masing), sisanya
 * tetap jalan normal. Sebelumnya 1 foto rusak bisa bikin SELURUH situs
 * gagal ke-build, itu terlalu rapuh buat sistem yang isinya bakal terus
 * bertambah foto dari waktu ke waktu.
 */
export async function safeImage(src, options = {}) {
   if (!src) return null;

   // Untuk URL eksternal, Astro wajib dikasih width & height eksplisit
   // (nyegah CLS). Kalau pemanggil cuma kasih `width` atau `widths`,
   // isi otomatis: width dasar = varian terbesar, height = rasio 4:3
   // (rasio dominan kartu/foto di situs ini; CSS object-fit tetap
   // ngebenerin tampilannya).
   const opts = { ...options };
   if (!opts.width && Array.isArray(opts.widths) && opts.widths.length > 0) {
     opts.width = opts.widths[opts.widths.length - 1];
   }
   if (opts.width && !opts.height) {
     opts.height = Math.round(opts.width * 0.75);
   }

   try {
     return await getImage({ src, ...opts });
   } catch (err) {
     console.warn(`⚠️  Gagal proses gambar, dilewati: ${src}\n   Alasan: ${err.message}`);
     return null;
   }
}

/**
 * Normalisasi URL gambar Google Drive ke endpoint `thumbnail` yang reliable
 * buat hotlink (dipakai browser visitor, crawler OG, dll). Endpoint
 * `uc?export=download` sering dibalas redirect/HTML interstitial - bukan
 * gambarnya - makanya semua format dikonversi ke sini:
 *   - drive.google.com/thumbnail?id=X&sz=w1000  -> tinggal naikin resolusi
 *   - drive.google.com/uc?export=download&id=X  -> dikonversi
 *   - drive.google.com/open?id=X                -> dikonversi
 *   - drive.google.com/file/d/X/view            -> dikonversi
 * URL selain Google Drive dikembalikan apa adanya.
 */
export function drivePreviewUrl(url, width = 1000) {
  if (!url) return url;
  const str = String(url);

  // Sudah format thumbnail - pastikan param sz sesuai resolusi yang diminta
  if (str.includes('drive.google.com/thumbnail')) {
    return /sz=w\d+/.test(str)
      ? str.replace(/sz=w\d+/, `sz=w${width}`)
      : `${str}&sz=w${width}`;
  }

  // Format lain: ekstrak file id-nya dulu
  const match = str.match(/drive\.google\.com\/(?:uc\?export=download&|open\?|file\/d\/)(?:id=)?([\w-]{10,})/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${width}`;
  }

  return str;
}
