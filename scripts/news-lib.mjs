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

const TEXT_LIMITS = {title: 140, summary: 700, number: 80, variation: 120, period: 80, transmission: 500, caveat: 400, source: 120, time: 40, morocco: 320};
export const BRIEF_COMPLEXES = ['soy', 'sun', 'palm', 'macro'];
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
    if (item.morocco !== undefined && (typeof item.morocco !== 'string' || !item.morocco)) problems.push('morocco : texte attendu (ou champ absent)');
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
  const keys = ['id', 'date', 'time', 'product', 'origin', 'category', 'title', 'summary', 'number', 'variation', 'period', 'impact', 'intensity', 'horizon', 'status', 'transmission', 'caveat', 'morocco', 'source', 'url'];
  const ordered = items.map(item => Object.fromEntries(keys.filter(key => item[key] !== undefined).map(key => [key, item[key]])));
  const feed = {updatedAt: now, items: ordered};
  if (input.brief !== undefined && input.brief !== null) {
    const {brief, errors: briefErrors, warnings: briefWarnings} = normalizeBrief(input.brief, {today, ids: new Set(ordered.map(item => item.id))});
    errors.push(...briefErrors);
    warnings.push(...briefWarnings);
    if (brief) feed.brief = brief;
  }
  return {feed, errors, warnings};
}

// Synthèse du jour : un titre, 2 à 6 points (un sens d'impact par complexe) et jusqu'à 4 choses à surveiller.
const clean = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
export function normalizeBrief(raw, {today, ids = new Set()} = {}) {
  const errors = [];
  const warnings = [];
  const where = 'brief';
  if (!raw || typeof raw !== 'object') return {brief: null, errors: [where + ' : objet attendu'], warnings};
  const brief = {date: clean(raw.date), headline: clean(raw.headline), points: [], watch: []};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(brief.date ?? '')) errors.push(where + ' : date AAAA-MM-JJ attendue');
  else if (today && brief.date > today) errors.push(where + ' : date future ' + brief.date);
  if (typeof brief.headline !== 'string' || !brief.headline || brief.headline.length > 180) errors.push(where + ' : headline de 1 à 180 caractères attendu');
  const points = Array.isArray(raw.points) ? raw.points : [];
  if (points.length < 2 || points.length > 6) errors.push(where + ' : 2 à 6 points attendus');
  points.forEach((point, index) => {
    const label = `${where}.points[${index}]`;
    const p = {complex: clean(point?.complex), impact: clean(point?.impact), text: clean(point?.text), ids: Array.isArray(point?.ids) ? point.ids.map(clean).filter(Boolean) : []};
    if (!BRIEF_COMPLEXES.includes(p.complex)) errors.push(`${label} : complex attendu parmi ${BRIEF_COMPLEXES.join(', ')}`);
    if (!IMPACTS.includes(p.impact)) errors.push(`${label} : impact attendu : positive, negative ou mixed`);
    if (typeof p.text !== 'string' || !p.text || p.text.length > 360) errors.push(`${label} : texte de 1 à 360 caractères attendu`);
    const missing = p.ids.filter(id => !ids.has(id));
    if (missing.length) warnings.push(`${label} : fiche(s) absente(s) du flux : ${missing.join(', ')}`);
    p.ids = p.ids.filter(id => ids.has(id));
    brief.points.push(p);
  });
  const watch = Array.isArray(raw.watch) ? raw.watch.map(clean) : [];
  if (watch.length > 4) errors.push(where + ' : 4 points à surveiller au plus');
  watch.forEach((text, index) => {
    if (typeof text !== 'string' || !text || text.length > 200) errors.push(`${where}.watch[${index}] : texte de 1 à 200 caractères attendu`);
  });
  brief.watch = watch.filter(text => typeof text === 'string' && text);
  return {brief: errors.length ? null : brief, errors, warnings};
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
