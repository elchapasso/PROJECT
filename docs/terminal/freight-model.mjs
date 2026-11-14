// Modèle d’estimation du fret huiles végétales en vrac vers Casablanca (USD/t).
// Coût de voyage = affrètement × jours + soutes + frais de port + canal + surprime de guerre,
// rapporté aux tonnes transportées. Les entrées de marché (soutes VLSFO, indices tankers Baltic)
// viennent de freight-feed.json ; les hypothèses sont modifiables et calibrables avec une cotation réelle.

export const SERIES = {
  'vlsfo-gib': {label: 'VLSFO Gibraltar', short: 'Soutes Gibraltar', unit: 'USD/t', kind: 'bunker'},
  'vlsfo-sgp': {label: 'VLSFO Singapour', short: 'Soutes Singapour', unit: 'USD/t', kind: 'bunker'},
  'tce-tc6': {label: 'TC6 · 30 kt cross-Méditerranée (TCE)', short: 'Handymax Méditerranée', unit: 'USD/jour', kind: 'tce'},
  'tce-mr-atl': {label: 'Panier MR Atlantique (TCE)', short: 'MR Atlantique', unit: 'USD/jour', kind: 'tce'},
};

// Profils de navire. Affrètement du navire type = hireBase (USD/jour) + hireRatio × indice tanker Baltic :
// la partie fixe évite un affrètement irréaliste quand les indices sont très bas.
export const PROFILES = {
  coaster: {
    label: 'Petit tanker dédié (6-8 kt)', hireSeries: 'tce-tc6', hireBase: 8000, hireRatio: 0.10, bunkerSeries: 'vlsfo-gib',
    speed: 11, seaCons: 9, portCons: 2, portDays: 5, ballast: 0.5, portCosts: 45000, hull: 9e6, dedicated: true,
  },
  handy: {
    label: 'Tanker Handy dédié (18-24 kt)', hireSeries: 'tce-mr-atl', hireBase: 10000, hireRatio: 0.40, bunkerSeries: 'vlsfo-gib',
    speed: 12.5, seaCons: 20, portCons: 4, portDays: 7, ballast: 0.4, portCosts: 110000, hull: 25e6, dedicated: true,
  },
  parcelAsia: {
    label: 'Lot sur chimiquier ~30 kt (Asie)', hireSeries: 'tce-mr-atl', hireBase: 12000, hireRatio: 0.27, bunkerSeries: 'vlsfo-sgp',
    speed: 13, seaCons: 24, portCons: 3, portDays: 10, ballast: 0.15, portCosts: 160000, hull: 30e6, dedicated: false,
    capacity: 30000, utilisation: 0.85, parcelPremium: 1.25,
  },
  parcelAtlantic: {
    label: 'Lot sur chimiquier ~18 kt (Atlantique)', hireSeries: 'tce-mr-atl', hireBase: 10000, hireRatio: 0.25, bunkerSeries: 'vlsfo-gib',
    speed: 12.5, seaCons: 18, portCons: 3, portDays: 8, ballast: 0.2, portCosts: 110000, hull: 20e6, dedicated: false,
    capacity: 18000, utilisation: 0.85, parcelPremium: 1.25,
  },
};

