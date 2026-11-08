
import {AS_OF,scoreWeights,scoreCategories,labels,products,origins,metrics,periodTypes,seedPrices} from './data.js';

export const emptyStore=()=>({events:[],balances:[],quotes:[],calendar:[],reports:[]});
export const byDate=(a,b)=>b.date.localeCompare(a.date);
export const unique=(rows,key)=>[...new Map(rows.map(r=>[key(r),r])).values()];
export const eventKey=r=>[r.product,r.origin,r.period,r.date,r.title.trim().toLocaleLowerCase('fr')].join('|');
export const balanceKey=r=>[r.product,r.origin,r.metric,r.periodType,r.period,r.date,r.unit,r.source,r.variant].join('|');
export const quoteKey=r=>[r.series,r.period].join('|');
export const pct=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b!==0?(a/b-1)*100:null;
export const addDays=(s,n)=>new Date(Date.parse(s+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export const monthShift=(s,n)=>{const [y,m]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7);};
export const dateISO=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().startsWith(s);
export const validPeriod=(v,g)=>g==='campaign'?/^\d{4}\/\d{2}$/.test(v):g==='year'?/^\d{4}$/.test(v):g==='month'?/^\d{4}-(0[1-9]|1[0-2])$/.test(v):dateISO(v);
export const previousPeriod=(s,g,n=1)=>g==='campaign'?(Number(s.slice(0,4))-n)+'/'+String((Number(s.slice(0,4))-n+1)%100).padStart(2,'0'):g==='year'?String(Number(s)-n):g==='month'?monthShift(s,-n):addDays(s,-7*n);
export const stamp=(now,days)=>!days?'':addDays(now,1-Number(days));
export function allows(row,filters,now,cap={}){
  return (!filters.product||row.product===filters.product) && (!filters.origin||row.origin===filters.origin)
    && (!filters.source||row.source===filters.source) && (!filters.status||!cap.status||row.status===filters.status)
    && (!filters.impact||!cap.impact||row.impact===filters.impact) && (!filters.horizon||!cap.horizon||row.horizon===filters.horizon)
    && (!filters.period||!cap.period||row.date>=stamp(now,filters.period)&&row.date<=now);
}
export function sentiment(rows,now,days=30){
  const buckets=Object.fromEntries(Object.keys(scoreWeights).map(k=>[k,[]]));
  const start=stamp(now,days);
  for(const e of rows){
    const bucket=buckets[scoreCategories[e.category]||e.category];
    if(!bucket||e.date<start||e.date>now||!['confirmed','estimate','projection','consensus'].includes(e.status))continue;
    const confidence={confirmed:1,estimate:.55,projection:.55,consensus:.45}[e.status];
    const direction={positive:1,negative:-1,mixed:0,neutral:0}[e.impact];
    bucket.push(direction*(e.intensity/3)*confidence);
  }
  const contributions=Object.entries(buckets).map(([key,values])=>({key,count:values.length,value:values.length?scoreWeights[key]*values.reduce((a,b)=>a+b,0)/values.length:0}));
  const count=contributions.reduce((a,b)=>a+b.count,0);
  const raw=contributions.reduce((a,b)=>a+b.value,0);
  const score=count?Math.round(raw):null;
  return {score,count,coverage:contributions.filter(c=>c.count).length,contributions,orientation:score===null?'pending':score>=12?'positive':score<=-12?'negative':Math.abs(score)<=3?'neutral':'mixed'};
}
export function align(a,b){
  return Object.keys(a.values).filter(d=>Number.isFinite(b.values[d])&&Number.isFinite(a.values[d])).sort().map(date=>({date,a:a.values[date],b:b.values[date]}));
}
export function corrReturns(rows){
  const changes=rows.slice(1).flatMap((r,i)=>{
    const p=rows[i];const a=pct(r.a,p.a),b=pct(r.b,p.b);return a===null||b===null?[]:[[a,b]];
  });
  if(changes.length<3)return {r:null,n:changes.length};
  const n=changes.length;
  const mx=changes.reduce((s,p)=>s+p[0],0)/n,my=changes.reduce((s,p)=>s+p[1],0)/n;
  const variance=changes.reduce((s,[a,b])=>[s[0]+(a-mx)*(b-my),s[1]+(a-mx)**2,s[2]+(b-my)**2],[0,0,0]);
  return {r:variance[1]&&variance[2]?Math.max(-1,Math.min(1,variance[0]/Math.sqrt(variance[1]*variance[2]))):null,n};
}
export function balancesWithRatios(rows){
  const endings=rows.filter(r=>r.metric==='ending'&&r.periodType==='campaign');
  const same=(a,b)=>a.origin===b.origin&&a.product===b.product&&a.period===b.period&&a.date===b.date&&a.source===b.source&&a.unit===b.unit&&a.variant===b.variant;
  const ratios=endings.flatMap(r=>{
    const usage=rows.find(x=>x.metric==='domestic'&&same(r,x));
    const exports=rows.find(x=>x.metric==='exports'&&same(r,x));
    const denominator=usage ? r.origin==='world' ? usage.value : exports ? usage.value+exports.value : 0 : 0;
    return denominator>0?[{...r,id:r.id+'-ratio',metric:'ratio',unit:'%',value:100*r.value/denominator}]:[];
  });
  return unique([...ratios,...rows],balanceKey);
}
export const safeURL=value=>{
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}
};
const isText=(v,max=6000)=>typeof v==='string'&&v.length<=max;
const filled=(v,max)=>isText(v,max)&&v.trim().length>0;
const validId=r=>filled(r.id,240);
const sourceValid=r=>filled(r.source,120)&&!!safeURL(r.url);
const scopeValid=r=>Object.hasOwn(products,r.product)&&Object.hasOwn(origins,r.origin);
const statusValid=r=>Object.hasOwn(labels.status,r.status);
export const validEvent=r=>r&&validId(r)&&scopeValid(r)&&sourceValid(r)&&statusValid(r)&&dateISO(r.date)
  && Object.hasOwn(labels.category,r.category)&&Object.hasOwn(labels.impact,r.impact)&&Object.hasOwn(labels.horizon,r.horizon)
  && [1,2,3].includes(r.intensity)&&['title','summary','period','number','variation','transmission','caveat'].every(k=>filled(r[k]))&&isText(r.time??'',120);
