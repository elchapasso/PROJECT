import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROFILES, ROUTES, latest, estimateVoyage, estimateRoute, calibrationFactor, checkFreightFeed} from '../docs/terminal/freight-model.mjs';

const feed = JSON.parse(readFileSync(new URL('../docs/terminal/freight-feed.json', import.meta.url), 'utf8'));
const date = '2026-11-14';
const route = id => ROUTES.find(r => r.id === id);
const inputs = {bunker: 800, tce: 60000};

test('the bundled freight feed is valid', () => {
  assert.deepEqual(checkFreightFeed(feed, {today: '2099-01-01'}), []);
  for (const block of Object.values(feed.series)) assert.ok(block.points.length > 0);
});

test('every route to Casablanca has an estimate for each of its lot sizes', () => {
  for (const r of ROUTES) {
    const est = estimateRoute(r, feed, {date});
    assert.ok(est, r.id);
    for (const leg of est.legs) {
      assert.equal(leg.bySize.length, r.sizes.length);
      for (const s of leg.bySize) assert.ok(s.total > 20 && s.total < 250, `${r.id} ${leg.id} ${s.total}`);
    }
  }
});

test('a larger dedicated lot costs less per tonne', () => {
  const [small, large] = estimateRoute(route('ukr'), feed, {date}).legs[0].bySize;
  assert.equal(small.size, 6000);
  assert.ok(large.total < small.total);
  const arg = estimateRoute(route('arg'), feed, {date}).legs[0];
  assert.ok(arg.low < arg.high);
});

test('the Cape route costs more than Suez for Asian palm oil', () => {
  for (const id of ['idn', 'mys']) {
    const legs = estimateRoute(route(id), feed, {date}).legs;
    const suez = legs.find(l => l.id === 'suez'), cape = legs.find(l => l.id === 'cape');
    assert.ok(cape.low > suez.low, id);
    assert.ok(cape.bySize[0].days.total > suez.bySize[0].days.total, id);
  }
});

test('higher bunkers or charter rates raise the freight estimate', () => {
  const base = estimateVoyage({distance: 2300, size: 6000, profile: PROFILES.coaster, inputs});
  assert.ok(estimateVoyage({distance: 2300, size: 6000, profile: PROFILES.coaster, inputs: {...inputs, bunker: 900}}).total > base.total);
  assert.ok(estimateVoyage({distance: 2300, size: 6000, profile: PROFILES.coaster, inputs: {...inputs, tce: 90000}}).total > base.total);
  assert.ok(estimateVoyage({distance: 2300, size: 6000, profile: PROFILES.coaster, inputs, warRisk: 0.02}).total > base.total);
});

test('the cost breakdown adds up to the total', () => {
  const est = estimateVoyage({distance: 6950, size: 4000, profile: PROFILES.parcelAsia, inputs, canal: 180000, warRisk: 0.003});
  const sum = Object.values(est.perTonne).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - est.total) < 1e-9);
  assert.ok(est.perTonne.canal > 0 && est.perTonne.war > 0);
});

test('a 4 kt parcel is priced as a share of a larger tanker, not as a dedicated ship', () => {
  const parcel = estimateVoyage({distance: 6950, size: 4000, profile: PROFILES.parcelAsia, inputs});
  assert.equal(parcel.basis, PROFILES.parcelAsia.capacity * PROFILES.parcelAsia.utilisation);
  assert.ok(parcel.total < 200);
});

test('the charter floor keeps hire realistic when indices are very low', () => {
  const low = estimateVoyage({distance: 2300, size: 6000, profile: PROFILES.coaster, inputs: {bunker: 700, tce: 9000}});
  assert.ok(low.hire >= PROFILES.coaster.hireBase);
});

test('inputs use the latest observation at or before the date', () => {
  const {last} = latest(feed, 'tce-tc6', '2026-11-10');
  assert.equal(last.date, '2026-11-06');
  assert.equal(latest(feed, 'vlsfo-sgp', '2026-11-01').last, null);
  assert.equal(estimateRoute(route('mys'), feed, {date: '2026-11-01'}), null);
});

test('calibration returns the ratio between a broker quote and the model', () => {
  const est = estimateRoute(route('ukr'), feed, {date, sizes: [6000]}).legs[0].bySize[0].total;
  const factor = calibrationFactor({date, value: est * 1.1, size: 6000, leg: 'direct'}, route('ukr'), feed);
  assert.ok(Math.abs(factor - 1.1) < 1e-9);
  const alt = calibrationFactor({date, value: 60, size: 6000, leg: 'constanta', alt: true}, route('ukr'), feed);
  const altModel = estimateRoute(route('ukr'), feed, {date, useAlt: true, sizes: [6000]}).legs[0].bySize[0].total;
  assert.ok(Math.abs(alt - 60 / altModel) < 1e-9);
  assert.equal(calibrationFactor({date: 'bad', value: 50}, route('ukr'), feed), null);
});

test('editable hypotheses change the estimate', () => {
  const base = estimateRoute(route('rus'), feed, {date}).legs[0].low;
  const slower = estimateRoute(route('rus'), feed, {date, overrides: {speed: 9}}).legs[0].low;
  assert.ok(slower > base);
});

test('invalid freight data is rejected with a readable reason', () => {
  const bad = {series: {
    'vlsfo-gib': {points: [{date: '2026-11-13', value: 90, source: 'X', url: 'https://x.test'}]},
    'unknown': {points: []},
    'tce-tc6': {points: [{date: '2026-12-01', value: 50000, source: 'X', url: 'http://x.test'}]},
  }, quotes: [{id: 'q', date: '2026-11-01', from: 'A', to: 'B', low: 120, high: 100, source: 'X', url: 'https://x.test'}]};
  const errors = checkFreightFeed(bad, {today: '2026-11-14'});
  assert.ok(errors.some(e => e.includes('hors bornes')));
  assert.ok(errors.some(e => e.includes('série inconnue')));
  assert.ok(errors.some(e => e.includes('date future')));
  assert.ok(errors.some(e => e.includes('https')));
  assert.ok(errors.some(e => e.includes('prix USD/t invalide')));
  assert.deepEqual(checkFreightFeed(null), ['Le fichier doit contenir « series » (objet) et « quotes » (tableau).']);
});
