import {test} from 'node:test';
import assert from 'node:assert/strict';
import {soyBalances} from '../docs/terminal/balance-data.mjs';
import {calculateBalance,normalizeCampaignLabel,parseBalanceVolume,readBalanceScenarios} from '../docs/terminal/balance-model.mjs';

test('each reference balance includes every campaign and the supplied comparisons',()=>{
  assert.equal(Object.keys(soyBalances).length,6);
  for(const balance of Object.values(soyBalances)){
    assert.equal(balance.periods.length,5);
    for(const values of Object.values(balance.rows))assert.equal(values.length,5+balance.comparisons.length);
    for(const campaign of Object.values(balance.campaigns))assert.ok(calculateBalance(balance.product,campaign.inputs));
  }
  assert.equal(soyBalances['soy-arg'].rows.exports.at(-1),'7.35');
});

test('soybean and soybean oil calculations use different demand components',()=>{
  const beans=soyBalances['soy-us'].campaigns['2026/27-11'].inputs;
  const oil=soyBalances['sbo-us'].campaigns['2026/27-11'].inputs;
  const expected=[['soy',beans,133.73,125.57,8.16],['sbo',oil,15.92,15.15,.77]];
  for(const [product,inputs,supply,use,ending] of expected){
    const result=calculateBalance(product,inputs);
    for(const [key,value] of Object.entries({supply,use,ending,ratio:ending/use*100}))assert.ok(Math.abs(result[key]-value)<1e-9);
    const increaseImports=calculateBalance(product,{...inputs,imports:inputs.imports+1});
    assert.ok(Math.abs(increaseImports.ending-ending-1)<1e-9);
  }
  assert.ok(calculateBalance('sbo',{...oil,bio:30}).ending<0);
  assert.equal(calculateBalance('sbo',{...oil,bio:0,hi:0,exports:0}).ratio,null);
});

test('input validation and storage preserve an independent personal baseline',()=>{
  assert.equal(parseBalanceVolume('1 234,50'),1234.5);
  for(const invalid of ['', '-1','5%','4,5.5','Infinity'])assert.equal(parseBalanceVolume(invalid),null);
  assert.equal(normalizeCampaignLabel('28/29'),'2028/29');
  assert.equal(normalizeCampaignLabel('2028/30'),null);
  const reference=soyBalances['soy-us'].campaigns['2026/27-11'].inputs;
  const inputs={...reference,production:130};
  const saved={'soy-us':{'2028/29':{label:'2028/29',inputs,reference},'corrompu':{label:3,inputs}}};
  assert.deepEqual(readBalanceScenarios(JSON.stringify(saved)),{'soy-us':{'2028/29':{label:'2028/29',inputs,reference}}});
});
