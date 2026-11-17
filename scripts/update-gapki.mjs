#!/usr/bin/env node
// Contrôle et horodate le flux GAPKI (Indonésie) avant publication sur la branche gapki-live.
// Usage :
//   node scripts/update-gapki.mjs <gapki-feed.json>            contrôle, met checkedAt à l'heure, réécrit le fichier
//   node scripts/update-gapki.mjs <gapki-feed.json> --check    contrôle seulement
//   node scripts/update-gapki.mjs <gapki-feed.json> --init     crée le fichier à partir de la copie intégrée au site
//   node scripts/update-gapki.mjs --check-bundled              contrôle la copie intégrée (docs/terminal/gapki-data.mjs)
// updatedAt ne change que si les données (mois, bilans annuels, perspectives) ont changé.
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateGapkiFeed, gapkiMissingMonths, gapkiYearToDate, gapkiStockResiduals} from '../docs/terminal/gapki-model.mjs';
import {gapkiFeed as bundled} from '../docs/terminal/gapki-data.mjs';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const flags = new Set(args.filter(a => a.startsWith('--')));
const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Casablanca'}).format(new Date());
const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const kt = n => Number.isFinite(n) ? Math.round(n).toLocaleString('fr-FR') + ' kt' : '—';

function report(feed) {
  const last = feed.months.at(-1);
  console.log(`Dernier bilan : ${feed.release.period} (publié le ${feed.release.published}) · ${feed.months.length} mois depuis ${feed.months[0].month}`);
  console.log(`  ${last.month} · production ${kt(last.cpo + last.pko)} · consommation ${kt(last.consumption)} (biodiesel ${kt(last.biodiesel)}) · exportations ${kt(last.exports)} · stock ${kt(last.stock)}`);
  const missing = feed.months.filter(r => r.stock === null).map(r => r.month);
  if (missing.length) console.log(`  stocks non publiés : ${missing.join(', ')}`);
  for (const a of feed.annual) {
    const gap = gapkiMissingMonths(feed, a.year);
    if (gap) console.log(`  ${a.year} · mois sans bilan ${gap.months.join(', ')} : production ${kt(gap.production)}, consommation ${kt(gap.consumption)}, exportations ${kt(gap.exports)} (bilan annuel)`);
  }
  const residuals = gapkiStockResiduals(feed.months).slice(-4).map(r => `${r.month} ${r.residual >= 0 ? '+' : ''}${r.residual}`);
  if (residuals.length) console.log(`  équation des stocks (écart ≈ importations) : ${residuals.join(' · ')} kt`);
  const ytd = gapkiYearToDate(feed, Number(feed.release.period.slice(0, 4)));
  if (ytd?.implied) console.log(`  ${ytd.year} · cumul ${ytd.from}→${ytd.to} : production ${kt(ytd.production)}, exportations ${kt(ytd.exports)} · rythme mensuel implicite pour l’estimation GAPKI : production ${kt(ytd.implied.production)}, exportations ${kt(ytd.implied.exports)}`);
}

function check(input, label) {
  const {feed, errors, warnings} = validateGapkiFeed(input, {today});
  for (const w of warnings) console.warn('Avertissement · ' + w);
  if (errors.length) {
    for (const e of errors) console.error('Erreur · ' + e);
    console.error(`${label} : ${errors.length} erreur(s), rien n’a été écrit.`);
    process.exit(1);
  }
  return feed;
}

const dataOf = f => JSON.stringify({release: f.release, months: f.months, annual: f.annual, outlook: f.outlook});

if (flags.has('--check-bundled')) {
  const feed = check(bundled, 'Copie intégrée');
  report(feed);
  process.exit(0);
}
if (!file) {
  console.error('Usage : node scripts/update-gapki.mjs <gapki-feed.json> [--check|--init] | --check-bundled');
  process.exit(2);
}
if (flags.has('--init')) {
  if (existsSync(file)) {
    console.error(file + ' existe déjà : --init ne l’écrase pas.');
    process.exit(1);
  }
  mkdirSync(path.dirname(file), {recursive: true});
  const feed = check(bundled, 'Copie intégrée');
  writeFileSync(file, JSON.stringify({...feed, checkedAt: now}, null, 2) + '\n');
  console.log('Flux créé à partir de la copie intégrée : ' + file);
  report(feed);
  process.exit(0);
}

let input;
try {
  input = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  console.error('JSON illisible : ' + error.message);
  process.exit(1);
}
// Version précédente = celle du dernier commit du dépôt qui contient le fichier (branche gapki-live).
let previous = null;
try {
  const abs = path.resolve(file);
  const top = execFileSync('git', ['-C', path.dirname(abs), 'rev-parse', '--show-toplevel'], {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim();
  const rel = path.relative(top, abs).split(path.sep).join('/');
  previous = JSON.parse(execFileSync('git', ['-C', top, 'show', 'HEAD:' + rel], {stdio: ['ignore', 'pipe', 'ignore']}).toString());
} catch { /* fichier pas encore suivi par git */ }
const feed = check(input, file);
if (!flags.has('--check')) {
  // Une modification des données sans nouvel horodatage est datée maintenant ; checkedAt marque chaque contrôle des sources.
  const changed = previous ? dataOf(previous) !== dataOf(feed) : false;
  const out = {...feed, checkedAt: now, updatedAt: changed ? now : feed.updatedAt};
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  console.log(`Flux valide · données ${changed ? 'modifiées' : previous ? 'inchangées' : 'contrôlées'} · vérifié ${now}`);
}
report(feed);
