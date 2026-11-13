import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkFocusParams,focusAverage,focusInputs,focusRows,focusSpreads,focusStats,focusWindow,gallonsPerTonne} from '../docs/terminal/spread-focus.mjs';
import {spreadPrices} from '../docs/terminal/spread-prices.mjs';

const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<tolerance,actual+' ≠ '+expected);
const spread=id=>focusSpreads.find(item=>item.id===id);
const variant=(id,name)=>spread(id).variants.find(item=>item.id===name);
const at=(rows,date)=>rows.find(row=>row.date===date);
const today='2026-11-12';

test('BOPO compares Argentine soybean oil with each palm oil reference on common dates',()=>{
  const {defaults}=spread('bopo');
  const belawan=focusRows(variant('bopo','belawan'),spreadPrices,defaults,today);
  assert.deepEqual(belawan.map(row=>row.date).filter(date=>date<='2026-11-11'),['2026-11-04','2026-11-05','2026-11-06','2026-11-10','2026-11-11']);
  assert.equal(at(belawan,'2026-11-05').value,1175-1130);
  assert.equal(at(belawan,'2026-11-11').value,1195-1102);
  const malaysia=at(focusRows(variant('bopo','mpob'),spreadPrices,defaults,today),'2026-11-10');
  close(malaysia.observations.usdm.value,4.056,.0005);
  close(malaysia.b,3985/malaysia.observations.usdm.value);
  close(malaysia.value,1188-malaysia.b);
  const delivered=at(focusRows(variant('bopo','belawan'),spreadPrices,{soyFreight:88,palmFreight:60},today),'2026-11-11');
  assert.equal(delivered.value,93+88-60);
});

test('BOHO converts soybean oil and diesel to the chosen unit',()=>{
  const dollars=at(focusRows(variant('boho','monthly'),spreadPrices,spread('boho').defaults,today),'2015-01-01');
  close(dollars.a,32.186*7.5/100);
  assert.equal(dollars.b,1.65714);
  const cents=at(focusRows(variant('boho','monthly'),spreadPrices,{unit:'clb',lbPerGallon:7.5},today),'2015-01-01');
  close(cents.a,32.186);
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
  const monthly=at(focusRows(variant('pogo','monthly'),spreadPrices,{density:.85},today),'2024-12-01');
  close(monthly.value,1072.124-674.869);
});

test('daily futures spreads use the closes of the same session',()=>{
  const boho=focusRows(variant('boho','futures'),spreadPrices,spread('boho').defaults,today);
  close(at(boho,'2026-11-06').value,62.26*7.5/100-4.3317);
  close(at(boho,'2026-11-12').value,63.42*7.5/100-4.1888);
  close(at(focusRows(variant('boho','futures'),spreadPrices,{unit:'clb',lbPerGallon:7.5},today),'2026-11-12').value,63.42-4.1888*100/7.5);
  const pogo=at(focusRows(variant('pogo','futures'),spreadPrices,spread('pogo').defaults,today),'2026-11-11');
  close(pogo.value,4410/pogo.observations.usdm.value-1341.25);
  assert.equal(pogo.observations.usdm.date,'2026-11-11');
  const bopo=at(focusRows(variant('bopo','futures'),spreadPrices,spread('bopo').defaults,today),'2026-11-11');
  close(bopo.value,63.88*22.0462-4410/bopo.observations.usdm.value);
  // le 9 novembre 2026 est férié à Kuala Lumpur : aucune valeur ce jour-là pour les spreads qui utilisent Bursa
  assert.equal(at(focusRows(variant('pogo','futures'),spreadPrices,spread('pogo').defaults,today),'2026-11-09'),undefined);
  assert.ok(at(boho,'2026-11-09'));
  assert.equal(spread('boho').variants[0].id,'futures');
  assert.equal(spread('pogo').variants[0].id,'futures');
  assert.deepEqual(focusInputs(spread('pogo'),variant('pogo','futures')),[]);
  assert.equal(focusInputs(spread('pogo'),variant('pogo','mpob')),spread('pogo').inputs);
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
  for(const [key,minimum] of [['ulsdNy',459],['ulsdNyMonth',142],['imfSoyOil',141],['imfPalmOil',141],['mpobCpo',448],
    ['zl',469],['zs',469],['zm',469],['ho',469],['gasoil',482],['fcpo',455]]){
    const rows=spreadPrices[key];
    assert.ok(rows.length>=minimum,key);
    assert.deepEqual(rows.map(([date])=>date),[...new Set(rows.map(([date])=>date))].sort(),key);
    assert.ok(rows.every(([,value])=>Number.isFinite(value)&&value>0),key);
  }
});

test('monthly futures spreads join TradingView averages to the daily closes, current month included',()=>{
  const {defaults}=spread('bopo');
  const rows=focusRows(variant('bopo','monthly'),spreadPrices,defaults,today);
  assert.equal(rows[0].date,'2015-01-01');
  close(rows[0].value,32.186*22.0462-637.035);
  close(at(rows,'2024-12-01').value,41.2948*22.0462-1072.124);
  assert.ok(at(rows,'2024-12-01').observations.zlM.stored);
  // Depuis janvier 2025 : moyenne des clôtures quotidiennes du site.
  const daily=focusRows(variant('bopo','futures'),spreadPrices,defaults,today);
  const zlDays=spreadPrices.zl.filter(([date])=>date.startsWith('2026-10'));
  const october=at(rows,'2026-10-01');
  close(october.observations.zlM.value,zlDays.reduce((sum,[,v])=>sum+v,0)/zlDays.length);
  assert.equal(october.observations.zlM.sessions,zlDays.length);
  assert.ok(!october.observations.zlM.partial);
  const november=rows.at(-1);
  assert.equal(november.date,'2026-11-01');
  assert.ok(november.observations.zlM.partial);
  assert.ok(november.observations.fcpoUsdM.partial);
  assert.equal(november.observations.zlM.last<=today,true);
  // Le BOPO mensuel reste proche de la moyenne des valeurs quotidiennes du même mois.
  const octoberDaily=daily.filter(row=>row.date.startsWith('2026-10'));
  close(october.value,octoberDaily.reduce((sum,row)=>sum+row.value,0)/octoberDaily.length,3);
  // Valeurs mensuelles 2015–2024 : 120 mois par contrat.
  for(const key of ['zlMonth','fcpoUsdMonth','hoMonth','gasoilMonth'])assert.equal(spreadPrices[key].length,120,key);
  const pogo=focusRows(variant('pogo','monthly'),spreadPrices,spread('pogo').defaults,today);
  assert.equal(pogo[0].date,'2015-01-01');
  assert.equal(pogo.at(-1).date,'2026-11-01');
});