// Routes vers Casablanca. Distances en milles nautiques (route maritime usuelle, arrondie).
export const ROUTES = [
  {id: 'arg', origin: 'arg', label: 'Argentine', port: 'Rosario (Up River)', product: 'Huile de soja', profile: 'handy', sizes: [18000, 24000],
    legs: [{id: 'direct', label: 'Atlantique', distance: 5240}], warRisk: 0},
  {id: 'ukr', origin: 'ukr', label: 'Ukraine', port: 'Tchornomorsk', product: 'Huile de tournesol', profile: 'coaster', sizes: [6000, 8000],
    legs: [{id: 'direct', label: 'Bosphore · Méditerranée', distance: 2300}], warRisk: 0.01,
    alt: {id: 'constanta', label: 'via Constanța', port: 'Constanța', distance: 2160, warRisk: 0.001}},
  {id: 'rus', origin: 'rus', label: 'Russie', port: 'Novorossiïsk', product: 'Huile de tournesol', profile: 'coaster', sizes: [6000, 8000],
    legs: [{id: 'direct', label: 'Bosphore · Méditerranée', distance: 2420}], warRisk: 0.0075},
  {id: 'bgr', origin: 'bgr', label: 'Bulgarie', port: 'Varna', product: 'Huile de tournesol', profile: 'coaster', sizes: [6000, 8000],
    legs: [{id: 'direct', label: 'Bosphore · Méditerranée', distance: 2120}], warRisk: 0.001},
  {id: 'col', origin: 'col', label: 'Colombie', port: 'Santa Marta', product: 'Huile de palme', profile: 'parcelAtlantic', sizes: [4000],
    legs: [{id: 'direct', label: 'Caraïbes · Atlantique', distance: 3900}], warRisk: 0},
  {id: 'idn', origin: 'idn', label: 'Indonésie', port: 'Dumai', product: 'Huile de palme', profile: 'parcelAsia', sizes: [4000],
    legs: [{id: 'suez', label: 'via Suez', distance: 6950, canal: 180000, warRisk: 0.003}, {id: 'cape', label: 'via le Cap', distance: 10430}], warRisk: 0},
  {id: 'mys', origin: 'mys', label: 'Malaisie', port: 'Port Klang', product: 'Huile de palme', profile: 'parcelAsia', sizes: [4000],
    legs: [{id: 'suez', label: 'via Suez', distance: 6900, canal: 180000, warRisk: 0.003}, {id: 'cape', label: 'via le Cap', distance: 10380}], warRisk: 0},
];

const iso = /^\d{4}-\d{2}-\d{2}$/;

// Dernier point (et précédent) d’une série, au plus tard à la date donnée.
export function latest(feed, key, beforeOrOn = '9999-12-31') {
  const points = (feed?.series?.[key]?.points ?? []).filter(p => iso.test(p.date) && p.date <= beforeOrOn && Number.isFinite(p.value))
    .sort((a, b) => a.date.localeCompare(b.date));
  return {last: points.at(-1) ?? null, previous: points.at(-2) ?? null, points};
}

// Estimation d’un voyage. inputs = {bunker, tce} en valeurs ; overrides modifie le profil.
export function estimateVoyage({distance, size, profile, inputs, canal = 0, warRisk = 0, overrides = {}}) {
  const p = {...profile, ...overrides};
  if (!Number.isFinite(inputs?.bunker) || !Number.isFinite(inputs?.tce) || !(distance > 0) || !(size > 0)) return null;
  const hire = (p.hireBase ?? 0) + inputs.tce * p.hireRatio;
  const laden = distance / (p.speed * 24);
  const ballast = laden * p.ballast;
  const days = laden + ballast + p.portDays;
  const bunkerTonnes = p.seaCons * (laden + ballast) + p.portCons * p.portDays;
  const costs = {
    hire: hire * days,
    bunkers: bunkerTonnes * inputs.bunker,
    port: p.portCosts,
    canal,
    war: p.hull * warRisk,
  };
  const basis = p.dedicated ? size : p.capacity * p.utilisation;
  const premium = p.dedicated ? 1 : p.parcelPremium;
  const perTonne = Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, v / basis * premium]));
  const total = Object.values(perTonne).reduce((a, b) => a + b, 0);
  return {total, perTonne, hire, days: {laden, ballast, port: p.portDays, total: days}, bunkerTonnes, basis, premium};
}

// Inputs d’un profil à une date (dernier relevé connu à cette date).
export function inputsFor(feed, profile, date) {
  const bunker = latest(feed, profile.bunkerSeries, date).last;
  const tce = latest(feed, profile.hireSeries, date).last;
  return bunker && tce ? {bunker: bunker.value, tce: tce.value, bunkerDate: bunker.date, tceDate: tce.date} : null;
}

