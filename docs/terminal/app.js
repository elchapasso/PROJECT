
import {AS_OF,labels,products,origins,groups,sources,seedEvents,seedCalendar,seedBalances,seedPrices,cards,metrics,periodTypes,pairs,scenarios,shockFields,horizonNotes,scoreWeights} from './data.js?v=20261111-market-close';
import {emptyStore,byDate,unique,eventKey,balanceKey,quoteKey,pct,addDays,monthShift,stamp,allows,sentiment,align,corrReturns,balancesWithRatios,safeURL,validEvent,validBalance,validQuote,validCalendar,parseStore,previousPeriod,referenceDate} from './model.js?v=20261111-market-close';
import {mpobHistory,mpobHistorySources,seaHistory,seaHistorySources} from './palm-history.js?v=20261110-mpob';
import {biofuelReleaseDate,biofuelSeries,biofuelNativeSeries} from './biofuels.js';
import {renderBiofuelPolicy,bindBiofuelPolicy} from './biofuel-policy-view.mjs?v=20261113-biofuels';
import {worldBalances} from './balance-data.mjs';
import {chinaSoybeanImports,chinaSoybeanSources} from './demand-history.js?v=20261111-market-close';
import {indiaOrigins} from './india-origins.js';
import {usSoyHistory} from './us-soy-history.js?v=20261109-soja';
import {nopaHistory,nopaReport} from './nopa-history.js?v=20261109-nopa';
import {argentinaSoyHistory} from './argentina-soy-history.js?v=20261109-argentina';

import {abioveAnnualUpdate,abioveProjectionStart,abioveSampleStart,brazilSoyHistory} from './brazil-soy-history.js?v=20261110-abiove';
import {sunflowerHistory,sunflowerSources} from './sunflower-history.js?v=20261112-uga';

import {GASOIL_KG_PER_LITRE,spreadLegPoints} from './spread-model.mjs?v=20261113-marges';
import {eurUsdSource,spreadLegs} from './spread-definitions.mjs?v=20261113-marges';
import {spreadPrices,priceFeed} from './spread-live.mjs?v=20261113-marges';
import {sourceAlerts} from './price-feed.mjs?v=20261113-futures';
import {focusSpreads,focusRows,focusStats,focusWindow,focusAverage,focusInputs,checkFocusParams} from './spread-focus.mjs?v=20261113-marges';
import {focusMargins} from './margin-focus.mjs?v=20261113-marges';

import {renderBalanceView,bindBalanceView} from './balance-view.mjs?v=20261112-tournesol';
import {renderCbotArgView,bindCbotArgView} from './cbot-arg-view.mjs?v=20261112-simulateur';
import {renderCotView,bindCotView,cotCalendarEntries} from './cot-view.mjs?v=20261112-cot';

const root=document.querySelector('#terminal');
const dateFormat=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const monthFormat=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'});
const shortMonth=new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'});
const num=(n,d=2)=>Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d}).format(n):'—';
const sign=(n,d=1)=>Number.isFinite(n)?(n>0?'+':n<0?'−':'')+num(Math.abs(n),d):'—';
const percent=n=>Number.isFinite(n)?sign(n)+' %':'—';
const formatDate=d=>d?dateFormat.format(new Date(d+'T12:00:00Z')):'À confirmer';
const displayPeriod=(s,g)=>g==='month'?monthFormat.format(new Date(s+'-01T12:00:00Z')):g==='week'||g==='day'?formatDate(s):s;
const smallMonth=d=>shortMonth.format(new Date(d.slice(0,7)+'-01T12:00:00Z'));
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=escape;
const iconPaths={
  grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',leaf:'M3 20c4-9 10-14 18-15-1 9-6 15-14 13m-4 2 12-10',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-5v2m0 14v2M3 12h2m14 0h2M6 6l1 1m10 10 1 1m0-12-1 1M7 17l-1 1',drop:'M12 3C9 8 5 12 5 16a7 7 0 0 0 14 0c0-4-4-8-7-13z',grain:'M12 21V3m0 7C8 10 5 8 5 4c4 0 7 2 7 6zm0 5c4 0 7-2 7-6-4 0-7 2-7 6zm0 4c-4 0-7-2-7-6 4 0 7 2 7 6z',
  pulse:'M3 12h4l3-7 4 14 3-7h4',table:'M3 5h18v14H3zm0 5h18m-12 0v9m6-9v9',chart:'M3 3v18h18M6 16l5-6 4 3 5-7',bolt:'m13 2-9 12h7l-1 8 10-12h-7z',target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-5h.01',
  news:'M5 3h13v18H5zm3 5h7m-7 4h7m-7 4h5',calendar:'M3 5h18v16H3zm0 5h18M8 3v4m8-4v4m-8 7h1m3 0h1m3 0h1',report:'M6 3h9l4 4v14H6zm9 0v5h4M9 12h7m-7 4h7',brief:'M3 7h18v13H3zm5 0V4h8v3m-13 6h18m-11 0v2h4v-2',
  database:'M4 6c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3zm0 0v6c0 2 3.6 3 8 3s8-1 8-3V6M4 12v6c0 2 3.6 3 8 3s8-1 8-3v-6',filter:'M4 5h16l-6 7v6l-4 2v-8z',plus:'M12 5v14M5 12h14',arrow:'M4 12h15m-6-6 6 6-6 6',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',moon:'M20 15a8 8 0 0 1-11-11A8 8 0 1 0 20 15z',menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',download:'M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4',copy:'M8 8h12v12H8zm-4 8V4h12',search:'M10 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm4-2 6 6',refresh:'M20 7V3m0 4h-4M4 17v4m0-4h4m-3-5a7 7 0 0 1 12-5l3 2M4 15l3 2a7 7 0 0 0 12-5',
  calc:'M6 3h12v18H6zM9 7h6M9 11.5h.01m2.99 0h.01m2.99 0h.01M9 14.5h.01m2.99 0h.01m2.99 0h.01M9 17.5h.01m2.99 0h.01m2.99 0h.01',
  users:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a7 7 0 0 1 14 0v1m0-10a3.5 3.5 0 1 0 0-7m3 17v-1a6 6 0 0 0-3-5.2',
};
const icon=(name,size=17)=>'<svg class="ico" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="'+iconPaths[name]+'"/></svg>';
const menu=[
  ['Terminal',[['overview','Vue d’ensemble','grid']]],
  ['Complexes',[['soy','Soja & dérivés','leaf'],['sun','Tournesol','sun'],['palm','Palme','drop'],['rape','Colza & canola','grain']]],
  ['Analyse',[['drivers','Facteurs de marché','pulse'],['balances','Bilans offre / demande','table'],['demand','Demande','grain'],['cot','Rapport COT · CFTC','users'],['cross','Comparaisons & spreads','chart'],['cbot-arg','Simulateur CBOT – ARG','calc'],['macro','Énergie & géopolitique','bolt'],['biofuels','Biocarburants','drop'],['outlook','Perspectives & scénarios','target']]],
  ['Veille & livrables',[['news','Fil d’actualité','news'],['calendar','Calendrier','calendar'],['reports','Rapports de marché','report'],['comex','Brief COMEX','brief']]],
];
const nav=Object.fromEntries(menu.flatMap(([,items])=>items.map(([id,title])=>[id,title])).concat([['sources','Sources & données']]));
const FILTERS={product:'',origin:'',period:'',horizon:'',impact:'',source:'',status:''};
const calendarToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Casablanca'}).format(new Date());
const localKey='olea-terminal-v1';
let data=emptyStore();
let loadError='';
try{const raw=localStorage.getItem(localKey);if(raw)data=parseStore(raw);}catch{loadError='Les données locales n’ont pas pu être chargées.';}
const state={
  page:'overview',filters:{...FILTERS},theme:'light',mobile:false,eventWindow:'7',chart:'oils',
  indiaOriginPeriod:Object.keys(indiaOrigins).at(-1),indiaOriginMode:'volume',
  soyFamily:'soy',soyOrigin:'us',brazilSoyView:'monthly',sunFamily:'sun',sunOrigin:'ukr',sunView:'',seasonYears:{},
  originTab:{},query:'',category:'',importance:'',start:'',end:'',
  crossView:'spreads',crossPair:'0',crossRange:'8',crossMode:'index',crossA:'wb-sbo',crossB:'wb-palm',outProduct:'sbo',outHorizon:'short',
  shocks:Object.fromEntries(shockFields.map(([k])=>[k,0])),reportKind:'weekly',reportEnd:AS_OF,reportView:'',exec:false,comexWindow:'60',month:calendarToday().slice(0,7),editType:'events',
};
try{if(localStorage.getItem('olea-theme')==='dark')state.theme='dark';}catch{}
const readPage=()=>{const p=location.hash.slice(1).split('?')[0];return Object.hasOwn(nav,p)?p:'overview';};
state.page=readPage();
let memoryReport=null;
let toastTimer;
const fullEvents=()=>unique([...seedEvents,...data.events],eventKey).sort(byDate);
const fullBalances=()=>balancesWithRatios(unique([...seedBalances,...data.balances],balanceKey));
let calendarFeed=null;
let calendarFeedLoaded=false;
const fullCalendar=()=>unique([...seedCalendar,...calendarEntries(calendarFeed),...cotCalendarEntries(),...data.calendar],r=>r.id)
  .sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.time??'').localeCompare(b.time??''));
