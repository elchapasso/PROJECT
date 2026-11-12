import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkGrid,checkInputs,decodeShare,encodeShare,gridDefaults,impliedBasis,parseDecimal,priceAt,readSimulatorStore,round2,sensitivity,simulate,simulatorDefaults} from '../docs/terminal/cbot-arg-model.mjs';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,actual+' ≠ '+expected);
const base=checkInputs(simulatorDefaults).inputs;

test('the default case reproduces the outputs of the source workbook',()=>{
  const result=simulate(base);
  close(result.fobTarget,1162);
  close(result.requiredCbot,68.85744826097172);
  close(result.price,1215.6641530000002);
  close(result.gap,-34.33584699999983);
  close(result.cbotGap,-1.557448260971725);
  assert.equal(result.signal,'buy');
  assert.equal(result.cargo,null);
});

test('the grid matches the workbook rows, basis columns and status column',()=>{
  const {rows,columns,cells,ladder}=sensitivity(base,gridDefaults);
  assert.deepEqual(rows,[65.86,66.36,66.86,67.36,67.86,68.36,68.86,69.36,69.86,70.36,70.86,71.36,71.86]);
  assert.deepEqual(columns.map(round2),[13.15,14.15,15.15,16.15,17.15,18.15,19.15]);
  close(cells[0][3].price,1183.9175962000002);
  close(cells[0][0].price,1250.0562562);
  close(cells[12][5].price,1272.1024762000002);
  close(ladder[6].price,1250.0562562);
  assert.deepEqual(ladder.map(row=>row.status==='good'),[true,true,true,true,true,true,false,false,false,false,false,false,false]);
});

test('break-even basis and freight bring the price exactly to the target',()=>{
  const result=simulate(base);
  close(priceAt(base,base.cbot,result.requiredBasis),base.target);
  close(priceAt({...base,freight:result.maxFreight},base.cbot),base.target);
  close(priceAt(base,result.requiredCbot),base.target);
  close(impliedBasis(base,result.fob),base.basis);
});

test('the signal follows the required CBOT and the optional watch zone',()=>{
  assert.equal(simulate({...base,cbot:69}).signal,'wait');
  assert.equal(simulate({...base,cbot:69,watch:5}).signal,'watch');
  assert.equal(simulate({...base,cbot:70,watch:5}).signal,'wait');
  assert.equal(simulate({...base,cbot:68.85}).signal,'buy');
});

test('the premium convention gives the same price with the opposite basis sign',()=>{
  const premium={...base,convention:'premium',basis:-base.basis};
  close(simulate(premium).price,simulate(base).price);
  close(simulate(premium).requiredCbot,simulate(base).requiredCbot);
  close(simulate(premium).requiredBasis,-simulate(base).requiredBasis);
});

test('cargo figures use the 60,000 lb contract and the conversion factor',()=>{
  const {cargo,price,gap}=simulate({...base,volume:30000});
  close(cargo.value,price*30000);
  close(cargo.gapValue,gap*30000);
  close(cargo.contracts,30000*2204.622/60000);
  close(cargo.centValue,30000*22.04622);
});

test('inputs accept French decimals and reject values outside their range',()=>{
  assert.equal(parseDecimal('1 250,50'),1250.5);
  assert.equal(parseDecimal('−16,15'),-16.15);
  for(const invalid of ['','abc','1,2,3','1.250,5','Infinity'])assert.equal(parseDecimal(invalid),null);
  assert.deepEqual(checkInputs({...simulatorDefaults,cbot:'0',factor:'-1',volume:''}).invalid,['cbot','factor']);
  assert.equal(checkInputs({...simulatorDefaults,volume:' ',watch:''}).inputs.watch,0);
  assert.equal(round2(1.005),1.01);
  assert.equal(round2(-1.005),-1.01);
  assert.deepEqual(checkGrid({cbotStep:'0.25',cbotSteps:7,display:'gap'}),{...gridDefaults,cbotStep:.25,display:'gap'});
});

test('shared links and local storage restore only valid simulations',()=>{
  const inputs={...base,volume:30000,watch:5,convention:'premium',basis:-16.15};
  assert.deepEqual(decodeShare(encodeShare(inputs,'  Offre   décembre ')),{inputs,name:'Offre décembre'});
  assert.equal(encodeShare(base),'t=1250&f=88&b=16.15&c=67.3');
  assert.equal(decodeShare('t=1250&f=88&b=16.15'),null);
  assert.equal(decodeShare('t=1250&f=88&b=16.15&c=abc'),null);
  const saved={inputs,grid:{center:'current',cbotStep:9},scenarios:[{name:'A',inputs:base},{name:'a',inputs:base},{name:'B',inputs:{...base,cbot:-1}}]};
  assert.deepEqual(readSimulatorStore(JSON.stringify(saved)),{grid:{...gridDefaults,center:'current'},inputs,scenarios:[{name:'A',inputs:base}]});
  assert.deepEqual(readSimulatorStore('corrompu'),{});
});
