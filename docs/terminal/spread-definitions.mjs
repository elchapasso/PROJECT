import {
  defaultYields,defaultCredits,ZL_USD_PER_TONNE,CENTS_PER_DOLLAR,OIL_LB_PER_GALLON,
  BEAN_LB_PER_BUSHEL,PERCENT_SCALE,LITRES_PER_CUBIC_METRE,MEAL_LB_PER_BUSHEL,OIL_LB_PER_BUSHEL,LB_PER_SHORT_TON,MEAL_SHORT_TON_PER_BUSHEL,OIL_DOLLARS_PER_BUSHEL,
  MEAL_CENTS_PER_BUSHEL,D4_PER_GALLON,GASOIL_KG_PER_LITRE,SOYOIL_KG_PER_LITRE,KG_PER_TONNE,
  HIP_CONVERSION_USD_PER_TONNE,HIP_BIODIESEL_KG_PER_CUBIC_METRE,
} from './spread-model.mjs';

const decimal=n=>String(n).replace('.',',');
const tv='https://www.tradingview.com/symbols/';
const ecb='https://data-api.ecb.europa.eu/service/data/EXR/D.';
export const eurUsdSource=ecb+'USD.EUR.SP00.A';
const ar='https://www.argentina.gob.ar/economia/agricultura/datos-abiertos';
const arAPI='https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php?Fecha=';
const commission='https://agridata.ec.europa.eu/extensions/DashboardCereals/OilseedPrices.html';
const future=(source,symbol,unit,description)=>({
  source,url:tv+encodeURIComponent(symbol.replace(':','-'))+'/',unit,symbol,
  description:description+' · '+symbol+' · règlement quotidien, première échéance continue',
  missing:'Droits de publication des règlements historiques à confirmer. Le MCP TradingView est réservé à un usage personnel et exclut la republication de ses séries.',
});
const arg=(description)=>({source:'Secretaría de Agricultura · MAGyP',url:ar,unit:'USD/t',description,observationUrl:date=>arAPI+encodeURIComponent(date.split('-').reverse().join('/'))});
const rapeseed=description=>({source:'Commission européenne · Agri-food Data Portal',url:commission,unit:'EUR/t',description,
  missing:'Série quotidienne de prix physiques avec une base comparable non vérifiée.'});
const blackSea=description=>({source:'Prix FOB mer Noire · source à confirmer',unit:'USD/t',description,
  missing:'Historique public comparable et redistribuable non vérifié.'});