export const validBalance=r=>r&&validId(r)&&scopeValid(r)&&sourceValid(r)&&statusValid(r)&&dateISO(r.date)&&Object.hasOwn(metrics,r.metric)
  && Object.hasOwn(periodTypes,r.periodType)&&validPeriod(r.period,r.periodType)&&filled(r.unit,40)&&Number.isFinite(r.value)&&r.value>=0
  && ['official','consensus','estimate'].includes(r.variant);
export const validQuote=r=>r&&Object.hasOwn(seedPrices,r.series)&&validPeriod(r.period,seedPrices[r.series].grain)&&Number.isFinite(r.value)
  && r.value>0&&sourceValid(r)&&isText(r.note??'',260);
export const validCalendar=r=>r&&validId(r)&&scopeValid(r)&&sourceValid(r)&&(!r.date||dateISO(r.date))
  && [1,2,3].includes(r.importance)&&['title','expected','previous','consensus','impact'].every(k=>filled(r[k]))
  && ['time','zone','short'].every(k=>isText(r[k]??'',120));
export const validReport=r=>r&&validId(r)&&dateISO(r.start)&&dateISO(r.end)&&r.end>=r.start&&['weekly','monthly'].includes(r.kind)&&filled(r.title,220)&&isText(r.text,60000);
export function parseStore(raw){
  const data=typeof raw==='string'?JSON.parse(raw):raw;
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Format JSON non reconnu.');
  const validation={events:validEvent,balances:validBalance,quotes:validQuote,calendar:validCalendar,reports:validReport};
  const clean=emptyStore();
  for(const [key,validate] of Object.entries(validation)){
    if(data[key]===undefined)continue;
    if(!Array.isArray(data[key])||data[key].length>5000||!data[key].every(validate))throw new Error('Éléments invalides dans '+key+'.');
    clean[key]=data[key];
  }
  if(!Object.keys(validation).some(k=>Object.hasOwn(data,k)))throw new Error('Aucun registre reconnu.');
  return clean;
}
export function referenceDate(events){
  return events.reduce((date,row)=>row.date>date?row.date:date,AS_OF);
}

