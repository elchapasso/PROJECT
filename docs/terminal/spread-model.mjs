export const START_DATE='2025-01-01';
export const CENTS_PER_DOLLAR=100;
export const PERCENT_SCALE=100;
export const ZL_USD_PER_TONNE=22.0462;
export const OIL_LB_PER_GALLON=7.5;
export const BEAN_LB_PER_BUSHEL=60;
export const MEAL_LB_PER_BUSHEL=44;
export const OIL_LB_PER_BUSHEL=11;
export const LB_PER_SHORT_TON=2000;
export const MEAL_SHORT_TON_PER_BUSHEL=MEAL_LB_PER_BUSHEL/LB_PER_SHORT_TON;
export const OIL_DOLLARS_PER_BUSHEL=OIL_LB_PER_BUSHEL/CENTS_PER_DOLLAR;
export const MEAL_CENTS_PER_BUSHEL=MEAL_SHORT_TON_PER_BUSHEL*CENTS_PER_DOLLAR;
export const D4_PER_GALLON=1.5;
export const GASOIL_KG_PER_LITRE=.845;
export const SOYOIL_KG_PER_LITRE=.88;
export const KG_PER_TONNE=1000;
export const LITRES_PER_CUBIC_METRE=1000;
export const HIP_CONVERSION_USD_PER_TONNE=85;
export const HIP_BIODIESEL_KG_PER_CUBIC_METRE=870;

export const defaultYields={
  arSoy:{oilYield:.19,mealYield:.78},
  arSun:{oilYield:.44,mealYield:.39},
  euRape:{oilYield:.42,mealYield:.57},
  blackSeaSun:{oilYield:.44,mealYield:.39},
};
export const defaultCredits={credit45z:0,lcfs:0,operating:0};

const crush=(oil,meal,seed,{oilYield,mealYield})=>oil*oilYield+meal*mealYield-seed;
export const formulas={
  bopo:({zl,fcpo,usdm})=>zl*ZL_USD_PER_TONNE-fcpo/usdm,
  bopoPhysical:({arSoyOil,idPalmFob})=>arSoyOil-idPalmFob,
  pogo:({fcpo,usdm,gasoil})=>fcpo/usdm-gasoil,
  boho:({zl,ho})=>zl*OIL_LB_PER_GALLON/CENTS_PER_DOLLAR-ho,
  boardCrush:({zm,zl,zs})=>zm*MEAL_SHORT_TON_PER_BUSHEL+zl*OIL_DOLLARS_PER_BUSHEL-zs/CENTS_PER_DOLLAR,
  oilShare:({zl,zm})=>zl*OIL_LB_PER_BUSHEL/(zl*OIL_LB_PER_BUSHEL+zm*MEAL_CENTS_PER_BUSHEL)*PERCENT_SCALE,
  arSoy:({arSoyOil,arSoyMeal,arSoySeed},p=defaultYields.arSoy)=>crush(arSoyOil,arSoyMeal,arSoySeed,p),
  arSun:({arSunOil,arSunMeal,arSunSeed},p=defaultYields.arSun)=>crush(arSunOil,arSunMeal,arSunSeed,p),
  usBio:({ho,d4,zl},{credit45z,lcfs,operating}=defaultCredits)=>
    ho+D4_PER_GALLON*d4-OIL_LB_PER_GALLON*zl/CENTS_PER_DOLLAR+credit45z+lcfs-operating,
  idBio:({hip,gasoil,usdi})=>hip-gasoil*GASOIL_KG_PER_LITRE/KG_PER_TONNE*usdi,
  brBio:({b100,cepea})=>b100-cepea*SOYOIL_KG_PER_LITRE/KG_PER_TONNE,
  euRape:({euOil,euMeal,euSeed},p=defaultYields.euRape)=>crush(euOil,euMeal,euSeed,p),
  blackSeaSun:({bsOil,bsMeal,bsSeed},p=defaultYields.blackSeaSun)=>crush(bsOil,bsMeal,bsSeed,p),
};

