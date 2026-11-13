import {epaPolicy, netD4} from './biofuel-policy-data.mjs';

export const KG_PER_POUND = 0.45359237;
export const KG_PER_TONNE = 1000;
export const MILLION = 1e6;
export const MILLION_LB_TO_MT = KG_PER_POUND / KG_PER_TONNE;
const MONTHS_PER_YEAR = 12;
const PRIOR_VINTAGE_CAP = 0.2;
const fraction = pct => pct / 100;

export function epaVolumes(year, scenario) {
  const rule = epaPolicy[year];
  const final = rule.base + rule.adopted;
  const total = rule.base + rule[scenario];
  return {base: rule.base, adopted: rule.adopted, final, total, extra: total - final};
}

export function defaultRenewableFactor(year) {
  return Number(year) >= 2027 ? 1.5 : 1.7;
}

export function simulateSoy(inputs) {
  const {year, scenario, scope, carryover, domestic, rdMix, bdRate, rdRate, bdOil, rdOil, bdSoy, rdSoy} = inputs;
  const rule = epaVolumes(year, scenario);
  const obligation = scope === 'total' ? rule.total : rule.extra;
  const ceiling = Math.min(obligation, rule.total * PRIOR_VINTAGE_CAP);
  const coverage = Math.min(carryover, ceiling);
  const newRins = obligation - coverage;
  const domesticRins = newRins * fraction(domestic);
  const renewableRins = domesticRins * fraction(rdMix);
  const biodieselRins = domesticRins - renewableRins;
  const bdGallons = biodieselRins / bdRate;
  const rdGallons = renewableRins / rdRate;
  const bdLipids = bdGallons * bdOil;
  const rdLipids = rdGallons * rdOil;
  const bdSoyLb = bdLipids * fraction(bdSoy);
  const rdSoyLb = rdLipids * fraction(rdSoy);
  const soyLb = bdSoyLb + rdSoyLb;
  return {obligation, coverage, ceiling, newRins, domesticRins, bdGallons, rdGallons, bdLipids, rdLipids, bdSoyLb, rdSoyLb, soyLb, soyMt: soyLb * MILLION_LB_TO_MT};
}

export function indonesiaVolumes({diesel, baseBlend, targetBlend, startMonth, realization, cpoRate}) {
  const share = (MONTHS_PER_YEAR + 1 - startMonth) / MONTHS_PER_YEAR;
  const effectiveBlend = baseBlend + (targetBlend - baseBlend) * share;
  const baselineLitres = diesel * fraction(baseBlend) * fraction(realization);
  const scenarioLitres = diesel * fraction(effectiveBlend) * fraction(realization);
  // Un milliard de litres × un kg/l = un million de tonnes.
  const baselinePalm = baselineLitres * cpoRate;
  const scenarioPalm = scenarioLitres * cpoRate;
  return {effectiveBlend, baselineLitres, scenarioLitres, baselinePalm, scenarioPalm, extraPalm: scenarioPalm - baselinePalm};
}

export function palmBalanceImpact(baseline, extraPalm, {productionShock, campaignShare, closure}) {
  const demandShock = extraPalm * fraction(campaignShare);
  const net = productionShock - demandShock;
  return {
    demandShock,
    production: baseline.production + productionShock,
    exports: baseline.exports + (closure === 'exports' ? net : 0),
    stocks: baseline.stocks + (closure === 'stocks' ? net : 0),
  };
}

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
