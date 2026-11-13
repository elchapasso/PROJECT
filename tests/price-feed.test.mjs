import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergePrices,validLiveFeed,validStatus,sourceAlerts} from '../docs/terminal/price-feed.mjs';

const bundled={
  arSoyOil:[['2026-11-10',1190,'https://source/10'],['2026-11-11',1195,'https://source/11']],
  hip:[['2026-11-01',14312,'https://notice']],
};
const live={schema:1,generatedAt:'2026-11-12T20:28:25Z',series:{
  arSoyOil:[['2026-11-10',1190],['2026-11-11',1196],['2026-11-12',1201]],
  myPalmFob:[['2026-11-10',982]],
}};

test('live series add dates, replace revised values and keep identical bundled rows with their links',()=>{
  const merged=mergePrices(bundled,live);
  assert.deepEqual(merged.arSoyOil,[['2026-11-10',1190,'https://source/10'],['2026-11-11',1196],['2026-11-12',1201]]);
  assert.deepEqual(merged.myPalmFob,[['2026-11-10',982]]);
  assert.equal(merged.hip,bundled.hip);
  assert.deepEqual(bundled.arSoyOil.length,2);
});

test('an invalid or missing feed leaves the bundled prices untouched',()=>{
  assert.equal(mergePrices(bundled,null),bundled);
  assert.equal(mergePrices(bundled,{schema:2,series:{}}),bundled);
  assert.ok(!validLiveFeed({schema:1,series:{x:[['12/11/2026',1]]}}));
  assert.ok(!validLiveFeed({schema:1,series:{x:[['2026-11-12',null]]}}));
  assert.ok(validLiveFeed(live));
});

test('source alerts flag failures older than 48 hours',()=>{
  const status={schema:1,series:{},sources:{
    magyp:{name:'MAGyP',ok:false,error:'HTTP 503',failingSince:'2026-11-09T21:23:00Z'},
    ecb:{name:'BCE',ok:true},
    mpob:{name:'MPOB',ok:false,error:'timeout',failingSince:'2026-11-12T09:17:00Z'},
  }};
  assert.ok(validStatus(status));
  const alerts=sourceAlerts(status,new Date('2026-11-12T20:00:00Z'));
  assert.deepEqual(alerts.map(a=>[a.id,a.long]),[['magyp',true],['mpob',false]]);
  assert.deepEqual(sourceAlerts(null),[]);
});