const usdCross={usdm:'eurMyr',usdi:'eurIdr'};
const dayMs=86400000;
const iso=ms=>new Date(ms).toISOString().slice(0,10);
function weekKey(date){
  const ms=Date.parse(date);
  const weekday=new Date(ms).getUTCDay();
  return iso(ms-((weekday+6)%7)*dayMs);
}
// Moyennes mensuelles des contrats à terme continus. Jusqu’en décembre 2024 : moyennes calculées par TradingView
// (scripts/pine/olea_monthly*.pine), copiées et vérifiées par sommes de contrôle. Ensuite : moyenne des clôtures
// quotidiennes du site, mois en cours compris (point marqué partial). La palme est convertie au change du jour.
export const monthlyLegs={
  zlM:{daily:'zl',history:'zlMonth'},
  fcpoUsdM:{daily:'fcpo',history:'fcpoUsdMonth',fx:'usdm'},
  hoM:{daily:'ho',history:'hoMonth'},
  gasoilM:{daily:'gasoil',history:'gasoilMonth'},
  zsM:{daily:'zs',history:'zsMonth'},
  zmM:{daily:'zm',history:'zmMonth'},
};
function monthlyPoints(id,raw,today){
  const {daily,history,fx}=monthlyLegs[id];
  const rates=fx?spreadLegPoints(fx,raw):null;
  const months=new Map();
  let r=-1;
  for(const point of spreadLegPoints(daily,raw)){
    if(point.date>today||!Number.isFinite(point.value))continue;
    let value=point.value;
    if(rates){
      while(r+1<rates.length&&rates[r+1].date<=point.date)r++;
      if(!(rates[r]?.value>0))continue;
      value/=rates[r].value;
    }
    const key=point.date.slice(0,7),month=months.get(key)??{sum:0,sessions:0,last:point.date};
    month.sum+=value;
    month.sessions++;
    month.last=point.date;
    months.set(key,month);
  }
  const keys=[...months.keys()].sort();
  const stored=(raw[history]||[]).filter(([date])=>!keys.length||date.slice(0,7)<keys[0]).map(([date,value])=>({date,value,stored:true}));
  return [...stored,...keys.map(key=>{
    const {sum,sessions,last}=months.get(key);
    return {date:key+'-01',value:sum/sessions,sessions,last,partial:key>=today.slice(0,7)};
  })];
}

export function spreadLegPoints(id,raw,today=new Date().toISOString().slice(0,10)){
  if(Object.hasOwn(monthlyLegs,id))return monthlyPoints(id,raw,today);
  if(!Object.hasOwn(usdCross,id))return (raw[id]||[]).map(([date,value,url])=>({date,value,url}));
  const cross=new Map(raw[usdCross[id]]||[]);
  return (raw.eurUsd||[]).flatMap(([date,value])=>{
    const foreign=cross.get(date);
    return value>0&&foreign>0?[{date,value:foreign/value}]:[];
  });
}

export function spreadRows(metric,raw,parameters,today=new Date().toISOString().slice(0,10)){
  const legs=metric.legs.filter(id=>!Object.hasOwn(usdCross,id));
  const byLeg=Object.fromEntries(legs.map(id=>[id,new Map(spreadLegPoints(id,raw).filter(({date,value})=>
    date>=START_DATE&&date<=today&&Number.isFinite(value)).map(point=>[point.date,point]))]));
  if(legs.some(id=>!byLeg[id].size))return [];
  const periodKey=metric.grain==='week'?weekKey:date=>date.slice(0,7);
  const dailyLegs=legs.filter(id=>id!==metric.periodLeg);
  const anchor=dailyLegs[0]||metric.periodLeg;
  const commonDates=[...byLeg[anchor].keys()].filter(date=>dailyLegs.every(id=>byLeg[id].has(date))).sort();
  const lastByPeriod=new Map(commonDates.map(date=>[periodKey(date),date]));
  const publishedDates=metric.periodLeg?[...byLeg[metric.periodLeg].keys()].sort():commonDates;
  const fx=Object.fromEntries(metric.legs.filter(id=>Object.hasOwn(usdCross,id)).map(id=>
    [id,spreadLegPoints(id,raw)]));
  return publishedDates.flatMap(periodDate=>{
    const quoteDate=metric.periodLeg?lastByPeriod.get(periodKey(periodDate)):periodDate;
    if(!quoteDate)return [];
    const observations=Object.fromEntries(metric.legs.map(id=>{
      if(fx[id])return [id,fx[id].findLast(({date})=>date<=quoteDate)];
      const date=id===metric.periodLeg?periodDate:quoteDate;
      return [id,byLeg[id].get(date)];
    }));
    if(Object.values(observations).some(o=>!Number.isFinite(o?.value)))return [];
    const value=formulas[metric.id](Object.fromEntries(Object.entries(observations).map(([id,o])=>[id,o.value])),parameters);
    return Number.isFinite(value)?[{date:periodDate,value,observations}]:[];
  });
}
