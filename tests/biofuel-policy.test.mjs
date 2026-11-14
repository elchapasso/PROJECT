import test from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyHipGap, cumulativeNetRins,
} from '../docs/terminal/biofuel-policy-model.mjs';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, actual + ' ≠ ' + expected);

test('HIP compares only matched same-day ICE and FX observations inside its month', () => {
  const hip = [{date:'2026-10-01',value:15072},{date:'2026-11-01',value:14312}];
  const gasoil = [{date:'2026-11-02',value:800},{date:'2026-11-03',value:900},{date:'2026-11-05',value:1000}];
  const rates = [{date:'2026-11-02',value:16000},{date:'2026-11-04',value:16000},{date:'2026-11-05',value:16000}];
  const [row,...rest] = monthlyHipGap(hip,gasoil,rates,.845,'2026-11-04');
  assert.equal(rest.length,0);
  assert.equal(row.date,'2026-11');
  assert.equal(row.count,1);
  assert.equal(row.partial,true);
  close(row.proxy,10816);
  close(row.gap,3496);
});

test('the cumulative D4 series adds published rounded observations', () => {
  assert.equal(cumulativeNetRins().at(-1).total,6141);
});
