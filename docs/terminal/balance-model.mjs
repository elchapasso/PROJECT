import {soyBalances,supplyFields,useFields} from './balance-data.mjs?v=20261111';

export const balanceInputFields=product=>[...supplyFields,...useFields[product]];
const isVolume=value=>Number.isFinite(value)&&value>=0&&value<=1e9;

export function parseBalanceVolume(value){
  const decimal=value.trim().replace(/\s+/g,'').replace(',','.');
  const number=/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(decimal)?Number(decimal):NaN;
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
      return [[key,{label:base?.label||key,inputs,reference:base?.inputs||savedReference}]];
    }));
  }
  return scenarios;
}
