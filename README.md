# Amara Valley — Elegant Website

Landing page klaster **Amara Valley** (`Amara Land` — Kelapa Dua, Depok):
rumah dua lantai *modern-classic*, 28 unit eksklusif, harga mulai ±Rp 900 juta, DP 0%.

Arah desain mengikuti tren *quiet luxury* 2026: warm ivory + banyak *white space*,
tipografi serif editorial (Playfair Display), aksen emas antique yang hemat, animasi
scroll halus, dan fotografi full-bleed.

## Stack

- [Astro](https://astro.build) 4 (SSG) + Vue 3 islands (`@astrojs/vue`)
- Font: Playfair Display + Plus Jakarta Sans (self-hosted via `@fontsource`)
- Deploy: GitHub Pages (`.github/workflows/deploy.yml`)

## Alur data

```
Google Spreadsheet ─▶ Apps Script API ─▶ Astro build ─▶ HTML statis
                        │
                        └─(gagal)─▶ data/snapshot.json (fallback)
```

1. **Sumber materi:** spreadsheet (tab `Content`, `Unit`, `Galeri`, `Artikel`, `Testimoni`)
   dibaca oleh Apps Script dan diekspos lewat endpoint `src/lib/api.js`.
2. **Fallback:** saat API tidak terjangkau (mis. cold start), build memakai
   `data/snapshot.json` — data terakhir yang tersimpan. Untuk menyegarkannya:

   ```bash
   node scripts/fetch-snapshot.mjs
   ```

3. **Gambar:** foto asli (Google Drive) dipakai lebih dulu lewat pipeline
   `astro:assets`. Bila belum tersedia atau gagal diunduh saat build, situs
   memakai gambar dummy elegan di `src/assets/dummy/` (AI-generated, konsisten
   dengan gaya *modern-classic ivory*). Ganti gambar dummy dengan foto asli
   kapan pun sudah ada — cukup tambahkan baris di tab `Galeri` spreadsheet.

> Catatan konten: teks *Tentang*, artikel, video, dan siteplan di spreadsheet
> masih berisi materi template proyek lama. Halaman menampilkannya apa adanya
> sesuai instruksi, dengan beberapa penyesuaian cerdas (mis. narasi *Tentang*
> memakai teks Amara Valley yang disusun ulang dari data sampai spreadsheet
> diperbarui — deteksi otomatis, tidak perlu ubah kode).

## Menjalankan

```bash
npm install        # atau: bun install
npm run dev        # dev server
npm run build      # build statis ke dist/
npm run preview    # pratinjau hasil build
```

### Path GitHub Pages

Project site di-deploy ke `https://iqbalrachman2905.github.io/amara_valley-elegant_website/`.
`astro.config.mjs` otomatis memakai `base` tersebut saat `CI=1` (GitHub Actions),
dan base `/` untuk dev lokal.

## Struktur penting

```
src/
  styles/tokens.css        ← design system (warna, tipografi, spacing, tombol)
  layouts/BaseLayout.astro ← layout dasar + SEO/OG
  components/              ← komponen halaman (Hero, Unit, Promo, FAQ, …)
  assets/dummy/            ← gambar dummy lokal (fallback)
  lib/                     ← api.js, format.js, image.js, paths.js
  pages/index.astro        ← komposisi landing page
  pages/artikel/           ← listing & detail artikel
data/snapshot.json         ← cadangan data spreadsheet
scripts/fetch-snapshot.mjs ← refresh snapshot dari API
```
