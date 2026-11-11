import {soyBalances,supplyFields,useFields} from './balance-data.mjs?v=20261111';

export const balanceInputFields=product=>[...supplyFields,...useFields[product]];
const isVolume=value=>Number.isFinite(value)&&value>=0&&value<=1e9;
const decimal=value=>value.trim().replace(/[\s\u202f]+/g,'').replace(',','.').replace(/^−/,'-');

export function parseBalanceVolume(value){
  const normalized=decimal(value);
  const number=/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)?Number(normalized):NaN;
  return isVolume(number)?number:null;
}

export function calculateBalance(product,inputs){
  if(!balanceInputFields(product).every(key=>isVolume(inputs[key])))return null;
  const sum=fields=>fields.reduce((total,key)=>total+inputs[key],0);
  const supply=sum(supplyFields),use=sum(useFields[product]);
  const stockDifference=supply-use;
  const ending=Math.abs(stockDifference)<1e-9?0:stockDifference;
  return {supply,use,ending,ratio:use>0?ending/use*100:null};
}

export function applyBalanceShock(product,inputs,field,raw,unit){
  if(!balanceInputFields(product).includes(field)||!calculateBalance(product,inputs))return null;
  const normalized=decimal(raw);
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)||!['MT','%'].includes(unit))return null;
  const change=Number(normalized);
  const value=inputs[field]+(unit==='%'?inputs[field]*change/100:change);
  return isVolume(value)?{...inputs,[field]:Number(value.toFixed(8))}:null;
}

export function balanceContributions(product,inputs,reference){
  return balanceInputFields(product).map(field=>({field,value:(inputs[field]-reference[field])*(supplyFields.includes(field)?1:-1)}));
}

export const scenarioName=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,60):'';

const campaignPattern=/^20\d{2}\/\d{2}$/;
export function normalizeCampaignLabel(raw){
  if(typeof raw!=='string')return null;
  const label=raw.trim().replace(/\s+/g,'').replace(/^(\d{2})\//,'20$1/');
  return campaignPattern.test(label)&&Number(label.slice(5))===(Number(label.slice(0,4))+1)%100?label:null;
}

export function readBalanceScenarios(raw){
  let parsed;
  try{parsed=JSON.parse(raw);}catch{return {};}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
  const scenarios={};
  for(const [id,balance] of Object.entries(soyBalances)){
    const group=parsed[id];
    if(!group||typeof group!=='object'||Array.isArray(group))continue;
    const keys=balanceInputFields(balance.product);
    scenarios[id]=Object.fromEntries(Object.entries(group).flatMap(([key,scenario])=>{
      const base=balance.campaigns[key];
      if(!scenario||typeof scenario!=='object'||!scenario.inputs)return [];
      if(!base&&key!==normalizeCampaignLabel(scenario.label||''))return [];
      if(!keys.every(field=>isVolume(scenario.inputs[field])))return [];
      const inputs=Object.fromEntries(keys.map(field=>[field,scenario.inputs[field]]));
      const savedReference=keys.every(field=>isVolume(scenario.reference?.[field]))?
        Object.fromEntries(keys.map(field=>[field,scenario.reference[field]])):inputs;
      const names=new Set();
      const variants=Array.isArray(scenario.variants)?scenario.variants.flatMap(variant=>{
        const name=scenarioName(variant?.name);
        const normalized=name.toLocaleLowerCase('fr');
        if(!name||names.has(normalized)||!keys.every(field=>isVolume(variant.inputs?.[field])))return [];
        names.add(normalized);
        return [{name,inputs:Object.fromEntries(keys.map(field=>[field,variant.inputs[field]]))}];
      }):[];
      return [[key,{label:base?.label||key,inputs,reference:base?.inputs||savedReference,...(variants.length?{variants}:{})}]];
    }));
  }
  return scenarios;
}
