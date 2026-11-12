// Rapport COT (Commitments of Traders) de la CFTC : définitions, normalisation, calendrier et indicateurs.
// Module partagé par le navigateur (cot-view.mjs) et par scripts/update-cot.mjs. Aucune dépendance.

export const COT_SCHEMA=1;
export const COT_START='2010-01-01';
export const CFTC_API='https://publicreporting.cftc.gov/resource/';
export const CFTC_SCHEDULE_URL='https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm';
export const CFTC_ABOUT_URL='https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm';
export const CFTC_EXPLANATORY_URL='https://www.cftc.gov/MarketReports/CommitmentsofTraders/ExplanatoryNotes/index.htm';
export const RELEASE_TIME='15:30';
export const RELEASE_ZONE='America/New_York';

export const cotMarkets={
  'soybean-oil':{code:'007601',name:'Huile de soja',ticker:'ZL',article:'l’huile de soja',contract:'CBOT · contrat de 60 000 lb',exchange:'SOYBEAN OIL - CHICAGO BOARD OF TRADE'},
  soybeans:{code:'005602',name:'Graines de soja',ticker:'ZS',article:'les graines de soja',contract:'CBOT · contrat de 5 000 bu',exchange:'SOYBEANS - CHICAGO BOARD OF TRADE'},
};

export const cotDatasets={
  'disaggregated-futures':{id:'72hh-3qpy',report:'disaggregated',scope:'futures'},
  'disaggregated-combined':{id:'kh3c-gbw2',report:'disaggregated',scope:'combined'},
  'legacy-futures':{id:'6dca-aqww',report:'legacy',scope:'futures'},
  'legacy-combined':{id:'jun7-fc8e',report:'legacy',scope:'combined'},
};
export const datasetKey=(report,scope)=>report+'-'+scope;
export const datasetPage=key=>'https://publicreporting.cftc.gov/d/'+cotDatasets[key].id;

const concentration=[
  ['g4L','conc_gross_le_4_tdr_long'],['g4S','conc_gross_le_4_tdr_short'],['g8L','conc_gross_le_8_tdr_long'],['g8S','conc_gross_le_8_tdr_short'],
  ['n4L','conc_net_le_4_tdr_long_all'],['n4S','conc_net_le_4_tdr_short_all'],['n8L','conc_net_le_8_tdr_long_all'],['n8S','conc_net_le_8_tdr_short_all'],
];
// Noms de colonnes de l’API publique de la CFTC, orthographe d’origine comprise (« swap__ », « postions »).
export const cotFields={
  disaggregated:[
    ['oi','open_interest_all'],
    ['pmL','prod_merc_positions_long'],['pmS','prod_merc_positions_short'],
    ['swL','swap_positions_long_all'],['swS','swap__positions_short_all'],['swX','swap__positions_spread_all'],
    ['mmL','m_money_positions_long_all'],['mmS','m_money_positions_short_all'],['mmX','m_money_positions_spread'],
    ['orL','other_rept_positions_long'],['orS','other_rept_positions_short'],['orX','other_rept_positions_spread'],
    ['nrL','nonrept_positions_long_all'],['nrS','nonrept_positions_short_all'],
    ['tT','traders_tot_all'],
    ['pmLT','traders_prod_merc_long_all'],['pmST','traders_prod_merc_short_all'],
    ['swLT','traders_swap_long_all'],['swST','traders_swap_short_all'],['swXT','traders_swap_spread_all'],
    ['mmLT','traders_m_money_long_all'],['mmST','traders_m_money_short_all'],['mmXT','traders_m_money_spread_all'],
    ['orLT','traders_other_rept_long_all'],['orST','traders_other_rept_short'],['orXT','traders_other_rept_spread'],
    ...concentration,
  ],
  legacy:[
    ['oi','open_interest_all'],
    ['ncL','noncomm_positions_long_all'],['ncS','noncomm_positions_short_all'],['ncX','noncomm_postions_spread_all'],
    ['cL','comm_positions_long_all'],['cS','comm_positions_short_all'],
    ['nrL','nonrept_positions_long_all'],['nrS','nonrept_positions_short_all'],
    ['tT','traders_tot_all'],
    ['ncLT','traders_noncomm_long_all'],['ncST','traders_noncomm_short_all'],['ncXT','traders_noncomm_spread_all'],
    ['cLT','traders_comm_long_all'],['cST','traders_comm_short_all'],
    ...concentration,
  ],
};
// Positions obligatoires : un rapport sans ces valeurs est rejeté.
export const requiredFields={
  disaggregated:['oi','pmL','pmS','swL','swS','swX','mmL','mmS','mmX','orL','orS','orX','nrL','nrS'],
  legacy:['oi','ncL','ncS','ncX','cL','cS','nrL','nrS'],
};

