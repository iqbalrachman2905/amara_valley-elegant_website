<script setup>
import { ref, computed } from 'vue';
import { statusStyle, formatRupiah, buildWaLink, estimateMonthlyInstallment } from '../lib/format.js';

const props = defineProps({
  units: { type: Array, required: true },
  waNumber: { type: String, default: '' }
});

const MAX_COMPARE = 3;
const COMPARE_TENOR_YEARS = 20;
const COMPARE_DP_PERCENT = 0;

// Filters dinamis — otomatis terupdate jika spreadsheet menambah status baru.
const filters = computed(() => {
  const unique = [...new Set(props.units.map(u => String(u.status || '').trim()).filter(Boolean))];
  const order = ['Available', 'Ready Unit', 'Progress (Ready Stock)', 'Progress', 'Booked', 'Booking', 'Sold'];
  unique.sort((a, b) => {
    const ia = order.findIndex(o => o.toLowerCase() === a.toLowerCase());
    const ib = order.findIndex(o => o.toLowerCase() === b.toLowerCase());
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return ['Semua', ...unique];
});
const activeFilter = ref('Semua');

const sortOptions = [
  { value: 'default', label: 'Urutan Default' },
  { value: 'price-asc', label: 'Harga Terendah' },
  { value: 'price-desc', label: 'Harga Tertinggi' }
];
const activeSort = ref('default');
const compareIds = ref([]);
const showCompareModal = ref(false);

const filtered = computed(() => {
  let list = activeFilter.value === 'Semua' 
    ? props.units 
    : props.units.filter(u => String(u.status || '').toLowerCase() === String(activeFilter.value || '').toLowerCase());

  if (activeSort.value === 'price-asc') {
    list = [...list].sort((a, b) => (a.harga || 0) - (b.harga || 0));
  } else if (activeSort.value === 'price-desc') {
    list = [...list].sort((a, b) => (b.harga || 0) - (a.harga || 0));
  }
  return list;
});

const groupedByTipe = computed(() => {
  const groups = {};
  for (const unit of filtered.value) {
    const match = String(unit.tipe || '').match(/^[A-Za-z]+/);
    const key = match ? match[0].toUpperCase() : 'Lainnya';
    if (!groups[key]) groups[key] = [];
    groups[key].push(unit);
  }
  return Object.keys(groups)
    .sort((a, b) => {
      if (a === 'Lainnya') return 1;
      if (b === 'Lainnya') return -1;
      return a.localeCompare(b);
    })
    .map(key => ({
      key,
      units: groups[key],
      isSlider: groups[key].length >= 4 
    }));
});

let dragState = { active: false, startX: 0, scrollLeft: 0, el: null };

function startDrag(e) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  dragState = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft, el };
  el.classList.add('dragging');
}
function onDrag(e) {
  if (!dragState.active) return;
  e.preventDefault();
  const dx = e.clientX - dragState.startX;
  dragState.el.scrollLeft = dragState.scrollLeft - dx;
}
function endDrag() {
  if (dragState.el) dragState.el.classList.remove('dragging');
  dragState.active = false;
}

const compareUnits = computed(() => props.units.filter(u => compareIds.value.includes(u.id)));

function chipLabel(f) { return f === 'Semua' ? 'Semua' : statusStyle(f).label; }
function unitDesc(unit) {
  const s = String(unit.deskripsi || '').trim();
  if (!s) return '';
  if (/^[0-9A-Fa-f\s-]{8,}$/.test(s)) return '';
  if (/^[A-F0-9]{8,}$/.test(s)) return '';
  if (s.length <= 12 && /^[0-9A-Fa-f]+$/.test(s)) return '';
  return s;
}
function unitWaLink(unit) { 
  const d = unitDesc(unit);
  const descPart = d ? ` — ${d}` : '';
  return buildWaLink(props.waNumber, `Halo, saya tertarik dengan Tipe ${unit.tipe} (${formatRupiah(unit.harga)})${descPart}. Boleh info lebih lanjut?`); 
}
function toggleCompare(unit) {
  const idx = compareIds.value.indexOf(unit.id);
  if (idx !== -1) { compareIds.value.splice(idx, 1); return; }
  if (compareIds.value.length >= MAX_COMPARE) return;
  compareIds.value.push(unit.id);
}
function isCompareFull(unit) { return compareIds.value.length >= MAX_COMPARE && !compareIds.value.includes(unit.id); }
function clearCompare() { compareIds.value = []; showCompareModal.value = false; }
function pricePerM2(unit) {
  if (!unit.harga || !unit.luas_bangunan) return null;
  return Math.round(unit.harga / unit.luas_bangunan);
}
function monthlyFor(unit) { return estimateMonthlyInstallment(unit.harga, { dpPercent: COMPARE_DP_PERCENT, tenorYears: COMPARE_TENOR_YEARS }); }
</script>

