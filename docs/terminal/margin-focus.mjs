// Marges de trituration : soja aux États-Unis (contrats CBOT relevés sur TradingView) et soja et tournesol en Argentine
// (prix FOB officiels du Secrétariat de l’Agriculture). Même structure que les spreads de spread-focus.mjs :
// chaque variante compare la valeur des coproduits au coût des graines, aux dates communes des prix.
import {CENTS_PER_DOLLAR,LB_PER_SHORT_TON,BEAN_LB_PER_BUSHEL,KG_PER_TONNE,defaultYields} from './spread-model.mjs?v=20261113-marges';

const KG_PER_LB=.45359237;
export const BUSHELS_PER_TONNE=KG_PER_TONNE/(BEAN_LB_PER_BUSHEL*KG_PER_LB);
const decimal=(n,digits=4)=>String(Number(n.toFixed(digits))).replace('.',',');
const percent=n=>decimal(n,2)+' %';

/* ---------- États-Unis · board crush ---------- */
const usUnits={usdbu:'USD/bu',usdt:'USD/t de graines'};
// Valeurs en USD par boisseau de 60 lb : tourteau en USD/short ton, huile en ¢ US/lb, graines en ¢ US/bu.
export function usCrushSides(zs,zm,zl,{unit,oilLb,mealLb,cost}){
  const scale=unit==='usdt'?BUSHELS_PER_TONNE:1;
  return [(zm*mealLb/LB_PER_SHORT_TON+zl*oilLb/CENTS_PER_DOLLAR)*scale,(zs/CENTS_PER_DOLLAR+cost)*scale];
}
const usFormula=(prefix,{unit,oilLb,mealLb,cost})=>prefix+'ZM (USD/short ton) × '+decimal(mealLb)+' lb ÷ 2\u00a0000'+
  ' + ZL (¢ US/lb) × '+decimal(oilLb)+' lb ÷ '+CENTS_PER_DOLLAR+' − ZS (¢ US/bu) ÷ '+CENTS_PER_DOLLAR+(cost?' − '+decimal(cost)+' USD/bu de coût de trituration':'')+
  (unit==='usdt'?', le tout × '+decimal(BUSHELS_PER_TONNE,3)+' bu/t pour exprimer la marge par tonne de graines.':', en USD par boisseau de '+BEAN_LB_PER_BUSHEL+' lb.');
const usSides=legs=>[
  ['Huile et tourteau · CBOT',(o,p)=>usCrushSides(o[legs[0]],o[legs[1]],o[legs[2]],p)[0]],
  ['Graines de soja · CBOT',(o,p)=>usCrushSides(o[legs[0]],o[legs[1]],o[legs[2]],p)[1]],
];
// Composantes du board crush dans l’unité choisie : huile et tourteau tirés d’un boisseau, prix du boisseau.
const usParts=([seed,meal,oil])=>({unit,oilLb,mealLb})=>{
  const scale=unit==='usdt'?BUSHELS_PER_TONNE:1;
  return [
    {role:'oil',short:'Huile de soja',label:'Huile de soja · '+decimal(oilLb)+' lb par boisseau',sign:1,legs:[oil],value:o=>o[oil]*oilLb/CENTS_PER_DOLLAR*scale},
    {role:'meal',short:'Tourteau de soja',label:'Tourteau de soja · '+decimal(mealLb)+' lb par boisseau',sign:1,legs:[meal],value:o=>o[meal]*mealLb/LB_PER_SHORT_TON*scale},
    {role:'seed',short:'Graines de soja',label:'Graines de soja · prix '+(unit==='usdt'?'de la tonne':'du boisseau'),sign:-1,legs:[seed],value:o=>o[seed]/CENTS_PER_DOLLAR*scale},
  ];
};
const rollNote='La première échéance continue associe chaque jour le contrat le plus proche de chaque produit : en octobre et novembre, le soja de novembre face à l’huile et au tourteau de décembre, comme dans le board crush usuel. Les séries changent de contrat à l’échéance, sans ajustement : un saut peut apparaître ces jours-là.';

