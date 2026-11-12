// Simulateur CBOT → huile de soja Argentine, fret inclus.
// Prix ARG fret inclus = ((CBOT − base) × facteur) + fret.

export const simulatorDefaults=Object.freeze({target:1250,freight:88,basis:16.15,cbot:67.3,factor:22.04622,convention:'discount',volume:null,watch:0});
export const gridDefaults=Object.freeze({center:'required',cbotStep:.5,cbotSteps:6,basisStep:1,basisSteps:3,display:'price'});
export const gridChoices=Object.freeze({center:['required','current'],cbotStep:[.1,.25,.5,1],cbotSteps:[4,6,8,10],basisStep:[.25,.5,1,2],basisSteps:[2,3,4],display:['price','gap']});
export const CONTRACT_POUNDS=60000;
export const MAX_SCENARIOS=40;

const rules={
  target:value=>value>0&&value<=1e5,
  freight:value=>Math.abs(value)<=1e4,
  basis:value=>Math.abs(value)<=500,
  cbot:value=>value>0&&value<=1e3,
  factor:value=>value>0&&value<=1e3,
  volume:value=>value>=0&&value<=1e8,
  watch:value=>value>=0&&value<=1e4,
};
const optional={volume:null,watch:0};

export function parseDecimal(raw){
  if(typeof raw==='number')return Number.isFinite(raw)?raw:null;
  if(typeof raw!=='string')return null;
  const text=raw.trim().replace(/\s+/g,'').replace(',','.').replace(/^[−–]/,'-');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)?Number(text):null;
}

const blank=value=>value===null||value===undefined||(typeof value==='string'&&!value.trim());

export function checkInputs(raw){
  const inputs={convention:raw?.convention==='premium'?'premium':'discount'},invalid=[];
  for(const [key,valid] of Object.entries(rules)){
    const value=raw?.[key];
    if(Object.hasOwn(optional,key)&&blank(value)){inputs[key]=optional[key];continue;}
    const number=parseDecimal(value);
    if(number===null||!valid(number))invalid.push(key);
    else inputs[key]=number;
  }
  return {inputs:invalid.length?null:inputs,invalid};
}

// −1 : la base est une décote retranchée du CBOT (classeur d’origine). +1 : la base s’ajoute au CBOT.
const direction=inputs=>inputs.convention==='premium'?1:-1;

export const priceAt=(inputs,cbot,basis=inputs.basis)=>(cbot+direction(inputs)*basis)*inputs.factor+inputs.freight;
export const priceStatus=(inputs,price)=>price<=inputs.target?'good':inputs.watch>0&&price-inputs.target<=inputs.watch?'near':'above';

export function simulate(inputs){
  const {target,freight,basis,cbot,factor,volume}=inputs;
  const sign=direction(inputs);
  const fobTarget=target-freight;
  const requiredCbot=fobTarget/factor-sign*basis;
  const fobCents=cbot+sign*basis;
  const fob=fobCents*factor;
  const price=fob+freight;
  const gap=price-target;
  const status=priceStatus(inputs,price);
  return {
    fobTarget,fobTargetCents:fobTarget/factor,requiredCbot,fobCents,fob,price,gap,
    cbotGap:cbot-requiredCbot,
    requiredBasis:sign*(fobTarget/factor-cbot),
    maxFreight:target-fob,
    signal:cbot<=requiredCbot?'buy':status==='near'?'watch':'wait',
    cargo:volume>0?{value:price*volume,gapValue:gap*volume,contracts:volume*factor*100/CONTRACT_POUNDS,centValue:volume*factor}:null,
  };
}

export const impliedBasis=(inputs,fob)=>direction(inputs)*(fob/inputs.factor-inputs.cbot);

// Arrondi à deux décimales, demi-unités éloignées de zéro comme la fonction ARRONDI d’un tableur.
const shift=(value,places)=>{
  const [mantissa,exponent='0']=value.toPrecision(15).split('e');
  return Number(mantissa+'e'+(Number(exponent)+places));
};
export const round2=value=>Math.sign(value)*shift(Math.round(shift(Math.abs(value),2)),-2);

export const cbotLevels=(center,step,steps)=>Array.from({length:2*steps+1},(_,i)=>round2(center+(i-steps)*step));
export const basisLevels=(basis,step,steps)=>Array.from({length:2*steps+1},(_,i)=>basis+(i-steps)*step);

export function checkGrid(raw){
  return Object.fromEntries(Object.entries(gridChoices).map(([key,choices])=>{
    const value=choices.find(choice=>String(choice)===String(raw?.[key]));
    return [key,value??gridDefaults[key]];
  }));
}

export function sensitivity(inputs,grid=gridDefaults){
  const {requiredCbot}=simulate(inputs);
  const center=grid.center==='current'?inputs.cbot:requiredCbot;
  const rows=cbotLevels(center,grid.cbotStep,grid.cbotSteps);
  const columns=basisLevels(inputs.basis,grid.basisStep,grid.basisSteps);
  const point=(cbot,basis)=>{
    const price=priceAt(inputs,cbot,basis);
    return {price,gap:price-inputs.target,status:priceStatus(inputs,price)};
  };
  return {
    center,rows,columns,
    cells:rows.map(cbot=>columns.map(basis=>point(cbot,basis))),
    ladder:rows.map(cbot=>({cbot,basis:inputs.basis,fob:priceAt(inputs,cbot)-inputs.freight,...point(cbot,inputs.basis)})),
  };
}

export const scenarioName=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,60):'';

const shareKeys={t:'target',f:'freight',b:'basis',c:'cbot',k:'factor',v:'volume',w:'watch'};

export function encodeShare(inputs,name=''){
  const query=new URLSearchParams();
  for(const [short,key] of Object.entries(shareKeys)){
    const value=inputs[key];
    if(value===null||value===undefined)continue;
    if(key==='factor'&&value===simulatorDefaults.factor)continue;
    if((key==='watch'||key==='volume')&&!value)continue;
    query.set(short,String(value));
  }
  if(inputs.convention==='premium')query.set('s','p');
  if(scenarioName(name))query.set('n',scenarioName(name));
  return query.toString();
}

export function decodeShare(query){
  const params=new URLSearchParams(query);
  if(!['t','f','b','c'].every(key=>params.has(key)))return null;
  const raw={...simulatorDefaults,convention:params.get('s')==='p'?'premium':'discount'};
  for(const [short,key] of Object.entries(shareKeys))if(params.has(short))raw[key]=params.get(short);
  const {inputs}=checkInputs(raw);
  return inputs?{inputs,name:scenarioName(params.get('n'))}:null;
}

export function readSimulatorStore(raw){
  let parsed;
  try{parsed=JSON.parse(raw);}catch{return {};}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
  const store={grid:checkGrid(parsed.grid)};
  const {inputs}=checkInputs(parsed.inputs);
  if(inputs)store.inputs=inputs;
  const names=new Set();
  store.scenarios=(Array.isArray(parsed.scenarios)?parsed.scenarios:[]).flatMap(scenario=>{
    const name=scenarioName(scenario?.name),key=name.toLocaleLowerCase('fr');
    const checked=checkInputs(scenario?.inputs).inputs;
    if(!name||names.has(key)||!checked)return [];
    names.add(key);
    return [{name,inputs:checked}];
  }).slice(0,MAX_SCENARIOS);
  return store;
}
