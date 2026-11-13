import test from 'node:test';
import assert from 'node:assert/strict';
import {
  epaVolumes, defaultRenewableFactor, simulateSoy, indonesiaVolumes, palmBalanceImpact,
  monthlyHipGap, cumulativeNetRins,
} from '../docs/terminal/biofuel-policy-model.mjs';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, actual + ' ≠ ' + expected);

test('EPA keeps adopted reallocation and proposed additions distinct', () => {
  assert.deepEqual(epaVolumes(2026,'adopted'), {base:8860,adopted:210,final:9070,total:9070,extra:0});
  assert.deepEqual(epaVolumes(2027,'adopted'), {base:8950,adopted:250,final:9200,total:9200,extra:0});
  assert.equal(epaVolumes(2026,'equal').total,9160);
  assert.equal(epaVolumes(2027,'equal').total,9290);
  assert.equal(epaVolumes(2026,'all2027').extra,0);
  assert.equal(epaVolumes(2027,'all2027').total,9380);
  assert.equal(defaultRenewableFactor(2026),1.7);
  assert.equal(defaultRenewableFactor(2027),1.5);
});

const soyInputs = {year:2027,scenario:'all2027',scope:'extra',carryover:80,domestic:100,rdMix:0,
  bdRate:1.5,rdRate:1.5,bdOil:7.5,rdOil:8,bdSoy:30,rdSoy:30};

test('100 M new D4 at 1.5 RIN/gal imply 150 Mlb SBO with the sample assumptions', () => {
  const result = simulateSoy(soyInputs);
  assert.equal(result.newRins,100);
  close(result.bdGallons,100/1.5);
  close(result.soyLb,150);
  close(result.soyMt,0.0680388555);
});

test('the model uses RIN shares before conversion and caps reportable credits', () => {
  const result = simulateSoy({...soyInputs,scope:'total',carryover:5000,domestic:80,rdMix:40,rdRate:1.6,rdSoy:25});
  assert.equal(result.ceiling,1876);
  assert.equal(result.coverage,1876);
  close(result.bdSoyLb,7504*.8*.6/1.5*7.5*.3);
  close(result.rdSoyLb,7504*.8*.4/1.6*8*.25);
  assert.equal(simulateSoy({...soyInputs,carryover:500}).soyLb,0);
});

const indonesia = {diesel:35.5,baseBlend:40,targetBlend:50,startMonth:1,realization:100,cpoRate:.92};
test('B50 January and July launches are measured against B40 on the same demand', () => {
  const january = indonesiaVolumes(indonesia);
  close(january.baselineLitres,14.2);
  close(january.scenarioLitres,17.75);
  close(january.extraPalm,3.266);
  const july = indonesiaVolumes({...indonesia,startMonth:7});
  assert.equal(july.effectiveBlend,45);
  close(july.extraPalm,1.633);
  close(indonesiaVolumes({...indonesia,targetBlend:40}).extraPalm,0);
});

test('palm balance applies the shock to either available exports or global ending stocks', () => {
  const base = {production:48,exports:23.4,stocks:12.92};
  const common = {productionShock:-1,campaignShare:50};
  const exports = palmBalanceImpact(base,3.266,{...common,closure:'exports'});
  const stocks = palmBalanceImpact(base,3.266,{...common,closure:'stocks'});
  close(exports.production,47);
  close(exports.exports,20.767);
  close(exports.stocks,12.92);
  close(stocks.exports,23.4);
  close(stocks.stocks,10.287);
});

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
