import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeFeed, coverage, complexOf} from '../scripts/news-lib.mjs';

const today = '2026-11-14';
const base = {
  id: 'test-1', date: '2026-11-13', time: '', product: 'palm', origin: 'mys', category: 'stocks',
  title: 'Titre', summary: 'Résumé', number: '3,6 Mt', variation: '+3 %', period: 'Octobre 2026',
  impact: 'positive', intensity: 2, horizon: 'short', status: 'confirmed',
  transmission: 'Pourquoi', caveat: 'Sauf si', source: 'MPOB', url: 'https://mpob.gov.my/',
};

test('the bundled news feed is valid and every item has a date, a source link and an impact', () => {
  const feed = JSON.parse(readFileSync(new URL('../docs/terminal/news-feed.json', import.meta.url), 'utf8'));
  const {errors} = normalizeFeed(feed, {today: '2099-01-01', keepDays: 100000});
  assert.deepEqual(errors, []);
  for (const item of feed.items) {
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(item.url, /^https:\/\//);
    assert.ok(['positive', 'negative', 'mixed'].includes(item.impact), item.id);
  }
});

test('invalid items are rejected with a readable reason', () => {
  const {errors} = normalizeFeed({items: [
    {...base, id: 'no-impact', impact: 'neutral'},
    {...base, id: 'no-link', url: 'http://example.com'},
    {...base, id: 'future', date: '2026-12-01'},
    {...base, id: 'unknown-origin', origin: 'mars'},
  ]}, {today});
  assert.equal(errors.length, 4);
  assert.match(errors[0], /impact/);
  assert.match(errors[1], /https/);
  assert.match(errors[2], /future/);
  assert.match(errors[3], /origine inconnue/);
});

test('duplicates keep the last version, old items expire and the feed is sorted newest first', () => {
  const {feed, warnings, errors} = normalizeFeed({items: [
    {...base, id: 'a', date: '2026-11-10', title: 'Ancienne version'},
    {...base, id: 'a', date: '2026-11-10', title: 'Nouvelle version', url: 'https://mpob.gov.my/a'},
    {...base, id: 'b', date: '2026-11-12', url: 'https://mpob.gov.my/b'},
    {...base, id: 'old', date: '2026-01-01', url: 'https://mpob.gov.my/old'},
  ]}, {today, now: '2026-11-14T06:00:00Z'});
  assert.deepEqual(errors, []);
  assert.deepEqual(feed.items.map(item => item.id), ['b', 'a']);
  assert.equal(feed.items[1].title, 'Nouvelle version');
  assert.equal(feed.updatedAt, '2026-11-14T06:00:00Z');
  assert.ok(warnings.some(w => w.includes('double')));
});

test('coverage counts the last seven days by complex and origin', () => {
  const feed = {items: [
    {...base, id: 'p', origin: 'idn', date: '2026-11-14'},
    {...base, id: 's', product: 'sfo', origin: 'ukr', date: '2026-11-09'},
    {...base, id: 'x', product: 'sfo', origin: 'ukr', date: '2026-11-01'},
  ]};
  const rows = coverage(feed, today);
  assert.equal(rows.find(r => r.key === 'palm').origins.find(o => o.origin === 'idn').count, 1);
  assert.equal(rows.find(r => r.key === 'sun').total, 1);
  assert.equal(complexOf({product: 'sm'}), 'soy');
  assert.equal(complexOf({product: 'energy'}), 'other');
});

test('the Morocco reading and the daily brief are kept and checked', () => {
  const {feed, errors, warnings} = normalizeFeed({items: [{...base, morocco: 'Pour les achats vers Casablanca : rien ne change.'}],
    brief: {date: '2026-11-14', headline: 'Palme soutenue', points: [
      {complex: 'palm', impact: 'positive', text: 'Stocks MPOB en hausse mais exportations solides.', ids: ['test-1', 'absent']},
      {complex: 'soy', impact: 'negative', text: 'Trituration record aux États-Unis.'}],
    watch: ['MPOB le 10 décembre']}}, {today});
  assert.deepEqual(errors, []);
  assert.equal(feed.items[0].morocco, 'Pour les achats vers Casablanca : rien ne change.');
  assert.deepEqual(feed.brief.points[0].ids, ['test-1']);
  assert.match(warnings.join('\n'), /absent/);
  const bad = normalizeFeed({items: [base], brief: {date: '2026-11-20', headline: '', points: [{complex: 'rice', impact: 'up', text: ''}]}}, {today});
  assert.ok(bad.errors.some(e => /date future/.test(e)));
  assert.ok(bad.errors.some(e => /2 à 6 points/.test(e)));
  assert.ok(bad.errors.some(e => /complex attendu/.test(e)));
  const noBrief = normalizeFeed({items: [base]}, {today});
  assert.equal(noBrief.feed.brief, undefined);
  assert.equal('morocco' in noBrief.feed.items[0], false);
});
