import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkFocusParams,focusAverage,focusRows,focusSpreads,focusStats,focusWindow,gallonsPerTonne} from '../docs/terminal/spread-focus.mjs';
import {spreadPrices} from '../docs/terminal/spread-prices.mjs';

const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<tolerance,actual+' ≠ '+expected);
const spread=id=>focusSpreads.find(item=>item.id===id);
const variant=(id,name)=>spread(id).variants.find(item=>item.id===name);
const at=(rows,date)=>rows.find(row=>row.date===date);
const today='2026-11-12';

test('BOPO compares Argentine soybean oil with each palm oil reference on common dates',()=>{
  const {defaults}=spread('bopo');
  const belawan=focusRows(variant('bopo','belawan'),spreadPrices,defaults,today);
  assert.deepEqual(belawan.map(row=>row.date),['2026-11-04','2026-11-06','2026-11-10','2026-11-11']);
  assert.equal(at(belawan,'2026-11-11').value,1195-1102);
  const malaysia=at(focusRows(variant('bopo','mpob'),spreadPrices,defaults,today),'2026-11-10');
  close(malaysia.observations.usdm.value,4.056,.0005);
  close(malaysia.b,3985/malaysia.observations.usdm.value);
  close(malaysia.value,1188-malaysia.b);
  const futures=at(focusRows(variant('bopo','imf'),spreadPrices,defaults,today),'2026-09-01');
  close(futures.value,1596.49-1133.13);
  const delivered=at(focusRows(variant('bopo','belawan'),spreadPrices,{soyFreight:88,palmFreight:60},today),'2026-11-11');
  assert.equal(delivered.value,93+88-60);
});

test('BOHO converts soybean oil and diesel to the chosen unit',()=>{
  const dollars=at(focusRows(variant('boho','imf'),spreadPrices,spread('boho').defaults,today),'2026-09-01');
  close(dollars.a,1596.49/22.0462*7.5/100);
  assert.equal(dollars.b,4.956);
  const cents=at(focusRows(variant('boho','imf'),spreadPrices,{unit:'clb',lbPerGallon:7.5},today),'2026-09-01');
  close(cents.a,1596.49/22.0462);
  close(cents.value,dollars.value*100/7.5);
  assert.equal(spread('boho').unit({unit:'clb'}),'¢ US/lb');
});

test('POGO converts diesel from USD per gallon to USD per tonne',()=>{
  close(gallonsPerTonne(.845),312.63,.01);
  const {defaults}=spread('pogo');
  const daily=focusRows(variant('pogo','mpob'),spreadPrices,defaults,today);
  const row=at(daily,'2026-11-03');
  close(row.b,4.823*gallonsPerTonne(.845));
  close(row.a,4366/row.observations.usdm.value);
  assert.equal(daily.at(-1).date,'2026-11-03');
  const monthly=at(focusRows(variant('pogo','imf'),spreadPrices,{density:.85},today),'2026-09-01');
  close(monthly.value,1133.13-4.956*gallonsPerTonne(.85));
});

test('rows stop at the reference date and keep source observations',()=>{
  const rows=focusRows(variant('pogo','mpob'),spreadPrices,spread('pogo').defaults,'2025-01-10');
  assert.deepEqual(rows.map(row=>row.date),['2025-01-02','2025-01-03','2025-01-06','2025-01-07','2025-01-08','2025-01-10']);
  assert.deepEqual(Object.keys(rows[0].observations),['mpobCpo','usdm','ulsdNy']);
  assert.ok(rows.every(row=>row.observations.usdm.date<=row.date));
});

test('window, moving average and statistics describe the selected period',()=>{
  const rows=[1,2,3,4,5,6].map((value,i)=>({date:'2026-0'+(i+1)+'-15',value}));
  assert.deepEqual(focusWindow(rows,3).map(row=>row.value),[4,5,6]);
  assert.deepEqual(focusWindow(rows,null),rows);
  assert.deepEqual(focusWindow(rows,2,'2026-04-15').map(row=>row.value),[3,4,5,6]);
  assert.deepEqual(focusAverage(rows,3),[{date:'2026-03-15',value:2},{date:'2026-04-15',value:3},{date:'2026-05-15',value:4},{date:'2026-06-15',value:5}]);
  const stats=focusStats([{date:'a',value:4},{date:'b',value:-2},{date:'c',value:1}]);
  assert.deepEqual([stats.change,stats.mean,stats.low.date,stats.high.date,stats.count],[3,1,'b','a',3]);
  close(stats.percentile,200/3);
  assert.equal(focusStats([]),null);
});

test('parameters outside their limits are rejected',()=>{
  assert.deepEqual(checkFocusParams(spread('pogo'),{density:.86}),{params:{density:.86}});
  assert.equal(checkFocusParams(spread('pogo'),{density:1.2}).error.key,'density');
  assert.equal(checkFocusParams(spread('bopo'),{soyFreight:10,palmFreight:NaN}).error.key,'palmFreight');
  assert.deepEqual(checkFocusParams(spread('boho'),{unit:'tonnes',lbPerGallon:7.7}).params,{unit:'usdgal',lbPerGallon:7.7});
});

test('imported histories are ordered, positive and free of duplicate dates',()=>{
  for(const [key,count] of [['ulsdNy',459],['ulsdNyMonth',142],['imfSoyOil',141],['imfPalmOil',141],['mpobCpo',448]]){
    const rows=spreadPrices[key];
    assert.equal(rows.length,count,key);
    assert.deepEqual(rows.map(([date])=>date),[...new Set(rows.map(([date])=>date))].sort(),key);
    assert.ok(rows.every(([,value])=>Number.isFinite(value)&&value>0),key);
  }
});
