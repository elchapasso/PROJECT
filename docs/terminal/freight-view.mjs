// Page « Fret » : estimation du fret vrac liquide vers Casablanca, repères publics,
// cotations courtier (navigateur uniquement) et actualités du fret.
import {SERIES, PROFILES, ROUTES, latest, estimateRoute, calibrationFactor, checkFreightFeed} from './freight-model.mjs?v=20261114-fret';
import {validateEnergySnapshot} from './energy-news-view.mjs?v=20261114-v2';

const LIVE = 'https://raw.githubusercontent.com/elchapasso/PROJECT/news-live/docs/terminal/freight-feed.json';
const BUNDLED = new URL('./freight-feed.json', import.meta.url).href;
const SHIPPING = 'https://raw.githubusercontent.com/elchapasso/PROJECT/energy-news-live/docs/terminal/live/energy-news.json';
const STORE = 'olea-fret-v1';
const DAY = 86_400_000;
const HEADLINE_DAYS = 14;
const iso = /^\d{4}-\d{2}-\d{2}$/;

const PARTS = [
  ['hire', 'Affrètement'], ['bunkers', 'Soutes'], ['port', 'Ports'], ['canal', 'Canal'], ['war', 'Surprime de guerre'],
];
// Hypothèses modifiables : [clé, libellé, unité affichée, facteur d’affichage, min, max, décimales].
const PARAMS = [
  ['hireBase', 'Affrètement fixe', 'USD/jour', 1, 0, 60000, 0],
  ['hireRatio', 'Part de l’indice Baltic', '% de l’indice, ajouté au fixe', 100, 0, 150, 0],
  ['speed', 'Vitesse', 'nœuds', 1, 8, 16, 1],
  ['seaCons', 'Consommation en mer', 't/jour', 1, 3, 40, 1],
  ['portDays', 'Jours de port', 'chargement + déchargement', 1, 1, 20, 1],
  ['portCosts', 'Frais de port', 'USD par voyage', 1, 0, 500000, 0],
  ['ballast', 'Retour à vide', '% du trajet chargé', 100, 0, 100, 0],
  ['parcelPremium', 'Prime de lot', '× coût moyen du navire', 1, 1, 2, 2],
];
const WAR = [
  ['ukr', 'Ukraine · Tchornomorsk'], ['constanta', 'Ukraine · via Constanța'], ['rus', 'Russie · Novorossiïsk'],
  ['bgr', 'Bulgarie · Varna'], ['suez', 'Asie · mer Rouge et Suez'],
];

const today = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Casablanca'}).format(new Date());
const addDays = (date, n) => new Date(Date.parse(date + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
const kt = n => (n / 1000).toLocaleString('fr-FR', {maximumFractionDigits: 1}) + ' kt';
const dateTime = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Casablanca'});

// ---------- État ----------
let feed = {updatedAt: '', series: {}, quotes: []};
let feedState = 'loading';
let headlines = [];
let headlineState = 'loading';
let lastRead = 0;
let pending = null;
let binding = null;

const blank = () => ({asia: 'cape', ukr: 'direct', overrides: {}, war: {}, quotes: []});
const legIds = route => [...route.legs.map(l => l.id), ...(route.alt ? [route.alt.id] : [])];
function validQuote(q) {
  const route = ROUTES.find(r => r.id === q?.route);
  return !!route && legIds(route).includes(q.leg) && iso.test(q.date ?? '') && Number.isFinite(q.size) && q.size >= 500 && q.size <= 60000 &&
    Number.isFinite(q.value) && q.value > 0 && q.value <= 1000 && typeof q.id === 'string';
}
function loadPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && typeof raw === 'object') {
      return {...blank(), asia: raw.asia === 'suez' ? 'suez' : 'cape', ukr: raw.ukr === 'constanta' ? 'constanta' : 'direct',
        overrides: raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {},
        war: raw.war && typeof raw.war === 'object' ? raw.war : {},
        quotes: Array.isArray(raw.quotes) ? raw.quotes.filter(validQuote) : []};
    }
  } catch {}
  return blank();
}
let prefs = loadPrefs();
function savePrefs() {
  try { localStorage.setItem(STORE, JSON.stringify(prefs)); return true; } catch { return false; }
}

