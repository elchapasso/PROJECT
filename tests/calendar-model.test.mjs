import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const local=iso=>{
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Casablanca',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .formatToParts(new Date(iso)).map(({type,value})=>[type,value]));
  return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};
};
import {casablanca,zonedInstant,reportEntry,forexEntry,feedEntries,toCasablanca,forexDayUrl,reportCatalog,dateStatusLabels} from '../docs/terminal/calendar-model.mjs';

test('heure de Casablanca à partir de l’heure de la source', () => {
  // Le décalage de Casablanca suit la base des fuseaux du navigateur (UTC+0 ou UTC+1 selon la période).
  assert.deepEqual(casablanca('2026-12-10T12:00:00-05:00'),local('2026-12-10T17:00:00Z'));
  assert.deepEqual(casablanca('2026-12-10T12:30:00+08:00'),local('2026-12-10T04:30:00Z'));
  assert.equal(local('2026-12-10T23:30:00Z').date>='2026-12-10',true);
  assert.equal(zonedInstant('2026-11-13','15:30','America/New_York'),'2026-11-13T20:30:00.000Z');
  assert.equal(zonedInstant('2026-07-10','15:30','America/New_York'),'2026-07-10T19:30:00.000Z');
});

test('publication agricole : titre, heure locale, lien officiel', () => {
  const row=reportEntry({id:'wasde-2026-12-10',kind:'wasde',date:'2026-12-10',at:'2026-12-10T12:00:00-05:00',url:'https://www.usda.gov/x',status:'official',period:'2026-12'});
  assert.equal(row.title,'USDA · WASDE · décembre 2026');
  assert.equal(row.time,local('2026-12-10T17:00:00Z').time);
  assert.match(row.zone,/12:00 à New York/);
  assert.equal(row.url,'https://www.usda.gov/x');
  assert.equal(row.importance,3);
  const nopa=reportEntry({id:'nopa-2026-11-16',kind:'nopa',date:'2026-11-16',at:'2026-11-16T12:00:00-05:00',url:'https://www.nopa.org/',status:'official',period:'2026-10'});
  assert.equal(nopa.title,'NOPA · Trituration mensuelle · données de octobre 2026');
  const sea=reportEntry({id:'sea-2026-12-14',kind:'sea',date:'2026-12-14',at:'',url:'https://seaofindia.com/',status:'usual',period:'2026-11'});
  assert.equal(sea.time,'');
  assert.equal(sea.dateStatus,'usual');
  assert.equal(reportEntry({id:'x',kind:'inconnu',date:'2026-12-14',url:'https://a.b'}),null);
  assert.equal(reportEntry({id:'x',kind:'sea',date:'2026-12-14',url:'javascript:alert(1)'}),null);
  for(const spec of Object.values(reportCatalog))assert.ok(spec.title&&spec.expected&&spec.impact&&[1,2,3].includes(spec.importance));
  assert.deepEqual(Object.keys(dateStatusLabels),['official','rule','usual']);
});

test('annonces Forex Factory : fiche de l’annonce ou page du jour', () => {
  const cpi=forexEntry({title:'CPI m/m',country:'USD',date:'2026-11-10T08:30:00-05:00',impact:'High',forecast:'0.3%',previous:'0.6%',url:'https://www.forexfactory.com/calendar/1-us-cpi-mm'});
  assert.equal(cpi.time,local('2026-11-10T13:30:00Z').time);
  assert.equal(cpi.url,'https://www.forexfactory.com/calendar/1-us-cpi-mm');
  assert.equal(cpi.importance,3);
  const old=forexEntry({title:'PPI m/m',country:'EUR',date:'2026-11-13T05:00:00-05:00',impact:'Medium',forecast:'',previous:''});
  assert.equal(old.url,forexDayUrl('2026-11-13'));
  assert.equal(forexDayUrl('2026-11-13'),'https://www.forexfactory.com/calendar?day=nov13.2026');
  assert.equal(old.importance,2);
  assert.equal(old.origin,'eu');
});

test('flux livré : nouvel et ancien format', () => {
  const feed=JSON.parse(readFileSync(new URL('../docs/terminal/calendar-feed.json',import.meta.url)));
  assert.ok(Array.isArray(feed.reports)&&feed.reports.length>100);
  const rows=feedEntries(feed);
  assert.ok(rows.length>=feed.reports.length);
  assert.ok(rows.every(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&/^https:\/\//.test(r.url)));
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const legacy=feedEntries({forex:[],nass:[{date:'2026-11-16T16:00:00-05:00',url:'https://www.nass.usda.gov/data-and-statistics/calendar/release/1'}]});
  assert.equal(legacy[0].title,'USDA NASS · Crop Progress');
  assert.equal(legacy[0].time,local('2026-11-16T21:00:00Z').time);
});

test('COT ramené à l’heure de Casablanca', () => {
  const row=toCasablanca({id:'c',date:'2026-11-13',time:'15:30',zone:'New York (ET)'},'America/New_York','New York');
  assert.deepEqual([row.date,row.time],[local('2026-11-13T20:30:00Z').date,local('2026-11-13T20:30:00Z').time]);
  assert.match(row.zone,/15:30 à New York/);
});
