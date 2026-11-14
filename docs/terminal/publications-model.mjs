// Rapports & publications : fiche de chaque rapport suivi (dernière publication, chiffres clés, prochaines dates).
// Les dates viennent du calendrier (calendar-feed.json · reports) ; les dernières publications et les chiffres clés
// du même flux (calendar-feed.json · latest), actualisé par GitHub Actions.
import {reportCatalog} from './calendar-model.mjs?v=20261114-calendrier';

const ESMIS='https://esmis.nal.usda.gov/publication/';
export const publicationGroups={all:'Tous',us:'États-Unis',sam:'Amérique du Sud',asia:'Asie',macro:'Devises'};

// kind : type de publication du calendrier ; prefix : identifiant des dates au calendrier.
export const publicationCards=[
  {kind:'wasde',group:'us',frequency:'Mensuel',page:'https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report',archive:ESMIS+'world-agricultural-supply-and-demand-estimates'},
  {kind:'nass-production',group:'us',frequency:'Mensuel',page:ESMIS+'crop-production',archive:'https://www.nass.usda.gov/Publications/Calendar/'},
  {kind:'nass-progress',group:'us',frequency:'Hebdomadaire, d’avril à novembre',page:ESMIS+'crop-progress',archive:'https://www.nass.usda.gov/Publications/Calendar/'},
  {kind:'nass-fats-oils',group:'us',frequency:'Mensuel',page:ESMIS+'fats-and-oils-oilseed-crushings-production-consumption-and-stocks',archive:'https://www.nass.usda.gov/Publications/Calendar/'},
  {kind:'nopa',group:'us',frequency:'Mensuel · données payantes (LSEG)',page:'https://www.nopa.org/resources/nopa-monthly-crush-report/',archive:'https://www.nopa.org/resources/nopa-monthly-crush-report/'},
  {kind:'fas-export-sales',group:'us',frequency:'Hebdomadaire',page:'https://www.fas.usda.gov/programs/export-sales-reporting-program',archive:'https://apps.fas.usda.gov/export-sales/complete.htm'},
  {kind:'usda-inspections',group:'us',frequency:'Hebdomadaire',page:'https://www.ams.usda.gov/mnreports/wa_gr101.txt',archive:ESMIS+'grains-inspected-export-weekly'},
  {kind:'cftc-cot',group:'us',frequency:'Hebdomadaire',page:'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm',archive:'#cot'},
  {kind:'nass-stocks',group:'us',frequency:'Trimestriel',page:ESMIS+'grain-stocks',archive:'https://www.nass.usda.gov/Publications/Calendar/'},
  {kind:'nass-plantings',group:'us',frequency:'Annuel (fin mars)',page:ESMIS+'prospective-plantings',archive:'https://www.nass.usda.gov/Publications/Calendar/'},
  {kind:'nass-acreage',group:'us',frequency:'Annuel (fin juin)',page:ESMIS+'acreage',archive:'https://www.nass.usda.gov/Publications/Calendar/'},
  {kind:'fas-oilseeds',group:'us',frequency:'Mensuel, avec le WASDE',page:'https://www.fas.usda.gov/data/oilseeds-world-markets-and-trade',archive:ESMIS+'oilseeds-world-markets-and-trade'},
  {kind:'conab',group:'sam',frequency:'Mensuel',page:'https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/safra-de-graos/boletim-da-safra-de-graos',archive:'https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/safra-de-graos'},
  {kind:'conab-progress',group:'sam',frequency:'Hebdomadaire (lundi)',page:'https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/progresso-de-safra',archive:'https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/progresso-de-safra'},
  {kind:'anec',group:'sam',frequency:'Hebdomadaire',page:'https://anec.com.br/',archive:'https://anec.com.br/'},
  {kind:'bcba',group:'sam',frequency:'Hebdomadaire (jeudi)',page:'https://www.bolsadecereales.com/estimaciones-informes',archive:'https://www.bolsadecereales.com/estimaciones-informes'},
  {kind:'mpob',group:'asia',frequency:'Mensuel (vers le 10)',page:'https://bepi.mpob.gov.my/',archive:'https://bepi.mpob.gov.my/'},
  {kind:'sea',group:'asia',frequency:'Mensuel (vers le milieu du mois)',page:'https://seaofindia.com/category/statistical-update/import-of-vegetable-oil/',archive:'https://seaofindia.com/category/statistical-update/import-of-vegetable-oil/'},
  {kind:'forex',group:'macro',frequency:'Annonces de la semaine',page:'https://www.forexfactory.com/calendar',archive:'https://www.forexfactory.com/calendar'},
];

// Fiches hors catalogue du calendrier : COT de la CFTC et annonces Forex Factory.
const extraSpecs={
  'cftc-cot':{title:'CFTC · Commitments of Traders',source:'CFTC',importance:2,
    expected:'Positions des fonds, des opérateurs physiques et des swaps sur l’huile et les graines de soja du CBOT, arrêtées le mardi.'},
  forex:{title:'Forex Factory · Annonces macroéconomiques',source:'Forex Factory',importance:2,
    expected:'Annonces à impact fort et moyen sur le dollar, l’euro et le yuan : inflation, emploi, banques centrales.'},
};
export const cardSpec=kind=>reportCatalog[kind]??extraSpecs[kind];

// Dates du calendrier propres à une fiche.
export function cardRows(rows,kind){
  if(kind==='cftc-cot')return rows.filter(r=>r.id.startsWith('cftc-cot-'));
  if(kind==='forex')return rows.filter(r=>r.source==='Forex Factory'&&r.importance>=2);
  return rows.filter(r=>r.id.startsWith('pub-'+kind+'-'));
}
// Instant comparable d’une entrée du calendrier (date et heure de Casablanca).
const stamp=r=>r.date+'T'+(r.time||'00:00');
export function nextDates(rows,kind,now,count=3){
  return cardRows(rows,kind).filter(r=>r.date&&stamp(r)>=now).sort((a,b)=>stamp(a).localeCompare(stamp(b))).slice(0,count);
}
// Dernière publication : lue sur la source quand elle l’est, sinon dernière date passée du calendrier.
export function latestFor(kind,latest,rows,now){
  const read=latest?.[kind];
  if(read?.date)return {...read,read:true};
  const past=cardRows(rows,kind).filter(r=>r.date&&stamp(r)<now).sort((a,b)=>stamp(b).localeCompare(stamp(a)))[0];
  return past?{date:past.date,title:'',url:past.url,documents:[],figures:[],read:false,usual:past.dateStatus==='usual'}:null;
}

// Décimales d’affichage selon l’unité de la source.
const unitDigits={'%':0,kt:0,'M bu':0,'M lb':0,contrats:0,'¢/lb':2,Mt:1,'M short tons':2,'Md lb':2,'bu/acre':1,'M acres':1};
// Petites quantités (moins de 100 kt) : une décimale.
export const figureDigits=(unit,value)=>unit==='kt'&&Math.abs(value)<100?1:unitDigits[unit]??1;
