import test from 'node:test';
import assert from 'node:assert/strict';
import {gapkiFeed} from '../docs/terminal/gapki-data.mjs';
import {validateGapkiFeed, gapkiMissingMonths, gapkiYearToDate, gapkiStockResiduals, newerGapkiFeed} from '../docs/terminal/gapki-model.mjs';

const today = '2026-11-17';
const clone = () => structuredClone(gapkiFeed);
const month = (feed, m) => feed.months.find(r => r.month === m);

test('la copie intégrée passe tous les contrôles', () => {
  const {errors, warnings} = validateGapkiFeed(gapkiFeed, {today});
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.equal(gapkiFeed.months[0].month, '2024-01');
  assert.equal(gapkiFeed.release.period, gapkiFeed.months.at(-1).month);
});

test('les cumuls 2024 égalent le bilan annuel et l’équation des stocks boucle', () => {
  const year = gapkiFeed.months.filter(r => r.month.startsWith('2024'));
  const annual = gapkiFeed.annual.find(a => a.year === 2024);
  for (const key of ['cpo', 'food', 'oleo', 'consumption', 'exports'])
    assert.equal(year.reduce((s, r) => s + r[key], 0), annual[key], key);
  for (const {month: m, residual} of gapkiStockResiduals(gapkiFeed.months))
    assert.ok(residual >= 0 && residual <= 12, m + ' : ' + residual);
});

test('novembre-décembre 2025 : cumul tiré du bilan annuel', () => {
  const gap = gapkiMissingMonths(gapkiFeed, 2025);
  assert.deepEqual(gap.months, ['2025-11', '2025-12']);
  assert.equal(gap.production, 8461);
  assert.equal(gap.consumption, 4086);
  assert.equal(gap.exports, 4649);
  assert.equal(gap.stock, 2068);
});

test('cumul 2026 et rythme implicite de l’estimation GAPKI', () => {
  const ytd = gapkiYearToDate(gapkiFeed, 2026);
  assert.equal(ytd.to, '2026-08');
  assert.equal(ytd.exports, 23370);
  assert.equal(ytd.consumption, 17523);
  assert.equal(ytd.implied.remaining, 4);
  assert.equal(ytd.implied.exports, (33890 - 23370) / 4);
});

test('une valeur mal recopiée est rejetée', () => {
  const stock = clone();
  month(stock, '2026-06').stock = 3844;
  assert.match(validateGapkiFeed(stock, {today}).errors.join('\n'), /2026-06 · l’équation des stocks/);
  const unit = clone();
  month(unit, '2026-08').exports = 3588000;
  assert.match(validateGapkiFeed(unit, {today}).errors.join('\n'), /hors des bornes/);
  const parts = clone();
  month(parts, '2026-08').biodiesel = 1450;
  assert.match(validateGapkiFeed(parts, {today}).errors.join('\n'), /≠ consommation/);
});

test('mois manquant, mois futur et communiqué incohérent sont rejetés', () => {
  const hole = clone();
  hole.months = hole.months.filter(r => r.month !== '2025-03');
  assert.match(validateGapkiFeed(hole, {today}).errors.join('\n'), /mois manquant/);
  const future = clone();
  future.months.push({...future.months.at(-1), month: '2026-09'}, {...future.months.at(-1), month: '2026-10'}, {...future.months.at(-1), month: '2026-11'});
  future.release.period = '2026-11';
  assert.match(validateGapkiFeed(future, {today}).errors.join('\n'), /2026-11 · mois non terminé/);
  const release = clone();
  release.release.period = '2026-07';
  assert.match(validateGapkiFeed(release, {today}).errors.join('\n'), /release.period/);
});

test('un nouveau mois publié passe et l’emporte sur la copie intégrée', () => {
  const next = clone();
  next.months.push({month: '2026-09', cpo: 4700, pko: 450, food: 800, oleo: 185, biodiesel: 1400, consumption: 2385, exports: 2800, stock: 2183,
    source: 'https://gapki.id/news/2026/11/28/exemple/'});
  next.release = {period: '2026-09', published: '2026-11-28', url: 'https://gapki.id/news/2026/11/28/exemple/'};
  next.updatedAt = '2026-11-28T10:00:00Z';
  const {errors} = validateGapkiFeed(next, {today: '2026-11-28'});
  assert.deepEqual(errors, []);
  assert.equal(newerGapkiFeed(gapkiFeed, next), next);
  assert.equal(newerGapkiFeed(next, gapkiFeed), next);
});
