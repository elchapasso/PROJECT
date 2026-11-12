import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildDataset,mergeDataset,validateDataset,serializeDataset,sameData,isValidDataset,records,identityGap,socrataUrl,
  releaseFor,zonedInstant,expectedLatest,nextRelease,upcomingReleases,federalHolidays,cotIndexAt,cotIndexSeries,zScoreAt,weekOfYear,seasonal,addDaysISO} from '../docs/terminal/cot-model.mjs';

// Rapport désagrégé « futures » du 3 novembre 2026 pour l’huile de soja, valeurs de l’API publique de la CFTC.
const oilRow={
  market_and_exchange_names:'SOYBEAN OIL - CHICAGO BOARD OF TRADE',report_date_as_yyyy_mm_dd:'2026-11-03T00:00:00.000',cftc_contract_market_code:'007601',
  contract_units:'(CONTRACTS OF 60,000 POUNDS)',open_interest_all:'602052',
  prod_merc_positions_long:'151320',prod_merc_positions_short:'301185',
  swap_positions_long_all:'96011',swap__positions_short_all:'4691',swap__positions_spread_all:'29261',
  m_money_positions_long_all:'91647',m_money_positions_short_all:'44234',m_money_positions_spread:'112841',
  other_rept_positions_long:'24837',other_rept_positions_short:'19712',other_rept_positions_spread:'62969',
  nonrept_positions_long_all:'33166',nonrept_positions_short_all:'27159',traders_tot_all:'328',traders_m_money_long_all:'70',
};
function weeks(base,count,code,shift=()=>0){
  return Array.from({length:count},(_,i)=>{
    const date=addDaysISO('2022-11-08',7*i);
    const s=shift(i);
    return {...base,cftc_contract_market_code:code,report_date_as_yyyy_mm_dd:date+'T00:00:00.000',
      m_money_positions_long_all:String(91647+s),prod_merc_positions_long:String(151320-s)};
  });
}
const history=[...weeks(oilRow,209,'007601',i=>i*10),...weeks(oilRow,209,'005602')];

test('Socrata rows are normalized by market, with the CFTC column spellings',()=>{
  const ds=buildDataset('disaggregated-futures',[oilRow,{...oilRow,cftc_contract_market_code:'099741'}],'2026-11-06T21:00:00Z');
  assert.deepEqual(Object.keys(ds.markets),['soybean-oil']);
  const [r]=records(ds,'soybean-oil');
  assert.equal(r.date,'2026-11-03');
  assert.equal(r.oi,602052);
  assert.equal(r.mmN,91647-44234);
  assert.equal(r.pmN,151320-301185);
  assert.equal(r.swS,4691);
  assert.equal(r.mmLT,70);
  assert.equal(r.pmLT,null);
  assert.equal(identityGap(ds,ds.markets['soybean-oil'].rows[0]),0);
  assert.equal(ds.latest,'2026-11-03');
});

test('validation accepts a coherent history and rejects a broken last report',()=>{
  const ds=buildDataset('disaggregated-futures',history,'x');
  assert.deepEqual(validateDataset(ds,{now:new Date('2026-11-06T22:00:00Z')}).errors,[]);
  const broken=buildDataset('disaggregated-futures',[...history.slice(0,-1),{...history.at(-1),open_interest_all:'1'}],'x');
  assert.ok(validateDataset(broken).errors.some(e=>e.includes('identité')));
  const short=buildDataset('disaggregated-futures',[oilRow],'x');
  assert.ok(validateDataset(short).errors.length>0);
});

test('serialization round-trips and ignores the generation time when comparing',()=>{
  const ds=buildDataset('legacy-futures',[{...oilRow,noncomm_positions_long_all:'1',noncomm_positions_short_all:'2',noncomm_postions_spread_all:'3'}],'a');
  const back=JSON.parse(serializeDataset(ds));
  assert.deepEqual(back,ds);
  assert.ok(isValidDataset(back,'legacy-futures'));
  assert.ok(sameData(back,{...ds,generatedAt:'b'}));
  assert.ok(!isValidDataset(back,'legacy-combined'));
});

test('direct CFTC rows are merged after the feed rows',()=>{
  const ds=buildDataset('disaggregated-futures',history,'x');
  const next={...history.at(-1),report_date_as_yyyy_mm_dd:'2026-11-10T00:00:00.000'};
  const revised={...history[208],open_interest_all:'610000'};
  const merged=mergeDataset(ds,[next,revised]);
  assert.equal(merged.latest,'2026-11-10');
  assert.equal(merged.markets['soybean-oil'].rows.length,209);
  assert.equal(merged.markets['soybean-oil'].rows.at(-1)[1],610000);
  assert.equal(merged.markets.soybeans.rows.at(-1)[0],'2026-11-10');
  assert.equal(ds.markets.soybeans.rows.length,209);
});

