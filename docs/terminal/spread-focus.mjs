// Spreads de référence : BOPO, BOHO et POGO.
// Chaque variante compare deux prix ramenés à la même unité, aux dates communes des deux sources.
import {ZL_USD_PER_TONNE,CENTS_PER_DOLLAR,OIL_LB_PER_GALLON,GASOIL_KG_PER_LITRE,KG_PER_TONNE,spreadLegPoints} from './spread-model.mjs?v=20261110-bopo-fob';

export const LITRES_PER_GALLON=3.785411784;
export const gallonsPerTonne=density=>KG_PER_TONNE/(density*LITRES_PER_GALLON);
const decimal=(n,digits=4)=>String(Number(n.toFixed(digits))).replace('.',',');
const fxLegs=new Set(['usdm']);

const freightInputs=[
  ['soyFreight','Fret et frais · huile de soja (USD/t)',0,500],
  ['palmFreight','Fret et frais · huile de palme (USD/t)',0,500],
];
const freightText=({soyFreight,palmFreight})=>soyFreight||palmFreight?
  ' Fret et frais ajoutés : '+decimal(soyFreight)+' USD/t pour le soja, '+decimal(palmFreight)+' USD/t pour la palme.':'';
const bohoUnits={usdgal:'USD/gal','clb':'¢ US/lb'};
// Huile de soja en ¢ US/lb et gazole en USD/gal, ramenés à l’unité choisie.
const bohoSides=(cents,dieselPerGallon,{unit,lbPerGallon})=>unit==='clb'?
  [cents,dieselPerGallon*CENTS_PER_DOLLAR/lbPerGallon]:[cents*lbPerGallon/CENTS_PER_DOLLAR,dieselPerGallon];