export const cotGroups={
  disaggregated:[
    {id:'mm',name:'Gestionnaires de fonds',short:'Fonds',en:'Managed Money',spread:true,slot:1,lead:true,
      desc:'Conseillers en trading (CTA), gestionnaires de pools (CPO) et fonds non enregistrés qui gèrent des positions pour le compte de clients.'},
    {id:'pm',name:'Producteurs, négociants et transformateurs',short:'Producteurs',en:'Producer/Merchant/Processor/User',spread:false,slot:2,hedger:true,
      desc:'Opérateurs de la filière physique qui couvrent leur production, leurs achats ou leurs stocks : triturateurs, exportateurs, raffineurs.'},
    {id:'sw',name:'Courtiers en swaps',short:'Swaps',en:'Swap Dealers',spread:true,slot:3,
      desc:'Contreparties de swaps sur matières premières qui couvrent leur exposition, souvent face à des fonds indiciels.'},
    {id:'or',name:'Autres déclarants',short:'Autres',en:'Other Reportables',spread:true,slot:4,
      desc:'Opérateurs au-dessus du seuil de déclaration qui n’entrent dans aucune autre catégorie.'},
    {id:'nr',name:'Non déclarants',short:'Non décl.',en:'Nonreportable',spread:false,slot:5,
      desc:'Positions sous le seuil de déclaration, obtenues par différence avec l’intérêt ouvert.'},
  ],
  legacy:[
    {id:'nc',name:'Non commerciaux',short:'Non comm.',en:'Non-Commercial',spread:true,slot:1,lead:true,
      desc:'Opérateurs dont les positions ne couvrent pas une activité commerciale : fonds, CTA, spéculateurs déclarés.'},
    {id:'c',name:'Commerciaux',short:'Commerciaux',en:'Commercial',spread:false,slot:2,hedger:true,
      desc:'Opérateurs qui utilisent les futures pour couvrir une activité commerciale, swaps compris dans ce format.'},
    {id:'nr',name:'Non déclarants',short:'Non décl.',en:'Nonreportable',spread:false,slot:5,
      desc:'Positions sous le seuil de déclaration, obtenues par différence avec l’intérêt ouvert.'},
  ],
};
export const leadGroup=report=>cotGroups[report].find(g=>g.lead);
export const hedgerGroup=report=>cotGroups[report].find(g=>g.hedger);

const toNumber=value=>{
  if(value===undefined||value===null||value==='')return null;
  const n=Number(String(value).replace(/,/g,'').trim());
  return Number.isFinite(n)?n:null;
};
const DATE=/^\d{4}-\d{2}-\d{2}$/;

export function normalizeSocrataRow(row,report){
  const date=String(row?.report_date_as_yyyy_mm_dd??'').slice(0,10);
  if(!DATE.test(date))return null;
  return [date,...cotFields[report].map(([,field])=>toNumber(row[field]))];
}