<template>
  <div class="toolbar">
    <div class="filter-chips" role="group" aria-label="Filter status unit">
      <button v-for="f in filters" :key="f" type="button" class="chip" :class="{ 'is-active': activeFilter === f }" @click="activeFilter = f">
        {{ chipLabel(f) }}
      </button>
    </div>
    <label class="sort-select">
      <span class="sr-only">Urutkan</span>
      <select v-model="activeSort">
        <option v-for="s in sortOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </label>
  </div>

  <p class="compare-hint">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    Bandingkan antar unit &mdash; pilih sampai {{ MAX_COMPARE }} unit dengan ikon di pojok foto. Status otomatis dari spreadsheet.
  </p>

  <div class="units-container">
    <div v-for="group in groupedByTipe" :key="group.key" class="unit-group">
      <h3 class="group-title">Tipe {{ group.key }}</h3>
      <div 
        class="group-row" 
        :class="{ 'is-slider': group.isSlider }"
        @pointerdown="startDrag"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointerleave="endDrag"
      >
        <article v-for="unit in group.units" :key="unit.id" class="unit-card">
          <div class="unit-photo">
            <img v-if="unit.coverSrc" :src="unit.coverSrc" :alt="unit.coverCaption || `Tipe ${unit.tipe}`" loading="lazy" />
            <div v-else class="unit-photo-placeholder">
              <svg class="placeholder-art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
                <path d="M22 46L60 18l38 28" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="32" y="44" width="56" height="34" rx="3" stroke="currentColor" stroke-width="3"/>
                <path d="M60 44v34M32 60h28M60 60h28" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/>
                <rect x="52" y="12" width="16" height="8" rx="2" stroke="currentColor" stroke-width="2.5"/>
                <circle cx="94" cy="70" r="9" stroke="currentColor" stroke-width="2.5" opacity=".45"/>
              </svg>
              <span class="placeholder-label">Foto menyusul &middot; Tipe {{ unit.tipe }}</span>
            </div>
            <span class="unit-status" :style="{ '--status-color': statusStyle(unit.status).color }">
              {{ statusStyle(unit.status).label }}
            </span>
            <button type="button" class="compare-toggle" 
              :class="{ 'is-active': compareIds.includes(unit.id) }" 
              :disabled="isCompareFull(unit)"
              :aria-label="compareIds.includes(unit.id) ? `Batal bandingkan Tipe ${unit.tipe}` : `Bandingkan Tipe ${unit.tipe}`"
              @click="toggleCompare(unit)"
            >
              <svg v-if="compareIds.includes(unit.id)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>
              <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
          <div class="unit-body">
            <h3>Tipe {{ unit.tipe }}</h3>
            <p v-if="unitDesc(unit)" class="unit-desc">{{ unitDesc(unit) }}</p>
            <ul class="unit-specs">
              <li v-if="unit.luas_tanah">LT {{ unit.luas_tanah }} m²</li>
              <li v-if="unit.luas_bangunan">LB {{ unit.luas_bangunan }} m²</li>
              <li v-if="unit.kamar">{{ unit.kamar }} KT</li>
            </ul>
            <div class="unit-footer">
              <span class="unit-price">{{ formatRupiah(unit.harga) }}</span>
              <a v-if="waNumber" :href="unitWaLink(unit)" target="_blank" rel="noopener noreferrer" class="unit-wa-btn">
                Tanya via WA
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
    <p v-if="groupedByTipe.length === 0" class="empty-state">Belum ada unit dengan status ini.</p>
  </div>

  <div v-if="compareIds.length > 0" class="compare-bar">
    <div class="compare-bar-info">
      <strong>{{ compareIds.length }}/{{ MAX_COMPARE }} unit dipilih</strong>
      <span>{{ compareUnits.map(u => `Tipe ${u.tipe}`).join(', ') }}</span>
    </div>
    <div class="compare-bar-actions">
      <button type="button" class="btn-compare" @click="showCompareModal = true">Bandingkan</button>
      <button type="button" class="btn-clear" aria-label="Hapus semua pilihan" @click="clearCompare">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </div>

  <div v-if="showCompareModal" class="compare-modal-backdrop" @click.self="showCompareModal = false">
    <div class="compare-modal">
      <div class="compare-modal-header">
        <div>
          <p class="compare-modal-title">Bandingkan Unit</p>
          <p class="compare-modal-note">Simulasi cicilan: tenor 20 tahun, DP Rp0 &mdash; simulasi kasar, bukan penawaran resmi bank.</p>
        </div>
        <button type="button" class="btn-clear" aria-label="Tutup" @click="showCompareModal = false">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="compare-columns">
        <div v-for="unit in compareUnits" :key="unit.id" class="compare-column">
          <img v-if="unit.coverSrc" :src="unit.coverSrc" :alt="`Tipe ${unit.tipe}`" class="compare-thumb" />
          <div v-else class="compare-thumb compare-thumb-placeholder"></div>
          <h4>Tipe {{ unit.tipe }}</h4>
          <p v-if="unitDesc(unit)" class="unit-desc" style="font-size:0.82rem">{{ unitDesc(unit) }}</p>
          <div class="compare-highlight">
            <span>Cicilan/bulan (estimasi)</span>
            <strong>{{ formatRupiah(monthlyFor(unit)) }}</strong>
          </div>
          <table class="compare-table">
            <tbody>
              <tr><td>Harga</td><td>{{ formatRupiah(unit.harga) }}</td></tr>
              <tr v-if="pricePerM2(unit)"><td>Harga / m²</td><td>{{ formatRupiah(pricePerM2(unit)) }}</td></tr>
              <tr v-if="unit.luas_tanah"><td>Luas Tanah</td><td>{{ unit.luas_tanah }} m²</td></tr>
              <tr v-if="unit.luas_bangunan"><td>Luas Bangunan</td><td>{{ unit.luas_bangunan }} m²</td></tr>
              <tr v-if="unit.kamar"><td>Kamar Tidur</td><td>{{ unit.kamar }}</td></tr>
              <tr><td>Status</td><td>{{ statusStyle(unit.status).label }}</td></tr>
            </tbody>
          </table>
          <a v-if="waNumber" :href="unitWaLink(unit)" target="_blank" rel="noopener noreferrer" class="compare-wa-btn">
            Tanya Unit Ini
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; margin-bottom: var(--space-sm); }
.filter-chips { display: flex; gap: var(--space-xs); flex-wrap: wrap; justify-content: center; }
.chip { background: var(--color-white); border: 1px solid var(--color-paper); color: var(--color-navy-soft); font-size: 0.85rem; font-weight: 500; padding: var(--space-xs) 18px; border-radius: 999px; cursor: pointer; transition: all var(--duration-fast) var(--ease-out); }
.chip:hover { border-color: var(--color-gold); }
.chip.is-active { background: var(--color-navy); border-color: var(--color-navy); color: var(--color-white); }
.sort-select select { background: var(--color-white); border: 1px solid var(--color-paper); border-radius: 999px; padding: var(--space-xs) var(--space-sm); font-size: 0.85rem; color: var(--color-navy); cursor: pointer; }
.compare-hint { display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; font-size: 0.82rem; color: var(--color-navy-soft); margin-bottom: var(--space-lg); }
.units-container { display: flex; flex-direction: column; gap: var(--space-xl); }
.empty-state { text-align: center; color: var(--color-navy-soft); padding: var(--space-lg) 0; }
.unit-group { display: flex; flex-direction: column; gap: var(--space-md); }
.group-title { font-family: var(--font-display); font-size: 1.5rem; color: var(--color-navy); border-left: 4px solid var(--color-gold); padding-left: 12px; }
.group-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md); }
.group-row.is-slider { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; padding-bottom: var(--space-md); }
.group-row.is-slider::-webkit-scrollbar { height: 6px; }
.group-row.is-slider::-webkit-scrollbar-track { background: var(--color-paper); border-radius: 10px; }
.group-row.is-slider::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 10px; }
.group-row.is-slider::-webkit-scrollbar-thumb:hover { background: var(--color-navy-soft); }
.group-row.dragging { scroll-behavior: auto; scroll-snap-type: none; cursor: grabbing; user-select: none; }
.group-row.dragging .unit-card { pointer-events: none; }
.unit-card { background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur)); -webkit-backdrop-filter: blur(var(--glass-blur)); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--glass-shadow); display: flex; flex-direction: column; transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out); }
.unit-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px color-mix(in srgb, var(--color-primary) 12%, transparent); }
.is-slider .unit-card { flex: 0 0 calc(85vw - var(--space-md)); max-width: 320px; scroll-snap-align: start; }
.unit-photo { position: relative; aspect-ratio: 4 / 3; background: var(--color-paper); }
.unit-photo img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.unit-photo-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--color-secondary) 10%, transparent), transparent 70%), linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 6%, white), var(--color-bg-paper)); color: color-mix(in srgb, var(--color-primary) 45%, transparent); }
.placeholder-art { width: 42%; max-width: 130px; }
.placeholder-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em; color: var(--color-navy-soft); padding: 3px 12px; border-radius: 999px; background: color-mix(in srgb, var(--color-white) 65%, transparent); }
.unit-status { position: absolute; top: 12px; left: 12px; background: var(--status-color); color: var(--color-white); font-size: 0.72rem; font-weight: 600; padding: 4px 12px; border-radius: 999px; }
.compare-toggle { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border-radius: 50%; border: none; background: color-mix(in srgb, var(--color-white) 90%, transparent); color: var(--color-navy-soft); display: grid; place-items: center; cursor: pointer; }
.compare-toggle.is-active { background: var(--color-gold); color: var(--color-navy); }
.compare-toggle:disabled { opacity: 0.4; cursor: not-allowed; }
.unit-body { padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); flex: 1; }
.unit-body h3 { font-size: 1.25rem; }
.unit-desc { font-size: 0.88rem; color: var(--color-navy-soft); line-height: 1.5; }
.unit-specs { display: flex; gap: 12px; list-style: none; font-size: 0.82rem; color: var(--color-navy-soft); flex-wrap: wrap; padding: 0; }
.unit-footer { margin-top: auto; padding-top: var(--space-xs); border-top: 1px solid var(--color-paper); display: flex; align-items: center; justify-content: space-between; gap: var(--space-xs); }
.unit-price { font-family: var(--font-display); font-weight: 700; font-size: 1.2rem; color: var(--color-navy); }
.unit-wa-btn { background: #25D366; color: var(--color-white); font-size: 0.78rem; font-weight: 600; padding: var(--space-xs) 16px; border-radius: var(--radius-full); text-decoration: none; white-space: nowrap; transition: filter var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.unit-wa-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
.compare-bar { position: fixed; bottom: calc(var(--space-md) + 64px); left: var(--space-md); right: var(--space-md); max-width: 420px; margin-inline: auto; background: rgba(24, 20, 13, 0.9); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.12); color: var(--color-white); border-radius: 999px; padding: 10px 10px 10px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); z-index: 54; }
.compare-bar-info { display: flex; flex-direction: column; min-width: 0; }
.compare-bar-info strong { font-size: 0.85rem; }
.compare-bar-info span { font-size: 0.72rem; color: color-mix(in srgb, var(--color-white) 70%, transparent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compare-bar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.btn-compare { background: var(--color-gold); color: var(--color-navy); font-weight: 600; font-size: 0.82rem; padding: var(--space-xs) var(--space-sm); border: none; border-radius: 999px; cursor: pointer; }
.btn-clear { background: color-mix(in srgb, var(--color-white) 15%, transparent); color: var(--color-white); border: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
.compare-modal-backdrop { position: fixed; inset: 0; background: color-mix(in srgb, var(--color-primary) 55%, transparent); z-index: 70; display: flex; align-items: flex-end; justify-content: center; padding: 0; }
.compare-modal { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: var(--radius-lg) var(--radius-lg) 0 0; width: 100%; max-width: 720px; max-height: 85vh; overflow-y: auto; padding: var(--space-md); box-shadow: 0 -8px 40px rgba(0,0,0,0.15); }
.compare-modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: var(--space-md); }
.compare-modal-title { font-family: var(--font-display); font-size: 1.2rem; color: var(--color-navy); }
.compare-modal-note { font-size: 0.78rem; color: var(--color-navy-soft); margin-top: 4px; }
.compare-modal .btn-clear { background: var(--color-paper); color: var(--color-navy); }
.compare-columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-sm); }
.compare-column { background: rgba(255,255,255,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); }
.compare-thumb { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--radius-sm); display: block; }
.compare-thumb-placeholder { background: linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 6%, white), var(--color-bg-paper)); }
.compare-column h4 { font-size: 1rem; color: var(--color-navy); }
.compare-highlight { background: var(--color-gold-soft); border-radius: var(--radius-sm); padding: var(--space-xs) 10px; display: flex; flex-direction: column; gap: 2px; }
.compare-highlight span { font-size: 0.7rem; color: var(--color-navy-soft); }
.compare-highlight strong { font-family: var(--font-display); font-size: 1.1rem; color: var(--color-navy); }
.compare-table { width: 100%; font-size: 0.8rem; }
.compare-table td { padding: 4px 0; border-bottom: 1px solid var(--color-paper); }
.compare-table td:first-child { color: var(--color-navy-soft); }
.compare-table td:last-child { text-align: right; font-weight: 600; color: var(--color-navy); }
.compare-wa-btn { display: block; text-align: center; background: #25D366; color: var(--color-white); font-weight: 600; font-size: 0.85rem; padding: 10px; border-radius: var(--radius-full); text-decoration: none; margin-top: auto; transition: filter var(--duration-fast) var(--ease-out); }
.compare-wa-btn:hover { filter: brightness(1.06); }
@media (min-width: 768px) {
  .compare-bar { bottom: var(--space-md); left: auto; right: 84px; max-width: 340px; }
  .compare-modal-backdrop { align-items: center; }
  .compare-modal { border-radius: var(--radius-lg); }
  .is-slider .unit-card { flex: 0 0 320px; } 
}
</style>