// ---------- Calculs ----------
const overridesFor = route => prefs.overrides[route.profile] ?? {};
const profileFor = key => ({...PROFILES[key], ...(prefs.overrides[key] ?? {})});
function warDefault(key) {
  if (key === 'suez') return ROUTES.find(r => r.id === 'idn').legs.find(l => l.id === 'suez').warRisk;
  if (key === 'constanta') return ROUTES.find(r => r.id === 'ukr').alt.warRisk;
  return ROUTES.find(r => r.id === key).warRisk;
}
function routeFor(route) {
  const war = prefs.war;
  const r = {...route, legs: route.legs.map(l => l.id === 'suez' && Number.isFinite(war.suez) ? {...l, warRisk: war.suez} : l)};
  if (Number.isFinite(war[route.id])) r.warRisk = war[route.id];
  if (r.alt && Number.isFinite(war.constanta)) r.alt = {...r.alt, warRisk: war.constanta};
  return r;
}
const refLeg = route => route.id === 'ukr' ? prefs.ukr : route.legs.some(l => l.id === prefs.asia) ? prefs.asia : route.legs[0].id;
const isAlt = (route, legId) => route.alt?.id === legId;

function legEstimate(route, legId, date) {
  const est = estimateRoute(routeFor(route), feed, {date, overrides: overridesFor(route), useAlt: isAlt(route, legId)});
  const leg = est?.legs.find(l => l.id === legId);
  return leg ? {...leg, inputs: est.inputs} : null;
}
// Date de comparaison : la veille du relevé le plus récent utilisé par le profil.
function previousDate(route, date) {
  const p = PROFILES[route.profile];
  const last = [latest(feed, p.bunkerSeries, date).last?.date, latest(feed, p.hireSeries, date).last?.date].filter(Boolean).sort().at(-1);
  return last ? addDays(last, -1) : null;
}
function latestQuote(route) {
  return prefs.quotes.filter(q => q.route === route.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0] ?? null;
}
function calibration(route) {
  const q = latestQuote(route);
  if (!q) return null;
  const factor = calibrationFactor({...q, alt: isAlt(route, q.leg)}, routeFor(route), feed, overridesFor(route));
  return factor ? {factor, quote: q, old: q.date < addDays(today(), -60)} : null;
}
function rows(date = today()) {
  return ROUTES.flatMap(route => legIds(route).map(legId => {
    const now = legEstimate(route, legId, date);
    if (!now) return null;
    const prevDate = previousDate(route, date);
    const prev = prevDate ? legEstimate(route, legId, prevDate) : null;
    const leg = isAlt(route, legId) ? route.alt : route.legs.find(l => l.id === legId);
    return {route, legId, leg, now, prev, delta: prev ? (now.low + now.high) / 2 - (prev.low + prev.high) / 2 : null,
      reference: refLeg(route) === legId, cal: calibration(route)};
  }).filter(Boolean));
}
function history(colors) {
  const dates = [...new Set(Object.values(feed.series ?? {}).flatMap(s => (s?.points ?? []).map(p => p.date)))].filter(d => iso.test(d)).sort();
  return ROUTES.map((route, i) => ({
    label: route.label + (route.legs.length > 1 || route.alt ? ' · ' + (isAlt(route, refLeg(route)) ? route.alt.label : route.legs.find(l => l.id === refLeg(route)).label) : ''),
    color: colors[i % colors.length],
    points: dates.map(date => {
      const leg = legEstimate(route, refLeg(route), date);
      return leg ? {date, value: Math.round((leg.low + leg.high) / 2 * 10) / 10} : null;
    }).filter(Boolean),
  }));
}

