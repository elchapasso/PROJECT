// Calendrier des publications : conversion du flux calendar-feed.json (Forex Factory et rapports agricoles)
// en entrées du calendrier, à l’heure de Casablanca, avec un lien vers la page officielle de chaque publication.
export const CASABLANCA='Africa/Casablanca';
export const FOREX_CALENDAR_URL='https://www.forexfactory.com/calendar';

// Niveau de certitude de la date, repris dans les listes et la fiche détaillée.
export const dateStatusLabels={
  official:'Date officielle',
  rule:'Date selon la règle de publication de la source',
  usual:'Date habituelle, sans calendrier officiel',
};

const cities={ET:'New York',MYT:'Kuala Lumpur',BRT:'Brasília'};
const sales='Un écart au rythme attendu modifie la perception de la demande à l’exportation et peut faire réagir les contrats à terme.';
const usSupply='Une surprise sur la production, les surfaces ou les stocks américains modifie l’offre de graines et le coût de la trituration.';
// Publications suivies : titre, marché, importance (1 à 3) et lecture.
// period : 'release' (mois de publication), 'data' (mois des données) ou 'text' (libellé fourni par la source).
export const reportCatalog={
  wasde:{title:'USDA · WASDE',short:'WASDE',source:'USDA WASDE',city:'ET',product:'sbo',origin:'us',importance:3,period:'release',
    expected:'Bilans mondiaux et américains : production, trituration, commerce et stocks de soja, d’huiles et de tourteaux.',
    impact:'Une révision des stocks finaux ou de l’usage de l’huile de soja en biocarburants peut déplacer tout le complexe des huiles.'},
  'fas-oilseeds':{title:'USDA FAS · Oilseeds: World Markets and Trade',short:'FAS · Oléagineux',source:'USDA FAS',city:'ET',product:'sbo',origin:'world',importance:2,period:'release',
    expected:'Production et commerce mondiaux des graines, huiles et tourteaux (soja, palme, tournesol, colza), publiés avec le WASDE.',
    impact:'Les révisions des flux mondiaux d’huiles orientent les écarts entre origines et les primes FOB.'},
  'nass-progress':{title:'USDA NASS · Crop Progress',short:'Crop Progress',source:'USDA NASS',city:'ET',product:'soy',origin:'us',importance:2,
    expected:'Avancement des semis et des récoltes, stade et état des cultures américaines.',
    impact:'Une dégradation de l’état des cultures soutient les prix ; une récolte rapide accélère l’offre disponible.'},
  'nass-production':{title:'USDA NASS · Crop Production',short:'Crop Production',source:'USDA NASS',city:'ET',product:'soy',origin:'us',importance:3,period:'text',
    expected:'Estimation des rendements, des surfaces récoltées et de la production américaine de soja et de tournesol.',impact:usSupply},
  'nass-fats-oils':{title:'USDA NASS · Fats & Oils · Oilseed Crushings',short:'NASS · Fats & Oils',source:'USDA NASS',city:'ET',product:'sbo',origin:'us',importance:2,
    expected:'Trituration, production et stocks d’huiles et de tourteaux aux États-Unis (soja, colza, tournesol…).',
    impact:'Un crush plus élevé augmente l’offre d’huile et de tourteau ; des stocks d’huile en baisse soutiennent l’huile de soja.'},
  'nass-stocks':{title:'USDA NASS · Grain Stocks',short:'Grain Stocks',source:'USDA NASS',city:'ET',product:'soy',origin:'us',importance:3,
    expected:'Stocks trimestriels de graines aux États-Unis, à la ferme et hors ferme.',impact:usSupply},
  'nass-acreage':{title:'USDA NASS · Acreage',short:'Acreage',source:'USDA NASS',city:'ET',product:'soy',origin:'us',importance:3,
    expected:'Surfaces semées de soja et des autres cultures, après les semis.',impact:usSupply},
  'nass-plantings':{title:'USDA NASS · Prospective Plantings',short:'Plantings',source:'USDA NASS',city:'ET',product:'soy',origin:'us',importance:3,
    expected:'Intentions de semis des agriculteurs américains pour la campagne à venir.',impact:usSupply},
  'fas-export-sales':{title:'USDA FAS · Weekly Export Sales',short:'Export Sales',source:'USDA FAS',city:'ET',product:'soy',origin:'us',importance:2,period:'text',
    expected:'Ventes nettes et expéditions hebdomadaires de graines, d’huile et de tourteau de soja américains, par destination.',impact:sales},
  'usda-inspections':{title:'USDA AMS · Export Inspections',short:'Inspections',source:'USDA AMS',city:'ET',product:'soy',origin:'us',importance:1,period:'text',
    expected:'Graines inspectées pour l’exportation la semaine précédente (soja, maïs, blé).',impact:sales},
  nopa:{title:'NOPA · Trituration mensuelle',short:'NOPA',source:'NOPA',city:'ET',product:'sbo',origin:'us',importance:3,period:'data',
    expected:'Volume de soja trituré par les membres de NOPA et stocks d’huile de soja en fin de mois.',
    impact:'Des stocks d’huile inférieurs aux attentes soutiennent l’huile de soja ; un crush record pèse sur le tourteau.'},
  mpob:{title:'MPOB · Bilan mensuel de la palme',short:'MPOB',source:'MPOB',city:'MYT',product:'palm',origin:'mys',importance:3,period:'data',
    expected:'Production, exportations, importations et stocks d’huile de palme en Malaisie.',
    impact:'Des stocks malaisiens en hausse pèsent sur la palme et réduisent sa prime face aux huiles concurrentes.'},
  conab:{title:'CONAB · Relevé de la récolte de grains',short:'CONAB',source:'CONAB',product:'soy',origin:'bra',importance:2,period:'text',
    expected:'Surfaces, rendements et production du Brésil pour le soja et les autres grains.',
    impact:'Une révision de la récolte brésilienne de soja modifie l’offre mondiale de graines, d’huile et de tourteau.'},
  'conab-progress':{title:'CONAB · Progrès des semis et des récoltes',short:'CONAB · Progrès',source:'CONAB',city:'BRT',product:'soy',origin:'bra',importance:1,
    expected:'Avancement hebdomadaire des semis et des récoltes au Brésil.',
    impact:'Un retard des semis de soja retarde la disponibilité de la récolte et soutient les primes.'},
  sea:{title:'SEA India · Importations d’huiles végétales',short:'SEA India',source:'SEA India',product:'palm',origin:'ind',importance:2,period:'data',
    expected:'Importations indiennes d’huiles de palme, de soja et de tournesol du mois précédent, et stocks dans les ports.',
    impact:'Des achats indiens plus forts soutiennent la palme et les huiles souples ; leur répartition révèle l’arbitrage entre huiles.'},
  anec:{title:'ANEC · Exportations brésiliennes',short:'ANEC',source:'ANEC',product:'soy',origin:'bra',importance:2,period:'text',
    expected:'Expéditions hebdomadaires et prévisions mensuelles de soja, de tourteau et de maïs du Brésil.',impact:sales},
  bcba:{title:'Bolsa de Cereales · Panorama agricole hebdomadaire',short:'Bolsa de Cereales',source:'Bolsa de Cereales',product:'soy',origin:'arg',importance:1,
    expected:'Avancement des semis et des récoltes, état des cultures et estimations de production en Argentine.',
    impact:'Les estimations argentines de soja et de tournesol orientent l’offre exportable d’huiles et de tourteaux.'},
};