// Toutes les estimations d’une route : par tronçon (Suez / Cap) et par taille de lot (min / max).
export function estimateRoute(route, feed, {date, overrides = {}, useAlt = false, sizes} = {}) {
  const profile = PROFILES[route.profile];
  const inputs = inputsFor(feed, profile, date);
  if (!inputs) return null;
  const legs = useAlt && route.alt ? [{id: route.alt.id, label: route.alt.label, distance: route.alt.distance, warRisk: route.alt.warRisk}] : route.legs;
  const chosen = (sizes ?? route.sizes).filter(s => s > 0);
  return {
    inputs,
    legs: legs.map(leg => {
      const warRisk = leg.warRisk ?? route.warRisk;
      const bySize = chosen.map(size => ({size, ...estimateVoyage({distance: leg.distance, size, profile, inputs, canal: leg.canal ?? 0, warRisk, overrides})}));
      return {...leg, warRisk, bySize, low: Math.min(...bySize.map(r => r.total)), high: Math.max(...bySize.map(r => r.total))};
    }),
  };
}

// Calibration : rapport entre une cotation réelle et l’estimation du modèle à la même date et pour la même taille.
export function calibrationFactor(quote, route, feed, overrides = {}) {
  if (!quote || !(quote.value > 0) || !iso.test(quote.date ?? '')) return null;
  const est = estimateRoute(route, feed, {date: quote.date, overrides, useAlt: quote.alt === true, sizes: [quote.size || route.sizes[0]]});
  const leg = est?.legs.find(l => l.id === (quote.leg || est.legs[0].id)) ?? est?.legs[0];
  const model = leg?.bySize[0]?.total;
  return model > 0 ? quote.value / model : null;
}

const SERIES_LIMITS = {bunker: [200, 2500], tce: [1000, 600000]};

// Contrôle du fichier freight-feed.json (utilisé par le site et par scripts/update-freight.mjs).
export function checkFreightFeed(feed, {today} = {}) {
  const errors = [];
  if (!feed || typeof feed !== 'object' || typeof feed.series !== 'object' || !Array.isArray(feed.quotes)) {
    return ['Le fichier doit contenir « series » (objet) et « quotes » (tableau).'];
  }
  for (const [key, block] of Object.entries(feed.series)) {
    if (!SERIES[key]) { errors.push(`série inconnue « ${key} »`); continue; }
    const [min, max] = SERIES_LIMITS[SERIES[key].kind];
    (block?.points ?? []).forEach((p, i) => {
      const where = `${key}[${i}]`;
      if (!iso.test(p?.date ?? '')) errors.push(`${where} : date invalide`);
      else if (today && p.date > today) errors.push(`${where} : date future ${p.date}`);
      if (!Number.isFinite(p?.value) || p.value < min || p.value > max) errors.push(`${where} : valeur hors bornes (${min}-${max})`);
      if (typeof p?.url !== 'string' || !p.url.startsWith('https://')) errors.push(`${where} : lien https:// obligatoire`);
      if (typeof p?.source !== 'string' || !p.source.trim()) errors.push(`${where} : source manquante`);
    });
  }
  feed.quotes.forEach((q, i) => {
    const where = `quotes[${i}] ${q?.id ?? ''}`;
    if (!q?.id) errors.push(`${where} : id manquant`);
    if (!iso.test(q?.date ?? '')) errors.push(`${where} : date invalide`);
    else if (today && q.date > today) errors.push(`${where} : date future`);
    if (!q?.from || !q?.to) errors.push(`${where} : origine et destination obligatoires`);
    if (!Number.isFinite(q?.low) || q.low <= 0 || q.low > 1000 || (q.high != null && (!Number.isFinite(q.high) || q.high < q.low || q.high > 1000))) errors.push(`${where} : prix USD/t invalide`);
    if (typeof q?.url !== 'string' || !q.url.startsWith('https://')) errors.push(`${where} : lien https:// obligatoire`);
    if (typeof q?.source !== 'string' || !q.source.trim()) errors.push(`${where} : source manquante`);
  });
  return errors;
}