// ---------- Chargement ----------
async function readJSON(address) {
  try {
    const response = await fetch(address, {cache: 'no-cache', signal: AbortSignal.timeout(7000)});
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
const validFeed = raw => raw && checkFreightFeed(raw).length === 0 ? raw : null;
function refresh() {
  if (pending) return pending;
  pending = (async () => {
    const [live, bundled, shipping] = await Promise.all([readJSON(LIVE), readJSON(BUNDLED), readJSON(SHIPPING)]);
    const candidates = [[validFeed(live), 'live'], [validFeed(bundled), 'bundled']].filter(([f]) => f);
    candidates.sort((a, b) => String(b[0].updatedAt ?? '').localeCompare(String(a[0].updatedAt ?? '')));
    if (candidates.length) [feed, feedState] = candidates[0];
    else if (feedState === 'loading') feedState = 'unavailable';
    const snap = validateEnergySnapshot(shipping);
    if (snap) {
      const since = Date.now() - HEADLINE_DAYS * DAY;
      headlines = snap.articles.filter(a => a.topics.includes('shipping') && Date.parse(a.publishedAt) >= since)
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
      headlineState = 'live';
    } else if (headlineState === 'loading') headlineState = 'unavailable';
    lastRead = Date.now();
  })().finally(() => { pending = null; });
  return pending;
}

export async function refreshFreight(manual = false) {
  if (!manual && pending) return;
  const before = JSON.stringify([feed, headlines.map(h => h.url)]);
  const button = binding?.page.querySelector('[data-fret-refresh]');
  if (button) button.disabled = true;
  await refresh();
  if (button?.isConnected) button.disabled = false;
  if (binding?.page.isConnected && (manual || before !== JSON.stringify([feed, headlines.map(h => h.url)]))) {
    binding.render();
    if (manual) binding?.page.querySelector('[data-fret-refresh]')?.focus({preventScroll: true});
  }
}

// ---------- Rendu ----------
function statusLine(ui) {
  const {e, formatDate} = ui;
  const inputDates = Object.keys(SERIES).map(key => latest(feed, key).last?.date).filter(Boolean).sort();
  const newest = inputDates.at(-1);
  if (feedState === 'loading') return '<p class="news-status"><span class="dot"></span>Chargement des données de fret…</p>';
  if (feedState === 'unavailable') return '<p class="news-status stale"><span class="dot"></span>Données de fret indisponibles pour le moment.</p>';
  const stale = !newest || newest < addDays(today(), -8);
  const updated = feed.updatedAt ? 'Données mises à jour le ' + dateTime.format(new Date(feed.updatedAt)) + ' (Casablanca)' : 'Données intégrées au site';
  return '<p class="news-status' + (stale ? ' stale' : '') + '"><span class="dot"></span>' + e(updated + ' · dernier relevé ' + formatDate(newest) +
    (feedState === 'bundled' ? ' · copie intégrée au site' : '') + (stale ? ' · relevés de plus de 8 jours' : '')) + '</p>';
}
function inputsBox(ui) {
  const {e, num, formatDate, link} = ui;
  return '<div class="fret-inputs"><span class="eyebrow">Entrées du modèle</span><ul>' + Object.entries(SERIES).map(([key, s]) => {
    const {last, previous} = latest(feed, key);
    const change = last && previous ? last.value - previous.value : null;
    return '<li><span>' + e(s.short) + '<small>' + e(s.unit) + '</small></span><b class="num">' + (last ? num(last.value, 1) : '—') + '</b>' +
      '<small>' + (last ? e(formatDate(last.date).replace(/ \d{4}$/, '')) + ' · ' + link(last.url, last.source) : 'Pas de relevé') +
      (change ? ' · <span class="' + (change > 0 ? 'fret-up' : 'fret-down') + '">' + (change > 0 ? '▲ +' : '▼ −') + e(num(Math.abs(change), 1)) + '</span> vs ' + e(formatDate(previous.date).replace(/ \d{4}$/, '')) : '') + '</small></li>';
  }).join('') + '</ul></div>';
}
const range = (ui, a, b) => {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return Math.round(lo) === Math.round(hi) ? ui.num(lo, 0) : ui.num(lo, 0) + '–' + ui.num(hi, 0);
};
const deltaHtml = (ui, d) => d == null ? '<span class="small">—</span>' : Math.abs(d) < 0.05 ? '<span class="small">stable</span>' :
  '<span class="num ' + (d > 0 ? 'fret-up' : 'fret-down') + '">' + (d > 0 ? '▲ +' : '▼ −') + ui.e(ui.num(Math.abs(d), 1)) + '</span>';
const sizeList = (ui, leg) => leg.bySize.map(s => kt(s.size) + ' : ' + ui.num(s.total, 0)).join(' · ');
const calHtml = (ui, row, card = false) => {
  if (!row.cal) return card ? '' : '<span class="small">—</span>';
  const {factor, quote, old} = row.cal;
  const value = range(ui, row.now.low * factor, row.now.high * factor);
  const note = 'Calé sur votre cotation du ' + ui.formatDate(quote.date) + ' (×' + ui.num(factor, 2) + ')' + (old ? ' · plus de 60 jours' : '');
  return card ? '<p class="fret-cal' + (old ? ' old' : '') + '"><b class="num">' + ui.e(value) + ' USD/t</b> calibré · <span>' + ui.e(note) + '</span></p>'
    : '<b class="num">' + ui.e(value) + '</b><small class="' + (old ? 'fret-old' : '') + '">' + ui.e(note) + '</small>';
};
function card(ui, row) {
  const {e} = ui;
  const r = row.route, leg = row.now;
  const sizes = r.sizes.length > 1 ? kt(Math.min(...r.sizes)) + '–' + kt(Math.max(...r.sizes)) : kt(r.sizes[0]);
  return '<article class="fret-card"><header><div><h3>' + e(r.label) + '</h3><p>' + e((isAlt(r, row.legId) ? r.alt.port : r.port) + ' → Casablanca') + '</p></div><span class="market-code">' + e(sizes) + '</span></header>' +
    '<p class="fret-value"><b class="num">' + e(range(ui, leg.low, leg.high)) + '</b><span>USD/t</span></p>' +
    '<p class="fret-meta">' + e(r.product + ' · ' + row.leg.label + ' · ' + ui.num(leg.bySize[0].days.total, 0) + ' jours') + '</p>' +
    '<p class="fret-meta">' + e(sizeList(ui, leg)) + '</p>' +
    '<footer><span>vs relevés précédents</span>' + deltaHtml(ui, row.delta) + '</footer>' + calHtml(ui, row, true) + '</article>';
}
function arbitrageCard(ui, list) {
  const {e, num} = ui;
  const mid = row => row ? (row.now.low + row.now.high) / 2 : null;
  const pick = (route, leg) => mid(list.find(r => r.route.id === route && r.legId === leg));
  const gap = (a, b) => Number.isFinite(a) && Number.isFinite(b) ? b - a : null;
  const items = [
    ['Asie : le Cap plutôt que Suez', gap(pick('mys', 'suez'), pick('mys', 'cape')), 'Malaisie, lot de 4 kt'],
    ['Ukraine : ports ukrainiens plutôt que Constanța', gap(pick('ukr', 'constanta'), pick('ukr', 'direct')), 'hors acheminement jusqu’à Constanța'],
    ['Russie plutôt que Bulgarie', gap(pick('bgr', 'direct'), pick('rus', 'direct')), 'surprime de guerre et distance'],
  ].filter(([, v]) => v != null);
  return '<article class="fret-card fret-arbitrage"><header><div><h3>Écarts de route</h3><p>Milieu de fourchette, USD/t</p></div></header><ul>' +
    items.map(([label, v, note]) => '<li><span>' + e(label) + '<small>' + e(note) + '</small></span><b class="num ' + (v > 0 ? 'fret-up' : 'fret-down') + '">' + (v > 0 ? '+' : '−') + num(Math.abs(v), 0) + '</b></li>').join('') +
    '</ul></article>';
}
function breakdown(ui, est, max) {
  const per = est.bySize[0].perTonne;
  return '<div class="fret-bar" role="img" aria-label="' + ui.e(PARTS.filter(([k]) => per[k] > 0.05).map(([k, l]) => l + ' ' + ui.num(per[k], 1) + ' USD/t').join(', ')) + '">' +
    PARTS.map(([k, l]) => per[k] > 0.05 ? '<i class="part-' + k + '" style="width:' + (per[k] / max * 100).toFixed(2) + '%" title="' + ui.e(l + ' : ' + ui.num(per[k], 1) + ' USD/t') + '"></i>' : '').join('') + '</div>';
}
function routeTable(ui, list) {
  const {e, num} = ui;
  const max = Math.max(...list.map(r => r.now.bySize[0].total));
  const body = list.map(row => {
    const r = row.route, leg = row.now;
    return '<tr class="' + (row.reference ? 'ref' : 'alt') + '"><th scope="row">' + e(r.label) + '<small>' + e((isAlt(r, row.legId) ? r.alt.port : r.port) + ' · ' + r.product) + '</small></th>' +
      '<td>' + e(row.leg.label) + (row.reference ? '' : '<small>Variante</small>') + (isAlt(r, row.legId) ? '<small>Hors acheminement jusqu’à Constanța</small>' : '') + '</td>' +
      '<td class="num">' + leg.bySize.map(s => '<span class="fret-size"><small>' + e(kt(s.size)) + '</small><b>' + num(s.total, 1) + '</b></span>').join('') + '</td>' +
      '<td>' + deltaHtml(ui, row.delta) + '</td>' +
      '<td>' + breakdown(ui, leg, max) + '</td>' +
      '<td class="num">' + num(leg.bySize[0].days.total, 0) + '<small>' + num(leg.distance, 0) + ' milles</small></td>' +
      '<td>' + calHtml(ui, row) + '</td></tr>';
  }).join('');
  const legend = '<div class="fret-legend">' + PARTS.map(([k, l]) => '<span><i class="part-' + k + '"></i>' + e(l) + '</span>').join('') + '<span class="small">Décomposition pour le plus petit lot</span></div>';
  return legend + '<div class="scroll"><table class="table fret-table"><thead><tr><th>Origine</th><th>Route</th><th class="num">USD/t par lot</th><th>Variation</th><th>Décomposition</th><th class="num">Jours</th><th>Calibré</th></tr></thead><tbody>' + body + '</tbody></table></div>';
}
function seg(ui, key, values, current, label) {
  return '<div class="seg" role="group" aria-label="' + ui.e(label) + '">' + Object.entries(values).map(([k, v]) =>
    '<button type="button" data-fret-set="' + key + '" data-value="' + k + '" class="' + (k === current ? 'active' : '') + '" aria-pressed="' + (k === current) + '">' + ui.e(v) + '</button>').join('') + '</div>';
}
function charts(ui) {
  const {chart, colors, panel} = ui;
  // Une mention par source, avec le lien de son relevé le plus récent.
  const sourceLinks = keys => [...new Map(keys.flatMap(key => latest(feed, key).points).map(p => [p.source, [p.source, p.url]])).values()];
  const line = (key, color) => ({label: SERIES[key].label, color, points: latest(feed, key).points.map(p => ({date: p.date, value: p.value}))});
  return panel('<h3>Estimation de référence par origine</h3><p class="small">Milieu de fourchette des lots, en USD/t, recalculé à chaque relevé.</p>' +
      chart(history(colors), {unit: 'USD/t', periodType: 'day', height: 230, label: 'Historique de l’estimation du fret vers Casablanca'}), 'fret-plot') +
    '<div class="fret-chart-grid">' +
    panel('<h3>Soutes VLSFO</h3>' + chart([line('vlsfo-gib', colors[0]), line('vlsfo-sgp', colors[1])], {unit: 'USD/t', periodType: 'day', height: 190, label: 'Prix des soutes VLSFO', sourceLinks: sourceLinks(['vlsfo-gib', 'vlsfo-sgp'])}), 'fret-plot') +
    panel('<h3>Affrètement tankers (Baltic)</h3>' + chart([line('tce-tc6', colors[2]), line('tce-mr-atl', colors[3])], {unit: 'USD/jour', periodType: 'day', height: 190, label: 'Indices tankers Baltic en équivalent time-charter', sourceLinks: sourceLinks(['tce-tc6', 'tce-mr-atl'])}), 'fret-plot') +
    '</div>';
}
function publicQuotes(ui) {
  const {e, num, link, formatDate} = ui;
  const list = [...(feed.quotes ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) return ui.empty('Aucune cotation publique relevée pour le moment.');
  return '<div class="scroll"><table class="table"><thead><tr><th>Date</th><th>Route</th><th>Lot</th><th class="num">USD/t</th><th>Avant</th><th>Source</th></tr></thead><tbody>' +
    list.map(q => '<tr><td class="num">' + e(formatDate(q.date)) + '</td><td>' + e(q.from + ' → ' + q.to) + (q.note ? '<small>' + e(q.note) + '</small>' : '') + '</td><td>' + e(q.size || 'n. d.') + '</td>' +
      '<td class="num"><b>' + num(q.low, 0) + (q.high ? '–' + num(q.high, 0) : '') + '</b></td><td>' + e(q.previous || '—') + '</td><td>' + link(q.url, q.source) + '</td></tr>').join('') +
    '</tbody></table></div><p class="small fret-note">Cotations reprises dans la presse : destinations et dates différentes de Casablanca. Elles servent d’ordre de grandeur et de contrôle du modèle.</p>';
}
function brokerPanel(ui) {
  const {e, num, formatDate} = ui;
  const options = ROUTES.flatMap(r => legIds(r).map(id => {
    const leg = isAlt(r, id) ? r.alt : r.legs.find(l => l.id === id);
    return '<option value="' + r.id + '|' + id + '">' + e(r.label + (legIds(r).length > 1 ? ' · ' + leg.label : '') + ' (' + r.sizes.map(kt).join(' / ') + ')') + '</option>';
  })).join('');
  const list = [...prefs.quotes].sort((a, b) => b.date.localeCompare(a.date));
  const table = list.length ? '<div class="scroll"><table class="table"><thead><tr><th>Date</th><th>Route</th><th class="num">Lot</th><th class="num">Cotation</th><th class="num">Modèle</th><th class="num">Écart</th><th></th></tr></thead><tbody>' +
    list.map(q => {
      const route = ROUTES.find(r => r.id === q.route);
      const leg = isAlt(route, q.leg) ? route.alt : route.legs.find(l => l.id === q.leg);
      const factor = calibrationFactor({...q, alt: isAlt(route, q.leg)}, routeFor(route), feed, overridesFor(route));
      const model = factor ? q.value / factor : null;
      return '<tr><td class="num">' + e(formatDate(q.date)) + '</td><td>' + e(route.label + ' · ' + leg.label) + '</td><td class="num">' + e(kt(q.size)) + '</td><td class="num"><b>' + num(q.value, 1) + '</b></td>' +
        '<td class="num">' + (model ? num(model, 1) : '—') + '</td><td class="num">' + (factor ? (factor >= 1 ? '+' : '−') + num(Math.abs(factor - 1) * 100, 0) + ' %' : '—') + '</td>' +
        '<td><button type="button" class="link-button" data-fret-del="' + e(q.id) + '" aria-label="Supprimer la cotation du ' + e(formatDate(q.date)) + '">Supprimer</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="small">Aucune cotation enregistrée. Ajoutez la dernière offre de votre courtier pour caler le modèle sur le marché réel.</p>';
  return '<form class="fret-form" data-fret-quote><label>Route<select name="route" required>' + options + '</select></label>' +
    '<label>Lot (t)<input name="size" type="number" min="500" max="60000" step="100" inputmode="numeric" placeholder="6000" required></label>' +
    '<label>Cotation (USD/t)<input name="value" type="number" min="1" max="1000" step="0.5" inputmode="decimal" placeholder="85" required></label>' +
    '<label>Date<input name="date" type="date" max="' + today() + '" value="' + today() + '" required></label>' +
    '<button type="submit" class="button primary">Enregistrer</button></form>' + table +
    '<p class="small fret-note">Vos cotations restent dans ce navigateur : elles ne sont ni publiées ni envoyées. La plus récente de chaque origine sert de facteur de calibration.</p>';
}
function paramsPanel(ui) {
  const {e, num} = ui;
  const keys = Object.keys(PROFILES);
  const head = '<tr><th>Hypothèse</th>' + keys.map(k => '<th>' + e(PROFILES[k].label) + '</th>').join('') + '</tr>';
  const body = PARAMS.map(([key, label, unit, factor, min, max, digits]) => '<tr><th scope="row">' + e(label) + '<small>' + e(unit) + '</small></th>' + keys.map(k => {
    const p = profileFor(k);
    if (p[key] == null) return '<td class="small">—</td>';
    const changed = prefs.overrides[k]?.[key] != null && prefs.overrides[k][key] !== PROFILES[k][key];
    return '<td><input class="' + (changed ? 'changed' : '') + '" name="' + k + '.' + key + '" type="number" min="' + min + '" max="' + max + '" step="' + (digits ? 1 / 10 ** digits : 1) + '" value="' + +(p[key] * factor).toFixed(digits) + '" aria-label="' + e(label + ' · ' + PROFILES[k].label) + '"></td>';
  }).join('') + '</tr>').join('');
  const hire = '<tr><th scope="row">Indice d’affrètement<small>série utilisée</small></th>' + keys.map(k => '<td class="small">' + e(SERIES[PROFILES[k].hireSeries].short) + '</td>').join('') + '</tr>' +
    '<tr><th scope="row">Soutes<small>port de soutage</small></th>' + keys.map(k => '<td class="small">' + e(SERIES[PROFILES[k].bunkerSeries].short) + '</td>').join('') + '</tr>';
  const war = '<div class="fret-war">' + WAR.map(([key, label]) => {
    const value = Number.isFinite(prefs.war[key]) ? prefs.war[key] : warDefault(key);
    return '<label>' + e(label) + '<span><input name="war.' + key + '" type="number" min="0" max="5" step="0.05" value="' + +(value * 100).toFixed(3) + '" class="' + (value !== warDefault(key) ? 'changed' : '') + '"> % de la coque</span></label>';
  }).join('') + '</div>';
  return '<form data-fret-params><div class="scroll"><table class="table fret-params"><thead>' + head + '</thead><tbody>' + hire + body + '</tbody></table></div>' +
    '<h3 class="fret-sub">Surprimes de guerre par voyage</h3>' + war +
    '<div class="fret-actions"><button type="submit" class="button primary">Recalculer</button><button type="button" class="button ghost" data-fret-reset>Revenir aux valeurs par défaut</button></div></form>';
}
function headlinesHtml(ui) {
  const {e, icon} = ui;
  if (headlineState === 'loading') return '<p class="small">Chargement des dépêches…</p>';
  if (!headlines.length) return ui.empty(headlineState === 'unavailable' ? 'Dépêches maritimes indisponibles pour le moment.' : 'Aucune dépêche maritime sur ' + HEADLINE_DAYS + ' jours.');
  return '<ul class="fret-wire">' + headlines.slice(0, 12).map(a => '<li><time datetime="' + e(a.publishedAt) + '">' + e(a.dateOnly ? new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'}).format(new Date(a.publishedAt)) : dateTime.format(new Date(a.publishedAt))) + '</time>' +
    '<a href="' + e(a.url) + '" target="_blank" rel="noopener noreferrer">' + e(a.title) + ' ' + icon('arrow', 12) + '</a><small>' + e(a.source) + '</small></li>').join('') + '</ul>';
}

export function renderFreight(ui) {
  const {e, icon, section, panel} = ui;
  const list = rows();
  const refs = ROUTES.map(r => list.find(row => row.route.id === r.id && row.reference)).filter(Boolean);
  const events = ui.freightEvents().slice(0, 8);
  const body = list.length ? '<div class="fret-cards">' + refs.map(row => card(ui, row)).join('') + arbitrageCard(ui, list) + '</div>' :
    ui.empty(feedState === 'loading' ? 'Chargement des estimations…' : 'Estimation impossible : relevés de soutes ou d’affrètement manquants.');
  return '<div class="fret-page" data-fret-page>' +
    '<section class="hero fret-hero"><div><span class="eyebrow">Terminal · Fret maritime</span><h1>Fret</h1>' +
    '<p>Coût estimé du transport d’huiles végétales en vrac jusqu’à Casablanca, pour vos tailles de lots. Le modèle se recalcule à chaque relevé des soutes et des taux d’affrètement tankers. C’est une estimation, pas une cotation : calez-la avec les offres de votre courtier.</p>' +
    statusLine(ui) + '<div class="actions"><button type="button" class="button" data-fret-refresh>' + icon('refresh') + ' Relire les données</button>' +
    '<button type="button" class="button ghost" data-fret-csv>' + icon('table') + ' CSV</button><a class="button ghost" href="#fret-method">Méthode</a></div></div>' + inputsBox(ui) + '</section>' +
    section('Estimation par origine', 'USD par tonne, Casablanca, lots habituels · Asie et Ukraine selon la route choisie',
      '<div class="fret-switches">' + seg(ui, 'asia', {cape: 'Asie via le Cap', suez: 'Asie via Suez'}, prefs.asia, 'Route depuis l’Asie') +
      seg(ui, 'ukr', {direct: 'Ports ukrainiens', constanta: 'Via Constanța'}, prefs.ukr, 'Route depuis l’Ukraine') + '</div>') + body +
    (list.length ? section('Détail par route', 'Toutes les variantes, décomposition du coût et durée du voyage aller-retour') + panel(routeTable(ui, list), 'fret-table-panel') : '') +
    section('Historique', 'Estimation recalculée à chaque relevé et entrées du modèle') + charts(ui) +
    section('Actualités du fret', 'Analyses datées et sourcées (haussier = fret plus cher), puis dépêches maritimes collectées automatiquement') +
    (events.length ? '<div class="news-list fret-news">' + events.map(ui.newsItem).join('') + '</div>' : ui.empty('Aucune analyse fret récente.')) +
    panel('<div class="spread-between"><div><h3>Dépêches maritimes</h3><p class="small">Fret, routes et sécurité maritime · ' + HEADLINE_DAYS + ' derniers jours · titres dans la langue de la source</p></div><a class="small" href="#macro">Énergie & géopolitique ' + icon('arrow', 14) + '</a></div>' + headlinesHtml(ui), 'fret-wire-panel') +
    section('Repères publics', 'Niveaux de fret cités dans la presse spécialisée') + panel(publicQuotes(ui)) +
    section('Vos cotations courtier', 'Calibration du modèle avec des offres réelles') + panel(brokerPanel(ui)) +
    '<div id="fret-method">' + section('Méthode & hypothèses', 'Hypothèses modifiables · enregistrées dans ce navigateur') + '</div>' +
    panel('<div class="fret-method-text"><p>Coût d’un voyage = affrètement × durée (aller chargé, retour partiel à vide, jours de port) + soutes consommées + frais de port + droits de canal + surprime d’assurance guerre. Le total est divisé par les tonnes chargées.</p>' +
      '<p>Lots de 6 à 8 kt et de 18 à 24 kt : navire dédié, le coût est réparti sur le lot. Lots de 4 kt de palme : part d’un chimiquier plus grand (taux de remplissage et prime de lot appliqués). L’affrètement du navire type = un montant fixe par jour + une part de l’indice Baltic le plus proche : TC6 (30 kt en Méditerranée) pour les petits tankers, panier MR Atlantique pour les autres. À chaque date, le modèle retient le dernier relevé connu de chaque entrée.</p>' +
      '<p>Non inclus : surestaries, commissions, acheminement intérieur et frais de transbordement. Les distances sont des routes maritimes usuelles arrondies.</p></div>' + paramsPanel(ui)) +
    '</div>';
}

function exportCsv(ui) {
  const list = rows();
  const head = ['Origine', 'Port', 'Produit', 'Route', 'Lot (t)', 'Estimation (USD/t)', 'Affrètement', 'Soutes', 'Ports', 'Canal', 'Guerre', 'Jours', 'Calibré (USD/t)', 'Date des relevés'];
  const out = [head];
  for (const row of list) for (const s of row.now.bySize) {
    out.push([row.route.label, isAlt(row.route, row.legId) ? row.route.alt.port : row.route.port, row.route.product, row.leg.label, s.size,
      s.total.toFixed(1), ...PARTS.map(([k]) => s.perTonne[k].toFixed(1)), s.days.total.toFixed(1),
      row.cal ? (s.total * row.cal.factor).toFixed(1) : '', [row.now.inputs.bunkerDate, row.now.inputs.tceDate].sort().at(-1)]);
  }
  ui.csv('olea_fret_estimation_' + today() + '.csv', out);
}

export function bindFreight(root, ui, render) {
  const page = root.querySelector('[data-fret-page]');
  binding = null;
  if (!page) return;
  binding = {page, ui, render};
  page.addEventListener('click', event => {
    const set = event.target.closest('[data-fret-set]');
    if (set) {
      prefs[set.dataset.fretSet] = set.dataset.value;
      savePrefs();
      render();
      root.querySelector('[data-fret-set="' + set.dataset.fretSet + '"][data-value="' + set.dataset.value + '"]')?.focus({preventScroll: true});
      return;
    }
    if (event.target.closest('[data-fret-refresh]')) { refreshFreight(true); return; }
    if (event.target.closest('[data-fret-csv]')) { exportCsv(ui); return; }
    const del = event.target.closest('[data-fret-del]');
    if (del) {
      prefs.quotes = prefs.quotes.filter(q => q.id !== del.dataset.fretDel);
      savePrefs();
      render();
      ui.toast('Cotation supprimée.');
      return;
    }
    if (event.target.closest('[data-fret-reset]')) {
      prefs.overrides = {};
      prefs.war = {};
      savePrefs();
      render();
      ui.toast('Hypothèses par défaut rétablies.');
    }
  });
  page.addEventListener('submit', event => {
    const form = event.target;
    if (form.matches('[data-fret-quote]')) {
      event.preventDefault();
      const f = new FormData(form);
      const [route, leg] = String(f.get('route')).split('|');
      const quote = {id: Date.now().toString(36), route, leg, size: Number(f.get('size')), value: Number(f.get('value')), date: String(f.get('date'))};
      if (!validQuote(quote) || quote.date > today()) { ui.toast('Cotation invalide : vérifiez le lot (500 à 60 000 t), le prix (1 à 1 000 USD/t) et la date.'); return; }
      prefs.quotes.push(quote);
      prefs.quotes = prefs.quotes.slice(-40);
      const saved = savePrefs();
      render();
      ui.toast(saved ? 'Cotation enregistrée dans ce navigateur.' : 'Cotation appliquée, mais le navigateur refuse l’enregistrement.');
    }
    if (form.matches('[data-fret-params]')) {
      event.preventDefault();
      const overrides = {}, war = {};
      for (const [name, raw] of new FormData(form)) {
        const value = Number(raw);
        if (raw === '' || !Number.isFinite(value)) continue;
        const [scope, key] = name.split('.');
        if (scope === 'war') {
          const v = Math.min(5, Math.max(0, value)) / 100;
          if (Math.abs(v - warDefault(key)) > 1e-9) war[key] = v;
          continue;
        }
        const def = PARAMS.find(p => p[0] === key);
        if (!def || !PROFILES[scope] || PROFILES[scope][key] == null) continue;
        const [, , , factor, min, max] = def;
        const v = Math.min(max, Math.max(min, value)) / factor;
        if (Math.abs(v - PROFILES[scope][key]) > 1e-9) (overrides[scope] ??= {})[key] = v;
      }
      prefs.overrides = overrides;
      prefs.war = war;
      savePrefs();
      render();
      ui.toast('Estimation recalculée avec vos hypothèses.');
    }
  });
  if (!lastRead || Date.now() - lastRead > 15 * 60_000) refreshFreight();
}