export const focusSpreads=[
  {id:'bopo',code:'BOPO',title:'BOPO · Huile de soja Argentine − huile de palme',legacy:'bopo',
    summary:'Prime de l’huile de soja argentine sur l’huile de palme d’Asie du Sud-Est.',
    unit:()=>'USD/t',digits:()=>1,inputs:freightInputs,defaults:{soyFreight:0,palmFreight:0},
    reading:'Au-dessus de zéro, l’huile de soja coûte plus cher que l’huile de palme. Plus l’écart s’élargit, plus la palme gagne en compétitivité pour les acheteurs, avant droits et différences de qualité. Saisissez un fret pour chaque origine afin de comparer les deux huiles rendues à destination.',
    variants:[
      {id:'belawan',label:'Indonésie · FOB Belawan',grain:'day',legs:['arSoyOil','idPalmFob'],context:'mpob',
        sides:[['Huile de soja · FOB Argentine',(o,p)=>o.arSoyOil+p.soyFreight],['Huile de palme · FOB Belawan',(o,p)=>o.idPalmFob+p.palmFreight]],
        formula:p=>'Huile de soja brute FOB Argentine (USD/t) − huile de palme brute FOB Belawan, Indonésie (USD/t).'+freightText(p),
        note:'Les cotations FOB Belawan proviennent du tableau public IPOSS, qui affiche les derniers jours. L’historique complet exige un compte IPOSS approuvé. La courbe de repère reprend le même calcul avec la palme de Malaisie.'},
      {id:'mpob',label:'Malaisie · CPO MPOB',grain:'day',legs:['arSoyOil','mpobCpo','usdm'],
        sides:[['Huile de soja · FOB Argentine',(o,p)=>o.arSoyOil+p.soyFreight],['Huile de palme · CPO Malaisie',(o,p)=>o.mpobCpo/o.usdm+p.palmFreight]],
        formula:p=>'Huile de soja brute FOB Argentine (USD/t) − CPO Malaisie (MYR/t) ÷ USD/MYR.'+freightText(p),
        note:'La Malaisie sert de repère régional avec un historique quotidien. Le prix MPOB est un prix livré localement et diffère du FOB indonésien.'},
      {id:'imf',label:'À terme · CBOT − Bursa',grain:'month',legs:['imfSoyOil','imfPalmOil'],
        sides:[['Huile de soja · référence FMI',(o,p)=>o.imfSoyOil+p.soyFreight],['Huile de palme · référence FMI',(o,p)=>o.imfPalmOil+p.palmFreight]],
        formula:p=>'Huile de soja, référence FMI (USD/t) − huile de palme, référence FMI (USD/t), en moyennes mensuelles.'+freightText(p),
        note:'Les séries PSOIL et PPOIL du FMI suivent le premier contrat à terme de Chicago pour le soja et de Bursa Malaysia pour la palme.'},
    ]},
  {id:'boho',code:'BOHO',title:'BOHO · Huile de soja CBOT − Heating Oil',legacy:'boho',
    summary:'Coût de l’huile de soja pour un gallon de biodiesel, comparé au gazole de New York.',
    units:bohoUnits,unit:({unit})=>bohoUnits[unit],digits:()=>2,
    inputs:[['lbPerGallon','Huile de soja par gallon (lb/gal)',6,9]],defaults:{unit:'usdgal',lbPerGallon:OIL_LB_PER_GALLON},
    reading:'Au-dessus de zéro, l’huile de soja nécessaire à un gallon de biodiesel coûte plus cher que le gallon de gazole. Une hausse de l’écart pèse sur la marge du biodiesel, avant crédits et subventions.',
    variants:[
      {id:'imf',label:'Mensuel · CBOT − ULSD New York',grain:'month',legs:['imfSoyOil','ulsdNyMonth'],
        sides:[['Huile de soja · CBOT',(o,p)=>bohoSides(o.imfSoyOil/ZL_USD_PER_TONNE,o.ulsdNyMonth,p)[0]],['Gazole · ULSD New York',(o,p)=>bohoSides(o.imfSoyOil/ZL_USD_PER_TONNE,o.ulsdNyMonth,p)[1]]],
        formula:({unit,lbPerGallon})=>unit==='clb'?
          'Huile de soja (USD/t) ÷ '+decimal(ZL_USD_PER_TONNE)+' − ULSD (USD/gal) × '+CENTS_PER_DOLLAR+' ÷ '+decimal(lbPerGallon)+' lb/gal.':
          'Huile de soja (USD/t) ÷ '+decimal(ZL_USD_PER_TONNE)+' × '+decimal(lbPerGallon)+' lb/gal ÷ '+CENTS_PER_DOLLAR+' − ULSD (USD/gal).',
        note:'Le soja est la moyenne mensuelle de la série PSOIL du FMI, qui suit le premier contrat de Chicago. Le gazole est la moyenne mensuelle du prix spot ULSD à New York, produit livrable du contrat Heating Oil du NYMEX. Les règlements quotidiens des deux bourses sont sous licence et restent hors du graphique.'},
    ]},
  {id:'pogo',code:'POGO',title:'POGO · Huile de palme − gazole',legacy:'pogo',
    summary:'Coût de l’huile de palme brute comparé au gazole fossile, par tonne.',
    unit:()=>'USD/t',digits:()=>1,inputs:[['density','Densité du gazole (kg/l)',.8,.9]],defaults:{density:GASOIL_KG_PER_LITRE},
    reading:'Au-dessus de zéro, l’huile de palme coûte plus cher que le gazole : l’incorporation de biodiesel de palme dépend alors des mandats et des subventions. En dessous de zéro, la palme est moins chère que le gazole et l’incorporation volontaire devient rentable.',
    variants:[
      {id:'mpob',label:'Quotidien · CPO Malaisie − ULSD New York',grain:'day',legs:['mpobCpo','usdm','ulsdNy'],
        sides:[['Huile de palme · CPO Malaisie',o=>o.mpobCpo/o.usdm],['Gazole · ULSD New York',(o,p)=>o.ulsdNy*gallonsPerTonne(p.density)]],
        formula:({density})=>'CPO Malaisie (MYR/t) ÷ USD/MYR − ULSD New York (USD/gal) × '+decimal(gallonsPerTonne(density),1)+' gal/t. La conversion retient '+decimal(density,3)+' kg/l.',
        note:'Le gazole est le prix spot ULSD à New York publié par l’EIA. La référence de marché habituelle du POGO, le contrat ICE Low Sulphur Gasoil, est sous licence.'},
      {id:'imf',label:'Mensuel · Bursa − ULSD New York',grain:'month',legs:['imfPalmOil','ulsdNyMonth'],
        sides:[['Huile de palme · référence FMI',o=>o.imfPalmOil],['Gazole · ULSD New York',(o,p)=>o.ulsdNyMonth*gallonsPerTonne(p.density)]],
        formula:({density})=>'Huile de palme, référence FMI (USD/t) − ULSD New York (USD/gal) × '+decimal(gallonsPerTonne(density),1)+' gal/t, en moyennes mensuelles. La conversion retient '+decimal(density,3)+' kg/l.',
        note:'La série PPOIL du FMI suit le premier contrat à terme de Bursa Malaysia. Le gazole est la moyenne mensuelle du prix spot ULSD à New York publié par l’EIA.'},
    ]},
];