const asOf=()=>referenceDate(fullEvents());
const eventCaps={status:true,impact:true,horizon:true,period:true};
const allSources=()=>Object.fromEntries([...new Set([...Object.keys(sources),...data.events.map(r=>r.source),...data.balances.map(r=>r.source),...data.quotes.map(r=>r.source),...data.calendar.map(r=>r.source)])].sort((a,b)=>a.localeCompare(b,'fr')).map(s=>[s,s]));
const eventsFor=(filter=state.filters)=>fullEvents().filter(r=>allows(r,filter,asOf(),eventCaps));
const balancesFor=(filter=state.filters)=>fullBalances().filter(r=>allows(r,filter,asOf(),{status:true,period:true}));
const periodLabel={1:'24 dernières heures',7:'7 derniers jours',30:'30 derniers jours',60:'60 derniers jours',90:'90 derniers jours'};
const options=(dict,value='',placeholder)=>((placeholder?'<option value="">'+e(placeholder)+'</option>':'')+Object.entries(dict).map(([k,v])=>'<option value="'+e(k)+'"'+(String(k)===String(value)?' selected':'')+'>'+e(v)+'</option>').join(''));
const select=(key,dict,value,placeholder,attr='data-control')=>'<select aria-label="'+e(placeholder||key)+'" '+attr+'="'+e(key)+'">'+options(dict,value,placeholder)+'</select>';
const link=(url,label)=>safeURL(url)?'<a href="'+e(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+e(label)+'</a>':e(label);
const chartSources=refs=>refs.length?'<p class="small chart-sources">Source'+(refs.length>1?'s':'')+' · '+refs.map(([name,url])=>link(url,name)).join(' · ')+'</p>':'';
const refsFor=rows=>unique(rows.filter(r=>r?.source),r=>JSON.stringify([r.source,r.url])).map(r=>[r.source,r.url]);
const route=(page,label,kind='',attr='')=>'<a class="button '+kind+'" href="#'+e(page)+'" '+attr+'>'+label+'</a>';
const action=(name,label,kind='',attrs='')=>'<button type="button" class="button '+kind+'" data-action="'+e(name)+'" '+attrs+'>'+label+'</button>';
const badge=(value,label='')=>'<span class="badge '+(value==='pending'?'muted':e(value))+'"><span class="dot"></span>'+e(label||labels.impact[value]||labels.status[value]||'Non disponible')+'</span>';
const lineBadge=r=>badge(r.impact)+' <span class="small">'+e(labels.status[r.status])+'</span>';
const empty=(text='Aucune observation pour ces filtres.')=>'<div class="empty">'+e(text)+'</div>';
const notice=text=>'<p class="notice">'+e(text)+'</p>';
const head=(section,title,description)=>'<header class="pagehead"><span class="eyebrow">'+e(section)+'</span><h1>'+e(title)+'</h1><p>'+e(description)+'</p></header>';
const section=(title,detail='',more='')=>'<div class="section-head"><div><h2>'+e(title)+'</h2><p>'+e(detail)+'</p></div>'+more+'</div>';
const btnSeg=(key,values,value,label=key)=>'<div class="seg" role="group" aria-label="'+e(label)+'">'+Object.entries(values).map(([k,v])=>'<button type="button" data-action="seg" data-key="'+e(key)+'" data-value="'+e(k)+'" class="'+(String(k)===String(value)?'active':'')+'" aria-pressed="'+(String(k)===String(value))+'">'+e(v)+'</button>').join('')+'</div>';
const table=(headings,rows)=>rows.length?'<div class="scroll"><table class="table"><thead><tr>'+headings.map(h=>'<th scope="col">'+e(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':empty();
const panel=(content,klass='')=>'<section class="panel '+klass+'">'+content+'</section>';
const valueCell=(value,unit,d)=>'<span class="num">'+num(value,d)+'</span>'+(Number.isFinite(value)&&unit?' '+e(unit):'');
function series(id,filter=state.filters){
  const base=seedPrices[id];
  const edits=data.quotes.filter(q=>q.series===id);
  const all=new Map(Object.entries(base.values).map(([period,value])=>[period,{value,source:base.pointSourceNames?.[period]||base.source,url:base.pointSources?.[period]||base.url,note:''}]));
  for(const q of edits)all.set(q.period,q);
  const eligible=(!filter.product||base.product===filter.product)&&(!filter.origin||base.origin===filter.origin)&&(!filter.status||filter.status==='confirmed');
  const since=stamp(asOf(),filter.period);
  const points=eligible?[...all.entries()].filter(([period,pt])=>{
    const date=base.grain==='month'?addDays(monthShift(period,1)+'-01',-1):period;
    return (!filter.source||pt.source===filter.source)&&(!since||date>=since&&date<=asOf());
  }).sort(([a],[b])=>a.localeCompare(b)):[];
  return {...base,values:Object.fromEntries(points.map(([k,v])=>[k,v.value])),points:Object.fromEntries(points)};
}
const linesFrom=(ids)=>ids.map((id,i)=>{const s=series(id);return {label:s.name,color:colors[i%colors.length],points:Object.entries(s.points).map(([date,point])=>({...point,date}))};});
const colors=['var(--series-1)','var(--series-2)','var(--series-3)','var(--series-4)','var(--series-5)','var(--series-6)','var(--series-7)'];
const yearMonths=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
const monthName=new Intl.DateTimeFormat('fr-FR',{month:'long',timeZone:'UTC'});
const monthDate=month=>new Date('2000-'+month+'-01T12:00:00Z');
function chartTicks(values,scale,zeroLine){
  if(scale==='zero'||zeroLine)values=[...values,0];
  const low=Math.min(...values),high=Math.max(...values);
  const range=high-low||Math.abs(high)*(scale==='tight'?.02:.15)||1;
  if(scale==='tight'){
    const margin=range*(high===low?.5:.03);
    const start=low>=0?Math.max(0,low-margin):low-margin;
    return Array.from({length:5},(_,i)=>start+(high+margin-start)*i/4);
  }
  const rawStep=range/4,power=10**Math.floor(Math.log10(rawStep));
  const step=[1,2,2.5,5,10].find(n=>n>=rawStep/power)*power;
  const bottom=Math.floor((low-range*.08)/step);
  const first=low>=0?Math.max(0,bottom):bottom;
  const last=Math.ceil((high+range*.08)/step);
  return Array.from({length:last-first+1},(_,i)=>(i+first)*step);
}
const chartModels=[];
const chartDefaults=last=>({height:'standard',scale:'auto',start:0,end:last,hidden:new Set()});
function chart(lines,{unit='',periodType='month',height=200,tooltips,seasonal=false,label='Historique '+unit,sourceLinks,zeroLine=false,startDate,maxGapDays,periodLabels}={}){
  const valid=lines.filter(l=>l.points.some(p=>Number.isFinite(p.value)));
  if(!valid.length)return empty('Série non disponible pour la sélection.');
  const dates=seasonal?yearMonths:[...new Set([...(startDate?[startDate]:[]),...valid.flatMap(l=>l.points.map(p=>p.date))])].sort();
  const periodLabel=date=>periodLabels?.[date]??(seasonal?monthName.format(monthDate(date)):displayPeriod(date,periodType));
  const periods=Object.fromEntries(dates.map((date,i)=>[i,periodLabel(date)]));
  const settings=chartDefaults(dates.length-1);
  const model={valid,dates,unit,periodType,height,tooltips,seasonal,settings,zeroLine,startDate,maxGapDays,periodLabels};
  const index=chartModels.push(model)-1;
  const selectSetting=(key,title,choices)=>'<label>'+e(title)+'<select aria-label="'+e(title)+'" data-chart-setting="'+key+'">'+options(choices,settings[key])+'</select></label>';
  const legend=valid.map((l,i)=>'<button type="button" data-chart-series="'+i+'" aria-pressed="true" title="Afficher ou masquer cette série"><i style="--series:'+l.color+'"></i>'+e(l.label)+'</button>').join('');
  return '<figure class="chart-wrap" aria-label="'+e(label)+'" data-chart="'+index+'">'+
    '<figcaption class="chart-key"><div class="legend" role="group" aria-label="Séries affichées">'+legend+'</div>'+(unit?'<span class="chart-unit">'+e(unit)+'</span>':'')+'</figcaption>'+
    '<details class="chart-settings"><summary>Réglages du graphique</summary><div class="chart-controls">'+
    selectSetting('height','Hauteur',{compact:'Compacte',standard:'Standard',large:'Agrandie'})+
    selectSetting('scale','Échelle verticale',{auto:'Automatique',tight:'Resserrée',zero:'Inclure zéro'})+
    selectSetting('start','Du',periods)+selectSetting('end','Au',periods)+
    '<button type="button" class="button" data-chart-reset>Réinitialiser</button></div></details>'+
    '<div class="chart-content">'+chartFrame(model)+'</div>'+
    chartSources(sourceLinks??refsFor(valid.flatMap(l=>l.points).filter(p=>Number.isFinite(p.value))))+'</figure>';
}
function bindChart(wrap,model){
  const content=wrap.querySelector('.chart-content');
  const refresh=()=>{
    const {settings}=model;
    for(const select of wrap.querySelectorAll('[data-chart-setting]'))select.value=settings[select.dataset.chartSetting];
    const legend=wrap.querySelectorAll('[data-chart-series]');
    for(const button of legend){
      const visible=!settings.hidden.has(Number(button.dataset.chartSeries));
      button.setAttribute('aria-pressed',visible);
      button.disabled=visible&&settings.hidden.size===legend.length-1;
    }
    content.innerHTML=chartFrame(model);
    const tooltip=content.querySelector('.chart-tooltip');
    if(tooltip)bindChartTooltip(tooltip);
  };
  wrap.addEventListener('change',event=>{
    const key=event.target.dataset.chartSetting;
    if(!key)return;
    const {settings}=model;
    settings[key]=key==='start'||key==='end'?Number(event.target.value):event.target.value;
    if(key==='start'&&settings.start>settings.end)settings.end=settings.start;
    if(key==='end'&&settings.end<settings.start)settings.start=settings.end;
    refresh();
  });
  wrap.addEventListener('click',event=>{
    const button=event.target.closest('[data-chart-series],[data-chart-reset]');
    if(!button)return;
    if(button.hasAttribute('data-chart-reset'))model.settings=chartDefaults(model.dates.length-1);
    else{
      const index=Number(button.dataset.chartSeries),hidden=model.settings.hidden;
      if(hidden.has(index))hidden.delete(index);
      else hidden.add(index);
    }
    refresh();
  });
  if(model.valid.length===1)wrap.querySelector('[data-chart-series]').disabled=true;
  const tooltip=content.querySelector('.chart-tooltip');
  if(tooltip)bindChartTooltip(tooltip);
}
function chartFrame({valid,dates:allDates,unit,periodType,height,tooltips,seasonal,settings,zeroLine,startDate,maxGapDays,periodLabels}){
  const dates=allDates.slice(settings.start,settings.end+1);
  const dateSet=new Set(dates);
  const key=p=>seasonal?p.date.slice(5):p.date;
  const lines=valid.filter((_,i)=>!settings.hidden.has(i)).map(line=>({...line,points:line.points.filter(p=>dateSet.has(key(p)))}));
  const values=lines.flatMap(l=>l.points.map(p=>p.value)).filter(Number.isFinite);
  if(!values.length)return empty('Aucune observation pour les séries et la période sélectionnées.');
  const ticks=chartTicks(values,settings.scale,zeroLine);
  const min=ticks[0],max=ticks.at(-1);
  const tickDigits=Math.max(0,Math.ceil(-Math.log10(ticks[1]-min))+1);
  const dateValues=startDate?dates.map(date=>Date.parse(date)):[];
  const x=i=>dates.length===1?50:startDate?
    100*(dateValues[i]-dateValues[0])/(dateValues.at(-1)-dateValues[0]):100*i/(dates.length-1);
  const y=v=>100*(max-v)/(max-min);
  const column=p=>dates.indexOf(key(p));
  const tickCount=Math.min(7,dates.length);
  const axisColumns=seasonal||tickCount===1?dates.map((_,i)=>i):Array.from({length:tickCount},(_,i)=>Math.round(i*(dates.length-1)/(tickCount-1)));
  const multiYear=dates[0].slice(0,4)!==dates.at(-1).slice(0,4);
  const axisLabel=d=>periodLabels?.[d]??(seasonal?smallMonth('2000-'+d):periodType==='month'?smallMonth(d)+(multiYear?' '+d.slice(2,4):''):periodType==='day'||periodType==='week'?d.slice(8)+' '+smallMonth(d)+(startDate&&multiYear?' '+d.slice(2,4):''):d);
  const yLabels=ticks.map(v=>'<span style="--y:'+y(v)+'%">'+e(num(v,tickDigits))+'</span>').join('');
  const lastTick=x(axisColumns.at(-1));
  const axisTicks=startDate?axisColumns.filter((column,i)=>i===axisColumns.length-1||lastTick-x(column)>=12):axisColumns;
  const xLabels=axisTicks.map(i=>'<span style="--x:'+x(i)+'%">'+e(axisLabel(dates[i]))+'</span>').join('');
  const gridValues=zeroLine&&!ticks.includes(0)?[...ticks,0]:ticks;
  const grid=gridValues.map(v=>'<line class="grid'+(v===0?' zero':'')+'" x1="0" x2="100" y1="'+y(v)+'" y2="'+y(v)+'"/>').join('');
  const paths=[],points=[];
  for(const l of lines){
    const path=l.points.map((p,i)=>{
      if(!Number.isFinite(p.value))return '';
      const previous=l.points[i-1];
      const gap=maxGapDays&&(Date.parse(p.date)-Date.parse(previous?.date))/86400000>maxGapDays;
      const command=Number.isFinite(previous?.value)&&!gap?'L':'M';
      return command+x(column(p))+','+y(p.value);
    }).join(' ');
    paths.push('<path class="chart-line" d="'+path+'" stroke="'+l.color+'" stroke-width="'+(l.width??2.25)+'"/>');
    for(const p of l.points){
      if(!Number.isFinite(p.value))continue;
      const index=column(p);
      const period=periodLabels?.[p.date]??displayPeriod(p.date,periodType);
      const reading=tooltips?tooltips(p):num(p.value)+(unit?' '+unit:'');
      const heading=seasonal?monthName.format(monthDate(dates[index])):period;
      const pointLabel=seasonal?period+' · '+reading:period+' · '+l.label+' · '+reading;
      points.push('<button type="button" class="chart-point" tabindex="'+(points.length?'-1':'0')+'" aria-label="'+e(pointLabel)+'" data-column="'+index+'" data-heading="'+e(heading)+'" data-series="'+e(l.label)+'" data-reading="'+e(reading)+'" style="--x:'+x(index)+'%;--y:'+y(p.value)+'%;--series:'+l.color+'"></button>');
    }
  }
  const plotHeight={compact:185,standard:height+75,large:height+220}[settings.height];
  return '<div class="chart-view" style="--plot-height:'+plotHeight+'px" data-columns="'+dates.length+'"'+(startDate?' data-calendar-axis':'')+'>'+
    '<div class="chart-frame"><div class="chart-axis-y" aria-hidden="true">'+yLabels+'</div><div class="chart-plot">'+
    '<svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+grid+paths.join('')+'</svg>'+
    '<div class="chart-guide" hidden></div>'+points.join('')+'</div><div class="chart-axis-x" aria-hidden="true">'+xLabels+'</div></div>'+
    '<div class="chart-tooltip" aria-hidden="true" hidden></div></div>';
}
function bindChartTooltip(tooltip){
  const wrap=tooltip.parentElement,plot=wrap.querySelector('.chart-plot'),guide=plot.querySelector('.chart-guide');
  const columns=new Map();
  for(const point of plot.querySelectorAll('.chart-point')){
    const index=Number(point.dataset.column);
    if(!columns.has(index))columns.set(index,[]);
    columns.get(index).push(point);
  }
  const indexes=[...columns.keys()].sort((a,b)=>a-b);
  const slots=Number(wrap.dataset.columns);
  let active=null;
  function show(point){
    if(active===point)return;
    active?.removeAttribute('data-active');
    active=point;
    tooltip.hidden=guide.hidden=!point;
    if(!point)return;
    point.setAttribute('data-active','');
    guide.style.left=point.style.getPropertyValue('--x');
    const rows=columns.get(Number(point.dataset.column)).map(row=>
      '<div class="chart-reading'+(row===point?' selected':'')+'"><i style="--series:'+row.style.getPropertyValue('--series')+'"></i><span>'+e(row.dataset.series)+'</span><b>'+e(row.dataset.reading)+'</b></div>').join('');
    tooltip.innerHTML='<strong>'+e(point.dataset.heading)+'</strong>'+rows;
    const bounds=wrap.getBoundingClientRect(),dot=point.getBoundingClientRect(),plotBounds=plot.getBoundingClientRect();
    const center=(dot.left+dot.right)/2-bounds.left;
    const width=tooltip.offsetWidth;
    const left=center+14+width<=bounds.width?center+14:center-14-width;
    tooltip.style.left=Math.max(0,Math.min(left,bounds.width-width))+'px';
    tooltip.style.top=(plotBounds.top-bounds.top+9)+'px';
  }
  function fromPointer(event){
    const bounds=plot.getBoundingClientRect();
    const index=Math.max(0,Math.min(slots-1,Math.round((event.clientX-bounds.left)/bounds.width*(slots-1))));
    const relativeX=(event.clientX-bounds.left)/bounds.width*100;
    const gapX=i=>Math.abs(parseFloat(columns.get(i)[0].style.getPropertyValue('--x'))-relativeX);
    const group=columns.get(wrap.hasAttribute('data-calendar-axis')?
      indexes.reduce((nearest,i)=>gapX(i)<gapX(nearest)?i:nearest):index);
    if(!group){show(null);return;}
    const relativeY=(event.clientY-bounds.top)/bounds.height*100;
    const gap=p=>Math.abs(parseFloat(p.style.getPropertyValue('--y'))-relativeY);
    show(group.reduce((nearest,p)=>gap(p)<gap(nearest)?p:nearest));
  }
  plot.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')fromPointer(event);});
  plot.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')show(null);});
  plot.addEventListener('click',event=>{
    if(event.detail===0&&event.target.matches('.chart-point'))show(event.target);
    else fromPointer(event);
  });
  plot.addEventListener('focusin',event=>{if(event.target.matches('.chart-point'))show(event.target);});
  plot.addEventListener('focusout',event=>{if(!plot.contains(event.relatedTarget))show(null);});
  plot.addEventListener('keydown',event=>{
    if(event.key==='Escape'){show(null);return;}
    const point=event.target;
    if(!point.matches('.chart-point'))return;
    const index=Number(point.dataset.column),group=columns.get(index);
    const columnIndex=indexes.indexOf(index),rowIndex=group.indexOf(point);
    let next;
    if(event.key==='ArrowLeft')next=columns.get(indexes[columnIndex-1])?.[0];
    if(event.key==='ArrowRight')next=columns.get(indexes[columnIndex+1])?.[0];
    if(event.key==='ArrowUp')next=group[rowIndex-1];
    if(event.key==='ArrowDown')next=group[rowIndex+1];
    if(!event.key.startsWith('Arrow'))return;
    event.preventDefault();
    if(next){
      plot.querySelector('[tabindex="0"]').tabIndex=-1;
      next.tabIndex=0;
      next.focus({preventScroll:true});
    }
  });
}
function filters(){
  return '<div class="filterbar"><label class="filter-title">'+icon('filter')+' Filtres</label>'+
  (state.page==='soy'?'':select('product',products,state.filters.product,'Tous les produits','data-filter')+
  select('origin',origins,state.filters.origin,'Toutes les origines','data-filter'))+
  select('period',periodLabel,state.filters.period,'Toute période','data-filter')+
  select('horizon',labels.horizon,state.filters.horizon,'Tous les horizons','data-filter')+
  select('impact',labels.impact,state.filters.impact,'Tous les impacts','data-filter')+
  select('source',allSources(),state.filters.source,'Toutes les sources','data-filter')+
  select('status',labels.status,state.filters.status,'Tous les statuts','data-filter')+
  (Object.values(state.filters).some(Boolean)?action('reset','Réinitialiser','ghost'):'')+'</div>';
}
function shell(body){
  const priceIds=['bo','zs','sm','fcpo-jan27','cpo-south-cash','brent-daily','wti-daily','fx-eur','fx-mad','rape-feb27','sbo-arg-official','wb-sbo','wb-palm','dce','go','ho'];
  const ticks=priceIds.map(id=>{
    const s=series(id,{}), dates=Object.keys(s.values),last=dates.at(-1),prev=dates.at(-2);
    const change=pct(s.values[last],s.values[prev]);const direction=change>0?'positive':change<0?'negative':'muted';
    return '<div class="tick" title="'+e(last?displayPeriod(last,s.grain)+' · '+s.points[last].source+' · '+s.definition:'Série non disponible')+'"><span>'+e(s.name)+'</span><div><b class="num">'+num(s.values[last],2)+'</b><small class="'+direction+'">'+(change===null?e(last?s.unit:'Non dispo.'):e(percent(change)))+'</small></div></div>';
  }).join('');
  return '<div class="shell'+(state.mobile?' nav-open':'')+'"><aside class="sidebar" aria-label="Navigation principale"><a class="brand" href="#overview"><img src="./favicon.svg?v=20261109-ui" alt=""><div><strong>Oléa Terminal</strong><small>Intelligence de marché</small></div></a><nav class="navlist">'+menu.map(([group,items])=>'<p class="navlabel">'+e(group)+'</p>'+items.map(([key,title,ico])=>'<a class="navlink '+(state.page===key?'active':'')+'" '+(state.page===key?'aria-current="page"':'')+' href="#'+key+'">'+icon(ico)+e(title)+'</a>').join('')).join('')+'</nav><div class="sidefoot"><a class="navlink '+(state.page==='sources'?'active':'')+'" href="#sources">'+icon('database')+' Sources & données</a><small>Casablanca · Veille de marché</small></div></aside><div class="workarea"><header class="topbar"><div class="topbar-left">'+action('menu',icon('menu'),'icon mobile-toggle','aria-label="Ouvrir le menu" aria-expanded="'+state.mobile+'"')+'<span class="crumb"><span>Terminal / </span><strong>'+e(nav[state.page])+'</strong></span></div><div class="actions"><span class="snapshot"><span class="dot"></span>Données au '+e(formatDate(asOf()))+'</span>'+action('theme',icon(state.theme==='dark'?'sun':'moon'),'icon','aria-label="Changer de thème" title="Changer de thème"')+action('add',icon('plus')+' <span>Ajouter une donnée</span>','primary','aria-label="Ajouter une donnée"')+'</div></header><div class="ticker" aria-label="Repères datés">'+ticks+'</div><main class="content" id="main">'+(['biofuels','demand','balances','cbot-arg','cot'].includes(state.page)||state.page==='cross'&&state.crossView!=='pairs'?'':filters())+body+'<footer class="footer"><span>OLÉA TERMINAL · VEILLE SOURCÉE · AFRICA/CASABLANCA</span><span><a href="#sources">Sources et couverture</a> · Données datées</span></footer></main></div></div><dialog id="detail" class="dialog"></dialog><dialog id="entry" class="dialog"></dialog><div id="printout" class="printonly"></div><div id="toast" class="toast" role="status" hidden></div>';
}


const eventBtn=r=>'<button type="button" class="cell-link" data-action="event" data-id="'+e(r.id)+'">'+e(r.title)+'</button>';
const eventRows=rows=>table(['Publication','Marché / origine','Facteur','Chiffre / variation','Impact / validation','Horizon / source'],rows.map(r=>[
  '<span class="num">'+e(formatDate(r.date))+'</span><small>'+e(r.time||'Heure non disponible')+'</small>',
  e(products[r.product])+'<small>'+e(origins[r.origin])+'</small>',
  eventBtn(r)+'<small>'+e(labels.category[r.category])+' · '+e(r.period)+'</small>',
  e(r.number)+'<small>'+e(r.variation)+'</small>',
  lineBadge(r)+'<small>Intensité '+e(labels.intensity[r.intensity].toLowerCase())+'</small>',
  e(labels.horizon[r.horizon])+'<small>'+link(r.url,r.source)+'</small>',
]));
const calendarFilter=(filter=state.filters)=>fullCalendar().filter(r=>allows(r,filter,asOf(),{})&&(!filter.status||filter.status===(r.date?'confirmed':'pending')));
const calMini=r=>'<div class="calendar-mini"><div class="datebox">'+(r.date?'<strong>'+Number(r.date.slice(-2))+'</strong>'+e(smallMonth(r.date)):'À conf.')+'</div><div><button class="cell-link" data-action="cal" data-id="'+e(r.id)+'">'+e(r.title)+'</button><p>'+e(r.time?r.time+' · '+r.zone:r.date?'Heure à confirmer':r.source)+' · '+e(labels.intensity[r.importance])+'</p></div></div>';
const checkedStatus=r=>['confirmed','estimate','projection','consensus'].includes(r.status);
function ranked(rows,impact,horizon){
  return rows.filter(r=>r.impact===impact&&(!horizon||r.horizon===horizon)&&checkedStatus(r)).sort((a,b)=>b.intensity-a.intensity||byDate(a,b));
}
function renderOverview(){
  const scoped=eventsFor(), now=asOf(), sentimentData=sentiment(scoped,now);
  const {score,count,coverage,orientation,contributions}=sentimentData;
  const sentimentBox='<div class="gauge"><div class="spread-between"><span class="eyebrow">Sentiment de marché</span>'+badge(orientation)+'</div><div class="num score">'+sign(score,0)+' <span class="small">/ 100</span></div><div class="gaugebar">'+(score===null?'':'<i style="left:'+((score+100)/2)+'%"></i>')+'</div><div class="spread-between scale mono"><span>−100</span><span>0</span><span>+100</span></div><details><summary>'+coverage+'/6 piliers · '+count+' facteurs · méthode</summary><p>Sur 30 jours, moyenne signée de l’intensité et de la fiabilité dans chaque pilier, puis somme pondérée. Un pilier sans donnée contribue à 0. Cet indicateur résume les facteurs disponibles.</p><p>'+contributions.map(c=>e(labels.category[c.key])+' '+scoreWeights[c.key]+' % ('+sign(c.value,1)+')').join(' · ')+'</p><p>Fiabilité des données confirmées ×1, estimations/projections ×0,55, consensus ×0,45. Mixte et neutre valent 0. Seuils haussier/baissier ±12, neutre entre −3 et +3.</p></details></div>';
  const hero='<section class="hero"><div><span class="eyebrow">Marchés mondiaux · Huiles végétales</span><h1>Vue d’ensemble</h1><p>Suivez les prix de référence, les bilans et les facteurs qui influencent les marchés du soja, du tournesol, de la palme et du colza.</p><div class="actions">'+route('drivers',icon('pulse')+' Explorer les facteurs','primary')+route('comex',icon('brief')+' Préparer le COMEX','ghost')+'</div></div>'+sentimentBox+'</section>';
  const marketCards=cards.filter(c=>(!state.filters.product||c.related.includes(state.filters.product))&&(!state.filters.origin||c.origins.includes(state.filters.origin))).map(c=>{
    const rows=scoped.filter(r=>c.related.includes(r.product)&&c.origins.includes(r.origin));
    const s=sentiment(rows,now,90), top=[...rows].sort((a,b)=>b.intensity-a.intensity||byDate(a,b));
    const drivers=[...new Set([...top.map(r=>r.title),...c.drivers])].slice(0,3);
    const confidence=s.count===0?'Non évaluable':s.coverage>=3&&s.count>=6?'Élevée':s.count>=3?'Modérée':'Limitée';
    return '<a href="#'+c.group+'" data-market="'+c.key+'" class="market-card"><span class="market-code">'+e(c.code)+'</span><h3>'+e(c.title)+'</h3>'+badge(s.orientation)+'<p class="small" style="margin-top:7px">'+e(top[0]?.number?top[0].number+' · '+top[0].variation:c.summary)+'</p><ul>'+drivers.map(d=>'<li title="'+e(d)+'">'+e(d)+'</li>').join('')+'</ul><footer>'+e(confidence)+' · '+(rows[0]?e(formatDate(rows[0].date)):'À confirmer')+'</footer></a>';
  });
  const chartIds=state.chart==='oils'?['wb-sbo','wb-palm']:state.chart==='grains'?['wb-soy','wb-sm']:['brent','wti'];
  const pricePanel=panel('<div class="spread-between"><div><h2>Historique des prix</h2><p class="small">Moyennes mensuelles</p></div>'+btnSeg('chart',{oils:'Huiles',grains:'Graines et tourteaux',energy:'Pétrole'},state.chart)+'</div>'+chart(linesFrom(chartIds),{unit:state.chart==='energy'?'USD/b':'USD/t'}));
  const next=calendarFilter().filter(r=>r.date&&r.date>=now).slice(0,4);
  const agenda=panel('<div class="spread-between"><h2>À surveiller</h2><a class="small" href="#calendar">Calendrier '+icon('arrow',14)+'</a></div>'+(next.length?next.map(calMini).join(''):empty('Aucune publication datée dans la sélection.')));
  const selected=scoped.filter(r=>r.date>=stamp(now,state.eventWindow)&&r.date<=now);
  const list=(rows,blank)=>rows.length?'<ul class="brief-list">'+rows.slice(0,3).map(r=>'<li>'+eventBtn(r)+'<small>'+e(r.number+' · '+r.variation)+'</small></li>').join('')+'</ul>':empty(blank);
  const near=selected.filter(r=>r.status==='consensus'||r.status==='estimate'||r.status==='pending'||['geo','logistics','weather'].includes(r.category));
  const pers=panel('<h2>Perspectives</h2><p class="analysis-text"><strong>Court terme</strong> · '+e((ranked(scoped,'negative','short')[0]||ranked(scoped,'positive','short')[0])?.caveat||'Les prochains bilans et cotations aideront à préciser la tendance.')+'</p><p class="analysis-text"><strong>Moyen terme</strong> · '+e((ranked(scoped,'negative','medium')[0]||ranked(scoped,'positive','medium')[0])?.caveat||'À confirmer avec les révisions des bilans.')+'</p><a href="#outlook">Comparer les scénarios '+icon('arrow',14)+'</a>');
  return hero+'<div class="dashboard-grid">'+pricePanel+agenda+'</div>'+
    section('Marchés clés','Orientation issue des événements disponibles sur 90 jours','<a href="#balances">Bilans '+icon('arrow',14)+'</a>')+(marketCards.length?'<div class="market-grid">'+marketCards.join('')+'</div>':empty())+
    section('Ce qui a changé','Fenêtre relative au point de veille affiché en haut de page',btnSeg('eventWindow',{1:'24 h',7:'7 j',30:'30 j'},state.eventWindow))+panel(eventRows(selected.slice(0,7)))+
    section('Lecture des facteurs','Les signaux sont classés par intensité et par date')+'<div class="grid3">'+panel('<h3 class="positive">Soutiens de prix</h3>'+list(ranked(selected,'positive'),'Aucun soutien documenté.'))+panel('<h3 class="negative">Pressions baissières</h3>'+list(ranked(selected,'negative'),'Aucune pression documentée.'))+panel('<h3 class="mixed">Risques et anticipations</h3>'+list(near,'Aucun risque nouveau documenté.'))+'</div><div style="margin-top:12px">'+pers+'</div>';
}
function monthlyHistory(title,rows,names,sourceLinks,note){
  const period=displayPeriod(rows[0][0],'month')+' – '+displayPeriod(rows.at(-1)[0],'month');
  const lines=names.map((label,i)=>({label,color:colors[i],points:rows.map(([date,...values])=>({date,value:values[i]/1000,tonnes:values[i]}))}));
  const exactRows=rows.slice().reverse().map(([date,...values])=>[e(displayPeriod(date,'month')),...values.map(value=>valueCell(value,'t',0))]);
  return section(title,period+' · '+rows.length+' mois · milliers de tonnes')+
    panel(chart(lines,{unit:'kt',height:222,label:title+' en milliers de tonnes',tooltips:p=>num(p.tonnes,0)+' t',sourceLinks})+(note?'<p class="analysis-text">'+e(note)+'</p>':'')+
      '<details><summary class="small">Voir les chiffres mensuels en tonnes</summary>'+
      table(['Mois',...names],exactRows)+'</details>');
}
function mpobHistoryPanel(){
  const latest=mpobHistory.at(-1).slice(1);
  const previous=mpobHistory.at(-2).slice(1);
  const names=['Stocks fin de mois','Production de CPO','Exportations d’huile de palme'];
  return section('Malaisie · Bilan MPOB d’octobre','Publié le 10 novembre 2026 · données provisoires')+
    '<div class="grid3">'+names.map((name,i)=>panel('<h3>'+e(name)+'</h3><p>'+num(latest[i]/1e6,3)+' Mt</p><p class="small">'+e(sign(pct(latest[i],previous[i]),2)+' % m/m')+'</p>')).join('')+'</div>'+
    monthlyHistory('Malaisie · Historique MPOB',mpobHistory,names,
    mpobHistorySources);
}
const seasonalColors=colors.slice(1);
function seasonalHistory(title,years,sourceLinks,note='',digits=4){
  const latest=years.at(-1);
  const lastMonth=yearMonths[latest.volumes.findLastIndex(Number.isFinite)];
  const lines=years.map(({year,volumes},i)=>({
    label:year,color:year===latest.year?colors[0]:seasonalColors[i%seasonalColors.length],width:year===latest.year?3.5:2,
    points:volumes.map((value,m)=>({date:year+'-'+yearMonths[m],value})),
  }));
  const rows=yearMonths.map((month,m)=>[e(smallMonth('2000-'+month)),...years.map(({volumes})=>num(volumes[m],digits))]);
  return section(title,'Dernière observation · '+displayPeriod(latest.year+'-'+lastMonth,'month')+' · millions de tonnes')+
    panel(chart(lines,{unit:'Mt',height:244,seasonal:true,label:title+' en millions de tonnes',tooltips:p=>num(p.value,digits)+' Mt',sourceLinks})+note+
      '<details><summary class="small">Voir les valeurs mensuelles en Mt</summary>'+table(['Mois',...years.map(y=>y.year)],rows)+'</details>');
}
const eiaFeedstocks='https://www.eia.gov/dnav/pet/pet_pnp_feedbiofuel_dcu_nus_m.htm';
const eiaHistory=code=>[['EIA · Historique mensuel','https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=M&n=PET&s='+code]];
const biofuelUi={section,panel,chart,chartSources,table,e,num,sign,formatDate,csv};
function renderBiofuels(){
  const today=new Date().toISOString().slice(0,10);
  return head('Analyse','Biocarburants','Mandats EPA et B50, consommation réelle d’huiles et simulations de demande.')+
    renderBiofuelPolicy(biofuelUi,{
      totalSoy:biofuelNativeSeries.soybean[2026],canola:biofuelNativeSeries.canola[2026],balance:worldBalances.palm,
      prices:{
        hip:spreadLegPoints('hip',spreadPrices).map(point=>point.date==='2026-11-01'?{...point,url:'https://ebtke.esdm.go.id/artikel/pengumuman/hip-bbn-jenis-biodiesel-bulan-november-2026'}:point),
        gasoil:spreadLegPoints('gasoil',spreadPrices),rates:spreadLegPoints('usdi',spreadPrices),density:GASOIL_KG_PER_LITRE,date:today,
        refs:[
          [spreadLegs.hip.source,'https://ebtke.esdm.go.id/artikel/pengumuman/hip-bbn-jenis-biodiesel-bulan-november-2026'],
          [spreadLegs.gasoil.source,spreadLegs.gasoil.url],
          ['BCE · Taux de change de référence','https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html'],
        ],
      },
    })+
    '<div id="bio-eia" tabindex="-1">'+section('États-Unis · Consommation saisonnière EIA','Chaque courbe représente une année de janvier à décembre.')+
    '<p class="small">'+link(eiaFeedstocks,'EIA · Feedstocks Consumed for Production of Biofuels')+' · Publication du '+e(formatDate(biofuelReleaseDate))+'. Les mois masqués par l’EIA ou encore non publiés restent vides.</p>'+
    seasonalHistory('Huile de soja · Total',biofuelSeries.soybean,eiaHistory('M_EPOOBDSO_YIFBP_NUS_MMLB'))+
    seasonalHistory('Huile de canola · Total',biofuelSeries.canola,eiaHistory('M_EPOOBDCO_YIFBP_NUS_MMLB'))+'</div>';
}
function indiaOriginChart(title,rows,column,share,source){
  const ranked=rows.filter(row=>row[column]>0).sort((a,b)=>b[column]-a[column]);
  const total=ranked.reduce((sum,row)=>sum+row[column],0);
  const axisMax=share?100:Math.ceil(ranked[0][column]/500000)*500000;
  const label=(value)=>share?num(value,1)+' %':num(value/1000000,2)+' Mt';
  const bars=ranked.map(row=>{
    const tonnes=row[column],part=tonnes/total*100;
    const value=share?part:tonnes;
    return '<li class="origin-row" title="'+e(num(tonnes,0)+' t · '+num(part,1)+' %')+'"><span>'+e(row[0])+'</span><span class="num">'+e(label(value))+'</span>'+
      '<div class="origin-track" aria-hidden="true"><div style="--origin-width:'+(value/axisMax*100)+'%"></div></div></li>';
  }).join('');
  const tableRows=ranked.map(row=>[e(row[0]),valueCell(row[column],'t',0),valueCell(row[column]/total*100,'%',1)]);
  return panel('<h3>'+e(title)+'</h3><p class="small">Total importé · '+e(num(total/1000000,3))+' Mt</p>'+
    '<figure class="origin-figure" aria-label="'+e(title+' par pays fournisseur')+'"><div class="origin-axis" aria-hidden="true"><span>'+label(0)+'</span><span>'+label(axisMax)+'</span></div>'+
    '<ol class="origin-bars">'+bars+'</ol>'+chartSources([source])+'</figure>'+
    '<details><summary class="small">Voir les volumes en tonnes et les parts</summary>'+
    table(['Origine','Volume','Part du total'],tableRows)+'</details>','origin-card');
}
function renderIndiaOrigins(){
  const period=state.indiaOriginPeriod;
  const {label,duration,rows}=indiaOrigins[period];
  const share=state.indiaOriginMode==='share';
  const periodOptions=Object.fromEntries(Object.entries(indiaOrigins).map(([year,p])=>[year,p.label+' ('+p.duration+')']));
  const source=seaHistorySources[Object.keys(indiaOrigins).indexOf(period)];
  return section('Inde · Importations par pays fournisseur',label+' · '+duration)+
    '<div class="toolbar"><label>Campagne</label>'+select('indiaOriginPeriod',periodOptions,period)+
    '<label>Affichage</label>'+select('indiaOriginMode',{volume:'Volume (Mt)',share:'Part des importations (%)'},state.indiaOriginMode)+'</div>'+
    '<div class="grid3 origin-grid">'+
    indiaOriginChart('Huile de palme',rows,1,share,source)+
    indiaOriginChart('Huile de tournesol',rows,2,share,source)+
    indiaOriginChart('Huile de soja',rows,3,share,source)+'</div>'+
    '<p class="analysis-text">Palme : huile brute, oléine RBD et huile brute de palmiste. Soja et tournesol : brut et raffiné lorsque ventilés par SEA. Le bulletin 2023/24 ventile le soja et le tournesol bruts. « Autres origines » reprend le regroupement publié par SEA.</p>';
}
function renderDemand(){
  const indiaEstimates=seedEvents.filter(event=>event.id.startsWith('market-1104-ind-'));
  return head('Analyse','Demande','Suivez les importations indiennes d’huiles végétales et comparez la saisonnalité des importations chinoises de graines de soja.')+
    monthlyHistory('Inde · Importations SEA India',seaHistory,['Huile de palme','Huile de tournesol','Huile de soja'],
      seaHistorySources,'Le total palme inclut CPO, oléine brute et RBD, et huile de palmiste brute. Le soja et le tournesol incluent les volumes raffinés comptabilisés par SEA. La révision 2024/25 intègre les flux du Népal.')+
    section('Inde · Estimations d’octobre','Négociants interrogés par Reuters · le tableau SEA suit les publications officielles')+panel(eventRows(indiaEstimates))+
    renderIndiaOrigins()+
    seasonalHistory('Chine · Importations de graines de soja',chinaSoybeanImports,chinaSoybeanSources,
      '<p class="analysis-text">Douanes chinoises (GACC), toutes origines. Une courbe par année civile depuis 2020. Les mois non publiés restent vides.</p>',3);
}
const soyFamilies={soy:'Graines de soja · Soybeans',sbo:'Huile de soja · Soyoil'};
const soyOrigins={us:origins.us,arg:origins.arg,bra:origins.bra};
function seasonYearSelection(dates,scope){
  const available=[...new Set(dates.map(date=>date.slice(0,4)))].sort().reverse();
  const saved=state.seasonYears[scope];
  const selected=available.filter(year=>saved?.includes(year));
  return {scope,available,selected:selected.length?selected:available.slice(0,4)};
}
function seasonYearPicker({scope,available,selected}){
  const buttons=available.map(year=>{
    const active=selected.includes(year);
    return '<button type="button" data-action="season-year" data-value="'+e(year)+'" aria-pressed="'+active+'"'+
      (active?' class="active"':'')+(active&&selected.length===1?' disabled':'')+'>'+e(year)+'</button>';
  }).join('');
  return '<fieldset class="panel season-year-picker" data-season-scope="'+e(scope)+'"><legend>Années à comparer</legend>'+
    '<p class="small">Chaque courbe représente une année civile. La sélection s’applique à tous les graphiques mensuels de cette origine.</p>'+
    '<div class="seg">'+buttons+'</div></fieldset>';
}
function seasonalMetricPanel(name,points,years,{label,sourceLinks,tooltips=p=>num(p.value,6)+' Mt',note=''}){
  const selectedPoints=points.filter(p=>years.includes(p.date.slice(0,4)));
  const last=selectedPoints.findLast(p=>Number.isFinite(p.value));
  const byDate=new Map(selectedPoints.map(point=>[point.date,point]));
  const lines=years.map((year,i)=>({label:year,color:colors[i%colors.length],points:yearMonths.map(month=>{
    const date=year+'-'+month;
    return byDate.get(date)??{date,value:null};
  })}));
  const graph=last?chart(lines,{unit:'Mt',seasonal:true,label,tooltips,sourceLinks}):
    empty('Aucune observation pour les années sélectionnées.')+chartSources(sourceLinks);
  return panel('<h3>'+e(name)+'</h3>'+(last?'<p class="small">'+e(displayPeriod(last.date,'month')+' · '+tooltips(last))+'</p>':'')+
    graph+(note?'<p class="small">'+e(note)+'</p>':''));
}
const soyHistoryLabels={
  soy:['Importations','Exportations','Trituration (NOPA)'],
  sbo:['Importations','Exportations','Consommation intérieure','Stocks de fin de mois (NOPA)'],
};
const usSoyYearbook='https://www.ers.usda.gov/data-products/oil-crops-yearbook';
const usSoyNass='https://esmis.nal.usda.gov/publication/fats-and-oils-oilseed-crushings-production-consumption-and-stocks';
const usSoyTrade='https://www.census.gov/foreign-trade/data/dataproducts.html';
function usSoyDisplayRows(family){
  return usSoyHistory[family].map(([date,imports,exports,domestic])=>{
    const nopa=nopaHistory.get(date);
    return family==='soy'?[date,imports,exports,nopa?.crush??null]:[date,imports,exports,domestic,nopa?.stocks??null];
  });
}
function usSoyHistoryPanels(family){
  const rows=usSoyDisplayRows(family);
  const years=seasonYearSelection(rows.map(([date])=>date),'soy-us');
  const names=soyHistoryLabels[family];
  const beans=family==='soy';
  const before=beans?'août 2025':'sept. 2025';
  const after=beans?'sept. 2025':'oct. 2025';
  const yearbook=['USDA ERS · Tableau '+(beans?6:8)+' (jusqu’en '+before+')',usSoyYearbook];
  const nass=['USDA NASS · Fats and Oils',usSoyNass];
  const trade=['U.S. Census · Commerce SH '+(beans?'1201':'1507'),usSoyTrade];
  const charts=names.map((name,i)=>{
    const isNopa=i===names.length-1;
    const recent=i<2?[trade]:[nass,trade];
    const sourceLinks=isNopa?[['NOPA · Monthly Crush Report',nopaReport]]:
      [yearbook,...recent.map(([label,url])=>[label+' (depuis '+after+')',url])];
    const points=rows.map(([date,...values])=>({date,value:values[i]}));
    return seasonalMetricPanel(name,points,years.selected,{label:products[family]+' · '+name,sourceLinks,
      note:isNopa?'Chiffres NOPA relayés publiquement. Voir les références par mois dans le tableau.':''});
  });
  const headers=['Mois',...names.map(name=>name+' (Mt)'),'Publication relayant NOPA'];
  const tableRows=rows.toReversed().map(([date,...values])=>{
    const ref=nopaHistory.get(date)?.source;
    return [e(displayPeriod(date,'month')),...values.map(v=>valueCell(v,'',6)),ref?link(ref[1],ref[0]):'—'];
  });
  const notes=family==='soy'?'La trituration couvre les volumes déclarés par les membres de NOPA. Les mois sans chiffre NOPA vérifié restent vides.':
    'La consommation intérieure apparente inclut l’alimentaire, l’alimentation animale, les usages industriels et les biocarburants. Elle correspond au stock d’ouverture, augmenté de la production et des importations, moins les exportations et le stock de clôture. Le calcul de consommation utilise les stocks nationaux de l’USDA. Le graphique des stocks couvre les stocks de fin de mois déclarés par les membres de NOPA. Les mois sans chiffre NOPA vérifié restent vides.';
  return section(products[family]+' · États-Unis','Historique mensuel depuis janvier 2020 · millions de tonnes métriques')+
    seasonYearPicker(years)+'<div class="grid2 flow">'+charts.join('')+'</div>'+
    section('Données mensuelles','Valeurs en millions de tonnes métriques',
      action('export-soy-us',icon('download')+' Télécharger le CSV','ghost'))+
    panel('<p class="analysis-text">'+e(notes)+'</p>'+
      '<p class="small">Le commerce récent repose sur les importations pour consommation et les exportations totales.</p>'+
      '<details><summary class="small">Voir le tableau mensuel</summary>'+table(headers,tableRows)+'</details>');
}
const arSoyTrade=['INDEC · COMEX Argentina','https://comex.indec.gob.ar/'];
const arSoyMilling=['SAGyP · Trituration et production','https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/areas/granos/_archivos/000058_Estad%C3%ADsticas/000032_Evolucion%20de%20la%20Molienda%20(Cereales%20y%20Oleaginosas)/000002_Evoluci%C3%B3n%20de%20la%20Molienda%20Mensual%20-%20Oleaginosas/000002_Evoluci%C3%B3n%20de%20la%20Molienda%20Mensual%20-%20Oleaginosas.php'];
const arSoyStocks=['SAGyP · Stocks industriels par province','https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/areas/granos/_archivos/000058_Estad%C3%ADsticas/000031_Existencias%20de%20Granos%20de%20Aceites%20y%20Subproductos%20por%20Provincia/000001_Existencias%20de%20Aceites%20y%20Subproductos%20por%20Provincia.php'];
const arSoyMetrics={
  soy:[['Importations',[arSoyTrade]],['Exportations',[arSoyTrade]],['Trituration',[arSoyMilling]]],
  sbo:[['Importations publiées',[arSoyTrade]],['Exportations publiées',[arSoyTrade]],['Production',[arSoyMilling]],['Consommation intérieure apparente',[arSoyTrade,arSoyMilling,arSoyStocks]],['Stocks industriels de fin de mois',[arSoyStocks]]],
};
function argentinaOilNote(row){
  const notes=[];
  if(row.oilImportsPartial)notes.push('Importations partielles');
  if(row.oilExportsPartial)notes.push('Exportations partielles');
  if(row.useExcluded)notes.push('Solde négatif écarté');
  return notes.join(' · ');
}
function argentinaSoyPanels(family){
  const oil=family==='sbo';
  const years=seasonYearSelection(argentinaSoyHistory.map(row=>row.date),'soy-arg');
  const charts=arSoyMetrics[family].map(([name,sourceLinks],i)=>{
    const points=argentinaSoyHistory.map(row=>({date:row.date,value:row[family][i],
      partial:oil&&(i===0&&row.oilImportsPartial||i===1&&row.oilExportsPartial)}));
    return seasonalMetricPanel(name,points,years.selected,{label:products[family]+' · Argentine · '+name,
      tooltips:p=>num(p.value,6)+' Mt'+(p.partial?' · Volume publié partiel':''),sourceLinks});
  });
  const headers=['Mois',...arSoyMetrics[family].map(([name])=>name+' (Mt)'),...(oil?['Qualité des données']:[])];
  const rows=argentinaSoyHistory.toReversed().map(row=>[e(displayPeriod(row.date,'month')),
    ...row[family].map(v=>valueCell(v,'',6)),...(oil?[e(argentinaOilNote(row)||'—')]:[])]);
  const notes=oil?'Le commerce couvre l’huile brute et les autres catégories de la position NCM 1507. Un volume partiel exclut les lignes confidentielles. Les stocks industriels du premier jour du mois suivant sont affectés à la clôture du mois. L’usage intérieur apparent est le solde stocks d’ouverture + production + importations − exportations − stocks de clôture. Les mois avec un flux confidentiel ou un solde négatif restent vides.':
    'Le commerce couvre les graines hors semences (NCM 12019000). Les volumes douaniers sont exprimés en poids net. La trituration reprend les volumes effectivement traités selon la SAGyP.';
  const fob=series('sbo-arg-official',{}),lastFob=Object.keys(fob.values).at(-1);
  const fobPanel=oil?panel('<h3>FOB officiel · Huile de soja brute</h3><p>'+valueCell(fob.values[lastFob],fob.unit,2)+'</p><p class="small">'+e(formatDate(lastFob))+' · '+link(fob.points[lastFob].url,fob.points[lastFob].source)+'</p>'):
    panel('<h3>Fourchette FOB · Novembre 2026</h3><p>468,45 à 476,35 USD/t</p><p class="small">Cotations du 5 novembre 2026 · '+link('https://www.bolsadecereales.com/fob','Bolsa de Cereales de Buenos Aires')+'</p>');
  const bcr=oil?'3,88 Mt d’huile embarquées':'5,31 Mt de graines embarquées';
  return section(products[family]+' · Argentine','Janvier 2020 – septembre 2026 · millions de tonnes métriques')+
    seasonYearPicker(years)+'<div class="grid2 flow">'+charts.join('')+'</div>'+
    section('Données mensuelles','Volumes en millions de tonnes métriques',action('export-soy-arg',icon('download')+' Télécharger le CSV','ghost'))+
    panel('<p class="analysis-text">'+e(notes)+'</p><details><summary class="small">Voir le tableau mensuel</summary>'+table(headers,rows)+'</details>')+
    section('Repères de marché','Cotations FOB et embarquements de campagne')+
    '<div class="grid2 flow">'+fobPanel+
    panel('<h3>Embarquements · Avril à octobre 2026</h3><p>'+e(bcr)+'</p><p class="small">Octobre provisoire, INDEC et NABSA · '+link('https://www.bcr.com.ar/es/mercados/investigacion-y-desarrollo/informativo-semanal/noticias-informativo-semanal/buenas-8','Bolsa de Comercio de Rosario · 6 novembre 2026')+'</p>')+'</div>';
}

const abioveDashboard='https://abiove.org.br/estatisticas-cadeia-da-soja-mensal/';
const brazilSoyViews={monthly:'Mensuel',national:'Annuel · Brésil',industry:'Annuel · Industrie'};
const brazilTradeMetrics=['Importations totales','Exportations totales'];
const brazilIndustryMetrics={
  soy:['Stocks industriels d’ouverture','Achats de graines par l’industrie','Trituration','Exportations de l’industrie','Consommation intérieure du bilan industriel','Stocks industriels de clôture'],
  sbo:['Stocks industriels d’ouverture','Production industrielle','Importations du bilan industriel','Exportations du bilan industriel','Consommation intérieure apparente','Stocks industriels de clôture'],
};
const brazilNationalMetrics={
  soy:['Stocks nationaux d’ouverture','Production de graines','Importations','Semences et autres usages','Exportations','Trituration','Stocks nationaux de clôture'],
  sbo:['Stocks d’ouverture','Production','Importations','Exportations','Consommation intérieure','Stocks de clôture'],
};
function brazilSoySelection(family,view){
  const names=view==='national'?brazilNationalMetrics[family]:brazilIndustryMetrics[family];
  return {names:view==='monthly'?[...brazilTradeMetrics,...names]:names,rows:brazilSoyHistory[family][view]};
}
function brazilSoyStatus(date,view){
  if(view==='monthly')return date>=abioveSampleStart?'Échantillon ABIOVE':'Historique industriel';
  if(view==='national'&&date>=abioveProjectionStart)return 'Projection ABIOVE';
  return 'Historique ABIOVE';
}
function brazilSoyScope(date,values,view){
  if(view==='monthly'&&values.slice(2).every(v=>v===null))return 'Commerce national uniquement';
  return brazilSoyStatus(date,view);
}
function brazilSoyPanels(family){
  const view=state.brazilSoyView;
  const monthly=view==='monthly';
  const grain=monthly?'month':'year';
  const {names,rows}=brazilSoySelection(family,view);
  const years=monthly?seasonYearSelection(rows.map(([date])=>date),'soy-bra'):null;
  const charts=names.map((name,i)=>{
    const trade=monthly&&i<brazilTradeMetrics.length;
    const source=trade?'ABIOVE · MDIC/Secex':view==='national'?'ABIOVE · Anual':'ABIOVE · Mensal';
    const points=rows.map(([date,...values])=>({date,value:values[i]===null?null:values[i]/1000}));
    const status=date=>trade?'Commerce national':brazilSoyStatus(date,view);
    const chartOptions={label:products[family]+' · Brésil · '+name,
      tooltips:p=>num(p.value,6)+' Mt · '+status(p.date),sourceLinks:[[source,abioveDashboard]]};
    if(monthly)return seasonalMetricPanel(name,points,years.selected,chartOptions);
    const first=points.findIndex(p=>Number.isFinite(p.value));
    const end=points.findLastIndex(p=>Number.isFinite(p.value));
    const last=points[end];
    const lines=Object.entries(Object.groupBy(points.slice(first,end+1),p=>status(p.date)))
      .map(([label,points],j)=>({label,color:colors[(i+j)%colors.length],points}));
    return panel('<h3>'+e(name)+'</h3><p class="small">'+
      e(displayPeriod(last.date,grain)+' · '+num(last.value,6)+' Mt · '+status(last.date))+'</p>'+
      chart(lines,{...chartOptions,unit:'Mt',periodType:grain}));
  });
  const detail=monthly?'Commerce national jusqu’en septembre 2026 · Bilan industriel jusqu’en août 2026':
    view==='national'?'Bilan national 1999–2027 · Mise à jour ABIOVE du '+formatDate(abioveAnnualUpdate):
      'Bilan annuel de l’industrie de transformation · 1999–2025';
  const note=monthly?'Le commerce national provient du MDIC/Secex via ABIOVE. Depuis janvier 2026, le bilan industriel reprend l’échantillon déclaré à ABIOVE, qui représente selon l’association 90,83 % de la trituration brésilienne. Les achats de graines incluent les importations.':
    view==='national'?'Les années 2026 et 2027 sont des projections du bilan national ABIOVE.':
      'Les séries reprennent le bilan annuel du secteur de transformation publié dans l’onglet Mensal d’ABIOVE.';
  const headers=[monthly?'Mois':'Année',...names.map(name=>name+' (Mt)'),'Périmètre du bilan'];
  const tableRows=rows.toReversed().map(([date,...values])=>[e(displayPeriod(date,grain)),
    ...values.map(v=>valueCell(v===null?null:v/1000,'',6)),e(brazilSoyScope(date,values,view))]);
  return section(products[family]+' · Brésil','ABIOVE · Volumes en millions de tonnes métriques')+
    '<div class="toolbar">'+btnSeg('brazilSoyView',brazilSoyViews,view,'Période et périmètre ABIOVE')+'</div>'+
    section(brazilSoyViews[view],detail,action('export-soy-bra',icon('download')+' Télécharger le CSV','ghost'))+
    panel('<p class="analysis-text">'+e(note)+'</p><details><summary class="small">Voir le tableau de données</summary>'+
      table(headers,tableRows)+'</details>')+
    (monthly?seasonYearPicker(years):'')+
    '<div class="grid2 flow">'+charts.join('')+'</div>';
}
const sunFamilies={sun:'Graines de tournesol · Sunseed',sfo:'Huile de tournesol · Sunoil'};
const sunOrigins={ukr:origins.ukr,rus:origins.rus,eu:'UE-27',bgr:origins.bgr,rou:origins.rou};
const sunViews={campaign:'Bilan national · USDA',monthly:'Données mensuelles',annual:'Données annuelles',cumulative:'Cumul des exportations',bilateral:'Commerce avec l’UE-27'};
const sunCampaignKpis=new Set(['Imports','Exports','Crush','Domestic Consumption']);
function sunSelection(){
  const available=sunflowerHistory[state.sunOrigin][state.sunFamily];
  const defaultView=available.bilateral?'campaign':'monthly';
  const view=Object.hasOwn(available,state.sunView)?state.sunView:defaultView;
  return {available,view,...available[view]};
}
function sunCampaignSummary(series){
  const metrics=series.filter(metric=>sunCampaignKpis.has(metric.key));
  const campaign=metrics[0].data.at(-1)[0];
  return '<div class="sun-campaign"><p class="small">Campagne '+e(campaign)+' · Prévision USDA FAS</p>'+
    '<div class="grid4">'+metrics.map(({name,data,unit})=>{
      const tonnes=data.find(([date])=>date===campaign)?.[1];
      return panel('<span class="small">'+e(name)+'</span><strong class="num">'+valueCell(tonnes/1e6,unit,3)+'</strong>','sun-kpi');
    }).join('')+'</div></div>';
}
function sunHistoryPanels(){
  const {available,view,series,note,benchmark}=sunSelection();
  const title=products[state.sunFamily]+' · '+sunOrigins[state.sunOrigin];
  const monthly=view==='monthly'||view==='bilateral';
  const years=monthly?seasonYearSelection(series.flatMap(metric=>metric.data.map(([date])=>date)),'sun-'+state.sunOrigin+'-'+view):null;
  const charts=series.map(({name,source,data,note,forecast,unit='Mt'},i)=>{
    const points=data.map(([date,tonnes])=>({date,value:tonnes===null?null:tonnes/1e6}));
    const sourceLinks=[sunflowerSources[source]];
    const latestUrl=data.findLast(([,tonnes,url])=>tonnes!==null&&url)?.[2];
    if(latestUrl)sourceLinks.push(['Dernière publication de la série',latestUrl]);
    const label=title+' · '+name;
    const tooltips=p=>num(p.value,6)+' '+unit+(forecast&&p.date>=forecast?' · Prévision USDA':'');
    if(monthly)return seasonalMetricPanel(name,points,years.selected,{label,sourceLinks,tooltips,note});
    const last=points.findLast(p=>Number.isFinite(p.value));
    return panel('<h3>'+e(name)+'</h3><p class="small">'+e(last.date+' · '+tooltips(last))+'</p>'+
      chart([{label:name,color:colors[i%colors.length],points}],{unit,periodType:view==='campaign'?'campaign':'year',label,sourceLinks,tooltips})+
      (note?'<p class="small">'+e(note)+'</p>':''));
  });
  const dates=[...new Set(series.flatMap(metric=>metric.data.map(([date])=>date)))].sort().reverse();
  const values=series.map(metric=>new Map(metric.data));
  const headers=[monthly?'Mois':view==='campaign'?'Campagne':'Année',...series.map(metric=>metric.name+' ('+(metric.unit??'Mt')+')')];
  const rows=dates.map(date=>[e(displayPeriod(date,monthly?'month':'year')),...values.map(metric=>{
    const tonnes=metric.get(date);
    return valueCell(Number.isFinite(tonnes)?tonnes/1e6:null,'',6);
  })]);
  const campaignLabel=state.sunOrigin==='eu'?'Bilan UE-27 · USDA':sunViews.campaign;
  const viewOrder=available.bilateral?Object.keys(sunViews):['monthly','annual','campaign'];
  const views=Object.fromEntries(viewOrder.filter(key=>Object.hasOwn(available,key)).map(key=>[key,key==='campaign'?campaignLabel:sunViews[key]]));
  const dataTitle=monthly?'Données mensuelles':view==='campaign'?'Données par campagne':view==='cumulative'?'Cumuls janvier à septembre':'Données annuelles';
  return section(title,'Volumes en millions de tonnes métriques')+
    '<div class="toolbar">'+btnSeg('sunView',views,view,'Périmètre et fréquence des données du tournesol')+'</div>'+
    (note?'<p class="small">'+e(note)+'</p>':'')+
    (view==='campaign'?sunCampaignSummary(series):'')+
    (benchmark?'<p class="sun-benchmark small">'+e(benchmark.text)+' '+link(benchmark.source[1],benchmark.source[0])+'</p>':'')+
    (monthly?seasonYearPicker(years):'')+
    '<div class="grid2 flow sun-history-charts">'+charts.join('')+'</div>'+
    section(dataTitle,'Historique complet pour cette vue',
      action('export-sun-history',icon('download')+' Télécharger le CSV','ghost'))+
    panel('<details><summary class="small">Voir le tableau de données</summary>'+table(headers,rows)+'</details>');
}
function renderComplex(key){
  const group=groups[key];
  const isSoy=key==='soy';
  const isSun=key==='sun';
  const origin=isSoy?state.soyOrigin:isSun?state.sunOrigin:state.filters.origin||state.originTab[key]||'';
  const product=isSoy?state.soyFamily:isSun?state.sunFamily:state.filters.product;
  const filter={...state.filters,origin,product};
  const matches=rows=>rows.filter(r=>group.products.includes(r.product));
  const events=matches(eventsFor(filter));
  const rows=matches(balancesFor(filter));
  const last=unique(rows.sort((a,b)=>a.date.localeCompare(b.date)||a.period.localeCompare(b.period)),r=>[r.origin,r.product,r.metric,r.periodType,r.variant].join('|')).sort(byDate);
  const marketSeries=Object.keys(seedPrices).filter(id=>{
    const s=seedPrices[id];return group.products.includes(s.product)&&(!origin||s.origin===origin)&&(!product||s.product===product);
  });
  const selectedOrigin=origin?origins[origin]:'Toutes les origines';
  return head(key==='macro'?'Marchés transversaux':'Complexes de marché',group.name,'Analyse de l’offre, de la demande, des stocks et des flux. Les fiches distinguent les chiffres publiés, les projections et les effets attendus.')+
    (isSoy?'<div class="toolbar">'+btnSeg('soyFamily',soyFamilies,product,'Sous-famille du soja')+'</div>'+
      '<div class="toolbar">'+btnSeg('soyOrigin',soyOrigins,origin,'Origine du soja')+'</div>'+
      (origin==='us'?usSoyHistoryPanels(product):origin==='arg'?argentinaSoyPanels(product):brazilSoyPanels(product)) :
      isSun?'<div class="toolbar">'+btnSeg('sunFamily',sunFamilies,product,'Sous-famille du tournesol')+'</div>'+
      '<div class="toolbar">'+btnSeg('sunOrigin',sunOrigins,origin,'Origine du tournesol')+'</div>'+sunHistoryPanels():
      '<div class="toolbar"><label>Origine analysée</label>'+select('originTab',Object.fromEntries(group.origins.map(k=>[k,origins[k]])),origin,'Toutes les origines')+' <span class="small">'+e(selectedOrigin)+'</span></div>')+
    '<div class="grid4">'+group.channels.map(([title,desc])=>panel('<span class="eyebrow">'+e(title)+'</span><p class="analysis-text">'+e(desc)+'</p>')).join('')+'</div>'+
    (key==='palm'?mpobHistoryPanel():'')+
    section('Lecture pour les prix','Données liées au périmètre sélectionné')+panel(events.length?'<p class="analysis-text">'+e(events[0].transmission)+'</p><p class="small">'+e(events[0].caveat)+'</p>':empty('Impact à confirmer. Aucun événement sourcé dans cette sélection.'))+
    section('Fondamentaux','Dernière publication disponible par indicateur')+panel(table(['Produit / origine','Indicateur','Période de référence','Valeur','Source / statut'],last.slice(0,28).map(r=>[e(products[r.product])+'<small>'+e(origins[r.origin])+'</small>',e(metrics[r.metric]),e(displayPeriod(r.period,r.periodType))+'<small>'+e(periodTypes[r.periodType])+'</small>',valueCell(r.value,r.unit,3),link(r.url,r.source)+'<small>'+e(formatDate(r.date)+' · '+labels.status[r.status])+'</small>'])))+
    section('Prix et repères','Cours datés. Une série manquante reste indiquée comme non disponible.')+panel(table(['Série','Dernier repère','Variation','Source'],marketSeries.map(id=>{
      const s=series(id,filter), dates=Object.keys(s.values),d=dates.at(-1),p=dates.at(-2);
      return [e(s.name)+'<small>'+e(s.definition)+'</small>',d?valueCell(s.values[d],s.unit)+'<small>'+e(displayPeriod(d,s.grain))+'</small>':'Non disponible',e(percent(pct(s.values[d],s.values[p]))),link(s.points[d]?.url||s.url,s.points[d]?.source||s.source)];
    })))+section('Facteurs et événements','Cliquer sur un événement pour ouvrir son mécanisme de transmission')+panel(eventRows(events))+
    section('Indicateurs à surveiller','Les séries peuvent être complétées dans le registre')+panel('<ul class="brief-list">'+group.watch.map(w=>'<li>'+e(w)+'</li>').join('')+'</ul>');
}
function filteredFeed(){
  const q=state.query.trim().toLocaleLowerCase('fr');
  return eventsFor().filter(r=>(!q||[r.title,r.summary,r.source,products[r.product],origins[r.origin]].some(v=>v.toLocaleLowerCase('fr').includes(q)))&&(!state.category||r.category===state.category)&&(!state.importance||r.intensity===Number(state.importance))&&(!state.start||r.date>=state.start)&&(!state.end||r.date<=state.end));
}
function renderFeed(isNews){
  const rows=filteredFeed();
  const toolbar='<form id="feed-search" class="toolbar"><label class="sr" for="search">Rechercher</label><input id="search" name="search" placeholder="Rechercher un sujet…" value="'+e(state.query)+'"><button class="button" type="submit">'+icon('search')+' Rechercher</button>'+select('category',labels.category,state.category,'Toutes les catégories')+select('importance',labels.intensity,state.importance,'Toutes les intensités')+'<label>Du <input type="date" data-control="start" value="'+e(state.start)+'"></label><label>au <input type="date" data-control="end" value="'+e(state.end)+'"></label>'+action('export-feed',icon('download')+' CSV','ghost')+'</form>';
  if(!isNews)return head('Analyse fondamentale','Facteurs de marché','Les chiffres, la fiabilité et la transmission économique de chaque événement.')+toolbar+panel(eventRows(rows));
  const articles=arr=>arr.length?'<div class="grid2 flow">'+arr.map(r=>panel('<div class="spread-between">'+lineBadge(r)+'<span class="small">'+e(formatDate(r.date))+' · '+e(r.time||'Heure non disponible')+'</span></div><h3>'+eventBtn(r)+'</h3><p class="analysis-text">'+e(r.summary)+'</p><dl><dt>Chiffres clés</dt><dd>'+e(r.number+' · '+r.variation)+'</dd><dt>Marché</dt><dd>'+e(products[r.product]+' · '+origins[r.origin])+'</dd><dt>Horizon</dt><dd>'+e(labels.horizon[r.horizon])+'</dd><dt>Interprétation</dt><dd>'+e(r.transmission)+'</dd></dl><p class="small">'+link(r.url,r.source)+'</p>','article')).join('')+'</div>':empty();
  return head('Veille','Fil d’actualité','Les publications confirmées sont séparées des projections, consensus et informations à confirmer.')+toolbar+section('Faits confirmés')+articles(rows.filter(r=>r.status==='confirmed'))+section('Anticipations et informations à confirmer')+articles(rows.filter(r=>r.status!=='confirmed'));
}


function renderBalanceCharts(balance,metric){
  chartModels.length=0;
  const opts={periodType:'campaign',periodLabels:Object.fromEntries(balance.periods),height:128,
    sourceLinks:balance.source?[[balance.source]]:undefined};
  const series=(key,label,color)=>({label,color,points:balance.periods.map(([date],index)=>({date,value:parseFloat(balance.rows[key][index])}))});
  const isRatio=metric==='ratio';
  const title=isRatio?'Stocks / utilisation':'Stocks finaux';
  const card=(title,lines,unit='MT')=>'<div class="balance-history-card"><h3>'+title+'</h3>'+
    chart(lines,{...opts,unit,label:title+' par campagne'})+'</div>';
  const world=balance.origin==='world';
  const volumes=world?
    card('Production et '+balance.labels.consumption.toLocaleLowerCase('fr'),[series('production','Production',colors[0]),series('consumption',balance.labels.consumption,colors[1])])+
    card('Commerce mondial',[series('imports','Importations',colors[0]),series('exports','Exportations',colors[1])]):
    card('Offre et utilisation',[series('supply','Offre totale',colors[0]),series('use','Utilisation totale',colors[1])]);
  const stock=balance.rows.ratio?
    card(title,[series(metric,title,colors[2])],isRatio?'%':'MT'):
    card('Stocks initiaux et finaux',[series('opening','Stocks initiaux',colors[0]),series('ending','Stocks finaux',colors[2])]);
  return '<div class="balance-history-charts'+(world?' balance-history-world':'')+'">'+volumes+stock+'</div>';
}
function renderBalances(){
  return head('Analyse fondamentale','Bilans offre / demande','Consultez les bilans par campagne et mesurez l’effet de vos hypothèses sur les stocks finaux.')+renderBalanceView(renderBalanceCharts);
}
function renderCot(){
  return head('Analyse · Positionnement','Rapport COT · CFTC','Suivez le positionnement des fonds et des opérateurs physiques sur l’huile de soja et les graines de soja du CBOT, d’après le rapport hebdomadaire Commitments of Traders de la CFTC.')+renderCotView();
}
function renderCbotArg(){
  const quotes=series('bo',{}),date=Object.keys(quotes.values).at(-1);
  const quote=date?{value:quotes.values[date],date:formatDate(date),name:quotes.name,source:quotes.points[date].source}:null;
  return head('Analyse','Simulateur CBOT – ARG','Convertissez le cours CBOT de l’huile de soja en prix argentin fret inclus et repérez le niveau de CBOT qui déclenche votre objectif d’achat.')+renderCbotArgView(quote);
}

const spreadDate=(date,grain)=>grain==='month'?displayPeriod(date.slice(0,7),'month'):formatDate(date);
const grainNames={day:'Quotidien',week:'Hebdomadaire',month:'Mensuel'};
const spreadLegName=id=>spreadLegs[id].fx?spreadLegs[id].unit:spreadLegs[id].description.split(' · ')[0];
// Noms courts des composantes (boutons) et rôle stable d’une variante à l’autre : le change garde le rôle « fx »,
// les autres prix gardent leur rang (huile puis palme, graines puis tourteau puis huile…).
const componentNames={arSoyOil:'Huile de soja',zl:'Huile de soja',zlM:'Huile de soja',idPalmFob:'Huile de palme',myPalmFob:'Huile de palme',mpobCpo:'Huile de palme',
  fcpo:'Huile de palme',fcpoUsdM:'Huile de palme',ho:'Gazole ULSD',hoM:'Gazole ULSD',ulsdNy:'Gazole ULSD',gasoil:'Gasoil',gasoilM:'Gasoil',
  zs:'Graines de soja',zsM:'Graines de soja',arSoySeed:'Graines de soja',zm:'Tourteau de soja',zmM:'Tourteau de soja',arSoyMeal:'Tourteau de soja',
  arSunSeed:'Graines de tournesol',arSunMeal:'Tourteau de tournesol',arSunOil:'Huile de tournesol'};
const componentName=id=>componentNames[id]??spreadLegName(id);
const componentRole=(variant,id)=>spreadLegs[id].fx?'fx':'p'+variant.legs.filter(leg=>!spreadLegs[leg].fx).indexOf(id);
const spreadObservationUrl=(id,obs)=>obs.url||spreadLegs[id].observationUrl?.(obs.date)||spreadLegs[id].url;
const spreadLegGrain={hip:'month',d4:'week',b100:'week',ulsdNyMonth:'month',imfSoyOil:'month',imfPalmOil:'month',zlM:'month',fcpoUsdM:'month',hoM:'month',gasoilM:'month',zsM:'month',zmM:'month'};
const focusRanges={day:{3:'3 mois',6:'6 mois',12:'1 an',all:'Tout'},month:{24:'2 ans',60:'5 ans',all:'Depuis 2015'}};
const focusAverages={day:{0:'Aucune',20:'20 séances',60:'60 séances'},month:{0:'Aucune',3:'3 mois',12:'12 mois'}};
const focusDefaults={day:{range:'all',average:'20'},month:{range:'60',average:'12'}};
const focusCards=[...focusSpreads,...focusMargins];
// components : prix sources affichés sous la courbe, à la demande (aucun par défaut).
const focusState=Object.fromEntries(focusCards.map(spread=>[spread.id,{variant:spread.variants[0].id,range:{},average:{},params:{...spread.defaults},components:[]}]));
const focusVariant=spread=>spread.variants.find(variant=>variant.id===focusState[spread.id].variant);
const focusSetting=(spread,key)=>{
  const {grain}=focusVariant(spread);
  return focusState[spread.id][key][grain]??focusDefaults[grain][key];
};
function focusData(spread){
  const {params}=focusState[spread.id],variant=focusVariant(spread);
  const all=focusRows(variant,spreadPrices,params);
  const range=focusSetting(spread,'range'),months=range==='all'?null:Number(range);
  const rows=focusWindow(all,months);
  const context=spread.variants.find(other=>other.id===variant.context);
  const contextRows=context&&all.length?focusWindow(focusRows(context,spreadPrices,params),months,all.at(-1).date):[];
  const size=Number(focusSetting(spread,'average'));
  const average=size&&rows.length?focusAverage(all,size).filter(point=>point.date>=rows[0].date):[];
  return {params,variant,grain:variant.grain,all,rows,context,contextRows,size,average,unit:spread.unit(params),digits:spread.digits(params)};
}
function focusCard(spread){
  const {params,variant,grain,all,rows,context,contextRows,size,average,unit,digits}=focusData(spread);
  const stats=focusStats(rows),monthly=grain==='month';
  const period=date=>monthly?date.slice(0,7):date;
  // Mois en cours : moyenne partielle des séances déjà closes.
  const sessionsOf=row=>Math.min(...Object.values(row?.observations??{}).map(o=>o?.sessions).filter(Number.isFinite));
  const partialRow=monthly?all.findLast(row=>Object.values(row.observations).some(o=>o?.partial)):null;
  const dateLabel=date=>spreadDate(date,grain)+(partialRow&&date===partialRow.date?' · en cours':'');
  const signed=value=>e(sign(value,digits));
  // Composantes affichées pour la variante choisie, dans l’ordre de ses prix.
  const shown=variant.legs.filter(id=>focusState[spread.id].components.includes(componentRole(variant,id)));
  const seg=(key,choices,value,label)=>'<div class="focus-control"><span>'+e(label)+'</span><div class="seg" role="group" aria-label="'+e(label+' · '+spread.code)+'">'+
    Object.entries(choices).map(([id,name])=>'<button type="button" data-action="focus-set" data-id="'+spread.id+'" data-key="'+key+'" data-value="'+e(id)+'" class="'+
      (id===String(value)?'active':'')+'" aria-pressed="'+(id===String(value))+'">'+e(name)+'</button>').join('')+'</div></div>';
  const controls='<div class="focus-controls">'+seg('variant',Object.fromEntries(spread.variants.map(option=>[option.id,option.label])),variant.id,'Référence')+
    seg('range',focusRanges[grain],focusSetting(spread,'range'),'Période')+seg('average',focusAverages[grain],size,'Moyenne mobile')+
    (spread.units?seg('unit',spread.units,params.unit,'Unité'):'')+
    '<div class="focus-control"><span>Composantes</span><div class="seg" role="group" aria-label="'+e('Composantes du calcul · '+spread.code)+'">'+
    variant.legs.map(id=>{
      const on=shown.includes(id);
      return '<button type="button" data-action="focus-component" data-id="'+spread.id+'" data-leg="'+e(id)+'" class="'+(on?'active':'')+'" aria-pressed="'+on+'"'+
        ' title="'+e((on?'Masquer':'Afficher')+' le prix · '+spreadLegs[id].description+' ('+spreadLegs[id].unit+')')+'">'+e(componentName(id))+'</button>';
    }).join('')+'</div></div></div>';
  const unitTag=' <small>'+e(unit)+'</small>';
  const kpi=(label,value,detail,klass='')=>'<div class="sim-kpi '+klass+'"><span>'+e(label)+'</span><strong class="num">'+value+'</strong><small>'+e(detail)+'</small></div>';
  const kpis=stats?'<div class="sim-kpis focus-kpis">'+
    kpi(spread.valueLabel??'Dernier spread',signed(stats.last.value)+unitTag,dateLabel(stats.last.date),'sim-kpi-main')+
    kpi('Variation',stats.previous?signed(stats.change)+unitTag:'—',stats.previous?'vs '+dateLabel(stats.previous.date):'Une seule observation')+
    kpi('Moyenne de la période',signed(stats.mean)+unitTag,stats.count+' observation'+(stats.count>1?'s':''))+
    kpi('Plus bas · plus haut',signed(stats.low.value)+' · '+signed(stats.high.value),dateLabel(stats.low.date)+' · '+dateLabel(stats.high.date))+
    kpi('Position dans la période',num(stats.percentile,0)+'<small>e centile</small>','Part des observations au niveau actuel ou en dessous')+'</div>':'';
  const point=value=>row=>({date:period(row.date),value:value(row)});
  const axis=first=>monthly?{periodType:'month'}:{periodType:'day',startDate:first,maxGapDays:10};
  const refs=refsFor([...variant.legs,...(context?.legs??[])].flatMap(id=>[spreadLegs[id],...(spreadLegs[id].fx?[{source:'BCE · EUR/USD',url:eurUsdSource}]:[])]));
  const tooltips=p=>num(p.value,digits)+' '+unit;
  const spreadTooltips=p=>sign(p.value,digits)+' '+unit;
  const lines=[{label:spread.code+' · '+variant.label,color:colors[0],width:context?3:2.25,points:rows.map(point(row=>row.value))}];
  if(contextRows.length)lines.push({label:'Repère · '+context.label,color:colors[5],width:1.75,points:contextRows.map(point(row=>row.value))});
  if(average.length)lines.push({label:'Moyenne mobile · '+focusAverages[grain][size],color:colors[2],width:1.75,points:average.map(point(row=>row.value))});
  const first=[rows[0]?.date,contextRows[0]?.date].filter(Boolean).sort()[0];
  // Chaque composante garde son unité : un graphique par prix, sur les mêmes dates que la courbe principale.
  const componentColors={p0:colors[3],p1:colors[4],p2:colors[6],fx:colors[1]};
  const components=shown.length&&rows.length?'<div class="focus-components"><h4>Composantes du calcul</h4>'+shown.map(id=>{
    const leg=spreadLegs[id],name=spreadLegName(id).split(' (')[0];
    return chart([{label:name,color:componentColors[componentRole(variant,id)],
      points:rows.map(row=>({date:period(row.date),value:row.observations[id]?.value}))}],
      {unit:leg.unit,height:150,label:'Composante · '+name,sourceLinks:refsFor([leg,...(leg.fx?[{source:'BCE · EUR/USD',url:eurUsdSource}]:[])]),
        tooltips:p=>num(p.value,Math.abs(p.value)>=100?2:4)+' '+leg.unit,...axis(rows[0].date)});
  }).join('')+'</div>':'';
  const history=rows.length?chart(lines,{unit,height:230,label:spread.title+' · '+variant.label,zeroLine:true,sourceLinks:refs,tooltips:spreadTooltips,...axis(first)}):
    empty('Aucune date commune entre les deux prix.');
  const sides=rows.length?chart(variant.sides.map(([label],i)=>({label,color:colors[i],points:rows.map(point(row=>i?row.b:row.a))})),
    {unit,height:170,label:'Prix comparés · '+spread.code,sourceLinks:refs,tooltips,...axis(rows[0].date)}):'';
  const inputs=focusInputs(spread,variant);
  const form=!inputs.length?'':'<h4>Paramètres</h4><form class="spread-inputs" data-focus-form="'+spread.id+'">'+inputs.map(([key,label,min,max])=>
    '<label>'+e(label)+'<input name="'+key+'" type="number" min="'+min+'" max="'+max+'" step="any" value="'+e(params[key])+'" required></label>').join('')+
    '<button type="submit" class="button">Recalculer</button>'+action('focus-reset','Valeurs par défaut','ghost','data-id="'+spread.id+'"')+'</form>';
  const sourceList=variant.legs.map(id=>{
    const {source,url,unit:legUnit,description,fx}=spreadLegs[id],last=all.at(-1)?.observations[id];
    return '<li>'+link(url,source)+' · '+e(description+' ('+legUnit+')')+
      (last?'<small>Dernière observation utilisée · '+link(spreadObservationUrl(id,last),spreadDate(last.date,spreadLegGrain[id]||'day'))+'</small>':'')+
      (fx?'<small>'+link(eurUsdSource,'Fixing EUR/USD · BCE')+'</small>':'')+'</li>';
  }).join('');
  const values=table(['Date',spread.code+' ('+unit+')',...variant.sides.map(([label])=>label+' ('+unit+')'),...variant.legs.map(id=>spreadLegName(id)+' ('+spreadLegs[id].unit+')')],
    all.toReversed().map(row=>[e(dateLabel(row.date)),'<span class="num">'+e(sign(row.value,digits+1))+'</span>',valueCell(row.a,'',digits+1),valueCell(row.b,'',digits+1),
      ...variant.legs.map(id=>{
        const observation=row.observations[id];
        return valueCell(observation.value,'',4)+(observation.date===row.date?'':'<small>'+e(formatDate(observation.date))+'</small>');
      })]));
  const partialNote=partialRow&&stats?.last.date===partialRow.date?' ('+sessionsOf(partialRow)+' séance'+(sessionsOf(partialRow)>1?'s':'')+')':'';
  return panel('<div class="spread-heading"><div><span class="eyebrow">'+grainNames[grain]+(stats?' · '+(monthly?'':'au ')+e(dateLabel(stats.last.date)+partialNote):'')+'</span>'+
    '<h3>'+e(spread.title)+'</h3><p class="small">'+e(spread.summary)+'</p></div>'+
    action('export-focus',icon('download')+' CSV','ghost','data-id="'+spread.id+'"'+(all.length?'':' disabled')+' aria-label="'+e('Télécharger le CSV · '+spread.code)+'"')+'</div>'+
    controls+kpis+'<div class="spread-body"><div class="spread-chart">'+history+components+'</div><div class="spread-summary">'+
      '<h4>Formule</h4><p>'+e(variant.formula(params))+'</p><h4>Comment lire le résultat</h4><p>'+e(spread.reading)+'</p>'+
      '<h4>Données</h4><p class="small">'+e(variant.note)+'</p>'+form+'</div></div>'+
    (sides?'<details class="spread-details spread-price-charts"><summary>Voir les deux prix comparés</summary>'+sides+'</details>':'')+
    '<details class="spread-details"><summary>Sources et dernières observations</summary><ul>'+sourceList+'</ul></details>'+
    '<details class="spread-details"><summary>Voir les valeurs</summary>'+values+'</details>','spread-card focus-card');
}
function renderFocusMargins(){
  return section('Marges de trituration','Soja aux États-Unis sur les contrats du CBOT · soja et tournesol en Argentine sur les prix FOB officiels · références, période, unité et paramètres modifiables')+
    '<div class="spread-list">'+focusMargins.map(focusCard).join('')+'</div>';
}
function renderFocusSpreads(){
  return section('Spreads de référence','BOPO, BOHO et POGO · calcul sur les dates communes des deux prix · références, période et paramètres modifiables')+
    '<div class="spread-list">'+focusSpreads.map(focusCard).join('')+'</div>';
}
function exportFocus(button){
  const spread=focusCards.find(item=>item.id===button.dataset.id);
  if(!spread)return;
  const {params,variant,all,unit}=focusData(spread);
  const number=value=>String(Number(value.toFixed(6))).replace('.',',');
  csv('olea_'+spread.id+'_'+variant.id+'.csv',[
    ['Date',spread.code+' ('+unit+')',...variant.sides.map(([label])=>label+' ('+unit+')'),
      ...variant.legs.flatMap(id=>[spreadLegName(id)+' ('+spreadLegs[id].unit+')','Date '+id,'Source '+id]),...focusInputs(spread,variant).map(([,label])=>label)],
    ...all.map(row=>[row.date,number(row.value),number(row.a),number(row.b),
      ...variant.legs.flatMap(id=>[number(row.observations[id].value),row.observations[id].date,spreadLegs[id].source]),
      ...focusInputs(spread,variant).map(([key])=>number(params[key]))]),
  ]);
}
const pairLabel=([a,b])=>seedPrices[a].name+' / '+seedPrices[b].name;
function crossData(){
  const preset=pairs[Number(state.crossPair)], a=series(preset?.[0]||state.crossA), b=series(preset?.[1]||state.crossB);
  const aligned=a.grain===b.grain?align(a,b):[];
  const limit=Number(state.crossRange);
  const rows=aligned.slice(-limit);
  return {a,b,rows,common:a.unit===b.unit&&a.grain===b.grain,sameGrain:a.grain===b.grain,note:preset?.[2]};
}
function renderPairs(){
  const {a,b,rows,common,sameGrain,note}=crossData();
  const first=rows[0],last=rows.at(-1),prior=rows.at(-2);
  const corr=corrReturns(rows), spread=last&&common?last.a-last.b:null;
  const deltaSpread=prior&&common?spread-(prior.a-prior.b):null;
  const mode=state.crossMode==='spread'&&common?'spread':'index';
  const priceDict=Object.fromEntries(Object.entries(seedPrices).map(([k,s])=>[k,s.name]));
  const seriesOptions=Object.fromEntries(pairs.map((p,i)=>[String(i),pairLabel(p)]));
  seriesOptions.custom='Paire personnalisée';
  const changes=mode==='spread'?[{label:a.name+' moins '+b.name,color:colors[0],points:rows.map(r=>({date:r.date,value:r.a-r.b}))}]:[
    {label:a.name,color:colors[0],points:rows.map(r=>({date:r.date,value:100*r.a/first.a}))},
    {label:b.name,color:colors[1],points:rows.map(r=>({date:r.date,value:100*r.b/first.b}))},
  ];
  return section('Comparaison de séries','Paires prédéfinies et personnalisées')+
    '<div class="toolbar"><label>Paire</label>'+select('crossPair',seriesOptions,state.crossPair)+
    (state.crossPair==='custom'?select('crossA',priceDict,state.crossA)+select('crossB',priceDict,state.crossB):'')+
    '<label>Fenêtre</label>'+select('crossRange',{4:'4 observations',6:'6 observations',8:'8 observations',24:'24 observations',120:'120 observations'},state.crossRange)+action('export-cross',icon('download')+' CSV','ghost')+'</div>'+
    '<div class="grid3">'+panel('<span class="eyebrow">Spread A − B</span><b class="num">'+e(sign(spread))+' <small>'+e(common?a.unit:'')+'</small></b><span class="muted">'+e(Number.isFinite(deltaSpread)?sign(deltaSpread)+' vs période précédente':'Écart comparable non disponible')+'</span>','metric')+
    panel('<span class="eyebrow">Corrélation</span><b class="num">'+num(corr.r)+'</b><span class="muted">Pearson sur '+corr.n+' variations</span>','metric')+
    panel('<span class="eyebrow">Observations communes</span><b class="num">'+rows.length+'</b><span class="muted">'+e(periodTypes[a.grain]||'Jour')+'</span>','metric')+'</div>'+
    section('Évolution historique',sameGrain?'Mêmes périodes de référence':'Les fréquences de publication diffèrent',btnSeg('crossMode',common?{index:'Base 100',spread:'Spread'}:{index:'Base 100'},mode))+
    panel(chart(changes,{unit:mode==='spread'?a.unit:'base 100',periodType:a.grain,sourceLinks:refsFor(rows.flatMap(r=>[a.points[r.date],b.points[r.date]]))})+(!sameGrain?notice('Ajoutez des observations sur la même fréquence pour comparer ces séries.'):''))+
    section('Formules et lecture','Comparaison sur les dates communes de la fenêtre sélectionnée')+
    panel('<p><strong>Base 100</strong> · 100 × valeur à la date t ÷ première valeur commune de la série. Un indice de 110 indique une hausse de 10 % depuis le début de la fenêtre.</p>'+
      '<p><strong>Spread</strong> · valeur A − valeur B, à unité et fréquence identiques. Un résultat positif indique que A est supérieur à B.</p>'+
      '<p><strong>Corrélation</strong> · coefficient de Pearson des variations en pourcentage entre observations communes successives. Proche de +1, les séries évoluent ensemble. Proche de −1, elles évoluent en sens opposé. Le calcul exige au moins trois paires de variations et des séries dont les variations ne sont pas constantes.</p>'+
      '<p class="analysis-text">'+e(note||'Vérifier le grade, la devise, le fret et la base géographique avant d’interpréter un écart.')+'</p>'+
      '<p class="small">'+e(a.definition+' '+b.definition)+'</p>')+
    section('Observations et provenance','Valeurs brutes avant indexation')+
    panel(table(['Période',a.name,b.name,'Spread','Sources'],rows.slice().reverse().map(r=>[e(displayPeriod(r.date,a.grain)),valueCell(r.a,a.unit),valueCell(r.b,b.unit),common?valueCell(r.a-r.b,a.unit):'—',link(a.points[r.date]?.url,a.points[r.date]?.source||a.source)+' · '+link(b.points[r.date]?.url,b.points[r.date]?.source||b.source)])));
}
const crossViews={spreads:['Spreads','BOPO · BOHO · POGO',renderFocusSpreads],margins:['Marges','Trituration · États-Unis et Argentine',renderFocusMargins],pairs:['Comparaison de séries','Base 100, écart et corrélation',renderPairs]};
const priceSeriesNames={
  zl:'Huile de soja · CBOT ZL',zs:'Graines de soja · CBOT ZS',zm:'Tourteau de soja · CBOT ZM',ho:'Heating Oil · NYMEX HO',
  fcpo:'Huile de palme · Bursa FCPO',gasoil:'Low Sulphur Gasoil · ICE',
  arSoyOil:'Huile de soja · FOB Argentine',arSoyMeal:'Tourteau de soja · FOB Argentine',arSoySeed:'Graines de soja · FOB Argentine',
  arSunOil:'Huile de tournesol · FOB Argentine',arSunMeal:'Pellets de tournesol · FOB Argentine',arSunSeed:'Graines de tournesol · FOB Argentine',
  idPalmFob:'CPO · FOB Belawan (Indonésie)',myPalmFob:'CPO · FOB Port Klang (Malaisie)',mpobCpo:'CPO livré · Malaisie (MPOB)',
  eurUsd:'EUR/USD · BCE',eurMyr:'EUR/MYR · BCE',eurIdr:'EUR/IDR · BCE',ulsdNy:'ULSD New York · spot',ulsdNyMonth:'ULSD New York · moyenne mensuelle',
  imfSoyOil:'Huile de soja · FMI, mensuel',imfPalmOil:'Huile de palme · FMI, mensuel',b100:'B100 · Brésil (ANP)',d4:'RIN D4 · EPA',hip:'HIP biodiesel · Indonésie (ESDM)',
};
const priceStates={ok:['À jour','positive'],stale:['En attente de publication','mixed'],held:['Valeur à vérifier','mixed'],error:['Source en échec','negative'],manual:['Saisie manuelle','muted']};
const stampFormat=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Casablanca'});
const priceValue=(key,value)=>Number.isFinite(value)?num(value,Math.abs(value)>=100?(Number.isInteger(value)?0:1):4)+(spreadLegs[key]?.unit&&!key.startsWith('eur')?' '+spreadLegs[key].unit:''):'—';
function priceStatusPanel(){
  const status=priceFeed.status;
  const live=priceFeed.origin==='live'&&status;
  const futures=priceFeed.futures.status;
  const auto={...(live?status.series:{}),...(futures?.series??{})};
  const rows=Object.keys(priceSeriesNames).filter(key=>spreadPrices[key]?.length||auto[key]).map(key=>{
    const entry=auto[key];
    const last=spreadPrices[key]?.at(-1);
    const [label,tone]=priceStates[entry?.status??'manual']??priceStates.manual;
    const source=spreadLegs[key]?.source??'';
    const added=entry?.addedCount?'<small>+'+entry.addedCount+' lors de la dernière vérification</small>':'';
    return [e(priceSeriesNames[key])+'<small>'+e(source)+'</small>',last?'<span class="num">'+e(priceValue(key,last[1]))+'</span><small>'+e(formatDate(last[0]))+'</small>':'—',
      badge(tone==='muted'?'pending':tone,label)+(entry?.message?'<small>'+e(entry.message)+'</small>':'')+added];
  });
  const counts=Object.values(auto).reduce((acc,entry)=>{acc[entry.status]=(acc[entry.status]||0)+1;return acc;},{});
  const alerts=[...(live?sourceAlerts(status):[]),...(futures?sourceAlerts(futures):[])];
  const held=[...(live?status.held||[]:[]),...(futures?.held??[])];
  const summary=live?
    'Vérification automatique le '+stampFormat.format(new Date(status.checkedAt))+' · '+(counts.ok||0)+' séries à jour'+
      (counts.stale?' · '+counts.stale+' en attente de publication':'')+(counts.held?' · '+counts.held+' à vérifier':'')+(counts.error?' · '+counts.error+' en échec':'')+
      (futures?' · contrats à terme relevés le '+stampFormat.format(new Date(futures.checkedAt)):''):
    'Flux automatique indisponible : le site affiche les prix intégrés lors de la dernière publication.';
  const heldList=held.length?'<ul class="price-held">'+held.map(h=>'<li><b>'+e(priceSeriesNames[h.series]||h.series)+'</b> · '+e(formatDate(h.date))+' : <span class="num">'+e(priceValue(h.series,h.value))+'</span>'+
    (h.previous!=null?' contre <span class="num">'+e(priceValue(h.series,h.previous))+'</span> le '+e(formatDate(h.previousDate)):'')+'. Écart inhabituel : la valeur sera publiée dès que la cotation suivante confirmera ce niveau.</li>').join('')+'</ul>':'';
  const alertList=alerts.length?'<ul class="price-held">'+alerts.map(a=>'<li><b>'+e(a.name)+'</b> · '+(a.long?'en échec depuis le '+e(stampFormat.format(new Date(a.failingSince))):'indisponible lors de la dernière vérification')+'. Les prix déjà publiés restent affichés.</li>').join('')+'</ul>':'';
  return '<section class="panel price-status"><div class="spread-between"><div><h2>Actualisation automatique des prix</h2><p class="small">'+e(summary)+'</p></div>'+
    '<span class="badge '+(alerts.length||counts.error?'negative':counts.held?'mixed':'positive')+'"><span class="dot"></span>'+(live?'Flux automatique':'Copie intégrée')+'</span></div>'+heldList+alertList+
    '<details><summary>État des séries</summary><p class="small">Trois vérifications par jour : 9 h 17 UTC (MPOB, IPOSS), 15 h 47 UTC (BCE) et 21 h 23 UTC (bulletins argentins, FRED, ANP). Chaque valeur est contrôlée : bornes de vraisemblance, cohérence avec l’historique et confirmation des écarts inhabituels. Les contrats à terme de Chicago, New York, Londres et Kuala Lumpur sont relevés une fois par jour sur TradingView, puis comparés à une somme de contrôle calculée par TradingView avant publication. Le D4 de l’EPA et le HIP indonésien restent saisis à la main.</p>'+
    table(['Série','Dernière observation','État'],rows)+'</details></section>';
}
function renderCross(){
  const view=Object.hasOwn(crossViews,state.crossView)?state.crossView:'spreads';
  const tabs='<div class="balance-tabs cross-tabs" role="group" aria-label="Vues de la rubrique">'+Object.entries(crossViews).map(([id,[title,detail]])=>
    '<button type="button" data-action="seg" data-key="crossView" data-value="'+id+'" aria-pressed="'+(id===view)+'"><strong>'+e(title)+'</strong><span>'+e(detail)+'</span></button>').join('')+'</div>';
  return head('Analyse intermarchés','Comparaisons & spreads','Suivez les spreads BOPO, BOHO et POGO, les marges de transformation et la comparaison de séries sur leurs observations communes.')+
    tabs+(view==='pairs'?'':priceStatusPanel())+crossViews[view][2]();
}
const horizonMultipliers={short:[.7,1.3,.9,1.1,1.2,1.15],medium:[1,1,1,1,1,1],long:[1.35,.75,1.25,.85,.8,.75]};
const presets={up:[-5,-10,8,7,10,0],base:[0,0,0,0,0,0],down:[5,10,-8,-7,-10,0]};
const scenarioProduct=()=>{
  const p=state.filters.product||state.outProduct;
  const group=Object.values(groups).find(g=>g.products.includes(p));
  return {p,base:scenarios[p]||scenarios[group?.products[0]]||{up:'Disponibilité réduite ou demande accrue.',base:'Suivre l’équilibre entre disponibilité, demande et stocks.',down:'Offre plus abondante ou demande plus faible.',trigger:'Publications de production, de consommation et de stocks.'}};
};
function scenarioValue(values,horizon){
  return shockFields.reduce((total,[k,,weight],i)=>total+(values[k]||0)*weight*horizonMultipliers[horizon][i],0);
}
const scenarioSign=v=>v>1?'positive':v< -1?'negative':'neutral';
function renderOutlook(){
  const {p,base}=scenarioProduct();
  const h=state.filters.horizon||state.outHorizon;
  const value=scenarioValue(state.shocks,h);
  const names={up:['Haussier','positive'],base:['Central','neutral'],down:['Baissier','negative']};
  return head('Analyse prospective','Perspectives & scénarios','Comparez des trajectoires conditionnelles à trois horizons et ajustez les chocs qui influencent les prix.')+
    '<div class="toolbar"><label>Produit</label>'+select('outProduct',products,p)+'<label>Horizon</label>'+select('outHorizon',labels.horizon,h)+'<span class="small">'+e(horizonNotes[h])+'</span></div>'+
    '<div class="grid3">'+Object.entries(names).map(([k,[name,cls]])=>{
      const shocks=Object.fromEntries(shockFields.map(([id],i)=>[id,presets[k][i]]));
      return panel('<span class="eyebrow '+cls+'">'+name+'</span><b class="num scenario-output '+cls+'">'+sign(scenarioValue(shocks,h))+' <small class="small">points</small></b><p class="analysis-text">'+e(base[k])+'</p><p class="small"><strong>À suivre</strong> · '+e(base.trigger)+'</p><div style="margin-top:10px">'+action('preset','Charger les hypothèses','ghost','data-value="'+k+'"')+'</div>');
    }).join('')+'</div>'+
    section('Sensibilités modifiables','Chocs en % par rapport au scénario central')+
    '<div class="grid2 flow">'+panel(shockFields.map(([k,label,weight],i)=>'<div class="spread-between"><label for="shock-'+k+'">'+e(label)+'</label><output id="val-'+k+'" class="num">'+e(percent(state.shocks[k]))+'</output></div><input type="range" id="shock-'+k+'" data-shock="'+k+'" min="-30" max="30" step="1" value="'+state.shocks[k]+'"><p class="small" style="margin-bottom:9px">Coefficient '+e(sign(weight*horizonMultipliers[h][i],2))+' point / 1 %</p>').join(''))+
    panel('<span class="eyebrow">Indice de pression simulé</span><strong class="num scenario-output '+scenarioSign(value)+'" id="scenario-value">'+e(sign(value))+' pts</strong><p class="analysis-text">Somme des variations d’hypothèses multipliées par les coefficients affichés. Coefficients illustratifs, ajustés par horizon. Le change mesure ici la pression sur la demande importatrice via le dollar.</p><div id="contrib">'+scenarioTable(h)+'</div>'+notice('L’indice exprime une sensibilité relative. Les coefficients illustratifs ne sont pas estimés à partir des prix, et le résultat ne fournit ni probabilité ni objectif de cours.')+
    action('preset','Remettre à zéro','ghost','data-value="base"'))+'</div>';
}
function scenarioTable(h){
  return table(['Hypothèse','Contribution'],shockFields.map(([k,label,w],i)=>[e(label),'<span class="num">'+e(sign(state.shocks[k]*w*horizonMultipliers[h][i],2))+' pts</span>']));
}


const forexCalendarUrl='https://www.forexfactory.com/calendar';
const liveCalendarFeed='https://raw.githubusercontent.com/elchapasso/PROJECT/calendar-live/docs/terminal/calendar-feed.json';
function calendarEntries(feed){
  if(!feed)return [];
  const common={zone:'New York (ET)',importance:3};
  const nass=feed.nass.map(({date,url})=>({...common,id:'nass-crop-progress-'+date.slice(0,10),
    date:date.slice(0,10),time:date.slice(11,16),title:'USDA NASS · Crop Progress',short:'NASS · Crop Progress',
    source:'USDA NASS',url,product:'soy',origin:'us',expected:'Avancement des semis et récoltes, stade et état des cultures selon la saison.',
    previous:'Voir les rapports Crop Progress',consensus:'Non disponible',
    impact:'Une surprise sur l’avancement ou l’état des cultures peut modifier les attentes d’offre américaine.'}));
  const forex=feed.forex.map(({date,country,title,forecast,previous})=>({...common,id:'ff-'+country+'-'+date+'-'+title,
    date:date.slice(0,10),time:date.slice(11,16),title:country+' · '+title,source:'Forex Factory',url:forexCalendarUrl,
    product:'fx',origin:country==='USD'?'us':'eu',expected:'Annonce à fort impact · '+country,
    consensus:forecast||'Non disponible',previous:previous||'Non disponible',
    impact:'Un écart au consensus peut affecter le '+(country==='USD'?'dollar américain':'cours de l’euro')+'.'}));
  return [...nass,...forex];
}
async function refreshCalendar(){
  for(const url of [liveCalendarFeed,'./terminal/calendar-feed.json?v=20261110']){
    try{
      const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(7000)});
      if(!response.ok)continue;
      const feed=await response.json();
      if(!Array.isArray(feed.nass)||!Array.isArray(feed.forex))continue;
      calendarFeed=feed;
      break;
    }catch{}
  }
  calendarFeedLoaded=true;
  if((state.page==='calendar'||state.page==='overview')&&!root.querySelector('dialog[open]'))render();
}
function calendarCoverage(){
  const nass=link(sources['USDA NASS'].url,'USDA NASS');
  const forex=link(forexCalendarUrl,'Forex Factory');
  const week=calendarFeed?.forexWeekStart?
    formatDate(calendarFeed.forexWeekStart)+' – '+formatDate(calendarFeed.forexWeekEnd):calendarFeedLoaded?'calendrier indisponible':'chargement du calendrier';
  const outdated=calendarFeed?.forexWeekEnd&&calendarFeed.forexWeekEnd<calendarToday();
  return '<p class="small">'+nass+' · Crop Progress à 16 h ET, le premier jour ouvré d’avril à novembre. '+
    forex+' · USD et EUR à fort impact · '+e(week)+(outdated?' · Dernière semaine disponible':'')+'.</p>';
}
function renderCalendar(){
  const rows=calendarFilter();
  const today=calendarToday();
  const [y,m]=state.month.split('-').map(Number);
  const dayCount=new Date(Date.UTC(y,m,0)).getUTCDate();
  const offset=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7;
  const tiles=Array.from({length:Math.ceil((dayCount+offset)/7)*7},(_,i)=>{
    const d=i+1-offset;
    if(d<1||d>dayCount)return '<div class="day blank" aria-hidden="true"></div>';
    const k=state.month+'-'+String(d).padStart(2,'0');
    return '<div class="day"><b>'+d+'</b>'+rows.filter(r=>r.date===k).map(r=>'<button type="button" title="'+e(r.title)+'" data-action="cal" data-id="'+e(r.id)+'">'+e(r.short||r.title)+'</button>').join('')+'</div>';
  });
  const renderRows=arr=>arr.length?arr.map(calMini).join(''):empty('Aucune publication dans cette sélection.');
  return head('Veille','Calendrier des publications','Retrouvez les prochaines publications officielles, les précédents chiffres et les scénarios de réaction.')+
    panel('<div class="spread-between"><h2>'+e(displayPeriod(state.month,'month'))+'</h2><div class="actions">'+action('month',icon('left'),'icon','data-value="-1" aria-label="Mois précédent"')+action('month',icon('right'),'icon','data-value="1" aria-label="Mois suivant"')+'</div></div><div class="month" aria-label="Calendrier mensuel">'+['Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.','Dim.'].map(d=>'<span class="small">'+d+'</span>').join('')+tiles.join('')+'</div>')+
    calendarCoverage()+
    section('Publications programmées','Heures indiquées dans le fuseau de la source')+panel(renderRows(rows.filter(r=>r.date?.startsWith(state.month)&&r.date>=today)))+
    section('Dates à confirmer','Les annonces sans date restent dans la liste de veille')+panel(renderRows(rows.filter(r=>!r.date)));
}
const reportScope=(end=state.reportEnd,kind=state.reportKind)=>{
  const start=kind==='weekly'?addDays(end,-6):end.slice(0,7)+'-01';
  return {start,end,kind};
};
function getReport(end=state.reportEnd,kind=state.reportKind){
  const scope=reportScope(end,kind);
  const weekly=kind==='weekly';
  const rows=eventsFor().filter(r=>r.date>=scope.start&&r.date<=end&&checkedStatus(r));
  const seriesIds=weekly?['fcpo-jan27','bo','zs','sm','brent-daily','wti-daily','fx-eur','fx-mad','rape-feb27','sbo-arg-official']:['wb-sbo','wb-palm','wb-sm','wb-soy','brent','wti'];
  const pricePeriod=end.slice(0,7);
  const prices=seriesIds.flatMap(id=>{
    const s=series(id),dates=Object.keys(s.values).filter(k=>weekly?k>=scope.start&&k<=end:k===pricePeriod).sort();
    if(!dates.length)return [];
    const date=dates.at(-1);
    const previous=weekly?Object.keys(s.values).filter(k=>k<date).sort().at(-1):monthShift(date,-1);
    const year=weekly?null:monthShift(date,-12);
    const point=s.points[date];
    return [s.name+' · '+num(s.values[date])+' '+s.unit+' ('+displayPeriod(date,s.grain)+')'+(previous&&s.values[previous]!==undefined?' · '+percent(pct(s.values[date],s.values[previous]))+' vs '+displayPeriod(previous,s.grain):'')+(year&&s.values[year]!==undefined?' · '+percent(pct(s.values[date],s.values[year]))+' a/a':'')+' ['+point.source+'] '+point.url];
  });
  const snapshots=balancesFor().filter(r=>r.date<=asOf()&&(weekly?r.date>=scope.start&&r.date<=end:r.periodType==='month'?r.period===pricePeriod:r.date>=scope.start&&r.date<=end));
  const fundamental=unique(snapshots.filter(r=>['production','ending','exports','crush','ratio'].includes(r.metric)).sort((a,b)=>a.date.localeCompare(b.date)),r=>[r.product,r.origin,r.metric,r.periodType,r.variant,r.source].join('|')).sort(byDate).slice(0,12).map(r=>{
    const candidates=balancesFor().filter(x=>x.product===r.product&&x.origin===r.origin&&x.metric===r.metric&&x.periodType===r.periodType&&x.unit===r.unit&&x.variant===r.variant&&x.source===r.source&&x.date<=asOf()).sort(byDate);
    const prev=candidates.find(x=>x.period===previousPeriod(r.period,r.periodType));
    const year=r.periodType==='month'?candidates.find(x=>x.period===monthShift(r.period,-12)):null;
    const rev=r.periodType==='campaign'?candidates.find(x=>x.period===r.period&&x.date<r.date):null;
    const compare=(x,label)=>x?' · '+(r.unit==='%'?sign(r.value-x.value)+' pts':percent(pct(r.value,x.value)))+' '+label:'';
    return origins[r.origin]+' / '+products[r.product]+' · '+metrics[r.metric]+' '+num(r.value,3)+' '+r.unit+' ('+displayPeriod(r.period,r.periodType)+', '+labels.status[r.status]+')'+compare(prev,r.periodType==='month'?'m/m':'vs période précédente')+compare(year,'a/a')+compare(rev,'vs édition précédente')+' ['+r.source+' · '+formatDate(r.date)+'] '+r.url;
  });
  const windowEnd=addDays(end,weekly?7:90);
  const agenda=calendarFilter().filter(r=>r.date&&r.date>end&&r.date<=windowEnd).slice(0,5);
  const rowLine=r=>origins[r.origin]+' / '+products[r.product]+' · '+r.title+' · '+r.number+' · '+r.variation+' · '+r.transmission+' ['+r.source+' · '+formatDate(r.date)+'] '+r.url;
  const trend=sentiment(rows,end,weekly?7:31);
  const sections=[
    ['Prix de référence',prices],
    ['Faits marquants',rows.filter(r=>r.status==='confirmed').slice(0,6).map(rowLine)],
    ['Évolutions des bilans et flux',fundamental],
    ['Facteurs haussiers',ranked(rows,'positive').slice(0,4).map(rowLine)],
    ['Facteurs baissiers',ranked(rows,'negative').slice(0,4).map(rowLine)],
    ['Risques et catalyseurs',rows.filter(r=>['estimate','consensus'].includes(r.status)).slice(0,3).map(rowLine).concat(agenda.map(r=>r.title+' · '+formatDate(r.date)+' · '+r.impact+' ['+r.source+'] '+r.url))],
    [weekly?'Perspectives sur la semaine suivante':'Perspectives à 1–3 mois',[
      trend.count?'Score des observations '+sign(trend.score,0)+'/100 ('+trend.count+' facteurs).':'Couverture insuffisante pour calculer une orientation.',
      ...[...ranked(rows,'positive',weekly?'short':'medium').slice(0,1),...ranked(rows,'negative',weekly?'short':'medium').slice(0,1)].map(r=>r.caveat),
    ]],
  ];
  const title=weekly?'Rapport hebdomadaire':'Rapport mensuel';
  const text=title+' · '+formatDate(scope.start)+' – '+formatDate(end)+'\n\n'+sections.map(([label,items])=>label+'\n'+(items.length?items.map(x=>'• '+x).join('\n'):'• Données non disponibles.')).join('\n\n');
  return {...scope,title,text,sections,priceCount:prices.length,events:rows.length};
}
function reportHtml(text){
  return text.split('\n\n').map((block,i)=>{
    const [title,...items]=block.split('\n');
    if(!i)return '<h2>'+e(title)+'</h2>';
    return '<h3 style="margin-top:16px">'+e(title)+'</h3><ul class="brief-list">'+items.map(line=>{
      const matched=line.match(/ (https?:\/\/\S+)$/);
      return '<li>'+e((matched?line.slice(0,matched.index):line).replace(/^•\s*/,''))+(matched?' · '+link(matched[1],'Source'):'')+'</li>';
    }).join('')+'</ul>';
  }).join('');
}
function renderReports(){
  memoryReport=getReport();
  const active=data.reports.find(r=>r.id===state.reportView);
  const compared=data.reports.find(r=>r.id===state.reportOther&&r.id!==active?.id);
  const archive=[...data.reports].sort((a,b)=>b.end.localeCompare(a.end));
  return head('Veille et synthèses','Rapports de marché','Les rapports sont assemblés à partir des données présentes. Archivez une version pour conserver la lecture et les sources à la date de génération.')+
    '<div class="toolbar">'+btnSeg('reportKind',{weekly:'Hebdomadaire',monthly:'Mensuel'},state.reportKind)+'<label>Fin de période <input type="date" data-control="reportEnd" value="'+e(state.reportEnd)+'"></label>'+action('save-report',icon('plus')+' Archiver','primary')+action('export-report',icon('download')+' Texte','ghost')+'</div>'+
    panel('<p class="small">Aperçu calculé · '+memoryReport.events+' événements · '+memoryReport.priceCount+' séries de prix</p>'+reportHtml(memoryReport.text))+
    section('Archives','Versions sauvegardées dans ce navigateur')+panel(archive.length?'<div class="toolbar"><label>Rapport archivé</label>'+select('reportView',Object.fromEntries(archive.map(r=>[r.id,r.title+' · '+formatDate(r.end)])),state.reportView,'Choisir un rapport')+
    (active&&archive.length>1?'<label>Comparer avec</label>'+select('reportOther',Object.fromEntries(archive.filter(r=>r.id!==active.id).map(r=>[r.id,r.title+' · '+formatDate(r.end)])),state.reportOther,'Choisir une version'):'')+'</div>':'<p class="small">Les rapports archivés apparaîtront ici.</p>')+
    (active?'<div class="'+(compared?'grid2 flow':'stack')+'" style="margin-top:12px">'+panel(reportHtml(active.text))+(compared?panel(reportHtml(compared.text)):'')+'</div>':'');
}
function briefGroups(){
  const since=stamp(asOf(),state.comexWindow);
  const rows=eventsFor().filter(r=>r.date>=since&&checkedStatus(r)&&/\d/.test(r.number));
  return Object.entries(groups).map(([key,g])=>{
    const filtered=rows.filter(r=>g.products.includes(r.product)).sort((a,b)=>b.intensity-a.intensity||byDate(a,b));
    return {key,name:g.name,rows:filtered.slice(0,state.exec?2:8),total:filtered.length};
  }).filter(g=>g.total||!state.filters.product);
}
function briefLine(r){return origins[r.origin]+' / '+r.title+' · '+r.period+' · '+r.number+(r.variation?' · '+r.variation:'')+' → '+labels.impact[r.impact].toLowerCase()+' · '+r.transmission;}
function briefHtml(print=false){
  const blocks=briefGroups();
  const headline=print?'<header><span style="letter-spacing:.12em;font-size:9pt">OLÉA TERMINAL · VEILLE SOURCÉE</span><h1>'+e(state.exec?'Synthèse de direction':'Brief marché COMEX')+'</h1><p>Données au '+e(formatDate(asOf()))+' · '+e(periodLabel[state.comexWindow])+'</p></header>':'';
  if(!blocks.length)return headline+empty('Aucun chiffre sourcé dans cette sélection.');
  return headline+blocks.map(g=>{
    const content=g.rows.length?'<ul class="brief-list">'+g.rows.map(r=>'<li><strong>'+e(origins[r.origin]+' / '+r.title)+'</strong> · '+e(r.period+' · '+r.number+' · '+r.variation)+' → <span class="'+e(r.impact)+'">'+e(labels.impact[r.impact])+'</span> · '+e(r.transmission)+'<small>'+link(r.url,r.source)+' · '+e(formatDate(r.date)+' · '+labels.status[r.status]+' · '+labels.horizon[r.horizon])+'</small></li>').join('')+'</ul>':empty('Aucun chiffre sourcé dans cette fenêtre.');
    const limited=g.total>0&&g.total<4&&!state.exec?'<p class="small">'+g.total+' éléments documentés sur cette fenêtre.</p>':'';
    return print?'<section><h2>'+e(g.name)+'</h2>'+limited+content+'</section>':panel('<h2>'+e(g.name)+'</h2>'+limited+content);
  }).join('');
}
function renderComex(){
  return head('Veille et synthèses','Brief COMEX','Transformez la veille en bullets courts, chiffrés et sourcés, avec une conséquence sur les prix.')+
  '<div class="toolbar"><label>Fenêtre</label>'+select('comexWindow',{7:periodLabel[7],30:periodLabel[30],60:periodLabel[60],90:periodLabel[90]},state.comexWindow)+
  '<label><input type="checkbox" data-control="exec" '+(state.exec?'checked':'')+'> Synthèse de direction</label>'+action('copy-brief',icon('copy')+' Copier','ghost')+action('pdf',icon('download')+' Export PDF','primary')+'</div>'+
  '<div class="stack">'+briefHtml()+'</div>';
}
function renderSources(){
  const priceList=Object.keys(seedPrices).map(id=>{
    const s=series(id,{}),last=Object.keys(s.values).at(-1),source=s.points[last]?.source||s.source;
    return [e(s.name)+'<small>'+e(s.definition)+'</small>',e(s.unit),last?valueCell(s.values[last],s.unit)+'<small>'+e(displayPeriod(last,s.grain))+'</small>':'Non disponible',link(s.points[last]?.url||s.url,source)];
  });
  return head('Configuration','Sources & données','Consultez les séries, les publications originales et le registre de saisie.')+
    '<div class="grid3">'+panel('<span class="eyebrow">Événements sourcés</span><b class="num">'+fullEvents().length+'</b><span class="muted">Publications et observations</span>','metric')+
    panel('<span class="eyebrow">Points fondamentaux</span><b class="num">'+fullBalances().length+'</b><span class="muted">Révisions comprises</span>','metric')+
    panel('<span class="eyebrow">Séries de prix</span><b class="num">'+priceList.filter(p=>p[2]!=='Non disponible').length+' / '+priceList.length+'</b><span class="muted">Au moins une observation</span>','metric')+'</div>'+
    section('Registre de données','Conservez une sauvegarde JSON pour retrouver vos ajouts sur un autre appareil.')+panel('<p class="analysis-text">Les ajouts, les données BCE synchronisées et les rapports archivés sont enregistrés dans ce navigateur. Le jeu initial comprend des données publiées ou des estimations identifiées. Les flux sous licence nécessitent une alimentation autorisée.</p><div class="toolbar">'+action('add',icon('plus')+' Ajouter une donnée','primary')+action('sync-fx',icon('refresh')+' Actualiser la BCE','ghost')+action('backup',icon('download')+' Sauvegarde JSON','ghost')+'<label class="button" for="import-data">Importer JSON</label><input class="sr" id="import-data" type="file" accept=".json,application/json"></div><p class="small">L’actualisation BCE récupère des taux de référence quotidiens pour EUR/USD, USD/BRL et USD/CNY.</p>')+
    section('Catalogue des séries','Prix physiques et cotations datées, avec leur unité d’origine')+panel(table(['Série','Unité','Dernière observation','Source'],priceList))+
    section('Répertoire des sources','Accès aux publications et aux sources sous licence')+panel(table(['Source','Périmètre','Couverture'],Object.entries(sources).map(([name,v])=>[link(v.url,name),e(v.scope),name==='BCE'?'Actualisation via API':fullEvents().some(r=>r.source===name)||fullCalendar().some(r=>r.source===name&&r.date)?'Publication citée':'À renseigner'])));
}


const pageRender={
  overview:renderOverview,soy:()=>renderComplex('soy'),sun:()=>renderComplex('sun'),palm:()=>renderComplex('palm'),
  rape:()=>renderComplex('rape'),macro:()=>renderComplex('macro'),drivers:()=>renderFeed(false),news:()=>renderFeed(true),
  balances:renderBalances,demand:renderDemand,cot:renderCot,cross:renderCross,'cbot-arg':renderCbotArg,biofuels:renderBiofuels,outlook:renderOutlook,calendar:renderCalendar,reports:renderReports,comex:renderComex,sources:renderSources,
};
function bindPageCharts(scope){
  scope.querySelectorAll('[data-chart]').forEach(wrap=>bindChart(wrap,chartModels[Number(wrap.dataset.chart)]));
}
function render(){
  const active=document.activeElement;
  const focusFilter=active?.getAttribute('data-filter');
  const focusControl=active?.getAttribute('data-control');
  document.documentElement.dataset.theme=state.theme;
  chartModels.length=0;
  root.innerHTML=shell(pageRender[state.page]());
  bindBalanceView(root,{csv,renderCharts:renderBalanceCharts,bindCharts:bindPageCharts});
  bindCbotArgView(root,{csv,toast});
  bindCotView(root,{csv,toast});
  bindBiofuelPolicy(root,biofuelUi);
  bindPageCharts(root);
  if(focusFilter)root.querySelector('[data-filter="'+CSS.escape(focusFilter)+'"]')?.focus({preventScroll:true});
  if(focusControl)root.querySelector('[data-control="'+CSS.escape(focusControl)+'"]')?.focus({preventScroll:true});
}
function toast(text){
  clearTimeout(toastTimer);
  const el=document.querySelector('#toast');if(!el)return;
  el.textContent=text;el.hidden=false;
  toastTimer=setTimeout(()=>{el.hidden=true;},4600);
}
function save(next){
  try{localStorage.setItem(localKey,JSON.stringify(next));data=next;return true;}
  catch{toast('La sauvegarde locale a échoué. Vérifiez le stockage de votre navigateur.');return false;}
}
const freshId=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function showDialog(id,title,content){
  const dlg=document.getElementById(id);
  dlg.innerHTML='<div class="spread-between"><h2 id="'+id+'-title">'+e(title)+'</h2>'+action('close',icon('close'),'icon ghost','aria-label="Fermer"')+'</div><hr class="rule">'+content;
  dlg.setAttribute('aria-labelledby',id+'-title');
  if(!dlg.open)dlg.showModal();
}
const dl=(rows)=>'<dl>'+rows.map(([label,value])=>'<dt>'+e(label)+'</dt><dd>'+value+'</dd>').join('')+'</dl>';
function showEvent(r){
  if(!r)return;
  showDialog('detail',r.title,'<div class="detail">'+lineBadge(r)+'<hr class="rule">'+dl([
    ['Publication',e(formatDate(r.date)+' · '+(r.time||'Heure non disponible'))],['Période',e(r.period)],['Marché',e(products[r.product]+' · '+origins[r.origin])],['Catégorie',e(labels.category[r.category])],
    ['Information',e(r.summary)],['Chiffre et variation',e(r.number+' · '+r.variation)],['Intensité et horizon',e(labels.intensity[r.intensity]+' · '+labels.horizon[r.horizon])],
    ['Transmission',e(r.transmission)],['Conditions d’inversion',e(r.caveat)],['Source originale',link(r.url,r.source)],
  ])+'</div>');
}
function showCalendar(r){
  if(!r)return;
  showDialog('detail',r.title,'<div class="detail">'+dl([['Date attendue',e(formatDate(r.date))],['Heure et fuseau',e(r.time?r.time+' · '+r.zone:'À confirmer')],['Marché',e(products[r.product]+' · '+origins[r.origin])],['Données attendues',e(r.expected)],['Consensus',e(r.consensus)],['Précédente publication',e(r.previous)],['Importance',e(labels.intensity[r.importance])],['Réaction possible',e(r.impact)],['Source',link(r.url,r.source)]])+'</div>');
}
const field=(label,control,wide=false)=>'<label class="field'+(wide?' wide':'')+'">'+e(label)+control+'</label>';
const input=(name,type='text',value='',extra='')=>'<input name="'+e(name)+'" type="'+e(type)+'" value="'+e(value)+'" '+extra+'>';
const box=(name,placeholder='')=>'<textarea name="'+e(name)+'" placeholder="'+e(placeholder)+'" required maxlength="1500"></textarea>';
const namedSelect=(name,dict,value='',placeholder)=>'<select name="'+e(name)+'" required>'+options(dict,value,placeholder)+'</select>';
function entryForm(type){
  const typeMap={events:'Événement',balances:'Observation fondamentale',quotes:'Cours daté',calendar:'Publication au calendrier'};
  const base=field('Produit',namedSelect('product',products,state.filters.product,'Choisir le produit'))+field('Origine',namedSelect('origin',origins,state.filters.origin,'Choisir l’origine'));
  const source=field('Source',input('source','text',state.filters.source,'required maxlength="120" placeholder="Organisme ou média"'))+field('Lien original',input('url','url','','required placeholder="https://…" maxlength="1000"'));
  const day=field('Date de publication',input('date','date',asOf(),'required'));
  const statuses=field('Validation',namedSelect('status',labels.status,'confirmed'));
  const optional=(key,placeholder)=>input(key,'text','','maxlength="120" placeholder="'+e(placeholder)+'"');
  const groups={
    events:field('Titre',input('title','text','','required maxlength="180"'),true)+base+day+field('Heure et fuseau (facultatif)',optional('time','ex. 16:00 New York'))+field('Période de référence',input('period','text','','required maxlength="100" placeholder="ex. octobre 2026"'))+field('Catégorie',namedSelect('category',labels.category,'supply'))+
      field('Chiffre clé',input('number','text','','required maxlength="160" placeholder="ex. 3,51 Mt"'))+field('Variation',input('variation','text','','required maxlength="160" placeholder="ex. +24,54 % m/m ou Non disponible"'))+field('Impact',namedSelect('impact',labels.impact,'mixed'))+field('Intensité',namedSelect('intensity',labels.intensity,'2'))+field('Horizon',namedSelect('horizon',labels.horizon,'short'))+statuses+source+
      field('Information factuelle',box('summary'),true)+field('Transmission au prix',box('transmission','Pourquoi cet événement affecte les prix'),true)+field('Conditions d’atténuation ou d’inversion',box('caveat'),true),
    balances:base+day+field('Indicateur',namedSelect('metric',metrics,'production'))+field('Type de période',namedSelect('periodType',periodTypes,'month'))+field('Référence',input('period','text','','required placeholder="AAAA-MM, AAAA/AA, AAAA ou AAAA-MM-JJ" maxlength="20"'))+
      field('Valeur',input('value','number','','required min="0" step="any"'))+field('Unité',input('unit','text','Mt','required maxlength="40"'))+statuses+field('Nature de la comparaison',namedSelect('variant',{official:'Publication',consensus:'Consensus',estimate:'Estimation'},'official'))+source,
    quotes:field('Série / unité',namedSelect('series',Object.fromEntries(Object.entries(seedPrices).map(([id,p])=>[id,p.name+' · '+p.unit+' · '+(periodTypes[p.grain]||'Jour')])),undefined,'Choisir la série'),true)+field('Date ou mois de référence',input('period','text','','required placeholder="AAAA-MM-JJ ou AAAA-MM" maxlength="10"'))+field('Valeur',input('value','number','','required min="0.00000001" step="any"'))+source+field('Précision (facultatif)',input('note','text','','maxlength="260" placeholder="Type de cours, échéance ou précision de la source"'),true),
    calendar:field('Publication',input('title','text','','required maxlength="180"'),true)+base+field('Date attendue (facultatif)',input('date','date',''))+field('Heure (facultatif)',input('time','time',''))+field('Fuseau horaire (facultatif)',optional('zone','ex. Africa/Casablanca'))+field('Importance',namedSelect('importance',labels.intensity,'2'))+source+
      field('Données attendues',box('expected'),true)+field('Chiffre précédent',input('previous','text','Non disponible','required maxlength="500"'))+field('Consensus',input('consensus','text','Non disponible','required maxlength="500"'))+field('Scénarios d’impact',box('impact'),true),
  };
  showDialog('entry','Ajouter une donnée sourcée','<div class="toolbar"><label>Type</label>'+select('editType',typeMap,type)+'</div><p class="small">La date de publication et la période mesurée sont distinctes. Les ajouts restent enregistrés dans ce navigateur.</p><form id="entry-form"><div class="form-grid">'+groups[type]+'</div><div class="spread-between"><span id="entry-error" class="negative small" role="alert"></span><button type="submit" class="button primary">'+icon('plus')+' Enregistrer</button></div></form>');
}
const storeRules={events:[validEvent,eventKey],balances:[validBalance,balanceKey],quotes:[validQuote,quoteKey],calendar:[validCalendar,r=>r.id],reports:[null,r=>r.id]};
function addRecord(form){
  const k=state.editType, [validate,key]=storeRules[k];
  const r=Object.fromEntries([...new FormData(form)].map(([name,value])=>[name,value.trim()]));
  r.id=freshId();
  if(k==='events')r.intensity=Number(r.intensity);
  if(k==='calendar'){r.importance=Number(r.importance);r.short=r.title.split(' ')[0];}
  if(k==='quotes'||k==='balances')r.value=Number(r.value);
  if(!validate(r)){
    form.querySelector('#entry-error').textContent='Vérifiez la période, les champs obligatoires et le lien HTTP(S).';
    return;
  }
  if(save({...data,[k]:unique([...data[k],r],key)})){
    document.querySelector('#entry').close();render();toast('Donnée sourcée enregistrée.');
  }
}
function download(name,content,mime){
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:mime}));
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const csvCell=val=>{
  const v=String(val??'');
  const formulaLike=/^[=+@-]/.test(v)&&typeof val!=='number'&&!/^-\d+(?:[.,]\d+)?%?$/.test(v);
  return '"'+(formulaLike?"'":'')+v.replaceAll('"','""')+'"';
};
function csv(name,rows){download(name,'\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');}
function exportFeed(){
  csv('olea_facteurs.csv',[['Date','Heure','Produit','Origine','Période','Catégorie','Titre','Fait','Chiffre','Variation','Impact','Intensité','Horizon','Statut','Transmission','Conditions','Source','Lien'],
    ...filteredFeed().map(r=>[r.date,r.time,products[r.product],origins[r.origin],r.period,labels.category[r.category],r.title,r.summary,r.number,r.variation,labels.impact[r.impact],labels.intensity[r.intensity],labels.horizon[r.horizon],labels.status[r.status],r.transmission,r.caveat,r.source,r.url])]);
}
function exportCross(){
  const {a,b,rows,common}=crossData();
  csv('olea_spreads.csv',[['Date',a.name+' '+a.unit,b.name+' '+b.unit,'Spread '+(common?a.unit:''),'Source A','Source B'],
    ...rows.map(r=>[r.date,r.a,r.b,common?r.a-r.b:null,a.points[r.date]?.url,b.points[r.date]?.url])]);
}
async function copyBrief(){
  const text=briefGroups().map(g=>g.name+'\n'+g.rows.map(r=>'• '+briefLine(r)+' ['+r.source+' · '+formatDate(r.date)+'] '+r.url).join('\n')).join('\n\n');
  try{await navigator.clipboard.writeText(text);toast('Brief copié dans le presse-papiers.');}
  catch{download('olea_brief_comex.txt',text,'text/plain;charset=utf-8');toast('Brief téléchargé en texte.');}
}
async function importData(file){
  if(!file)return;
  try{
    if(file.size>10_000_000)throw new Error('Le fichier dépasse 10 Mo.');
    const imported=parseStore((await file.text()).replace(/^\ufeff/,''));
    const next=Object.fromEntries(Object.entries(storeRules).map(([k,[,key]])=>[k,unique([...data[k],...imported[k]],key)]));
    if(save(next)){render();toast('Import JSON terminé.');}
  }catch(err){toast('Import impossible · '+err.message);}
}
const ecbase='https://data-api.ecb.europa.eu/service/data/EXR/D.';
function parseECB(text){
  const lines=text.trim().split(/\r?\n/);
  const header=lines.shift().replace(/^\ufeff/,'').split(',').map(s=>s.replaceAll('"','').trim());
  const period=header.indexOf('TIME_PERIOD'),value=header.indexOf('OBS_VALUE');
  if(period<0||value<0)throw new Error('Schéma BCE inattendu.');
  return new Map(lines.flatMap(line=>{
    const cols=line.split(','), date=cols[period]?.replaceAll('"',''), rate=Number(cols[value]?.replaceAll('"',''));
    return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(rate)&&rate>0?[[date,rate]]:[];
  }));
}
async function syncFX(button){
  button.disabled=true;
  toast('Lecture des références quotidiennes BCE…');
  try{
    const codes=['USD','BRL','CNY'];
    const results=await Promise.all(codes.map(async code=>{
      const url=ecbase+code+'.EUR.SP00.A?lastNObservations=90&format=csvdata';
      const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      return {url,values:parseECB(await response.text())};
    }));
    const [usd,brl,cny]=results;
    const entries=[...usd.values].flatMap(([period,value])=>{
      const make=(series,value,url)=>({series,period,value,source:'BCE',url,note:'Cours de référence quotidien'});
      return [make('fx-eur',value,usd.url),...[[brl,'fx-brl'],[cny,'fx-cny']].flatMap(([series,id])=>series.values.has(period)?[make(id,series.values.get(period)/value,series.url)]:[])];
    }).filter(validQuote);
    if(!entries.length)throw new Error('Aucune observation exploitable.');
    if(save({...data,quotes:unique([...data.quotes,...entries],quoteKey)})){render();toast(entries.length+' observations BCE synchronisées.');}
  }catch{toast('La BCE est inaccessible depuis ce navigateur. Vous pouvez ajouter des cours datés ou importer un registre JSON.');}
  finally{button.disabled=false;}
}
function printBrief(){
  document.querySelector('#printout').innerHTML=briefHtml(true);
  document.body.classList.add('print-brief');
  window.print();
}
window.addEventListener('afterprint',()=>document.body.classList.remove('print-brief'));
const controlActions={
  menu:()=>{state.mobile=!state.mobile;render();},
  theme:()=>{state.theme=state.theme==='dark'?'light':'dark';try{localStorage.setItem('olea-theme',state.theme);}catch{}render();},
  reset:()=>{state.filters={...FILTERS};render();},
  add:()=>entryForm(state.editType),
  close:el=>el.closest('dialog')?.close(),
  event:el=>showEvent(fullEvents().find(r=>r.id===el.dataset.id)),
  cal:el=>showCalendar(fullCalendar().find(r=>r.id===el.dataset.id)),
  month:el=>{state.month=monthShift(state.month,Number(el.dataset.value));render();},
  preset:el=>{state.shocks=Object.fromEntries(shockFields.map(([k],i)=>[k,presets[el.dataset.value][i]]));render();},
  seg:el=>{
    const {key,value}=el.dataset;
    if(key==='sunOrigin'&&value!==state.sunOrigin)state.sunView='';
    state[key]=value;
    if(key==='reportKind')state.reportEnd=value==='monthly'?addDays(asOf().slice(0,7)+'-01',-1):asOf();
    render();
  },
  'season-year':el=>{
    const year=el.dataset.value;
    const fieldset=el.closest('[data-season-scope]');
    const selected=[...fieldset.querySelectorAll('[aria-pressed="true"]')].map(button=>button.dataset.value);
    state.seasonYears[fieldset.dataset.seasonScope]=selected.includes(year)?selected.filter(value=>value!==year):[...selected,year];
    render();
    root.querySelector('[data-action="season-year"][data-value="'+CSS.escape(year)+'"]')?.focus({preventScroll:true});
  },
  'export-soy-us':()=>{
    const family=state.soyFamily;
    const names=soyHistoryLabels[family].map(name=>name+' (Mt)');
    const rows=usSoyDisplayRows(family).map(([date,...values])=>[date,...values.map(v=>v===null?'':String(Number(v.toFixed(8))).replace('.',',')),nopaHistory.get(date)?.source[1]??'']);
    csv('olea_'+(family==='soy'?'graines_soja':'huile_soja')+'_us.csv',[['Mois',...names,'Publication relayant NOPA'],...rows]);
  },
  'export-soy-arg':()=>{
    const family=state.soyFamily, oil=family==='sbo';
    const names=arSoyMetrics[family].map(([name])=>name+' (Mt)');
    const rows=argentinaSoyHistory.map(row=>[row.date,...row[family].map(v=>v===null?'':String(Number(v.toFixed(9))).replace('.',',')),...(oil?[argentinaOilNote(row)]:[])]);
    csv('olea_'+(oil?'huile_soja':'graines_soja')+'_arg.csv',[['Mois',...names,...(oil?['Qualité des données']:[])],...rows]);
  },
  'export-soy-bra':()=>{
    const family=state.soyFamily, view=state.brazilSoyView;
    const {names,rows}=brazilSoySelection(family,view);
    const monthly=view==='monthly';
    const values=rows.map(([date,...values])=>[date,
      ...values.map(v=>v===null?'':String(Number((v/1000).toFixed(9))).replace('.',',')),
      brazilSoyScope(date,values,view)]);
    csv('olea_'+(family==='soy'?'graines_soja':'huile_soja')+'_bresil_'+view+'.csv',
      [[monthly?'Mois':'Année',...names.map(name=>name+' (Mt)'),'Périmètre du bilan'],...values]);
  },
  'export-sun-history':()=>{
    const {view,series}=sunSelection();
    const rows=series.flatMap(({name,source,data,note,forecast,unit='Mt'})=>data.map(([date,tonnes,url])=>
      [date,name,tonnes===null?'':String(tonnes/1e6).replace('.',','),unit,sunflowerSources[source][0],url??sunflowerSources[source][1],
        [forecast&&date>=forecast?'Prévision USDA':'',note].filter(Boolean).join(' · ')]));
    csv('olea_tournesol_'+state.sunFamily+'_'+state.sunOrigin+'_'+view+'.csv',
      [['Période','Indicateur','Volume','Unité','Source','URL','Périmètre / statut'],...rows]);
  },
  'export-feed':exportFeed,
  'export-cross':exportCross,
  'export-focus':exportFocus,
  'focus-set':el=>{
    const {id,key,value}=el.dataset,spread=focusCards.find(item=>item.id===id);
    if(!spread)return;
    const current=focusState[id],{grain}=focusVariant(spread);
    if(key==='variant'&&spread.variants.some(variant=>variant.id===value))current.variant=value;
    else if(key==='unit'&&Object.hasOwn(spread.units??{},value))current.params.unit=value;
    else if(key==='range'&&Object.hasOwn(focusRanges[grain],value)||key==='average'&&Object.hasOwn(focusAverages[grain],value))current[key][grain]=value;
    else return;
    render();
    root.querySelector('[data-action="focus-set"][data-id="'+id+'"][data-key="'+key+'"][data-value="'+CSS.escape(value)+'"]')?.focus({preventScroll:true});
  },
  'focus-component':el=>{
    const spread=focusCards.find(item=>item.id===el.dataset.id),leg=el.dataset.leg,variant=spread&&focusVariant(spread);
    if(!variant?.legs.includes(leg))return;
    const role=componentRole(variant,leg),list=focusState[spread.id].components;
    focusState[spread.id].components=list.includes(role)?list.filter(item=>item!==role):[...list,role];
    render();
    root.querySelector('[data-action="focus-component"][data-id="'+spread.id+'"][data-leg="'+CSS.escape(leg)+'"]')?.focus({preventScroll:true});
  },
  'focus-reset':el=>{
    const spread=focusCards.find(item=>item.id===el.dataset.id);
    if(!spread)return;
    focusState[spread.id].params={...spread.defaults,...(spread.units?{unit:focusState[spread.id].params.unit}:{})};
    render();
    root.querySelector('[data-focus-form="'+spread.id+'"] button')?.focus({preventScroll:true});
  },
  'export-report':()=>download('olea_rapport_'+memoryReport.end+'.txt',memoryReport.text,'text/plain;charset=utf-8'),
  'save-report':()=>{
    const {start,end,kind,title,text}=memoryReport;
    const id=freshId();
    if(save({...data,reports:[...data.reports,{id,start,end,kind,title,text}]})){state.reportView=id;render();toast('Rapport archivé.');}
  },
  backup:()=>download('olea_registre.json',JSON.stringify(data,null,2),'application/json'),
  'copy-brief':copyBrief,
  'sync-fx':syncFX,
  pdf:printBrief,
};
root.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');
  if(button){controlActions[button.dataset.action]?.(button);return;}
  const market=event.target.closest('[data-market]');
  if(market){
    const c=cards.find(item=>item.key===market.dataset.market);
    if(c?.group==='soy'){
      state.soyFamily=c.product;
      state.soyOrigin=c.origins[0];
    }else if(c)state.originTab[c.group]=c.origins[0];
  }
  const anchor=event.target.closest('a[href^="#"]');
  if(anchor&&anchor.hash===location.hash&&state.mobile){state.mobile=false;render();}
});
root.addEventListener('submit',event=>{
  if(event.target.matches('form[data-focus-form]')){
    event.preventDefault();
    const spread=focusCards.find(item=>item.id===event.target.dataset.focusForm);
    const fields=new FormData(event.target);
    const {params,error}=checkFocusParams(spread,{...focusState[spread.id].params,...Object.fromEntries(focusInputs(spread,focusVariant(spread)).map(([key])=>[key,Number(fields.get(key))]))});
    if(error){
      toast(error.message??error.label+' · saisissez une valeur de '+num(error.min,3)+' à '+num(error.max,3)+'.');
      return;
    }
    focusState[spread.id].params=params;
    render();
    root.querySelector('[data-focus-form="'+spread.id+'"] button')?.focus({preventScroll:true});
  }
  if(event.target.id==='entry-form'){event.preventDefault();addRecord(event.target);}
  if(event.target.id==='feed-search'){event.preventDefault();state.query=new FormData(event.target).get('search');render();}
});
root.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='import-data'){importData(target.files[0]);target.value='';return;}
  if(target.dataset.filter){state.filters[target.dataset.filter]=target.value;render();return;}
  const key=target.dataset.control;
  if(!key)return;
  if(key==='editType'){state.editType=target.value;entryForm(state.editType);return;}
  if(key==='originTab'){
    state.originTab[state.page]=target.value;
    if(state.filters.origin)state.filters.origin=target.value;
  }else{
    if(key==='outProduct'){if(state.filters.product)state.filters.product=target.value;}
    if(key==='outHorizon'&&state.filters.horizon)state.filters.horizon=target.value;
    if(key==='reportEnd'&&!target.value){target.value=state.reportEnd;return;}
    if(target.form?.id==='feed-search')state.query=new FormData(target.form).get('search');
    state[key]=target.type==='checkbox'?target.checked:target.value;
  }
  render();
});
root.addEventListener('input',event=>{
  const k=event.target.dataset.shock;
  if(!k)return;
  state.shocks[k]=Number(event.target.value);
  const h=state.filters.horizon||state.outHorizon,v=scenarioValue(state.shocks,h);
  const output=document.getElementById('scenario-value');
  document.getElementById('val-'+k).textContent=percent(state.shocks[k]);
  output.textContent=sign(v)+' pts';output.className='num scenario-output '+scenarioSign(v);
  document.getElementById('contrib').innerHTML=scenarioTable(h);
});
window.addEventListener('hashchange',()=>{state.page=readPage();state.mobile=false;render();window.scrollTo(0,0);});
render();
refreshCalendar();
if(loadError)toast(loadError);