// Regroupe les lignes de l’API par marché suivi, triées par date, une ligne par date.
export function marketsFromSocrata(rows,report){
  const byCode=Object.fromEntries(Object.entries(cotMarkets).map(([key,m])=>[m.code,key]));
  const out={};
  for(const row of rows||[]){
    const key=byCode[String(row?.cftc_contract_market_code??'').trim()];
    if(!key)continue;
    const values=normalizeSocrataRow(row,report);
    if(!values)continue;
    const market=out[key]??={code:cotMarkets[key].code,exchange:String(row.market_and_exchange_names??cotMarkets[key].exchange).trim(),units:String(row.contract_units??'').trim(),rows:new Map()};
    market.rows.set(values[0],values);
    if(row.market_and_exchange_names)market.exchange=String(row.market_and_exchange_names).trim();
    if(row.contract_units)market.units=String(row.contract_units).trim();
  }
  for(const market of Object.values(out))market.rows=[...market.rows.values()].sort((a,b)=>a[0].localeCompare(b[0]));
  return out;
}

const latestOf=markets=>Object.values(markets).map(m=>m.rows.at(-1)?.[0]).filter(Boolean).sort().at(-1)??null;

export function buildDataset(key,socrataRows,generatedAt){
  const def=cotDatasets[key];
  if(!def)throw new Error('Jeu de données COT inconnu : '+key);
  const markets=marketsFromSocrata(socrataRows,def.report);
  return {schema:COT_SCHEMA,dataset:key,datasetId:def.id,report:def.report,scope:def.scope,generatedAt,latest:latestOf(markets),
    source:'CFTC · Commitments of Traders',sourceUrl:datasetPage(key),fields:cotFields[def.report].map(([k])=>k),markets};
}

// Ajoute à un jeu existant les rapports plus récents obtenus directement auprès de la CFTC.
export function mergeDataset(dataset,socrataRows){
  const fresh=marketsFromSocrata(socrataRows,dataset.report);
  const markets={};
  for(const key of new Set([...Object.keys(dataset.markets),...Object.keys(fresh)])){
    const base=dataset.markets[key],add=fresh[key];
    const rows=new Map((base?.rows??[]).map(r=>[r[0],r]));
    for(const r of add?.rows??[])rows.set(r[0],r);
    markets[key]={...(base??add),rows:[...rows.values()].sort((a,b)=>a[0].localeCompare(b[0]))};
  }
  return {...dataset,markets,latest:latestOf(markets)};
}

// Identité comptable de la CFTC : la somme des positions longues (ou courtes), spreads compris, égale l’intérêt ouvert.
export function identityGap(dataset,row){
  const at=Object.fromEntries(dataset.fields.map((f,i)=>[f,row[i+1]]));
  const sum=keys=>keys.reduce((s,k)=>s+(at[k]??NaN),0);
  const [long,short]=dataset.report==='disaggregated'?
    [sum(['pmL','swL','swX','mmL','mmX','orL','orX','nrL']),sum(['pmS','swS','swX','mmS','mmX','orS','orX','nrS'])]:
    [sum(['ncL','ncX','cL','nrL']),sum(['ncS','ncX','cS','nrS'])];
  return Math.max(Math.abs(long-at.oi),Math.abs(short-at.oi));
}

