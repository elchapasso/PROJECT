import test from 'node:test';
import assert from 'node:assert/strict';
import {formulas,spreadRows} from '../docs/terminal/spread-model.mjs';
import {spreadMetrics} from '../docs/terminal/spread-definitions.mjs';

const metric=id=>spreadMetrics.find(row=>row.id===id);
const round=(v,n=2)=>Number(v.toFixed(n));

test('reference values for the five futures metrics',()=>{
  const soy={zl:62.26,zm:319.2,zs:1193.75,ho:4.33};
  const palm={zl:61.98,fcpo:4253,usdm:4.054,gasoil:1248.75};
  assert.equal(round(formulas.boardCrush(soy)),1.93);
  assert.equal(round(formulas.oilShare(soy),1),49.4);
  assert.equal(round(formulas.boho(soy)),.34);
  assert.equal(round(formulas.bopo(palm),0),317);
  assert.equal(round(formulas.pogo(palm),0),-200);
});

test('physical BOPO compares FOB prices in USD/t on the same day',()=>{
  const rows=spreadRows(metric('bopoPhysical'),{
    arSoyOil:[['2026-11-04',1185],['2026-11-06',1185]],
    idPalmFob:[['2026-11-04',1150],['2026-11-05',1130],['2026-11-06',1110],['2026-11-10',1090]],
  },undefined,'2026-11-10');
  assert.deepEqual(rows.map(({date,value})=>[date,value]),[['2026-11-04',35],['2026-11-06',75]]);
});

test('gross physical crush and editable yields',()=>{
  assert.equal(formulas.arSoy({arSoyOil:1000,arSoyMeal:300,arSoySeed:400}),24);
  assert.equal(formulas.arSoy({arSoyOil:1000,arSoyMeal:300,arSoySeed:400},{oilYield:.2,mealYield:.75}),25);
  assert.equal(formulas.arSun({arSunOil:1000,arSunMeal:200,arSunSeed:480}),38);
  assert.equal(formulas.euRape({euOil:1000,euMeal:300,euSeed:500}),91);
  assert.equal(formulas.blackSeaSun({bsOil:1000,bsMeal:200,bsSeed:480}),38);
});

test('biodiesel margins, native densities and credit/cost sign',()=>{
  assert.equal(round(formulas.usBio({ho:3,d4:1,zl:50})),.75);
  assert.equal(round(formulas.usBio({ho:3,d4:1,zl:50},{credit45z:.5,lcfs:.25,operating:.4})),1.10);
  assert.equal(formulas.idBio({hip:14000,gasoil:1000,usdi:16000}),480);
  assert.equal(round(formulas.brBio({b100:5,cepea:4800}),3),.776);
});

test('only prices on common dates, with the last common FX fixing',()=>{
  const raw={
    zl:[['2025-01-02',60],['2025-01-03',61],['2025-01-06',62],['2025-01-07',63]],
    fcpo:[['2025-01-02',4000],['2025-01-04',4001],['2025-01-06',4002]],
    eurUsd:[['2025-01-03',1.1],['2025-01-06',1.2],['2025-01-07',1.3]],
    eurMyr:[['2025-01-03',4.4],['2025-01-07',5.2]],
  };
  const rows=spreadRows(metric('bopo'),raw,undefined,'2025-01-07');
  assert.equal(rows.length,1);
  assert.equal(rows[0].date,'2025-01-06');
  assert.deepEqual(rows[0].observations.usdm,{date:'2025-01-03',value:4});
  assert.deepEqual(spreadRows(metric('pogo'),raw),[]);
});

test('weekly alignment never rolls a non-FX price into another week',()=>{
  const rows=spreadRows(metric('usBio'),{
    ho:[['2025-01-02',3],['2025-01-03',3.1],['2025-01-10',4]],
    zl:[['2025-01-02',50],['2025-01-06',55]],
    d4:[['2025-01-05',1],['2025-01-12',1]],
  });
  assert.deepEqual(rows.map(r=>[r.date,r.value,r.observations.ho.date]),[['2025-01-05',.75,'2025-01-02']]);
});

test('monthly alignment uses an observed gasoil price and FX in the same period',()=>{
  const rows=spreadRows(metric('idBio'),{
    hip:[['2025-01-01',14000,'https://example.org/hip'],['2025-02-01',14100]],
    gasoil:[['2025-01-10',990],['2025-01-30',1000],['2025-02-10',1100]],
    eurUsd:[['2025-01-29',1],['2025-01-30',1]],
    eurIdr:[['2025-01-29',16001],['2025-01-30',16000]],
  },undefined,'2025-02-01');
  assert.equal(rows.length,1);
  assert.equal(rows[0].value,480);
  assert.equal(rows[0].observations.gasoil.date,'2025-01-30');
  assert.equal(rows[0].observations.hip.url,'https://example.org/hip');
});
