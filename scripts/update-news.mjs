#!/usr/bin/env node
// Contrôle, trie et date la veille quotidienne avant publication.
// Usage : node scripts/update-news.mjs <chemin/vers/news-feed.json> [--check]
//   --check : contrôle seulement, sans réécrire le fichier.
import {readFileSync, writeFileSync} from 'node:fs';
import {normalizeFeed, coverage} from './news-lib.mjs';

const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error('Usage : node scripts/update-news.mjs <news-feed.json> [--check]');
  process.exit(2);
}
const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Casablanca'}).format(new Date());
let input;
try {
  input = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  console.error('JSON illisible : ' + error.message);
  process.exit(1);
}
const previous = typeof input?.updatedAt === 'string' ? input.updatedAt : undefined;
const {feed, errors, warnings} = normalizeFeed(input, {today, now: flag === '--check' && previous ? previous : new Date().toISOString()});
for (const warning of warnings) console.warn('Avertissement · ' + warning);
if (errors.length) {
  for (const error of errors) console.error('Erreur · ' + error);
  console.error(`${errors.length} fiche(s) invalide(s) : rien n’a été écrit.`);
  process.exit(1);
}
if (flag !== '--check') writeFileSync(file, JSON.stringify(feed, null, 2) + '\n');
console.log(`${feed.items.length} fiches valides · mise à jour ${feed.updatedAt}`);
for (const block of coverage(feed, today)) {
  const gaps = block.origins.filter(o => !o.count).map(o => o.name);
  console.log(`${block.name} · ${block.total} sur 7 jours · ` + block.origins.map(o => `${o.name} ${o.count}`).join(', ') + (gaps.length ? ` · sans actualité : ${gaps.join(', ')}` : ''));
}