/* ---------- Argentine · prix FOB officiels ---------- */
const argSides=(oil,meal,seed,net)=>[
  ['Huile et tourteau · FOB'+(net?' net de droits':''),(o,p)=>p.oilYield*o[oil]*(net?1-p.dexOil/100:1)+p.mealYield*o[meal]*(net?1-p.dexMeal/100:1)],
  ['Graines · FOB'+(net?' net de droits':''),(o,p)=>o[seed]*(net?1-p.dexSeed/100:1)+p.cost],
];
// Composantes argentines par tonne de graines : produits pondérés par leur rendement, graines au prix FOB.
const argParts=([oilName,mealName,seedName],oil,meal,seed,net)=>p=>[
  {role:'oil',short:oilName,label:oilName+' · '+decimal(p.oilYield)+' t par t de graines'+(net?', net de droits':''),sign:1,legs:[oil],
    value:o=>p.oilYield*o[oil]*(net?1-p.dexOil/100:1)},
  {role:'meal',short:mealName,label:mealName+' · '+decimal(p.mealYield)+' t par t de graines'+(net?', net de droits':''),sign:1,legs:[meal],
    value:o=>p.mealYield*o[meal]*(net?1-p.dexMeal/100:1)},
  {role:'seed',short:seedName,label:seedName+' · prix de la tonne'+(net?', net de droits':''),sign:-1,legs:[seed],
    value:o=>o[seed]*(net?1-p.dexSeed/100:1)},
];
const soyNames=['Huile de soja','Tourteau de soja','Graines de soja'],sunNames=['Huile de tournesol','Pellets de tournesol','Graines de tournesol'];
const argFormula=(names,net)=>({oilYield,mealYield,cost,dexOil,dexMeal,dexSeed})=>
  decimal(oilYield)+' t d’huile × '+names[0]+' FOB'+(net?' × (1 − '+percent(dexOil)+')':'')+
  ' + '+decimal(mealYield)+' t de '+names[1]+' × '+names[1]+' FOB'+(net?' × (1 − '+percent(dexMeal)+')':'')+
  ' − graines FOB'+(net?' × (1 − '+percent(dexSeed)+')':'')+(cost?' − '+decimal(cost)+' USD/t de coût de trituration et frais':'')+', par tonne de graines (USD/t).';
// Taux par défaut : droits d’exportation en vigueur depuis le Décret 877/2025 (Boletín Oficial du 12/12/2025),
// maintenus pour 2026 par le Décret 423/2026, qui prévoit une baisse mensuelle à partir de janvier 2027.
export const ARG_DUTIES_UNTIL='2026-12-31';
const dutyNote=(rates,today=new Date().toISOString().slice(0,10))=>
  'Les droits par défaut ('+rates+') sont ceux en vigueur depuis le Décret 877/2025 (12/12/2025), maintenus en 2026 par le Décret 423/2026. Ils s’appliquent à toute la période affichée et restent modifiables.'+
  (today>ARG_DUTIES_UNTIL?' Attention : le Décret 423/2026 réduit ces taux chaque mois depuis janvier 2027 ; saisissez le taux du mois.':' Le Décret 423/2026 les réduira chaque mois à partir de janvier 2027.');
const argNote='Prix FOB officiels publiés chaque jour ouvré par le Secrétariat de l’Agriculture (MAGyP), base de calcul des droits d’exportation. Chaque prix retient la position d’embarquement qui couvre le mois de la cotation ; un jour sans prix unique pour l’un des trois produits est écarté. Actualisation automatique chaque soir.';
const yieldInputs=(oil,meal)=>[
  ['oilYield','Rendement en huile (t par t de graines)',...oil],
  ['mealYield','Rendement en '+meal[2]+' (t par t de graines)',meal[0],meal[1]],
  ['cost','Coût de trituration et frais (USD/t de graines)',0,150],
];
const dutyInputs=label=>[
  ['dexSeed','Droit d’exportation · graines (%)',0,50],
  ['dexOil','Droit d’exportation · huile (%)',0,50],
  ['dexMeal','Droit d’exportation · '+label+' (%)',0,50],
];