test('the API query targets both markets after the last known report',()=>{
  const url=new URL(socrataUrl('disaggregated-futures',{after:'2026-11-03'}));
  assert.equal(url.pathname,'/resource/72hh-3qpy.json');
  assert.match(url.searchParams.get('$where'),/in\('007601','005602'\) AND report_date_as_yyyy_mm_dd > '2026-11-03T00:00:00'/);
});

test('release dates reproduce the official 2026 CFTC schedule',()=>{
  // Dates de publication officielles 2026 : chaque mardi de données est publié le vendredi, sauf report férié.
  const official={'2026-01-06':'2026-01-09','2026-01-13':'2026-01-16','2026-01-20':'2026-01-23','2026-02-17':'2026-02-20','2026-05-26':'2026-05-29',
    '2026-06-16':'2026-06-22','2026-06-30':'2026-07-06','2026-09-08':'2026-09-11','2026-10-13':'2026-10-16','2026-11-03':'2026-11-06',
    '2026-11-10':'2026-11-16','2026-11-17':'2026-11-20','2026-11-24':'2026-11-30','2026-12-22':'2026-12-28','2025-12-30':'2026-01-05'};
  for(const [asOf,date] of Object.entries(official))assert.equal(releaseFor(asOf).date,date,asOf);
  // La règle générale retrouve les reports officiels sans la table.
  for(const asOf of ['2026-06-16','2026-06-30','2026-11-10','2026-11-24','2026-12-22']){
    const friday=addDaysISO(asOf,3);
    assert.ok([1,2,3].some(d=>federalHolidays(2026).has(addDaysISO(asOf,d))),friday);
  }
  assert.equal(releaseFor('2026-12-29').date,'2027-01-04');
  assert.equal(releaseFor('2026-12-29').official,false);
});

test('release instants follow New York daylight saving time',()=>{
  assert.equal(zonedInstant('2026-11-16').toISOString(),'2026-11-16T20:30:00.000Z');
  assert.equal(zonedInstant('2026-07-10').toISOString(),'2026-07-10T19:30:00.000Z');
});

test('latest and next reports around a delayed release',()=>{
  const thursday=new Date('2026-11-12T19:25:00Z');
  assert.equal(expectedLatest(thursday),'2026-11-03');
  const next=nextRelease(thursday);
  assert.equal(next.asOf,'2026-11-10');
  assert.equal(next.date,'2026-11-16');
  assert.ok(next.delayed);
  assert.equal(expectedLatest(new Date('2026-11-16T20:31:00Z')),'2026-11-10');
  assert.equal(expectedLatest(new Date('2026-11-16T20:29:00Z')),'2026-11-03');
  assert.deepEqual(upcomingReleases(thursday,4).map(r=>r.date),['2026-11-16','2026-11-20','2026-11-30','2026-12-04']);
});

test('COT index, z-score and seasonality',()=>{
  const values=[0,10,20,30,40];
  assert.equal(cotIndexAt(values,4,5),100);
  assert.equal(cotIndexAt(values,3,5),null);
  assert.equal(cotIndexAt([5,5,5],2,3),50);
  assert.deepEqual(cotIndexSeries([4,0,2],3),[null,null,50]);
  assert.ok(Math.abs(zScoreAt(values,4,5)-Math.SQRT2)<1e-12);
  assert.equal(weekOfYear('2026-01-01'),1);
  assert.equal(weekOfYear('2026-01-08'),2);
  assert.equal(weekOfYear('2026-12-31'),53);
  const ds=buildDataset('disaggregated-futures',history,'x');
  const s=seasonal(records(ds,'soybean-oil'),'mmN',{years:3});
  assert.equal(s.year,2026);
  assert.deepEqual(s.years,[2023,2024,2025]);
  assert.ok(s.band.every(b=>b.min<=b.avg&&b.avg<=b.max));
  assert.equal(s.current.at(-1).date,'2026-11-03');
  assert.equal(s.previous.length,52);
});

test('weekly changes span reporting gaps',()=>{
  const rows=[history[0],history[2]];
  const r=records(buildDataset('disaggregated-futures',rows,'x'),'soybean-oil');
  assert.equal(r[1].gap,2);
  assert.equal(r[1].dmmL,20);
});