export const spreadLegs={
  zl:future('CBOT · CME Group','CBOT:ZL1!','¢ US/lb','Huile de soja'),
  zm:future('CBOT · CME Group','CBOT:ZM1!','USD/short ton','Tourteau de soja'),
  zs:future('CBOT · CME Group','CBOT:ZS1!','¢ US/bu','Graines de soja'),
  fcpo:future('Bursa Malaysia Derivatives','MYX:FCPO1!','MYR/t','Huile de palme brute'),
  gasoil:future('ICE Futures Europe','ICEEUR:ULS1!','USD/t','Low Sulphur Gasoil'),
  ho:future('NYMEX · CME Group','NYMEX:HO1!','USD/gal','NY Harbor ULSD'),
  usdm:{source:'BCE · EXR',url:ecb+'MYR.EUR.SP00.A',unit:'MYR/USD',description:'EUR/MYR ÷ EUR/USD, fixings BCE du même jour. Dernier fixing commun si absent ce jour.',fx:['eurMyr','eurUsd']},
  usdi:{source:'BCE · EXR',url:ecb+'IDR.EUR.SP00.A',unit:'IDR/USD',description:'EUR/IDR ÷ EUR/USD, fixings BCE du même jour. Dernier fixing commun si absent ce jour.',fx:['eurIdr','eurUsd']},
  arSoyOil:arg('Huile de soja brute en vrac · position 15071000100Q'),
  arSoyMeal:arg('Pellets et farine d’extraction de soja · position 23040010100B'),
  arSoySeed:arg('Graines de soja en vrac · position 12019000190C'),
  arSunOil:arg('Huile de tournesol brute en vrac · position 15121110310E'),
  arSunMeal:arg('Pellets de tournesol d’extraction · position 23063010310V'),
  arSunSeed:arg('Graines de tournesol industrielles en vrac · position 12060090910Y'),
  d4:{source:'US EPA · Renewable Fuel Standard',url:'https://www.epa.gov/fuels-registration-reporting-and-compliance-help/rin-trades-and-price-information',
    unit:'USD/RIN',description:'D4 séparés · moyenne hebdomadaire pondérée par les volumes selon la date de transfert.',
  },
  hip:{source:'ESDM · Ditjen EBTKE',url:'https://ebtke.esdm.go.id/',unit:'Rp/l',
    description:'HIP BBN biodiesel en vigueur le mois indiqué · prix officiel de base hors fret.'},
  b100:{source:'ANP · Brésil',url:'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-de-produtores-e-importadores-de-derivados-de-petroleo-e-biodiesel',
    unit:'R$/l',description:'B100 · prix producteur moyen national pondéré par semaine, hors ICMS.'},
  cepea:{source:'CEPEA / ESALQ',url:'https://www.cepea.org.br/',unit:'R$/t',
    description:'Huile de soja brute dégommée (CEPEA) · São Paulo, 12 % d’ICMS inclus.',
    missing:'Historique de la cotation exacte et droit de redistribution non vérifiés.'},
  euOil:rapeseed('Huile de colza · prix physique sur la même base géographique que les graines et le tourteau.'),
  euMeal:rapeseed('Tourteau de colza · prix physique sur la même base géographique.'),
  euSeed:rapeseed('Graines de colza · prix physique sur la même base géographique.'),
  bsOil:blackSea('Huile brute de tournesol · FOB sur une origine commune en mer Noire.'),
  bsMeal:blackSea('Pellets de tournesol · FOB sur une origine commune en mer Noire.'),
  bsSeed:blackSea('Graines de tournesol · FOB sur une origine commune en mer Noire.'),
};
const oilYield=['oilYield','Rendement en huile (t/t)'];
const mealYield=['mealYield','Rendement en tourteau ou pellets (t/t)'];
const crushFormula=(unit,byproduct='tourteau')=>({oilYield,mealYield})=>
  'Huile ('+unit+') × '+decimal(oilYield)+' t/t + '+byproduct+' ('+unit+') × '+decimal(mealYield)+' t/t − graines ('+unit+').';