export function validateDataset(dataset,{now=new Date()}={}){
  const errors=[],warnings=[];
  const def=cotDatasets[dataset?.dataset];
  if(!def){errors.push('Jeu de données inconnu.');return {errors,warnings};}
  const expected=cotFields[def.report].map(([k])=>k);
  if(JSON.stringify(dataset.fields)!==JSON.stringify(expected))errors.push('Colonnes inattendues.');
  const required=requiredFields[def.report].map(f=>dataset.fields.indexOf(f)+1);
  // Les options converties en équivalent futures (delta) sont arrondies : écart de quelques contrats toléré.
  const tolerance=def.scope==='combined'?5:1;
  for(const key of Object.keys(cotMarkets)){
    const market=dataset.markets?.[key];
    if(!market?.rows?.length){errors.push(key+' : aucun rapport.');continue;}
    const rows=market.rows;
    let previous='',missing=0,broken=0;
    for(const row of rows){
      if(!DATE.test(row[0])||row[0]<=previous)errors.push(key+' : dates non triées ou en double ('+row[0]+').');
      previous=row[0];
      if(row.length!==expected.length+1)errors.push(key+' : ligne incomplète ('+row[0]+').');
      if(required.some(i=>!Number.isFinite(row[i]))){missing++;continue;}
      if(identityGap(dataset,row)>tolerance)broken++;
    }
    const last=rows.at(-1);
    if(required.some(i=>!Number.isFinite(last[i])))errors.push(key+' : positions manquantes dans le dernier rapport ('+last[0]+').');
    else if(identityGap(dataset,last)>tolerance)errors.push(key+' : le dernier rapport ne respecte pas l’identité long/short = intérêt ouvert ('+last[0]+').');
    if(missing)warnings.push(key+' : '+missing+' rapport(s) sans positions complètes.');
    if(broken)warnings.push(key+' : '+broken+' rapport(s) hors identité comptable.');
    if(rows.length<200)errors.push(key+' : historique trop court ('+rows.length+' rapports).');
    const age=(now-new Date(last[0]+'T00:00:00Z'))/864e5;
    if(age>45)warnings.push(key+' : dernier rapport du '+last[0]+', il y a '+Math.round(age)+' jours.');
  }
  return {errors,warnings};
}

// Une ligne par rapport pour des différences Git lisibles.
export function serializeDataset(dataset){
  const {markets,...head}=dataset;
  const marketText=Object.entries(markets).map(([key,{rows,...meta}])=>
    '    '+JSON.stringify(key)+':{'+Object.entries(meta).map(([k,v])=>JSON.stringify(k)+':'+JSON.stringify(v)).join(',')+',"rows":[\n'+
    rows.map(r=>'      '+JSON.stringify(r)).join(',\n')+'\n    ]}').join(',\n');
  return '{\n'+Object.entries(head).map(([k,v])=>'  '+JSON.stringify(k)+':'+JSON.stringify(v)+',').join('\n')+'\n  "markets":{\n'+marketText+'\n  }\n}\n';
}
// Deux jeux sont identiques si seuls leurs horodatages de génération diffèrent.
export const sameData=(a,b)=>!!a&&!!b&&JSON.stringify({...a,generatedAt:0})===JSON.stringify({...b,generatedAt:0});

export function socrataUrl(key,{after='',from=COT_START,codes=Object.values(cotMarkets).map(m=>m.code),limit=50000}={}){
  const def=cotDatasets[key];
  const where='cftc_contract_market_code in('+codes.map(c=>"'"+c+"'").join(',')+') AND report_date_as_yyyy_mm_dd '+(after?'> ':'>= ')+"'"+(after||from)+"T00:00:00'";
  const params=new URLSearchParams({$where:where,$order:'report_date_as_yyyy_mm_dd ASC',$limit:String(limit)});
  return CFTC_API+def.id+'.json?'+params.toString();
}

export function isValidDataset(data,key){
  if(!data||data.schema!==COT_SCHEMA||data.dataset!==key||!Array.isArray(data.fields)||typeof data.markets!=='object')return false;
  return Object.values(data.markets).every(m=>Array.isArray(m?.rows)&&m.rows.every(r=>Array.isArray(r)&&DATE.test(r[0])&&r.length===data.fields.length+1));
}

/* ---------- Dates et calendrier de publication ---------- */
const DAY=864e5;
export const addDaysISO=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*DAY).toISOString().slice(0,10);
const weekday=date=>new Date(date+'T00:00:00Z').getUTCDay();
export const daysBetween=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY);

