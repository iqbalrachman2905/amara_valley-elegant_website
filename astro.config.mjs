import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

// GitHub Pages project site: https://<user>.github.io/<repo>/
// `site` wajib diset supaya canonical URL, OG tags, JSON-LD, dan sitemap
// valid (tanpa ini `new URL(path, Astro.site)` di BaseLayout melempar
// "Invalid URL" dan bikin build gagal - ini penyebab deploy gagal terakhir).
const SITE = 'https://iqbalrachman2905.github.io';
const BASE = '/shanum-haven_modern_website';

export default defineConfig({
  site: SITE,
  // Base path wajib untuk GitHub Pages project site. Di-local dev kita
  // biarkan root biar preview gampang; BASE_URL tetap dikalkulasi benar
  // oleh helper withBase() di src/lib/paths.js.
  base: process.env.CI ? BASE : '/',
  // Izinkan diakses lewat host preview sandbox (proxy e2b.app) saat dev.
  // (Astro gak forward server.allowedHosts, jadi lewat Vite langsung.)
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  // CATATAN: gambar remote (Google Drive) sengaja TIDAK dioptimasi build-time
  // (image.domains tidak diset). Kalau diset, build wajib download semua foto
  // dari Drive - dan pas Drive galak, build gagal total (ini yang selama ini
  // bikin deploy gagal berulang). URL thumbnail Drive sudah cukup ringan &
  // reliable untuk dimuat langsung oleh browser visitor.
  integrations: [
    vue(),
    sitemap(),
  ],
});
