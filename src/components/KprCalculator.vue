<script setup>
import { ref, computed } from 'vue';
import { formatRupiah, estimateMonthlyInstallment } from '../lib/format.js';

const props = defineProps({
  defaultPrice: { type: Number, default: 900000000 }
});

const price = ref(props.defaultPrice);
const dpPercent = ref(10);
const rate = ref(7.5);
const tenor = ref(15);

const tenorOptions = [5, 10, 15, 20];

const dpAmount = computed(() => Math.round((price.value * dpPercent.value) / 100));
const loanAmount = computed(() => price.value - dpAmount.value);

const monthlyInstallment = computed(() =>
  estimateMonthlyInstallment(price.value, {
    dpPercent: dpPercent.value,
    ratePercent: rate.value,
    tenorYears: tenor.value
  })
);

const totalPayment = computed(() => monthlyInstallment.value * tenor.value * 12 + dpAmount.value);
</script>

<template>
  <div class="kpr-card">
    <div class="kpr-inputs">
      <label class="field">
        <span>Harga Properti</span>
        <input type="number" v-model.number="price" step="1000000" />
      </label>

      <label class="field">
        <span>Uang Muka (DP): {{ dpPercent }}%</span>
        <input type="range" min="0" max="50" step="5" v-model.number="dpPercent" />
      </label>

      <label class="field">
        <span>Suku Bunga: {{ rate }}% / tahun</span>
        <input type="range" min="3" max="15" step="0.25" v-model.number="rate" />
      </label>

      <label class="field">
        <span>Tenor</span>
        <select v-model.number="tenor">
          <option v-for="t in tenorOptions" :key="t" :value="t">{{ t }} tahun</option>
        </select>
      </label>
    </div>

    <div class="kpr-result">
      <div class="result-main">
        <span>Estimasi Cicilan / Bulan</span>
        <strong>{{ formatRupiah(monthlyInstallment) }}</strong>
      </div>
      <div class="result-details">
        <div>
          <span>Uang Muka</span>
          <strong>{{ formatRupiah(dpAmount) }}</strong>
        </div>
        <div>
          <span>Plafon Pinjaman</span>
          <strong>{{ formatRupiah(loanAmount) }}</strong>
        </div>
        <div>
          <span>Estimasi Total Bayar</span>
          <strong>{{ formatRupiah(totalPayment) }}</strong>
        </div>
      </div>
      <p class="disclaimer">
        *Simulasi kasar, bukan penawaran resmi bank. Angka final tergantung kebijakan & penilaian bank terkait.
      </p>
    </div>
  </div>
</template>

<style scoped>
.kpr-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  padding: var(--space-lg);
  display: grid;
  gap: var(--space-lg);
}
.kpr-inputs {
  display: grid;
  gap: var(--space-md);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--color-navy-soft);
  font-weight: 500;
}
.field input[type='number'],
.field select {
  padding: 10px 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-navy);
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: border-color var(--duration-normal) var(--ease-out);
}
.field input[type='number']:focus,
.field select:focus {
  border-color: var(--color-secondary);
  outline: none;
}
.field input[type='range'] {
  accent-color: var(--color-gold);
}
.kpr-result {
  border-top: 1px solid var(--color-paper);
  padding-top: var(--space-md);
}
.result-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-md);
}
.result-main span {
  font-size: 0.85rem;
  color: var(--color-navy-soft);
}
.result-main strong {
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--color-navy);
}
.result-details {
  display: grid;
  gap: 10px;
}
.result-details > div {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}
.result-details span {
  color: var(--color-navy-soft);
}
.result-details strong {
  color: var(--color-navy);
}
.disclaimer {
  font-size: 0.75rem;
  color: var(--color-navy-soft);
  margin-top: var(--space-md);
}

@media (min-width: 720px) {
  .kpr-card {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}
</style>
