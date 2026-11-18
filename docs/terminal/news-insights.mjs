// Marché & actualités : classement des actualités, sentiment dans le temps et réaction des prix.
// Fonctions pures, partagées par docs/terminal/app.js et tests/news-insights.test.mjs.

const DAY = 86400000;
const toMs = d => Date.parse(d + 'T12:00:00Z');
const iso = ms => new Date(ms).toISOString().slice(0, 10);
export const shiftDay = (d, n) => iso(toMs(d) + n * DAY);
export const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY);

export const DIRECTION = {positive: 1, negative: -1, mixed: 0, neutral: 0};
// Poids de fiabilité : un fait publié compte plus qu'une estimation, une rumeur peu.
export const CONFIDENCE = {confirmed: 1, estimate: .7, projection: .7, consensus: .6, pending: .4, rumor: .3};

// Importance d'une fiche aujourd'hui : intensité × fiabilité × fraîcheur (demi-vie d'environ 3 jours).
export function importance(item, today) {
  const age = Math.max(0, daysBetween(item.date, today));
  return (item.intensity || 1) * (CONFIDENCE[item.status] ?? .5) * Math.pow(.5, age / 3);
}

export function topStories(items, today, {limit = 5, days = 7} = {}) {
  const since = shiftDay(today, 1 - days);
  return items.filter(r => r.date >= since && r.date <= today)
    .map(r => ({item: r, score: importance(r, today)}))
    .sort((a, b) => b.score - a.score || b.item.date.localeCompare(a.item.date))
    .slice(0, limit).map(x => x.item);
}

// Solde pondéré : somme de sens × intensité × fiabilité (un fait fort et confirmé vaut 3 points).
export const weightedNet = items => items.reduce((sum, r) => sum + (DIRECTION[r.impact] ?? 0) * (r.intensity || 1) * (CONFIDENCE[r.status] ?? .5), 0);

// Solde pondéré sur fenêtre glissante, jour par jour, pour chaque groupe.
export function sentimentSeries(items, groupOf, groups, {from, to, window = 7}) {
  const days = [];
  for (let d = from; d <= to; d = shiftDay(d, 1)) days.push(d);
  return Object.fromEntries(groups.map(group => {
    const rows = items.filter(r => groupOf(r) === group);
    return [group, days.map(date => {
      const since = shiftDay(date, 1 - window);
      const value = weightedNet(rows.filter(r => r.date >= since && r.date <= date));
      return {date, value: Math.round(value * 10) / 10};
    })];
  }));
}

// Réaction des prix : dernière valeur connue et variation depuis la dernière cotation au plus tard au début de la période.
export function priceReaction(points, {today, days}) {
  const rows = points.filter(p => Number.isFinite(p.value) && p.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length < 2) return null;
  const last = rows.at(-1);
  const start = shiftDay(today, -days);
  const base = rows.filter(p => p.date <= start).at(-1) ?? rows[0];
  if (base.date === last.date) return null;
  const window = rows.filter(p => p.date >= base.date);
  return {last, base, change: (last.value / base.value - 1) * 100, points: window, stale: daysBetween(last.date, today) > 6};
}

// Lecture croisée du sens des actualités et du mouvement des prix.
export function marketReading(orientation, change, {threshold = 1} = {}) {
  if (!Number.isFinite(change)) return {tone: 'muted', text: 'Prix indisponible sur la période.'};
  const up = change > threshold, down = change < -threshold;
  const move = (change > 0 ? '+' : '−') + Math.abs(change).toFixed(1).replace('.', ',') + ' %';
  if (!up && !down) return {tone: 'neutral', text: 'Prix stables (' + move + ') : le marché n’a pas encore tranché.'};
  if (orientation === 'positive' && up) return {tone: 'positive', text: 'Les prix confirment la lecture haussière (' + move + ').'};
  if (orientation === 'negative' && down) return {tone: 'negative', text: 'Les prix confirment la lecture baissière (' + move + ').'};
  if (orientation === 'positive' && down) return {tone: 'mixed', text: 'Divergence : actualités haussières mais prix en baisse (' + move + ').'};
  if (orientation === 'negative' && up) return {tone: 'mixed', text: 'Divergence : actualités baissières mais prix en hausse (' + move + ').'};
  return {tone: up ? 'positive' : 'negative', text: 'Prix en ' + (up ? 'hausse' : 'baisse') + ' (' + move + ') sans signal net des actualités.'};
}

// Prix quotidiens des huiles convertis en USD/t pour les comparer sur un même graphique.
export const LB_PER_TONNE = 2204.62262;
export function oilUsdSeries(raw) {
  const usdMyr = new Map();
  const eurMyr = new Map(raw.eurMyr || []);
  for (const [date, eurUsd] of raw.eurUsd || []) {
    const myr = eurMyr.get(date);
    if (eurUsd > 0 && myr > 0) usdMyr.set(date, myr / eurUsd);
  }
  const rates = [...usdMyr.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const rateOn = date => {
    let found = null;
    for (const [d, v] of rates) { if (d > date) break; found = [d, v]; }
    return found && daysBetween(found[0], date) <= 7 ? found[1] : null;
  };
  const series = (rows, map) => (rows || []).flatMap(([date, value]) => {
    const v = map(value, date);
    return Number.isFinite(v) && v > 0 ? [{date, value: Math.round(v)}] : [];
  });
  return {
    zl: series(raw.zl, v => v / 100 * LB_PER_TONNE),
    arSoyOil: series(raw.arSoyOil, v => v),
    arSunOil: series(raw.arSunOil, v => v),
    fcpo: series(raw.fcpo, (v, date) => { const r = rateOn(date); return r ? v / r : null; }),
  };
}

// Sparkline SVG (valeurs déjà triées par date).
export function sparkline(points, {width = 132, height = 34} = {}) {
  const values = points.map(p => p.value).filter(Number.isFinite);
  if (values.length < 2) return '';
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const step = width / (values.length - 1);
  const coords = values.map((v, i) => (i * step).toFixed(1) + ',' + (height - 2 - (v - min) / span * (height - 4)).toFixed(1));
  const trend = values.at(-1) >= values[0] ? 'up' : 'down';
  return '<svg class="sparkline ' + trend + '" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" aria-hidden="true" focusable="false">' +
    '<polyline fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="' + coords.join(' ') + '"/>' +
    '<circle r="2.4" fill="currentColor" cx="' + coords.at(-1).split(',')[0] + '" cy="' + coords.at(-1).split(',')[1] + '"/></svg>';
}