function nthWeekday(year,month,day,n){
  const first=new Date(Date.UTC(year,month-1,1)).getUTCDay();
  return new Date(Date.UTC(year,month-1,1+(day-first+7)%7+(n-1)*7)).toISOString().slice(0,10);
}
function lastWeekday(year,month,day){
  const last=new Date(Date.UTC(year,month,0));
  return new Date(Date.UTC(year,month-1,last.getUTCDate()-(last.getUTCDay()-day+7)%7)).toISOString().slice(0,10);
}
const observed=date=>weekday(date)===6?addDaysISO(date,-1):weekday(date)===0?addDaysISO(date,1):date;
const holidayCache=new Map();
// Jours fériés fédéraux américains (dates chômées).
export function federalHolidays(year){
  if(!holidayCache.has(year)){
    const fixed=[[1,1],[6,19],[7,4],[11,11],[12,25]].map(([m,d])=>observed(year+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')));
    holidayCache.set(year,new Set([...fixed,nthWeekday(year,1,1,3),nthWeekday(year,2,1,3),lastWeekday(year,5,1),nthWeekday(year,9,1,1),nthWeekday(year,10,1,2),nthWeekday(year,11,4,4),
      observed((year+1)+'-01-01')]));
  }
  return holidayCache.get(year);
}
const isHoliday=date=>federalHolidays(Number(date.slice(0,4))).has(date);

// Calendrier officiel de la CFTC : publications 2026 décalées par un jour férié (date des données → date de publication).
export const officialDelays={
  '2025-12-30':'2026-01-05','2026-06-16':'2026-06-22','2026-06-30':'2026-07-06',
  '2026-11-10':'2026-11-16','2026-11-24':'2026-11-30','2026-12-22':'2026-12-28',
};
export const officialYears=new Set(['2026']);

// Les données sont arrêtées le mardi et publiées le vendredi à 15 h 30 ET. Un jour férié du mercredi au vendredi
// reporte la publication au lundi suivant, comme dans le calendrier officiel 2026.
export function releaseFor(asOf){
  const friday=addDaysISO(asOf,3);
  if(officialDelays[asOf])return {asOf,date:officialDelays[asOf],delayed:true,official:true};
  let date=friday,delayed=false;
  if([1,2,3].some(d=>isHoliday(addDaysISO(asOf,d)))){date=addDaysISO(asOf,6);delayed=true;}
  while(weekday(date)===0||weekday(date)===6||isHoliday(date))date=addDaysISO(date,1);
  return {asOf,date,delayed,official:officialYears.has(date.slice(0,4))};
}

// Instant UTC correspondant à une heure locale d’un fuseau donné.
export function zonedInstant(date,time=RELEASE_TIME,zone=RELEASE_ZONE){
  const [y,m,d]=date.split('-').map(Number),[hh,mm]=time.split(':').map(Number);
  const target=Date.UTC(y,m-1,d,hh,mm);
  const format=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  let guess=target;
  for(let i=0;i<3;i++){
    const parts=Object.fromEntries(format.formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
    const seen=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour)%24,Number(parts.minute));
    if(seen===target)break;
    guess+=target-seen;
  }
  return new Date(guess);
}
export const releaseInstant=asOf=>zonedInstant(releaseFor(asOf).date);

const tuesdayOnOrBefore=date=>addDaysISO(date,-((weekday(date)-2+7)%7));
const todayISO=now=>new Date(now).toISOString().slice(0,10);

// Date des données du dernier rapport déjà publié à l’instant donné.
export function expectedLatest(now=new Date()){
  let asOf=tuesdayOnOrBefore(todayISO(now));
  for(let i=0;i<6;i++,asOf=addDaysISO(asOf,-7))if(releaseInstant(asOf)<=now)return asOf;
  return asOf;
}
// Prochain rapport à paraître après l’instant donné.
export function nextRelease(now=new Date()){
  let asOf=addDaysISO(tuesdayOnOrBefore(todayISO(now)),-14);
  for(let i=0;i<8;i++,asOf=addDaysISO(asOf,7)){
    const release=releaseFor(asOf),instant=zonedInstant(release.date);
    if(instant>now)return {...release,instant};
  }
  return null;
}
export function upcomingReleases(now=new Date(),count=8){
  const out=[];
  let next=nextRelease(now);
  while(next&&out.length<count){out.push(next);next=nextRelease(new Date(next.instant.getTime()+60e3));}
  return out;
}

/* ---------- Indicateurs ---------- */
export function records(dataset,market){
  const m=dataset?.markets?.[market];
  if(!m)return [];
  const groups=cotGroups[dataset.report];
  const out=m.rows.map(row=>{
    const r={date:row[0]};
    dataset.fields.forEach((f,i)=>{r[f]=row[i+1];});
    for(const g of groups){
      r[g.id+'N']=Number.isFinite(r[g.id+'L'])&&Number.isFinite(r[g.id+'S'])?r[g.id+'L']-r[g.id+'S']:null;
      if(!g.spread)r[g.id+'X']=null;
    }
    return r;
  });
  const keys=['oi',...groups.flatMap(g=>[g.id+'L',g.id+'S',g.id+'X',g.id+'N'])];
  out.forEach((r,i)=>{
    const p=out[i-1];
    r.gap=p?Math.round(daysBetween(p.date,r.date)/7):null;
    for(const k of keys)r['d'+k]=p&&Number.isFinite(r[k])&&Number.isFinite(p[k])?r[k]-p[k]:null;
  });
  return out;
}
export const pctOf=(value,oi)=>Number.isFinite(value)&&oi>0?value/oi*100:null;

function windowValues(values,i,lookback){
  if(i+1<lookback||!Number.isFinite(values[i]))return null;
  const win=[];
  for(let j=i+1-lookback;j<=i;j++)if(Number.isFinite(values[j]))win.push(values[j]);
  return win.length>=Math.ceil(lookback*.9)?win:null;
}
// Indice COT (Williams) : position de la valeur entre le minimum et le maximum de la fenêtre, de 0 à 100.
export function cotIndexAt(values,i,lookback){
  const win=windowValues(values,i,lookback);
  if(!win)return null;
  const min=Math.min(...win),max=Math.max(...win);
  return max===min?50:(values[i]-min)/(max-min)*100;
}
export const cotIndexSeries=(values,lookback)=>values.map((_,i)=>cotIndexAt(values,i,lookback));
export function zScoreAt(values,i,lookback){
  const win=windowValues(values,i,lookback);
  if(!win)return null;
  const mean=win.reduce((s,v)=>s+v,0)/win.length;
  const sd=Math.sqrt(win.reduce((s,v)=>s+(v-mean)**2,0)/win.length);
  return sd?(values[i]-mean)/sd:0;
}
export function rangeAt(values,i,lookback){
  const win=windowValues(values,i,lookback);
  return win?{min:Math.min(...win),max:Math.max(...win),mean:win.reduce((s,v)=>s+v,0)/win.length}:null;
}

// Semaine de l’année (1 à 53) comptée depuis le 1er janvier.
export const weekOfYear=date=>Math.floor((Date.parse(date+'T00:00:00Z')-Date.UTC(Number(date.slice(0,4)),0,1))/(7*DAY))+1;

// Saisonnalité : minimum, maximum et moyenne des années précédentes, semaine par semaine.
export function seasonal(recs,key,{years=5,year}={}){
  const all=recs.filter(r=>Number.isFinite(r[key]));
  const current=Number(year??all.at(-1)?.date.slice(0,4));
  const pastYears=Array.from({length:years},(_,i)=>current-years+i);
  const byWeek=new Map();
  for(const r of all){
    const y=Number(r.date.slice(0,4));
    if(!pastYears.includes(y))continue;
    const w=weekOfYear(r.date);
    if(!byWeek.has(w))byWeek.set(w,[]);
    byWeek.get(w).push(r[key]);
  }
  const band=[...byWeek.entries()].sort((a,b)=>a[0]-b[0]).map(([week,v])=>({week,min:Math.min(...v),max:Math.max(...v),avg:v.reduce((s,x)=>s+x,0)/v.length,n:v.length}));
  const line=y=>all.filter(r=>Number(r.date.slice(0,4))===y).map(r=>({week:weekOfYear(r.date),value:r[key],date:r.date}));
  const covered=pastYears.filter(y=>all.some(r=>Number(r.date.slice(0,4))===y));
  return {year:current,years:covered,band,current:line(current),previous:line(current-1)};
}
