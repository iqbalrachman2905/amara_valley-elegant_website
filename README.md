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

## Prinsip: tidak ada hardcode untuk angka/gambar/perhitungan

Semua **angka, fakta, harga, dan asumsi perhitungan** diturunkan dari data
spreadsheet lewat `src/lib/derive.js` — bukan ditulis mati di komponen:

| Yang tampil di situs | Sumber data |
| --- | --- |
| Harga mulai (hero, promo, CTA) | `price_from`, fallback unit termurah di sheet `Unit` |
| Unit tersedia / total unit | dihitung dari baris sheet `Unit` & `total_unit` |
| Luas tanah/bangunan (Tentang) | `luas_tanah`/`luas_bangunan` sheet `Unit` (min–max) |
| Kamar mandi, carport, lantai | diparse dari key `rumah` / `jumlah_lantai` |
| Highlight material (Spesifikasi) | dipilih otomatis dari `spec_1`…`spec_N` |
| Narasi jumlah rumah (Siteplan) | `total_unit` + `jumlah_lantai` |
| Cicilan & simulasi compare | rumus anuitas + asumsi dari sheet (lihat bawah) |

Yang boleh hardcoded hanyalah teks deskriptif/narasi (judul section,
microcopy tombol, dsb.). Gambar dummy lokal hanya **fallback terakhir** saat
foto Drive kosong/gagal dimuat.

### Key tambahan untuk kalkulator KPR (tab `Content`)

| key | contoh nilai | keterangan |
| --- | --- | --- |
| `kpr_dp_default` | `0` | DP awal (%) di kalkulator & simulasi compare |
| `kpr_rate_default` | `7.5` | suku bunga awal (%/tahun) |
| `kpr_tenor_default` | `15` | tenor awal (tahun) |

Ketiganya opsional: kalau kosong, DP diturunkan otomatis dari `promo_dp`
("DP 0%" → 0%) dan bunga/tenor memakai nilai wajar umum KPR. Begitu key
diisi di sheet, kalkulator langsung mengikutinya tanpa ubah kode.

### Key sosmed (tab `Content`)

`instagram_url`, `facebook_url`, `x_url`, `youtube_url` — semua ditampilkan
di footer; key yang kosong otomatis disembunyikan.

### Kategori foto di sheet `Galeri`

| kategori | dipakai untuk |
| --- | --- |
| `hero` | latar section Hero |
| `unit` (isi `unit_id` = kode unit) | cover kartu unit |
| `tentang` | foto section Tentang (urutan kedua = foto kecil) |
| `interior` / `detail` | foto section Spesifikasi |
| `progress` | masuk rotasi galeri |
| *(kategori lain)* | masuk rotasi galeri |

## Alur data

```
Google Spreadsheet ─▶ Apps Script API ─▶ Astro build ─▶ HTML statis
                        │
                        └─(gagal)─▶ data/snapshot.json (fallback)
```

1. **Sumber materi:** spreadsheet (tab `Content`, `Unit`, `Galeri`, `Artikel`,
   `Testimoni`, `Person`) dibaca oleh Apps Script dan diekspos lewat endpoint
   `src/lib/api.js`.
2. **Fallback:** saat API tidak terjangkau (mis. cold start), build memakai
   `data/snapshot.json` — data terakhir yang tersimpan. Untuk menyegarkannya:

   ```bash
   node scripts/fetch-snapshot.mjs
   ```

3. **Gambar:** foto dari Google Drive (tab `Galeri`, kolom `photo` di
   `Person`, key `siteplan`) dipakai langsung sebagai URL thumbnail — tidak
   ada unduhan build-time, jadi build tidak pernah gagal gara-gara Drive.
   Gambar dummy lokal di `src/assets/dummy/` hanya muncul kalau data foto di
   sheet belum ada.

> Catatan kebersihan data: sel `about_description` yang mengandung sisa
> paste kode (tanda `'` dan `,` di pergantian paragraf) dibersihkan otomatis
> oleh `splitNarrativeParagraphs()`; kolom `deskripsi` sheet `Unit` yang
> berisi kode internal otomatis disembunyikan. Sebaiknya tetap dibersihkan
> di sheet juga.

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
  pages/tim.astro          ← halaman profil tim (sheet Person + foto dummy)
  pages/artikel/           ← listing & detail artikel
data/snapshot.json         ← cadangan data spreadsheet
scripts/fetch-snapshot.mjs ← refresh snapshot dari API
```

## Halaman Tim Kami (`/tim/`)

Menampilkan profil pegawai dari sheet **Person** (`name`, `position`,
`experience`, `quote`, `strength`, `photo`). Backend Apps Script sudah
mengekspos action `persons` — foto profil dari Google Drive otomatis dipakai
begitu kolom `photo` diisi; selama kosong, halaman memakai foto dummy di
`src/assets/dummy/team/` dan mencantumkan catatan bahwa foto masih ilustrasi.