export function checkFocusParams(spread,values){
  const params={...spread.defaults};
  if(spread.units&&Object.hasOwn(spread.units,values?.unit))params.unit=values.unit;
  for(const [key,label,min,max] of spread.inputs){
    const value=values?.[key];
    if(typeof value!=='number'||!(value>=min&&value<=max))return {error:{key,label,min,max}};
    params[key]=value;
  }
  return {params};
}

export function focusRows(variant,raw,params,today=new Date().toISOString().slice(0,10)){
  const direct=variant.legs.filter(id=>!fxLegs.has(id));
  const points=Object.fromEntries(direct.map(id=>[id,new Map(spreadLegPoints(id,raw)
    .filter(({date,value})=>date<=today&&Number.isFinite(value)).map(point=>[point.date,point]))]));
  const fx=Object.fromEntries(variant.legs.filter(id=>fxLegs.has(id)).map(id=>[id,spreadLegPoints(id,raw)]));
  const dates=[...points[direct[0]].keys()].filter(date=>direct.every(id=>points[id].has(date))).sort();
  return dates.flatMap(date=>{
    const observations=Object.fromEntries(variant.legs.map(id=>
      [id,fx[id]?fx[id].findLast(point=>point.date<=date):points[id].get(date)]));
    if(Object.values(observations).some(o=>!Number.isFinite(o?.value)))return [];
    const values=Object.fromEntries(Object.entries(observations).map(([id,o])=>[id,o.value]));
    const [a,b]=variant.sides.map(([,side])=>side(values,params));
    return Number.isFinite(a-b)?[{date,a,b,value:a-b,observations}]:[];
  });
}

// Fenêtre glissante en mois, comptée à partir de la dernière observation.
export function focusWindow(rows,months,end=rows.at(-1)?.date){
  if(!months||!rows.length)return rows;
  const start=new Date(Date.UTC(Number(end.slice(0,4)),Number(end.slice(5,7))-1-months,Number(end.slice(8,10))+1));
  const from=start.toISOString().slice(0,10);
  return rows.filter(row=>row.date>=from);
}

// Moyenne mobile sur les `size` dernières observations disponibles.
export function focusAverage(rows,size){
  let sum=0;
  return rows.flatMap((row,i)=>{
    sum+=row.value;
    if(i>=size)sum-=rows[i-size].value;
    return i>=size-1?[{date:row.date,value:sum/size}]:[];
  });
}

export function focusStats(rows){
  if(!rows.length)return null;
  const last=rows.at(-1),previous=rows.at(-2)??null;
  const low=rows.reduce((best,row)=>row.value<best.value?row:best);
  const high=rows.reduce((best,row)=>row.value>best.value?row:best);
  return {
    last,previous,change:previous?last.value-previous.value:null,count:rows.length,
    mean:rows.reduce((sum,row)=>sum+row.value,0)/rows.length,low,high,
    percentile:100*rows.filter(row=>row.value<=last.value).length/rows.length,
  };
}
