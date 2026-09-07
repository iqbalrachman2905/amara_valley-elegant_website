// Astro nggak selalu jamin import.meta.env.BASE_URL punya garis miring "/"
// di ujungnya (tergantung config `base`). Daripada nulis manual ${base}xxx/
// di banyak file (dan gampang lupa/salah kayak yang baru kejadian), pakai
// fungsi ini biar konsisten di mana pun dipakai.
export function withBase(path) {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : import.meta.env.BASE_URL + '/';
  return base + path.replace(/^\//, '');
}
