#!/usr/bin/env node
// Contrôle, trie et date les données de fret avant publication, puis affiche les estimations.
// Usage : node scripts/update-freight.mjs <chemin/vers/freight-feed.json> [--check]
//   --check : contrôle seulement, sans réécrire le fichier.
import {readFileSync, writeFileSync} from 'node:fs';
import {SERIES, ROUTES, latest, estimateRoute, checkFreightFeed} from '../docs/terminal/freight-model.mjs';

const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error('Usage : node scripts/update-freight.mjs <freight-feed.json> [--check]');
  process.exit(2);
}
const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Casablanca'}).format(new Date());
let feed;
try {
  feed = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  console.error('JSON illisible : ' + error.message);
  process.exit(1);
}
const errors = checkFreightFeed(feed, {today});
if (errors.length) {
  for (const error of errors) console.error('Erreur · ' + error);
  console.error(`${errors.length} erreur(s) : rien n’a été écrit.`);
  process.exit(1);
}
// Un point par date et par série (le dernier saisi l’emporte), dans l’ordre chronologique.
const series = Object.fromEntries(Object.entries(feed.series).map(([key, block]) => {
  const byDate = new Map(block.points.map(p => [p.date, p]));
  return [key, {points: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))}];
}));
const quotes = [...new Map(feed.quotes.map(q => [q.id, q])).values()].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
const out = {updatedAt: flag === '--check' && feed.updatedAt ? feed.updatedAt : new Date().toISOString(), series, quotes};
if (flag !== '--check') writeFileSync(file, JSON.stringify(out, null, 2) + '\n');

console.log(`Fret · ${Object.values(series).reduce((n, s) => n + s.points.length, 0)} relevés · ${quotes.length} cotations publiques · mise à jour ${out.updatedAt}`);
for (const key of Object.keys(SERIES)) {
  const {last} = latest(out, key);
  const age = last ? Math.round((Date.parse(today) - Date.parse(last.date)) / 86_400_000) : null;
  console.log(`${SERIES[key].label} : ${last ? `${last.value} ${SERIES[key].unit} au ${last.date} (${last.source})` : 'aucun relevé'}` + (age > 8 ? ` · ATTENTION relevé de ${age} jours` : ''));
}
for (const route of ROUTES) {
  for (const useAlt of route.alt ? [false, true] : [false]) {
    const est = estimateRoute(route, out, {date: today, useAlt});
    for (const leg of est?.legs ?? []) {
      console.log(`${route.label} · ${leg.label} : ` + leg.bySize.map(s => `${s.size / 1000} kt ${s.total.toFixed(1)} USD/t`).join(' · '));
    }
  }
}
