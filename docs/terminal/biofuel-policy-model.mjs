import {netD4} from './biofuel-policy-data.mjs?v=20261114-biofuel-observations-v2';

export const KG_PER_POUND = 0.45359237;
export const KG_PER_TONNE = 1000;
export const MILLION_LB_TO_MT = KG_PER_POUND / KG_PER_TONNE;
export function gasoilReference(gasoil, rates, density, cutoff) {
  const fx = new Map(rates.map(({date, value}) => [date, value]));
  const months = new Map();
  for (const {date, value} of gasoil) {
    const rate = fx.get(date);
    if (date > cutoff || !(rate > 0) || !(value > 0)) continue;
    const month = date.slice(0, 7);
    const row = months.get(month) ?? {sum: 0, count: 0, last: ''};
    row.sum += value * density / KG_PER_TONNE * rate;
    row.count++;
    if (date > row.last) row.last = date;
    months.set(month, row);
  }
  return months;
}

export function monthlyHipGap(hipPoints, gasoil, rates, density, cutoff) {
  const months = gasoilReference(gasoil, rates, density, cutoff);
  return hipPoints.flatMap(({date, value, url}) => {
    const month = date.slice(0, 7);
    const row = months.get(month);
    if (!row || date > cutoff || !(value > 0)) return [];
    const proxy = row.sum / row.count;
    return [{date: month, hip: value, proxy, gap: value - proxy, count: row.count, last: row.last, partial: month === cutoff.slice(0, 7), url}];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function cumulativeNetRins() {
  let total = 0;
  return netD4.map(([date, value]) => ({date, value, total: total += value}));
}