const arNote='Historique partiel lorsque l’API ne renvoie pas de bulletin vérifiable. Le calcul emploie les prix FOB officiels argentins des trois produits à la même date et pour une fenêtre couvrant le mois de cotation. Il s’agit d’un indicateur brut avant droits à l’exportation, coûts de transformation et logistique.';
export const spreadMetrics=[
  {id:'bopo',title:'BOPO · Soja contre palme',unit:'USD/t',legs:['zl','fcpo','usdm'],
    formula:()=>`ZL (¢ US/lb) × ${decimal(ZL_USD_PER_TONNE)} USD/t par ¢ US/lb − FCPO (MYR/t) ÷ USD/MYR (MYR/USD).`,
    reading:'Mesure la prime de l’huile de soja américaine sur l’huile de palme brute malaisienne. Au-dessus de zéro, le soja est plus cher par tonne. Plus l’écart augmente, plus la palme gagne en compétitivité relative sur ces références, avant fret, taxes et différences de qualité.'},
  {id:'pogo',title:'POGO · Palme contre gazole',unit:'USD/t',legs:['fcpo','usdm','gasoil'],
    formula:()=> 'FCPO (MYR/t) ÷ USD/MYR (MYR/USD) − ICE Gasoil (USD/t).',
    reading:'Compare le coût de l’huile de palme brute au prix du gazole fossile. Au-dessus de zéro, la palme coûte plus cher par tonne que le gazole. Une hausse de l’écart pèse sur l’économie du biodiesel, à aides constantes.'},
  {id:'boho',title:'BOHO · Soja contre ULSD',unit:'USD/gal',legs:['zl','ho'],
    formula:()=>`ZL (¢ US/lb) × ${decimal(OIL_LB_PER_GALLON)} lb/gal ÷ ${CENTS_PER_DOLLAR} ¢ US/USD − HO (USD/gal). ${decimal(OIL_LB_PER_GALLON)} lb d’huile par gallon est une convention.`,
    reading:'Compare un coût théorique d’huile de soja par gallon au contrat NY Harbor ULSD. Un spread positif indique que la quantité d’huile retenue coûte plus cher que le gallon d’ULSD. Un spread négatif indique l’inverse, avant crédits et autres coûts.'},
  {id:'boardCrush',title:'Board crush · Soja US',unit:'USD/bu',legs:['zm','zl','zs'],
    formula:()=>`ZM (USD/short ton) × ${decimal(MEAL_SHORT_TON_PER_BUSHEL)} short ton/bu + ZL (¢ US/lb) × ${decimal(OIL_DOLLARS_PER_BUSHEL)} − ZS (¢ US/bu) ÷ ${CENTS_PER_DOLLAR}. Pour 1 bu de ${BEAN_LB_PER_BUSHEL} lb, le calcul retient ${MEAL_LB_PER_BUSHEL} lb de tourteau ÷ ${LB_PER_SHORT_TON} lb/short ton et ${OIL_LB_PER_BUSHEL} lb d’huile ÷ ${CENTS_PER_DOLLAR} ¢ US/USD.`,
    reading:'Mesure la valeur théorique de l’huile et du tourteau moins le coût des graines sur le CBOT. Au-dessus de zéro, la valeur théorique des coproduits couvre le coût des graines à terme. Les coûts de transformation et les écarts de prix physiques restent à déduire.'},
  {id:'oilShare',title:'Part de l’huile · Soja US',unit:'%',legs:['zl','zm'],
    formula:()=>`[ZL (¢ US/lb) × ${OIL_LB_PER_BUSHEL} lb/bu] ÷ [ZL × ${OIL_LB_PER_BUSHEL} + ZM (USD/short ton) × ${decimal(MEAL_CENTS_PER_BUSHEL)}] × ${PERCENT_SCALE}. Le facteur ${decimal(MEAL_CENTS_PER_BUSHEL)} convertit ZM en ¢ US/bu avec ${MEAL_LB_PER_BUSHEL} lb/bu, ${LB_PER_SHORT_TON} lb/short ton et ${CENTS_PER_DOLLAR} ¢ US/USD.`,
    reading:'Indique la contribution de l’huile à la valeur totale de l’huile et du tourteau issus d’un boisseau de soja. À 50 %, l’huile et le tourteau contribuent à parts égales. Une hausse indique que l’huile gagne du poids dans la valeur des coproduits.'},
  {id:'arSoy',title:'Trituration brute du soja · Argentine',unit:'USD/t de graines',legs:['arSoyOil','arSoyMeal','arSoySeed'],
    formula:crushFormula('USD/t'),reading:'Mesure la valeur des coproduits de soja par tonne de graines, diminuée du prix FOB des graines. Au-dessus de zéro, les coproduits couvrent le prix des graines avant frais et droits. En dessous, leur valeur est inférieure au coût des graines.',
    note:arNote,inputs:[oilYield,mealYield],defaults:defaultYields.arSoy},
  {id:'arSun',title:'Trituration brute du tournesol · Argentine',unit:'USD/t de graines',legs:['arSunOil','arSunMeal','arSunSeed'],
    formula:crushFormula('USD/t','pellets'),reading:'Mesure la valeur de l’huile et des pellets de tournesol par tonne de graines, diminuée du prix FOB des graines. Au-dessus de zéro, les coproduits couvrent le prix des graines avant frais et droits. En dessous, leur valeur est inférieure au coût des graines.',
    note:arNote,inputs:[oilYield,mealYield],defaults:defaultYields.arSun},
  {id:'usBio',title:'Marge brute biodiesel · États-Unis',unit:'USD/gal',legs:['ho','d4','zl'],grain:'week',periodLeg:'d4',
    formula:()=>`HO (USD/gal) + ${decimal(D4_PER_GALLON)} RIN/gal × D4 (USD/RIN) − ${decimal(OIL_LB_PER_GALLON)} lb/gal × ZL (¢ US/lb) ÷ ${CENTS_PER_DOLLAR} + 45Z + LCFS − coût d’exploitation (tous trois en USD/gal).`,
    reading:'Compare la valeur de l’ULSD et des crédits au coût théorique de l’huile de soja. Au-dessus de zéro, les recettes retenues couvrent les coûts saisis. La marge évolue avec les crédits et le coût d’exploitation renseignés.',
    note:'Le calcul retient le dernier jour de règlement commun à HO et ZL dans la semaine D4 (lundi à dimanche). Les trois ajustements saisis s’appliquent à toute la courbe et valent zéro par défaut.',
    inputs:[['credit45z','Crédit 45Z (USD/gal)'],['lcfs','Crédit LCFS (USD/gal)'],['operating','Coût d’exploitation (USD/gal)']],defaults:defaultCredits},
  {id:'idBio',title:'Écart biodiesel / gazole · Indonésie',unit:'Rp/l',legs:['hip','gasoil','usdi'],grain:'month',periodLeg:'hip',
    formula:()=>`HIP BBN (Rp/l) − ICE Gasoil (USD/t) × ${decimal(GASOIL_KG_PER_LITRE)} kg/l ÷ ${KG_PER_TONNE} kg/t × USD/IDR (Rp/USD). HIP officiel = [moyenne KPB CPO (Rp/kg) + ${HIP_CONVERSION_USD_PER_TONNE} USD/t × change officiel (Rp/USD) ÷ ${KG_PER_TONNE} kg/t] × ${HIP_BIODIESEL_KG_PER_CUBIC_METRE} kg/m³ ÷ ${LITRES_PER_CUBIC_METRE} l/m³ + fret (Rp/l).`,
    reading:'Compare le prix de base officiel du biodiesel à un équivalent en roupies du gazole ICE. Un écart positif élevé indique une prime plus forte du biodiesel sur ce proxy de la référence diesel indonésienne.',
    note:'Le HIP de base publié exclut le fret. Le calcul mensuel retient le dernier règlement ICE disponible dans le mois et le fixing BCE correspondant.'},
  {id:'brBio',title:'Écart biodiesel / huile de soja · Brésil',unit:'R$/l',legs:['b100','cepea'],grain:'week',periodLeg:'b100',
    formula:()=>`B100 ANP (R$/l) − huile de soja CEPEA (R$/t) × ${decimal(SOYOIL_KG_PER_LITRE)} kg/l ÷ ${KG_PER_TONNE} kg/t.`,
    reading:'Compare le prix producteur du B100 au coût de l’huile de soja par litre équivalent. Au-dessus de zéro, le prix du B100 dépasse le coût d’huile retenu par litre. Les deux prix ont des bases fiscales différentes.',
    note:'Le prix CEPEA inclut 12 % d’ICMS, tandis que le prix ANP exclut l’ICMS. La comparaison retient la dernière cotation CEPEA de la semaine ANP.'},
  {id:'euRape',title:'Trituration brute du colza · Union européenne',unit:'EUR/t de graines',legs:['euOil','euMeal','euSeed'],
    formula:crushFormula('EUR/t'),reading:'Compare la valeur des coproduits du colza au prix des graines sur une base physique commune. Une hausse indique une meilleure valorisation brute des coproduits.',
    note:'Les trois références doivent partager une base géographique et une fréquence comparables. Le contrat Euronext ECO (EUR/t) ne remplace pas à lui seul un prix physique sur cette base.',inputs:[oilYield,mealYield],defaults:defaultYields.euRape},
  {id:'blackSeaSun',title:'Trituration brute du tournesol · Mer Noire',unit:'USD/t de graines',legs:['bsOil','bsMeal','bsSeed'],
    formula:crushFormula('USD/t','pellets'),reading:'Mesure la valeur FOB des coproduits du tournesol moins le prix FOB des graines d’une même origine. Au-dessus de zéro, les coproduits couvrent le prix des graines avant frais et droits. En dessous, leur valeur est inférieure au coût des graines.',
    note:'Les rendements initiaux reprennent les hypothèses utilisées pour le tournesol argentin. Le calcul suppose trois prix FOB comparables et exclut les coûts de transformation.',inputs:[oilYield,mealYield],defaults:defaultYields.blackSeaSun},
].map(metric=>({grain:'day',...metric}));