export const focusMargins=[
  {id:'usCrush',code:'Board crush',valueLabel:'Dernière marge',title:'Board crush · Soja aux États-Unis',
    summary:'Valeur de l’huile et du tourteau tirés d’un boisseau de soja, moins le prix du boisseau, sur les contrats du CBOT.',
    units:usUnits,unit:({unit})=>usUnits[unit],digits:({unit})=>unit==='usdt'?1:3,
    inputs:[['oilLb','Huile par boisseau (lb)',9,13],['mealLb','Tourteau par boisseau (lb)',40,48],['cost','Coût de trituration (USD/bu)',0,3]],
    defaults:{unit:'usdbu',oilLb:11,mealLb:44,cost:0},
    reading:'Au-dessus de zéro, l’huile et le tourteau valent plus que les graines : la trituration couvre le prix du soja, avant coûts si aucun coût n’est saisi. Une marge qui se resserre freine la trituration américaine ; une marge élevée l’encourage et pèse sur les prix de l’huile et du tourteau.',
    variants:[
      {id:'daily',label:'Quotidien · première échéance',grain:'day',legs:['zs','zm','zl'],sides:usSides(['zs','zm','zl']),parts:usParts(['zs','zm','zl']),
        formula:p=>usFormula('',p),
        note:'Clôtures quotidiennes des contrats continus CBOT:ZS1!, CBOT:ZM1! et CBOT:ZL1!, relevées sur TradingView chaque matin et contrôlées par somme de contrôle. '+rollNote},
      {id:'monthly',label:'Mensuel · depuis 2015',grain:'month',legs:['zsM','zmM','zlM'],sides:usSides(['zsM','zmM','zlM']),parts:usParts(['zsM','zmM','zlM']),
        formula:p=>usFormula('Moyennes mensuelles : ',p),
        note:'Moyennes mensuelles des clôtures quotidiennes de CBOT:ZS1!, CBOT:ZM1! et CBOT:ZL1!. Jusqu’en décembre 2024, moyennes calculées par TradingView et vérifiées par somme de contrôle ; depuis janvier 2025, moyennes des clôtures quotidiennes de la version quotidienne. Le mois en cours est une moyenne partielle, actualisée chaque jour.'},
    ]},
  {id:'arSoyCrush',code:'Trituration soja AR',valueLabel:'Dernière marge',title:'Trituration du soja · Argentine',
    summary:'Valeur FOB de l’huile et du tourteau tirés d’une tonne de soja, moins le prix FOB de la tonne de graines.',
    unit:()=>'USD/t de graines',digits:()=>1,
    inputs:[...yieldInputs([.15,.23],[.7,.85,'tourteau']),...dutyInputs('tourteau')],
    defaults:{...defaultYields.arSoy,cost:0,dexSeed:24,dexOil:22.5,dexMeal:22.5},
    reading:'Au-dessus de zéro, l’huile et le tourteau valent plus que les graines. La version nette de droits approche la marge d’un triturateur argentin, qui achète les graines sur le marché intérieur et exporte l’huile et le tourteau : l’écart entre le droit sur les graines et celui sur les produits pèse directement sur sa marge.',
    variants:[
      {id:'fob',label:'FOB · avant droits',grain:'day',legs:['arSoyOil','arSoyMeal','arSoySeed'],sides:argSides('arSoyOil','arSoyMeal','arSoySeed',false),parts:argParts(soyNames,'arSoyOil','arSoyMeal','arSoySeed',false),
        inputs:yieldInputs([.15,.23],[.7,.85,'tourteau']),formula:argFormula(['huile de soja','tourteau'],false),note:argNote},
      {id:'net',label:'Net des droits d’exportation',grain:'day',legs:['arSoyOil','arSoyMeal','arSoySeed'],sides:argSides('arSoyOil','arSoyMeal','arSoySeed',true),parts:argParts(soyNames,'arSoyOil','arSoyMeal','arSoySeed',true),
        formula:argFormula(['huile de soja','tourteau'],true),note:argNote+' '+dutyNote('graines 24 %, huile et tourteau 22,5 %')},
    ]},
  {id:'arSunCrush',code:'Trituration tournesol AR',valueLabel:'Dernière marge',title:'Trituration du tournesol · Argentine',
    summary:'Valeur FOB de l’huile et des pellets tirés d’une tonne de tournesol, moins le prix FOB de la tonne de graines.',
    unit:()=>'USD/t de graines',digits:()=>1,
    inputs:[...yieldInputs([.35,.5],[.3,.5,'pellets']),...dutyInputs('pellets')],
    defaults:{...defaultYields.arSun,cost:0,dexSeed:4.5,dexOil:4.5,dexMeal:4.5},
    reading:'Au-dessus de zéro, l’huile et les pellets valent plus que les graines. Le tournesol argentin est surtout exporté sous forme d’huile : la marge indique la capacité de paiement des triturateurs face aux exportations de graines.',
    variants:[
      {id:'fob',label:'FOB · avant droits',grain:'day',legs:['arSunOil','arSunMeal','arSunSeed'],sides:argSides('arSunOil','arSunMeal','arSunSeed',false),parts:argParts(sunNames,'arSunOil','arSunMeal','arSunSeed',false),
        inputs:yieldInputs([.35,.5],[.3,.5,'pellets']),formula:argFormula(['huile de tournesol','pellets'],false),note:argNote},
      {id:'net',label:'Net des droits d’exportation',grain:'day',legs:['arSunOil','arSunMeal','arSunSeed'],sides:argSides('arSunOil','arSunMeal','arSunSeed',true),parts:argParts(sunNames,'arSunOil','arSunMeal','arSunSeed',true),
        formula:argFormula(['huile de tournesol','pellets'],true),
        note:argNote+' '+dutyNote('4,5 % pour les graines et l’huile en vrac')+' Le taux des pellets (position 2306.30) est fixé par défaut au même niveau ; vérifiez-le selon la position tarifaire.'},
    ]},
];
