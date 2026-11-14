// Contrôle et normalisation de la veille quotidienne (docs/terminal/news-feed.json).
// Utilisé par scripts/update-news.mjs et par tests/news-feed.test.mjs.
import {validEvent} from '../docs/terminal/model.js';
import {products, origins} from '../docs/terminal/data.js';

export const KEEP_DAYS = 120;
export const IMPACTS = ['positive', 'negative', 'mixed'];

// Périmètre suivi : chaque complexe, ses produits et ses origines (doit rester aligné sur newsComplexes dans app.js).
export const COVERAGE = {
  soy: {name: 'Soja & huile de soja', products: ['soy', 'sbo', 'sm'], origins: ['us', 'arg', 'bra']},
  sun: {name: 'Tournesol', products: ['sun', 'sfo', 'sfm'], origins: ['rus', 'ukr', 'eu', 'bgr', 'rou', 'arg']},
  palm: {name: 'Huile de palme', products: ['palm', 'rbd', 'olein', 'pko'], origins: ['idn', 'mys', 'tha', 'col', 'latam']},
};

const TEXT_LIMITS = {title: 140, summary: 700, number: 80, variation: 120, period: 80, transmission: 500, caveat: 400, source: 120, time: 40};
const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

export function complexOf(item) {
  return Object.keys(COVERAGE).find(key => COVERAGE[key].products.includes(item.product)) ?? 'other';
}

// Retourne {feed, errors, warnings}. Une erreur bloque la publication ; un avertissement est seulement signalé.
export function normalizeFeed(input, {today, now = new Date().toISOString(), keepDays = KEEP_DAYS} = {}) {
  const errors = [];
  const warnings = [];
  if (!input || !Array.isArray(input.items)) return {feed: null, errors: ['Le fichier doit contenir un tableau « items ».'], warnings};
  const limit = addDays(today, -keepDays);
  const byId = new Map();
  input.items.forEach((raw, index) => {
    const item = Object.fromEntries(Object.entries(raw ?? {}).map(([key, value]) => [key, typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value]));
    item.time ??= '';
    const label = `#${index} ${item.id ?? '(sans id)'}`;
    const problems = [];
    if (!validEvent(item)) problems.push('champ manquant ou invalide (voir NEWS.md)');
    if (!IMPACTS.includes(item.impact)) problems.push('impact attendu : positive, negative ou mixed');
    if (!Object.hasOwn(products, item.product)) problems.push(`produit inconnu « ${item.product} »`);
    if (!Object.hasOwn(origins, item.origin)) problems.push(`origine inconnue « ${item.origin} »`);
    if (typeof item.url !== 'string' || !item.url.startsWith('https://')) problems.push('lien https:// obligatoire');
    if (typeof item.date === 'string' && item.date > today) problems.push(`date future ${item.date}`);
    for (const [key, max] of Object.entries(TEXT_LIMITS)) {
      if (typeof item[key] === 'string' && item[key].length > max) problems.push(`${key} dépasse ${max} caractères`);
    }
    if (problems.length) { errors.push(`${label} : ${problems.join(' ; ')}`); return; }
    if (item.date < limit) return; // archive glissante
    if (byId.has(item.id)) warnings.push(`${label} : identifiant en double, la dernière version est gardée`);
    byId.set(item.id, item);
  });
  const items = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || String(b.time).localeCompare(String(a.time)) || a.id.localeCompare(b.id));
  const sameUrl = new Map();
  for (const item of items) {
    const key = item.url + '|' + item.product + '|' + item.origin;
    if (sameUrl.has(key)) warnings.push(`${item.id} : même lien et même marché que ${sameUrl.get(key)} (doublon probable)`);
    else sameUrl.set(key, item.id);
  }
  const keys = ['id', 'date', 'time', 'product', 'origin', 'category', 'title', 'summary', 'number', 'variation', 'period', 'impact', 'intensity', 'horizon', 'status', 'transmission', 'caveat', 'source', 'url'];
  const ordered = items.map(item => Object.fromEntries(keys.map(key => [key, item[key]])));
  return {feed: {updatedAt: now, items: ordered}, errors, warnings};
}

// Couverture des 7 derniers jours par complexe et par origine, pour repérer les trous de la veille.
export function coverage(feed, today, days = 7) {
  const since = addDays(today, 1 - days);
  const recent = feed.items.filter(item => item.date >= since && item.date <= today);
  return Object.entries(COVERAGE).map(([key, spec]) => {
    const rows = recent.filter(item => complexOf(item) === key);
    return {
      key, name: spec.name, total: rows.length,
      origins: spec.origins.map(origin => ({origin, name: origins[origin], count: rows.filter(item => item.origin === origin).length})),
    };
  });
}
