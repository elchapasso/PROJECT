import {test} from 'node:test';
import assert from 'node:assert/strict';
import {focusMargins,usCrushSides,BUSHELS_PER_TONNE} from '../docs/terminal/margin-focus.mjs';
import {focusRows,checkFocusParams,focusInputs,focusParts,focusSpreads} from '../docs/terminal/spread-focus.mjs';
import {spreadPrices} from '../docs/terminal/spread-prices.mjs';

const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<tolerance,actual+' ≠ '+expected);
const card=id=>focusMargins.find(item=>item.id===id);
const variant=(id,name)=>card(id).variants.find(item=>item.id===name);
const value=(key,date)=>spreadPrices[key].find(([d])=>d===date)?.[1];
const today='2026-11-12';

test('US board crush: 44 lb of meal and 11 lb of oil per 60 lb bushel, in USD/bu or USD/t',()=>{
  close(BUSHELS_PER_TONNE,36.7437,1e-4);
  const p={unit:'usdbu',oilLb:11,mealLb:44,cost:0};
  const [products,beans]=usCrushSides(1100,320,50,p);
  close(products,320*.022+5.5);
  close(beans,11);
  close(products-beans,1.54);
  const [pt,bt]=usCrushSides(1100,320,50,{...p,unit:'usdt'});
  close(pt-bt,1.54*BUSHELS_PER_TONNE);
  const [,withCost]=usCrushSides(1100,320,50,{...p,cost:.5});
  close(withCost,11.5);
});

test('US daily crush uses the three CBOT closes of the same session',()=>{
  const {defaults}=card('usCrush');
  const rows=focusRows(variant('usCrush','daily'),spreadPrices,defaults,today);
  const date=rows.at(-1).date;
  const [zs,zm,zl]=['zs','zm','zl'].map(key=>value(key,date));
  close(rows.at(-1).value,zm*44/2000+zl*11/100-zs/100);
  assert.ok(rows.length>400);
});

test('US monthly crush runs from January 2015 to the current month',()=>{
  const {defaults}=card('usCrush');
  const rows=focusRows(variant('usCrush','monthly'),spreadPrices,defaults,today);
  assert.equal(rows[0].date,'2015-01-01');
  close(rows[0].value,338.115*44/2000+32.186*11/100-1002.45/100);
  assert.equal(rows.at(-1).date,'2026-11-01');
  assert.ok(rows.at(-1).observations.zsM.partial);
  for(const key of ['zsMonth','zmMonth'])assert.equal(spreadPrices[key].length,120,key);
});

test('Argentine crush, FOB and net of export duties, per tonne of seed',()=>{
  const soy=card('arSoyCrush');
  const fob=focusRows(variant('arSoyCrush','fob'),spreadPrices,soy.defaults,today);
  const last=fob.at(-1);
  const [oil,meal,seed]=['arSoyOil','arSoyMeal','arSoySeed'].map(key=>value(key,last.date));
  close(last.value,.19*oil+.78*meal-seed);
  const net=focusRows(variant('arSoyCrush','net'),spreadPrices,soy.defaults,today).at(-1);
  close(net.value,.19*oil*(1-.225)+.78*meal*(1-.225)-seed*(1-.24));
  const withCost=focusRows(variant('arSoyCrush','net'),spreadPrices,{...soy.defaults,cost:25},today).at(-1);
  close(withCost.value,net.value-25);
  const sun=card('arSunCrush');
  const s=focusRows(variant('arSunCrush','net'),spreadPrices,sun.defaults,today).at(-1);
  const [so,sm,ss]=['arSunOil','arSunMeal','arSunSeed'].map(key=>value(key,s.date));
  close(s.value,(.44*so+.39*sm)*(1-.045)-ss*(1-.045));
});

test('parameters are validated, and the FOB version hides the duty inputs',()=>{
  const soy=card('arSoyCrush');
  assert.deepEqual(focusInputs(soy,variant('arSoyCrush','fob')).map(([key])=>key),['oilYield','mealYield','cost']);
  assert.deepEqual(focusInputs(soy,variant('arSoyCrush','net')).map(([key])=>key),['oilYield','mealYield','cost','dexSeed','dexOil','dexMeal']);
  assert.ok(checkFocusParams(soy,{...soy.defaults,oilYield:.23,mealYield:.85}).error.message);
  assert.equal(checkFocusParams(soy,{...soy.defaults,dexSeed:60}).error.key,'dexSeed');
  assert.deepEqual(checkFocusParams(soy,soy.defaults).params,soy.defaults);
  const us=card('usCrush');
  assert.deepEqual(checkFocusParams(us,{...us.defaults,unit:'usdt'}).params.unit,'usdt');
});

test('les composantes de chaque fiche se somment en spread ou en marge', () => {
  const today='2026-11-13';
  for(const card of [...focusSpreads,...focusMargins])for(const option of card.variants){
    for(const params of [card.defaults,{...card.defaults,...(card.units?{unit:Object.keys(card.units).at(-1)}:{})}]){
      const parts=focusParts(option,params),row=focusRows(option,spreadPrices,params,today).at(-1);
      assert.ok(row,card.id+' '+option.id);
      assert.deepEqual(Object.keys(row.parts),parts.map(part=>part.role));
      const total=parts.reduce((sum,part)=>sum+part.sign*row.parts[part.role],0)-(params.cost?(params.unit==='usdt'?params.cost*BUSHELS_PER_TONNE:params.cost):0);
      assert.ok(Math.abs(total-row.value)<1e-9,card.id+' '+option.id+' '+total+' '+row.value);
      for(const part of parts)assert.ok(part.legs.every(id=>option.legs.includes(id)),card.id+' '+part.role);
    }
  }
});

test('les composantes gardent leur rôle d’une variante à l’autre', () => {
  for(const card of [...focusSpreads,...focusMargins]){
    const roles=card.variants.map(option=>focusParts(option,card.defaults).map(part=>part.role).join());
    assert.equal(new Set(roles).size,1,card.id);
  }
  const cost=focusMargins.find(card=>card.id==='usCrush');
  const option=cost.variants[0],params={...cost.defaults,cost:.5};
  const row=focusRows(option,spreadPrices,params,'2026-11-13').at(-1);
  const total=focusParts(option,params).reduce((sum,part)=>sum+part.sign*row.parts[part.role],0);
  assert.ok(Math.abs(total-.5-row.value)<1e-9);
});
