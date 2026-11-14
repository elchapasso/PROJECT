import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicationCards,publicationGroups,cardSpec,cardRows,nextDates,latestFor,figureDigits} from '../docs/terminal/publications-model.mjs';
import {feedEntries,reportCatalog} from '../docs/terminal/calendar-model.mjs';

const feed=JSON.parse(readFileSync(new URL('../docs/terminal/calendar-feed.json',import.meta.url)));
const rows=feedEntries(feed);

test('une fiche par rapport du calendrier, plus le COT et Forex Factory', () => {
  const kinds=publicationCards.map(c=>c.kind);
  assert.equal(new Set(kinds).size,kinds.length);
  for(const kind of Object.keys(reportCatalog))assert.ok(kinds.includes(kind),kind);
  assert.ok(kinds.includes('cftc-cot')&&kinds.includes('forex'));
  for(const card of publicationCards){
    assert.ok(cardSpec(card.kind)?.title,card.kind);
    assert.ok(card.group in publicationGroups&&card.group!=='all');
    assert.match(card.page,/^https:\/\//);
  }
});

test('prochaines dates et dernière publication', () => {
  const now='2026-11-14T01:00';
  const next=nextDates(rows,'wasde',now);
  assert.equal(next[0].date,'2026-12-10');
  assert.ok(next.every(r=>r.id.startsWith('pub-wasde-')));
  const wasde=latestFor('wasde',feed.latest,rows,now);
  assert.equal(wasde.read,true);
  assert.equal(wasde.date,'2026-11-10');
  assert.ok(wasde.figures.length>=4);
  // MPOB : pas de lecture des chiffres, dernière date passée du calendrier.
  const mpob=latestFor('mpob',feed.latest,rows,now);
  assert.equal(mpob.read,false);
  assert.equal(mpob.date,'2026-11-10');
  assert.equal(nextDates(rows,'mpob',now)[0].date,'2026-12-10');
  assert.equal(latestFor('inconnu',{},rows,now),null);
  assert.ok(cardRows(rows,'forex').every(r=>r.source==='Forex Factory'));
});

test('décimales selon l’unité', () => {
  assert.equal(figureDigits('kt',1154),0);
  assert.equal(figureDigits('kt',1.7),1);
  assert.equal(figureDigits('¢/lb',68),2);
  assert.equal(figureDigits('%',92),0);
});

test('flux livré : dernières publications lisibles', () => {
  for(const [kind,entry] of Object.entries(feed.latest)){
    assert.match(entry.date,/^\d{4}-\d{2}-\d{2}$/,kind);
    assert.ok(entry.documents.every(d=>/^https:\/\//.test(d.url)),kind);
    assert.ok((entry.figures??[]).every(f=>typeof f.label==='string'&&Number.isFinite(f.value)&&f.unit),kind);
  }
});