const two=n=>String(n).padStart(2,'0');
const parts=(instant,timeZone)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  .formatToParts(instant).map(({type,value})=>[type,value]));
// Date et heure d’un instant à Casablanca.
export function casablanca(iso){
  const p=parts(new Date(iso),CASABLANCA);
  return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};
}
// Instant correspondant à une heure murale dans un fuseau donné (ex. 15:30 à New York).
export function zonedInstant(date,time,timeZone){
  const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
  let guess=Date.UTC(y,m-1,d,h,min);
  for(let i=0;i<2;i++){
    const p=parts(new Date(guess),timeZone);
    const shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
    guess-=shown-Date.UTC(y,m-1,d,h,min);
  }
  return new Date(guess).toISOString();
}
const monthName=key=>new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T00:00:00Z'));
const clock=iso=>iso.slice(11,16);
// Heure de Casablanca, avec l’heure locale de la source quand elle diffère.
function timing(iso,city){
  const local=casablanca(iso),source=clock(iso);
  return {date:local.date,time:local.time,zone:'heure de Casablanca'+(city&&source!==local.time?' · '+source+' à '+cities[city]:'')};
}

export function reportEntry(row){
  const spec=reportCatalog[row.kind];
  if(!spec||!/^\d{4}-\d{2}-\d{2}$/.test(row.date??'')||!/^https:\/\//.test(row.url??''))return null;
  const period=!row.period?'':spec.period==='release'?' · '+monthName(row.period):spec.period==='data'?' · données de '+monthName(row.period):spec.period==='text'?' · '+row.period:'';
  const when=row.at?timing(row.at,spec.city):{date:row.date,time:'',zone:''};
  return {id:'pub-'+row.id,date:when.date,time:when.time,zone:when.zone,title:spec.title+period,short:spec.short,source:spec.source,url:row.url,
    product:spec.product,origin:spec.origin,importance:spec.importance,dateStatus:row.status in dateStatusLabels?row.status:'usual',
    expected:spec.expected,previous:'Voir la dernière publication sur la page officielle',consensus:'Non disponible',impact:spec.impact};
}

const forexImportance={High:3,Medium:2,Holiday:1};
const forexOrigin={USD:'us',EUR:'eu',CNY:'chn'};
const forexCurrency={USD:'le dollar américain',EUR:'l’euro',CNY:'le yuan et la demande chinoise'};
// Page du jour sur Forex Factory quand le flux ne donne pas la fiche de l’annonce.
export const forexDayUrl=date=>{
  const d=new Date(date+'T00:00:00Z');
  return FOREX_CALENDAR_URL+'?day='+['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getUTCMonth()]+d.getUTCDate()+'.'+d.getUTCFullYear();
};
export function forexEntry(row){
  const when=timing(row.date,'ET'),holiday=row.impact==='Holiday';
  return {id:'ff-'+row.country+'-'+row.date+'-'+row.title,date:when.date,time:holiday?'':when.time,zone:holiday?'':when.zone,
    title:row.country+' · '+row.title,short:row.country+' · '+row.title,source:'Forex Factory',
    url:/^https:\/\/www\.forexfactory\.com\//.test(row.url??'')?row.url:forexDayUrl(row.date.slice(0,10)),
    product:'fx',origin:forexOrigin[row.country]??'world',importance:forexImportance[row.impact]??(row.impact?1:3),dateStatus:'official',
    expected:holiday?'Jour férié · marchés de '+row.country+' fermés ou peu actifs':'Annonce macroéconomique'+(row.impact==='Medium'?' à impact moyen':' à fort impact')+' · '+row.country,
    consensus:row.forecast||'Non disponible',previous:row.previous||'Non disponible',
    impact:holiday?'Liquidité réduite : les contrats à terme et les devises peuvent bouger davantage sur peu de volume.':'Un écart au consensus peut faire bouger '+(forexCurrency[row.country]??'la devise')+' et, par le change, les prix d’importation.'};
}

// Entrées du calendrier tirées du flux ; l’ancien format (Crop Progress seul) reste lisible.
export function feedEntries(feed){
  if(!feed)return [];
  const reports=Array.isArray(feed.reports)?feed.reports:(feed.nass??[]).map(({date,url})=>({id:'nass-progress-'+date.slice(0,10),kind:'nass-progress',date:date.slice(0,10),at:date,url,status:'official',period:''}));
  // Jours fériés : seuls ceux des États-Unis (marchés de Chicago) sont repris.
  return [...reports.map(reportEntry),...(feed.forex??[]).filter(r=>r.impact!=='Holiday'||r.country==='USD').map(forexEntry)].filter(Boolean);
}

// Entrée datée dans le fuseau de sa source (ex. COT à 15:30 ET) ramenée à l’heure de Casablanca.
export function toCasablanca(row,timeZone,city){
  if(!row.date||!/^\d{2}:\d{2}$/.test(row.time??''))return row;
  const iso=zonedInstant(row.date,row.time,timeZone),local=casablanca(iso);
  return {...row,date:local.date,time:local.time,zone:'heure de Casablanca'+(row.time!==local.time?' · '+row.time+' à '+city:'')};
}
