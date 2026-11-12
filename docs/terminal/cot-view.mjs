// Vue « Rapport COT · CFTC » : positionnement des opérateurs sur l’huile de soja et les graines de soja (CBOT).
// Les données viennent de la branche cot-live (actualisée par GitHub Actions), d’une copie intégrée au site,
// et, si un rapport publié manque encore, directement de l’API publique de la CFTC.
import {cotMarkets,cotDatasets,cotGroups,datasetKey,datasetPage,leadGroup,hedgerGroup,records,pctOf,cotIndexSeries,cotIndexAt,zScoreAt,rangeAt,
  seasonal,weekOfYear,releaseFor,expectedLatest,nextRelease,upcomingReleases,socrataUrl,mergeDataset,buildDataset,isValidDataset,addDaysISO,
  CFTC_SCHEDULE_URL,CFTC_ABOUT_URL,CFTC_EXPLANATORY_URL} from './cot-model.mjs?v=20261112-cot';

const VERSION='20261112-cot';
const LIVE_BASE='https://raw.githubusercontent.com/elchapasso/PROJECT/cot-live/docs/terminal/cot/';
const BUNDLED_BASE='./terminal/cot/';
const PREFS='olea-cot-v1';

/* ---------- Formats ---------- */
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatters=new Map();
function num(value,digits=0){
  if(!Number.isFinite(value))return '—';
  if(!formatters.has(digits))formatters.set(digits,new Intl.NumberFormat('fr-FR',{minimumFractionDigits:digits,maximumFractionDigits:digits}));
  const shown=Math.abs(value)<.5/10**digits?0:value;
  return (shown<0?'−':'')+formatters.get(digits).format(Math.abs(shown));
}
const signed=(value,digits=0)=>!Number.isFinite(value)?'—':(value>=.5/10**digits?'+':'')+num(value,digits);
const pct=(value,digits=1)=>Number.isFinite(value)?num(value,digits)+' %':'—';
const signedPct=(value,digits=1)=>Number.isFinite(value)?signed(value,digits)+' %':'—';
function compact(value){
  if(!Number.isFinite(value))return '—';
  const a=Math.abs(value);
  if(a>=1e6)return num(value/1e6,1)+' M';
  if(a>=1e4)return num(value/1e3,0)+' k';
  if(a>=1e3)return num(value/1e3,1)+' k';
  return num(value,Number.isInteger(value)?0:1);
}
const tone=value=>!Number.isFinite(value)||Math.abs(value)<.5?'neutral':value>0?'positive':'negative';
const longDate=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
const shortDate=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const dayMonth=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:'UTC'});
const monthYear=new Intl.DateTimeFormat('fr-FR',{month:'short',year:'2-digit',timeZone:'UTC'});
const monthOnly=new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'});
const casablanca=new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Casablanca'});
const casablancaHour=new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Casablanca'});
const at=date=>new Date(date+'T12:00:00Z');
const fmtLong=date=>date?longDate.format(at(date)):'—';
const fmtShort=date=>date?shortDate.format(at(date)):'—';
const capital=text=>text.charAt(0).toUpperCase()+text.slice(1);

/* ---------- Préférences ---------- */
const ranges={'1y':['1 an',365],'3y':['3 ans',3*365],'5y':['5 ans',5*365],'10y':['10 ans',10*365],all:['Depuis 2010',Infinity]};
const lookbacks={26:'26 sem.',52:'1 an',156:'3 ans',260:'5 ans'};
const reportNames={disaggregated:'Désagrégé',legacy:'Legacy'};
const scopeNames={futures:'Futures',combined:'Futures + options'};
const modeNames={contracts:'Contrats',pct:'% de l’OI'};
const defaults={market:'soybean-oil',report:'disaggregated',scope:'futures',range:'3y',mode:'contracts',lookback:156,hidden:['nr'],hiddenIndex:['sw','or','nr'],lsGroup:'',seasonGroup:'',seasonYears:5,compare:'pct',detailDate:'',historyRows:26,flowWeeks:12};
const state={...defaults};
try{
  const saved=JSON.parse(localStorage.getItem(PREFS)||'{}');
  const choose=(key,allowed)=>{if(allowed.includes(saved[key]))state[key]=saved[key];};
  choose('market',Object.keys(cotMarkets));choose('report',['disaggregated','legacy']);choose('scope',['futures','combined']);
  choose('range',Object.keys(ranges));choose('mode',['contracts','pct']);choose('lookback',[26,52,156,260]);choose('seasonYears',[3,5,10]);
  choose('compare',['pct','index']);choose('historyRows',[13,26,52,104]);choose('flowWeeks',[8,12,26]);
  for(const key of ['hidden','hiddenIndex'])if(Array.isArray(saved[key]))state[key]=saved[key].filter(v=>typeof v==='string').slice(0,8);
  for(const key of ['lsGroup','seasonGroup'])if(typeof saved[key]==='string')state[key]=saved[key];
}catch{}
function persist(){
  try{const {detailDate,...keep}=state;localStorage.setItem(PREFS,JSON.stringify(keep));}catch{}
}
const currentKey=()=>datasetKey(state.report,state.scope);

/* ---------- Chargement ---------- */
const cache=new Map();
const pending=new Map();
let hooks={toast:()=>{},csv:()=>{}};
async function fetchJSON(url,timeout){
  const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
}
function loadDataset(key,{force=false}={}){
  if(!force&&cache.has(key))return Promise.resolve(cache.get(key));
  if(pending.has(key))return pending.get(key);
  const job=(async()=>{
    const bust=force?'t='+Date.now():'';
    const [live,bundled]=await Promise.allSettled([
      fetchJSON(LIVE_BASE+key+'.json'+(bust?'?'+bust:''),9000),
      fetchJSON(BUNDLED_BASE+key+'.json?v='+VERSION+(bust?'&'+bust:''),9000),
    ]);
    const candidates=[[live,'live'],[bundled,'bundled']]
      .filter(([result])=>result.status==='fulfilled'&&isValidDataset(result.value,key))
      .map(([result,origin])=>({data:result.value,origin}))
      .sort((a,b)=>(b.data.latest??'').localeCompare(a.data.latest??''));
    let entry=candidates[0]??null;
    const expected=expectedLatest(new Date());
    if(!entry||entry.data.latest<expected){
      // Rapport publié mais pas encore dans le flux : complément direct depuis l’API de la CFTC.
      try{
        const rows=await fetchJSON(socrataUrl(key,entry?{after:entry.data.latest}:{}),15000);
        if(Array.isArray(rows)&&rows.length){
          const data=entry?mergeDataset(entry.data,rows):buildDataset(key,rows,new Date().toISOString());
          if(isValidDataset(data,key)&&data.latest>(entry?.data.latest??''))entry={data,origin:'cftc',base:entry?.origin??null,baseLatest:entry?.data.latest??null};
        }
      }catch{}
    }
    const result=entry?{...entry,checkedAt:new Date(),expected}:{error:true,checkedAt:new Date(),expected};
    cache.set(key,result);
    pending.delete(key);
    return result;
  })();
  pending.set(key,job);
  return job;
}

/* ---------- Graphiques ---------- */
const charts=new Map();
const slotVar=slot=>'var(--cot-'+slot+')';
function niceTicks(min,max,{zero=false,count=6}={}){
  if(zero){min=Math.min(min,0);max=Math.max(max,0);}
  if(!Number.isFinite(min)||!Number.isFinite(max))return [0,1];
  if(min===max){const pad=Math.abs(min)*.1||1;min-=pad;max+=pad;}
  const raw=(max-min)/(count-1),power=10**Math.floor(Math.log10(raw));
  const step=[1,2,2.5,5,10].find(n=>n*power>=raw)*power;
  const start=Math.floor(min/step)*step,end=Math.ceil(max/step)*step;
  const ticks=[];
  for(let v=start;v<=end+step/2;v+=step)ticks.push(Math.round(v/step)*step);
  return ticks;
}
function timeTicks(x0,x1){
  const years=(x1-x0)/(365.25*864e5);
  const out=[];
  const start=new Date(x0),end=new Date(x1);
  if(years>2.2){
    const every=years>11?2:1;
    for(let y=start.getUTCFullYear()+1;y<=end.getUTCFullYear();y++)if(y%every===0)out.push([Date.UTC(y,0,1),String(y)]);
  }else{
    const every=years>1.2?3:years>.6?2:1;
    const d=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,1));
    for(;d.getTime()<=x1;d.setUTCMonth(d.getUTCMonth()+1))if(d.getUTCMonth()%every===0)out.push([d.getTime(),monthYear.format(d)]);
  }
  return out;
}
function weekTicks(){
  return [0,2,4,6,8,10].map(m=>{const d=new Date(Date.UTC(2001,m,1));return [weekOfYear(d.toISOString().slice(0,10)),monthOnly.format(d)];});
}
// cfg : {id,label,xs,kind:'time'|'week',series:[{key,label,slot|color,values,type:'line'|'area'|'band',low,high,width,muted}],height,format,zero,bands,domain,ticks}
function lineChart(cfg){
  charts.set(cfg.id,cfg);
  const visible=cfg.series.filter(s=>!s.hidden);
  const W=1000,H=cfg.height??260;
  const xs=cfg.xs;
  const x0=cfg.xMin??xs[0],x1=cfg.xMax??xs.at(-1);
  const X=v=>(v-x0)/((x1-x0)||1)*W;
  const values=visible.flatMap(s=>s.type==='band'?[...s.low,...s.high]:s.values).filter(Number.isFinite);
  const ticks=cfg.ticks??niceTicks(values.length?Math.min(...values):0,values.length?Math.max(...values):1,{zero:cfg.zero});
  const y0=ticks[0],y1=ticks.at(-1);
  const Y=v=>H-(v-y0)/((y1-y0)||1)*H;
  const maxGap=cfg.kind==='time'?16*864e5:1.5;
  const pathOf=(vals)=>{
    let d='',open=false,prev=null;
    vals.forEach((v,i)=>{
      if(!Number.isFinite(v)){open=false;return;}
      const jump=prev!==null&&xs[i]-xs[prev]>maxGap;
      d+=(open&&!jump?'L':'M')+X(xs[i]).toFixed(1)+' '+Y(v).toFixed(1);
      open=true;prev=i;
    });
    return d;
  };
  const areaOf=(lowVals,highVals)=>{
    // Une zone par segment continu.
    let out='',segment=[];
    const flush=()=>{
      if(segment.length>1){
        out+='M'+segment.map(i=>X(xs[i]).toFixed(1)+' '+Y(highVals[i]).toFixed(1)).join('L')+
          'L'+[...segment].reverse().map(i=>X(xs[i]).toFixed(1)+' '+Y(lowVals[i]).toFixed(1)).join('L')+'Z';
      }
      segment=[];
    };
    xs.forEach((_,i)=>{
      const ok=Number.isFinite(lowVals[i])&&Number.isFinite(highVals[i]);
      if(!ok){flush();return;}
      if(segment.length&&xs[i]-xs[segment.at(-1)]>maxGap)flush();
      segment.push(i);
    });
    flush();
    return out;
  };
  const base=Math.min(Math.max(0,y0),y1);
  let svg='';
  for(const band of cfg.bands??[])svg+='<rect class="cot-band" x="0" width="'+W+'" y="'+Y(band.to).toFixed(1)+'" height="'+(Y(band.from)-Y(band.to)).toFixed(1)+'"/>';
  for(const t of ticks)svg+='<line class="cot-gridline'+(t===0&&y0<0?' cot-zero':'')+'" x1="0" x2="'+W+'" y1="'+Y(t).toFixed(1)+'" y2="'+Y(t).toFixed(1)+'"/>';
  for(const s of visible){
    const color=s.color??slotVar(s.slot);
    if(s.type==='band')svg+='<path class="cot-area cot-area-band" style="--c:'+color+'" d="'+areaOf(s.low,s.high)+'"/>';
    if(s.type==='area')svg+='<path class="cot-area" style="--c:'+color+'" d="'+areaOf(s.values.map(v=>Number.isFinite(v)?base:null),s.values)+'"/>';
  }
  for(const s of visible){
    if(s.type==='band')continue;
    const color=s.color??slotVar(s.slot);
    svg+='<path class="cot-line'+(s.muted?' muted':'')+'" style="--c:'+color+';--w:'+(s.width??2)+'px" d="'+pathOf(s.values)+'"/>';
  }
  const ends=visible.filter(s=>s.type!=='band'&&!s.muted).map(s=>{
    const i=s.values.findLastIndex(Number.isFinite);
    return i<0?'':'<span class="cot-end" style="--c:'+(s.color??slotVar(s.slot))+';left:'+(X(xs[i])/W*100).toFixed(2)+'%;top:'+(Y(s.values[i])/H*100).toFixed(2)+'%"></span>';
  }).join('');
  const bandLabels=(cfg.bands??[]).map(b=>'<span class="cot-band-label" style="top:'+(Y(b.to)/H*100).toFixed(2)+'%">'+esc(b.label)+'</span>').join('');
  const format=cfg.format??compact;
  const yLabels=ticks.map(t=>'<span style="top:'+(Y(t)/H*100).toFixed(2)+'%">'+esc(format(t,true))+'</span>').join('');
  const xt=cfg.kind==='week'?weekTicks():timeTicks(x0,x1);
  const xLabels=xt.filter(([v])=>v>=x0&&v<=x1).map(([v,label])=>'<span style="left:'+(X(v)/W*100).toFixed(2)+'%">'+esc(label)+'</span>').join('');
  const legend=cfg.legend===false?'':'<div class="cot-legend" role="group" aria-label="Séries affichées">'+cfg.series.map(s=>{
    const color=s.color??slotVar(s.slot);
    const key='<i class="'+(s.type==='band'?'swatch':s.muted?'line muted':'line')+'" style="--c:'+color+'"></i>';
    return cfg.toggle?'<button type="button" data-cot-toggle="'+esc(s.key)+'" data-cot-list="'+cfg.toggle+'" aria-pressed="'+!s.hidden+'">'+key+esc(s.label)+'</button>':'<span>'+key+esc(s.label)+'</span>';
  }).join('')+(cfg.unit?'<span class="cot-unit">'+esc(cfg.unit)+'</span>':'')+'</div>';
  return '<figure class="cot-chart">'+legend+
    '<div class="cot-frame" style="--h:'+H+'px"><div class="cot-y" aria-hidden="true">'+yLabels+'</div>'+
    '<div class="cot-plot" data-cot-plot="'+esc(cfg.id)+'" tabindex="0" role="img" aria-label="'+esc(cfg.label+'. Survolez ou utilisez les flèches pour lire les valeurs.')+'">'+
    '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+svg+'</svg>'+bandLabels+ends+
    '<div class="cot-guide" hidden></div><div class="cot-dots"></div><div class="cot-tip" hidden></div></div>'+
    '<div class="cot-x" aria-hidden="true">'+xLabels+'</div></div></figure>';
}
function nearestIndex(xs,target){
  let lo=0,hi=xs.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(xs[mid]<target)lo=mid;else hi=mid;}
  return Math.abs(xs[lo]-target)<=Math.abs(xs[hi]-target)?lo:hi;
}
function showPoint(plot,index){
  const cfg=charts.get(plot.dataset.cotPlot);
  if(!cfg)return;
  const i=Math.max(0,Math.min(cfg.xs.length-1,index));
  plot.dataset.index=String(i);
  const x0=cfg.xMin??cfg.xs[0],x1=cfg.xMax??cfg.xs.at(-1);
  const left=(cfg.xs[i]-x0)/((x1-x0)||1)*100;
  const guide=plot.querySelector('.cot-guide'),tip=plot.querySelector('.cot-tip'),dots=plot.querySelector('.cot-dots');
  const values=cfg.series.filter(s=>!s.hidden).flatMap(s=>s.type==='band'?[...s.low,...s.high]:s.values).filter(Number.isFinite);
  const ticks=cfg.ticks??niceTicks(values.length?Math.min(...values):0,values.length?Math.max(...values):1,{zero:cfg.zero});
  const y0=ticks[0],y1=ticks.at(-1);
  const top=v=>(1-(v-y0)/((y1-y0)||1))*100;
  guide.hidden=false;
  guide.style.left=left+'%';
  dots.replaceChildren();
  tip.replaceChildren();
  const title=document.createElement('strong');
  title.textContent=cfg.kind==='week'?'Semaine '+cfg.xs[i]+' · vers le '+dayMonth.format(new Date(Date.UTC(2001,0,1+(cfg.xs[i]-1)*7))):capital(fmtLong(cfg.dates[i]));
  tip.append(title);
  const format=cfg.format??compact;
  for(const s of cfg.series){
    if(s.hidden)continue;
    const color=s.color??slotVar(s.slot);
    const row=document.createElement('div');
    row.className='cot-tip-row';
    const key=document.createElement('i');
    key.className=s.type==='band'?'swatch':'line';
    key.style.setProperty('--c',color);
    const label=document.createElement('span');
    label.textContent=s.label;
    const value=document.createElement('b');
    if(s.type==='band'){
      value.textContent=Number.isFinite(s.low[i])?format(s.low[i])+' à '+format(s.high[i]):'—';
    }else{
      const v=s.values[i];
      value.textContent=Number.isFinite(v)?(s.tipFormat??format)(v):'—';
      if(Number.isFinite(v)){
        const dot=document.createElement('span');
        dot.className='cot-dot';
        dot.style.setProperty('--c',color);
        dot.style.left=left+'%';
        dot.style.top=top(v)+'%';
        dots.append(dot);
      }
    }
    row.append(key,label,value);
    tip.append(row);
  }
  for(const extra of cfg.extra?.(i)??[]){
    const row=document.createElement('div');
    row.className='cot-tip-row extra';
    const label=document.createElement('span'),value=document.createElement('b');
    label.textContent=extra[0];value.textContent=extra[1];
    row.append(document.createElement('i'),label,value);
    tip.append(row);
  }
  tip.hidden=false;
  const right=left>55;
  tip.style.left=right?'auto':'calc('+left+'% + 14px)';
  tip.style.right=right?'calc('+(100-left)+'% + 14px)':'auto';
}
function hidePoint(plot){
  plot.querySelector('.cot-guide').hidden=true;
  plot.querySelector('.cot-tip').hidden=true;
  plot.querySelector('.cot-dots').replaceChildren();
}

/* ---------- Composants ---------- */
const seg=(key,choices,value,label)=>'<div class="seg" role="group" aria-label="'+esc(label)+'">'+Object.entries(choices).map(([id,name])=>
  '<button type="button" data-cot-set="'+esc(key)+'" data-value="'+esc(id)+'" aria-pressed="'+(String(id)===String(value))+'" class="'+(String(id)===String(value)?'active':'')+'">'+esc(name)+'</button>').join('')+'</div>';
const control=(label,html)=>'<div class="cot-control"><span>'+esc(label)+'</span>'+html+'</div>';
const sectionHead=(title,detail,more='')=>'<div class="section-head"><div><h2>'+esc(title)+'</h2><p>'+esc(detail)+'</p></div>'+more+'</div>';
const panel=(body,klass='')=>'<section class="panel '+klass+'">'+body+'</section>';
const delta=(value,digits=0,suffix='')=>'<span class="cot-delta '+tone(value)+'">'+(value>0?'▲ ':value<0?'▼ ':'')+esc(signed(value,digits)+suffix)+'</span>';
const groupKey=g=>'<i class="cot-key" style="--c:'+slotVar(g.slot)+'"></i>';
function zone(index){
  if(!Number.isFinite(index))return ['Historique insuffisant','neutral'];
  if(index>=90)return ['Extrême haut · proche du plus haut','mixed'];
  if(index>=80)return ['Zone haute','mixed'];
  if(index<=10)return ['Extrême bas · proche du plus bas','mixed'];
  if(index<=20)return ['Zone basse','mixed'];
  return ['Zone intermédiaire','neutral'];
}

/* ---------- Contenu ---------- */
function context(entry){
  const ds=entry.data;
  const recs=records(ds,state.market);
  const groups=cotGroups[ds.report];
  const lead=leadGroup(ds.report),hedger=hedgerGroup(ds.report);
  const last=recs.at(-1);
  const days=ranges[state.range][1];
  const from=Number.isFinite(days)?addDaysISO(last.date,-days):'0000';
  const start=Math.max(0,recs.findIndex(r=>r.date>=from));
  const view=recs.slice(start);
  const val=(r,key)=>state.mode==='pct'?pctOf(r[key],r.oi):r[key];
  return {ds,recs,groups,lead,hedger,last,prev:recs.at(-2),view,start,val,market:cotMarkets[state.market]};
}

function statusPanel(entry){
  const ds=entry.data;
  const latest=ds.latest,release=releaseFor(latest);
  const now=new Date();
  const next=nextRelease(now);
  const expected=expectedLatest(now);
  const origins={live:'Flux automatique · branche cot-live',bundled:'Copie intégrée au site',cftc:'API de la CFTC en direct'};
  const late=latest<expected;
  const nextLine=next?'<b>'+esc(capital(longDate.format(at(next.date))))+'</b> à 15 h 30 ET · '+esc(casablancaHour.format(next.instant))+' à Casablanca'+
    '<br><span class="small">Données arrêtées au '+esc(fmtShort(next.asOf))+(next.delayed?' · publication reportée par un jour férié américain':'')+(next.official?' · calendrier officiel':' · date estimée')+'</span>':'—';
  return panel(
    '<div class="cot-status">'+
      '<div><span class="eyebrow">Dernier rapport</span><strong class="cot-status-date">'+esc(capital(fmtLong(latest)))+'</strong>'+
        '<span class="small">Positions arrêtées le mardi · publiées le '+esc(fmtShort(release.date))+' à 15 h 30 ET</span></div>'+
      '<div><span class="eyebrow">Prochain rapport</span><span class="cot-next">'+nextLine+'</span></div>'+
      '<div><span class="eyebrow">Source des données</span><span class="cot-origin"><span class="dot '+(late?'mixed':'positive')+'"></span>'+esc(origins[entry.origin]??'—')+'</span>'+
        '<span class="small">Vérifié à '+esc(casablancaHour.format(entry.checkedAt))+' · flux généré le '+esc(casablanca.format(new Date(ds.generatedAt)))+'</span></div>'+
      '<div class="cot-status-actions"><button type="button" class="button" data-cot-action="refresh">Actualiser</button>'+
        '<a class="button ghost" href="'+esc(datasetPage(ds.dataset))+'" target="_blank" rel="noopener noreferrer">Données CFTC</a></div>'+
    '</div>'+
    (late?'<p class="notice">La CFTC a publié le rapport du '+esc(fmtShort(expected))+', qui n’est pas encore disponible ici. La page réessaie automatiquement toutes les 10 minutes.</p>':'')+
    (entry.origin==='cftc'&&entry.baseLatest?'<p class="small cot-origin-note">Les rapports postérieurs au '+esc(fmtShort(entry.baseLatest))+' proviennent directement de l’API de la CFTC, en attendant la mise à jour du flux.</p>':''),
    'cot-status-panel');
}

function controls(){
  return '<div class="cot-controls" role="group" aria-label="Sélection du rapport">'+
    control('Marché',seg('market',Object.fromEntries(Object.entries(cotMarkets).map(([k,m])=>[k,m.name+' · '+m.ticker])),state.market,'Marché'))+
    control('Format',seg('report',reportNames,state.report,'Format du rapport'))+
    control('Positions',seg('scope',scopeNames,state.scope,'Positions incluses'))+
    control('Période',seg('range',Object.fromEntries(Object.entries(ranges).map(([k,[n]])=>[k,n])),state.range,'Période affichée'))+
    control('Unité',seg('mode',modeNames,state.mode,'Unité des positions'))+
  '</div>';
}

function kpis(c){
  const {last,lead,hedger,recs}=c;
  const idx=recs.map(r=>r[lead.id+'N']);
  const index=cotIndexAt(idx,recs.length-1,state.lookback);
  const [zoneName,zoneTone]=zone(index);
  const leadPct=pctOf(last[lead.id+'N'],last.oi);
  const prevPct=c.prev?pctOf(c.prev[lead.id+'N'],c.prev.oi):null;
  const ratio=last[lead.id+'S']>0?last[lead.id+'L']/last[lead.id+'S']:null;
  const tile=(label,value,sub,klass='')=>'<div class="cot-kpi '+klass+'"><span>'+esc(label)+'</span><strong>'+value+'</strong><small>'+sub+'</small></div>';
  const side=v=>v>0?'acheteurs nets':v<0?'vendeurs nets':'à l’équilibre';
  const traders=lead.id==='mm'||lead.id==='nc'?(Number.isFinite(last[lead.id+'LT'])?num(last[lead.id+'LT'])+' à l’achat · '+num(last[lead.id+'ST'])+' à la vente':'—'):'—';
  return '<div class="cot-kpis">'+
    tile('Position nette · '+lead.short,esc(signed(last[lead.id+'N'])),delta(last['d'+lead.id+'N'])+' <span>sur la semaine · '+esc(side(last[lead.id+'N']))+'</span>','lead')+
    tile('Nette en % de l’intérêt ouvert',esc(signedPct(leadPct)),delta(Number.isFinite(prevPct)?leadPct-prevPct:null,1,' pt')+' <span>longs '+esc(pct(pctOf(last[lead.id+'L'],last.oi)))+' · shorts '+esc(pct(pctOf(last[lead.id+'S'],last.oi)))+'</span>')+
    tile('Indice COT · '+lookbacks[state.lookback],Number.isFinite(index)?num(index,0)+'<span class="cot-of">/100</span>':'—',
      '<span class="cot-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(Number.isFinite(index)?Math.round(index):0)+'" aria-label="Indice COT"><i style="width:'+(Number.isFinite(index)?index:0)+'%"></i></span><span class="'+zoneTone+'">'+esc(zoneName)+'</span>')+
    tile('Position nette · '+hedger.short,esc(signed(last[hedger.id+'N'])),delta(last['d'+hedger.id+'N'])+' <span>sur la semaine · '+esc(pct(pctOf(last[hedger.id+'N'],last.oi)))+' de l’OI</span>')+
    tile('Intérêt ouvert',esc(num(last.oi)),delta(last.doi)+' <span>'+esc(signedPct(c.prev?pctOf(last.doi,c.prev.oi):null))+' · contrats</span>')+
    tile('Ratio longs / shorts · '+lead.short,Number.isFinite(ratio)?esc(num(ratio,2)):'—','<span>'+esc(traders)+'</span>')+
  '</div>';
}

function reading(c){
  const {last,lead,hedger,recs,groups,market}=c;
  const leadNet=recs.map(r=>r[lead.id+'N']);
  const i=recs.length-1;
  const lines=[];
  const n=last[lead.id+'N'],d=last['d'+lead.id+'N'];
  lines.push('Les '+lead.name.toLowerCase()+' sont '+(n>=0?'acheteurs':'vendeurs')+' nets de '+num(Math.abs(n))+' contrats sur '+market.article+
    ' ('+pct(Math.abs(pctOf(n,last.oi)))+' de l’intérêt ouvert), '+(d>0?'en hausse de ':d<0?'en baisse de ':'stables, ')+(d?num(Math.abs(d))+' contrats ':'')+'sur la semaine.');
  for(const lb of [156,52]){
    const r=rangeAt(leadNet,i,lb);
    if(!r)continue;
    if(n>=r.max)lines.push('Leur position nette est la plus élevée depuis '+lookbacks[lb]+'.');
    else if(n<=r.min)lines.push('Leur position nette est la plus faible depuis '+lookbacks[lb]+'.');
    else continue;
    break;
  }
  const idx=cotIndexAt(leadNet,i,state.lookback),z=zScoreAt(leadNet,i,state.lookback);
  if(Number.isFinite(idx))lines.push('Sur '+lookbacks[state.lookback]+', l’indice COT se situe à '+num(idx,0)+'/100 et l’écart à la moyenne à '+signed(z,1)+' écart-type.');
  const changes=recs.slice(-53,-1).map(r=>Math.abs(r['d'+lead.id+'N'])).filter(Number.isFinite);
  if(Number.isFinite(d)&&changes.length>=26&&Math.abs(d)>Math.max(...changes))lines.push('Leur variation hebdomadaire est la plus forte depuis un an.');
  const longChange=last['d'+lead.id+'L'],shortChange=last['d'+lead.id+'S'];
  if(Number.isFinite(longChange)&&Number.isFinite(shortChange))
    lines.push('Sur la semaine, leurs longs varient de '+signed(longChange)+' contrats et leurs shorts de '+signed(shortChange)+'.');
  const h=last[hedger.id+'N'];
  lines.push('Les '+hedger.name.toLowerCase()+' sont '+(h>=0?'acheteurs':'vendeurs')+' nets de '+num(Math.abs(h))+' contrats ('+signed(last['d'+hedger.id+'N'])+' sur la semaine).');
  const movers=groups.filter(g=>Number.isFinite(last['d'+g.id+'N'])).sort((a,b)=>Math.abs(last['d'+b.id+'N'])-Math.abs(last['d'+a.id+'N']));
  if(movers[0]&&movers[0]!==lead)lines.push('La plus forte variation de la semaine revient aux '+movers[0].name.toLowerCase()+' ('+signed(last['d'+movers[0].id+'N'])+' contrats nets).');
  if(last.gap>1)lines.push('Les variations couvrent '+last.gap+' semaines : la CFTC n’a pas publié de rapport intermédiaire.');
  return '<ul class="cot-reading">'+lines.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>';
}

function seriesFor(c,keyOf,{toggle=true}={}){
  return c.groups.map(g=>({key:g.id,label:g.name,slot:g.slot,values:c.view.map(r=>keyOf(r,g)),hidden:toggle&&state.hidden.includes(g.id)}));
}
const unitLabel=()=>state.mode==='pct'?'% de l’intérêt ouvert':'Contrats';
const fmtMode=(v,axis)=>state.mode==='pct'?(axis?num(v,0)+' %':signedPct(v)):(axis?compact(v):signed(v));

function netChart(c){
  const series=seriesFor(c,(r,g)=>c.val(r,g.id+'N'));
  if(series.every(s=>s.hidden))series[0].hidden=false;
  return lineChart({id:'net',label:'Positions nettes par catégorie',kind:'time',xs:c.view.map(r=>Date.parse(r.date)),dates:c.view.map(r=>r.date),
    series,height:300,zero:true,toggle:'hidden',unit:unitLabel(),format:fmtMode,
    extra:i=>[['Intérêt ouvert',num(c.view[i].oi)+' contrats']]});
}
function longShortChart(c){
  const g=c.groups.find(x=>x.id===state.lsGroup)??c.lead;
  const series=[
    {key:'L',label:'Longs',color:'var(--cot-long)',values:c.view.map(r=>c.val(r,g.id+'L'))},
    {key:'S',label:'Shorts (en négatif)',color:'var(--cot-short)',values:c.view.map(r=>{const v=c.val(r,g.id+'S');return Number.isFinite(v)?-v:null;}),tipFormat:v=>state.mode==='pct'?pct(-v):num(-v)},
    {key:'N',label:'Net',color:'var(--cot-net)',type:'area',values:c.view.map(r=>c.val(r,g.id+'N'))},
  ];
  if(g.spread)series.push({key:'X',label:'Spreads',color:'var(--sub)',muted:true,values:c.view.map(r=>c.val(r,g.id+'X'))});
  const choices=Object.fromEntries(c.groups.map(x=>[x.id,x.short]));
  return '<div class="cot-panel-head"><div><h3>Longs et shorts · '+esc(g.name)+'</h3><p class="small">Positions brutes de part et d’autre de zéro, position nette en aplat.</p></div>'+seg('lsGroup',choices,g.id,'Catégorie')+'</div>'+
    lineChart({id:'ls',label:'Longs et shorts '+g.name,kind:'time',xs:c.view.map(r=>Date.parse(r.date)),dates:c.view.map(r=>r.date),series,height:240,zero:true,unit:unitLabel(),
      format:(v,axis)=>state.mode==='pct'?(axis?num(v,0)+' %':signedPct(v)):(axis?compact(v):signed(v))});
}
function oiChart(c){
  const r=c.view;
  const avg=r.map((_,i)=>{const j=c.start+i;const w=c.recs.slice(Math.max(0,j-51),j+1).map(x=>x.oi);return w.length>=40?w.reduce((s,v)=>s+v,0)/w.length:null;});
  return '<div class="cot-panel-head"><div><h3>Intérêt ouvert</h3><p class="small">Contrats ouverts, toutes catégories, et moyenne mobile sur 52 semaines.</p></div></div>'+
    lineChart({id:'oi',label:'Intérêt ouvert',kind:'time',xs:r.map(x=>Date.parse(x.date)),dates:r.map(x=>x.date),height:240,unit:'Contrats',
      series:[{key:'oi',label:'Intérêt ouvert',color:'var(--accent)',type:'area',values:r.map(x=>x.oi)},{key:'avg',label:'Moyenne 52 semaines',color:'var(--sub)',muted:true,values:avg}],
      format:(v,axis)=>axis?compact(v):num(v),extra:i=>[['Variation hebdomadaire',signed(r[i].doi)]]});
}

function flows(c){
  const {last,groups}=c;
  const max=Math.max(1,...groups.map(g=>Math.abs(last['d'+g.id+'N'])).filter(Number.isFinite));
  const bars=groups.map(g=>{
    const v=last['d'+g.id+'N'];
    const w=Number.isFinite(v)?Math.abs(v)/max*50:0;
    return '<li class="cot-flow"><span class="cot-flow-label">'+groupKey(g)+esc(g.name)+'</span>'+
      '<span class="cot-flow-track" title="'+esc(g.name+' · '+signed(v)+' contrats nets')+'"><i class="'+(v<0?'neg':'pos')+'" style="--c:'+slotVar(g.slot)+';width:'+w.toFixed(2)+'%"></i></span>'+
      '<span class="cot-flow-value num">'+esc(signed(v))+'</span>'+
      '<span class="cot-flow-detail small">longs '+esc(signed(last['d'+g.id+'L']))+' · shorts '+esc(signed(last['d'+g.id+'S']))+(g.spread?' · spreads '+esc(signed(last['d'+g.id+'X'])):'')+'</span></li>';
  }).join('');
  return '<div class="cot-panel-head"><div><h3>Mouvements de la semaine</h3><p class="small">Variation des positions nettes entre le '+esc(fmtShort(c.prev?.date))+' et le '+esc(fmtShort(last.date))+'.</p></div></div>'+
    '<div class="cot-flow-axis small" aria-hidden="true"><span>Ventes nettes</span><span>Achats nets</span></div><ul class="cot-flows">'+bars+'</ul>'+
    '<p class="small">Intérêt ouvert : '+delta(last.doi)+' contrats.</p>';
}

function heatTable(c){
  const rows=c.recs.slice(-state.flowWeeks).reverse();
  const cols=[['doi','Intérêt ouvert'],...c.groups.map(g=>['d'+g.id+'N',g.short]),['d'+c.lead.id+'L',c.lead.short+' longs'],['d'+c.lead.id+'S',c.lead.short+' shorts']];
  const max=Object.fromEntries(cols.map(([k])=>[k,Math.max(1,...rows.map(r=>Math.abs(r[k])).filter(Number.isFinite))]));
  const cell=(r,k)=>{
    const v=r[k];
    if(!Number.isFinite(v))return '<td class="num">—</td>';
    const share=Math.round(Math.min(1,Math.abs(v)/max[k])*42);
    return '<td class="num cot-heat '+(v>0?'up':v<0?'down':'')+'" style="--s:'+share+'%">'+esc(signed(v))+'</td>';
  };
  return '<div class="cot-panel-head"><div><h3>Variations hebdomadaires</h3><p class="small">Variation des positions nettes, en contrats. L’intensité de la couleur se lit par colonne.</p></div>'+
    seg('flowWeeks',{8:'8 sem.',12:'12 sem.',26:'26 sem.'},state.flowWeeks,'Nombre de semaines')+'</div>'+
    '<div class="scroll"><table class="table cot-table"><thead><tr><th scope="col">Rapport du</th>'+cols.map(([,n])=>'<th scope="col">'+esc(n)+'</th>').join('')+'</tr></thead><tbody>'+
    rows.map(r=>'<tr><th scope="row">'+esc(fmtShort(r.date))+(r.gap>1?' <small>'+r.gap+' sem.</small>':'')+'</th>'+cols.map(([k])=>cell(r,k)).join('')+'</tr>').join('')+'</tbody></table></div>';
}

function indexSection(c){
  const full=Object.fromEntries(c.groups.map(g=>[g.id,cotIndexSeries(c.recs.map(r=>r[g.id+'N']),state.lookback)]));
  const series=c.groups.map(g=>({key:g.id,label:g.name,slot:g.slot,values:full[g.id].slice(c.start),hidden:state.hiddenIndex.includes(g.id)}));
  if(series.every(s=>s.hidden))series[0].hidden=false;
  const chart=lineChart({id:'index',label:'Indice COT',kind:'time',xs:c.view.map(r=>Date.parse(r.date)),dates:c.view.map(r=>r.date),series,height:250,toggle:'hiddenIndex',
    ticks:[0,20,40,60,80,100],bands:[{from:80,to:100,label:'Zone haute ≥ 80'},{from:0,to:20,label:'Zone basse ≤ 20'}],format:(v,axis)=>axis?num(v,0):num(v,0)+'/100',unit:'0 à 100'});
  const i=c.recs.length-1;
  const lbs=[26,52,156,260];
  const matrix='<div class="scroll"><table class="table cot-table cot-matrix"><thead><tr><th scope="col">Catégorie</th>'+lbs.map(lb=>'<th scope="col">Indice '+esc(lookbacks[lb])+'</th>').join('')+
    '<th scope="col">Écart-type · '+esc(lookbacks[state.lookback])+'</th><th scope="col">Fourchette nette · '+esc(lookbacks[state.lookback])+'</th></tr></thead><tbody>'+
    c.groups.map(g=>{
      const vals=c.recs.map(r=>r[g.id+'N']);
      const r=rangeAt(vals,i,state.lookback),z=zScoreAt(vals,i,state.lookback);
      return '<tr><th scope="row">'+groupKey(g)+esc(g.name)+'</th>'+lbs.map(lb=>{
        const v=cotIndexAt(vals,i,lb);
        return '<td class="num cot-seq" style="--s:'+(Number.isFinite(v)?Math.round(v*.45):0)+'%">'+(Number.isFinite(v)?num(v,0):'—')+'</td>';
      }).join('')+'<td class="num">'+esc(Number.isFinite(z)?signed(z,2):'—')+'</td><td class="num">'+(r?esc(signed(r.min))+' → '+esc(signed(r.max)):'—')+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  return panel('<div class="cot-panel-head"><div><h3>Indice COT</h3><p class="small">Position nette du moment dans la fourchette de la période : 0 au plus bas, 100 au plus haut.</p></div>'+
    seg('lookback',lookbacks,state.lookback,'Période de calcul')+'</div>'+chart+'<h4 class="cot-subhead">Lecture au '+esc(fmtShort(c.last.date))+'</h4>'+matrix);
}

function seasonalSection(c){
  const g=c.groups.find(x=>x.id===state.seasonGroup)??c.lead;
  const key='__season';
  const recs=c.recs.map(r=>({date:r.date,[key]:c.val(r,g.id+'N')}));
  const s=seasonal(recs,key,{years:state.seasonYears});
  const weeks=Array.from({length:53},(_,i)=>i+1);
  const byWeek=(arr,field)=>weeks.map(w=>arr.find(p=>p.week===w)?.[field]??null);
  const series=[
    {key:'band',label:'Fourchette '+s.years[0]+'–'+s.years.at(-1),color:'var(--cot-1)',type:'band',low:byWeek(s.band,'min'),high:byWeek(s.band,'max')},
    {key:'avg',label:'Moyenne '+s.years.length+' ans',color:'var(--sub)',muted:true,values:byWeek(s.band,'avg')},
    {key:'prev',label:String(s.year-1),color:'var(--cot-prev)',values:byWeek(s.previous,'value'),width:1.5},
    {key:'cur',label:String(s.year),color:'var(--cot-1)',values:byWeek(s.current,'value'),width:2.5},
  ];
  const choices=Object.fromEntries(c.groups.map(x=>[x.id,x.short]));
  return panel('<div class="cot-panel-head"><div><h3>Saisonnalité · '+esc(g.name)+'</h3><p class="small">Position nette semaine par semaine : année en cours, année précédente et fourchette des années antérieures.</p></div>'+
    '<div class="cot-inline">'+seg('seasonGroup',choices,g.id,'Catégorie')+seg('seasonYears',{3:'3 ans',5:'5 ans',10:'10 ans'},state.seasonYears,'Années de référence')+'</div></div>'+
    lineChart({id:'season',label:'Saisonnalité',kind:'week',xs:weeks,dates:weeks,series,height:260,zero:true,xMin:1,xMax:53,unit:unitLabel(),format:fmtMode}));
}

function compareSection(entry){
  const ds=entry.data;
  const lead=leadGroup(ds.report);
  const all=Object.keys(cotMarkets).map(k=>({k,recs:records(ds,k)}));
  const lastDate=all.map(m=>m.recs.at(-1)?.date).sort().at(-1);
  const days=ranges[state.range][1];
  const from=Number.isFinite(days)?addDaysISO(lastDate,-days):'0000';
  const dates=[...new Set(all.flatMap(m=>m.recs.filter(r=>r.date>=from).map(r=>r.date)))].sort();
  const colors={'soybean-oil':'var(--cot-oil)',soybeans:'var(--cot-bean)'};
  const series=all.map(({k,recs})=>{
    const byDate=new Map();
    if(state.compare==='index'){
      const idx=cotIndexSeries(recs.map(r=>r[lead.id+'N']),state.lookback);
      recs.forEach((r,i)=>byDate.set(r.date,idx[i]));
    }else recs.forEach(r=>byDate.set(r.date,pctOf(r[lead.id+'N'],r.oi)));
    return {key:k,label:cotMarkets[k].name+' · '+cotMarkets[k].ticker,color:colors[k],values:dates.map(d=>byDate.get(d)??null)};
  });
  const index=state.compare==='index';
  const diff=dates.map((_,i)=>Number.isFinite(series[0].values[i])&&Number.isFinite(series[1].values[i])?series[0].values[i]-series[1].values[i]:null);
  return panel('<div class="cot-panel-head"><div><h3>Huile contre graines · '+esc(lead.name)+'</h3><p class="small">'+
    (index?'Indice COT sur '+esc(lookbacks[state.lookback])+' : les deux marchés sur une même échelle de 0 à 100.':'Position nette en % de l’intérêt ouvert : la taille des contrats diffère, le pourcentage les rend comparables.')+'</p></div>'+
    seg('compare',{pct:'Net en % de l’OI',index:'Indice COT'},state.compare,'Mesure comparée')+'</div>'+
    lineChart({id:'compare',label:'Comparaison huile de soja et graines de soja',kind:'time',xs:dates.map(d=>Date.parse(d)),dates,series,height:240,zero:!index,
      ticks:index?[0,20,40,60,80,100]:undefined,bands:index?[{from:80,to:100,label:'Zone haute ≥ 80'},{from:0,to:20,label:'Zone basse ≤ 20'}]:undefined,unit:index?'0 à 100':'% de l’intérêt ouvert',
      format:(v,axis)=>index?(axis?num(v,0):num(v,0)+'/100'):(axis?num(v,0)+' %':signedPct(v)),
      extra:i=>[['Écart huile − graines',Number.isFinite(diff[i])?(index?signed(diff[i],0)+' pts':signed(diff[i],1)+' pt'):'—']]}));
}

function detailSection(c){
  const choices=c.recs.slice(-104).reverse();
  const date=choices.some(r=>r.date===state.detailDate)?state.detailDate:c.last.date;
  const i=c.recs.findIndex(r=>r.date===date);
  const r=c.recs[i];
  const share=v=>pct(pctOf(v,r.oi));
  const traders=(g,side)=>{const v=r[g.id+side+'T'];return Number.isFinite(v)?num(v):'—';};
  const rows=c.groups.map(g=>'<tr><th scope="row">'+groupKey(g)+esc(g.name)+'<small>'+esc(g.en)+'</small></th>'+
    '<td class="num">'+esc(num(r[g.id+'L']))+'</td><td class="num">'+esc(num(r[g.id+'S']))+'</td><td class="num">'+(g.spread?esc(num(r[g.id+'X'])):'—')+'</td>'+
    '<td class="num"><b>'+esc(signed(r[g.id+'N']))+'</b></td>'+
    '<td class="num '+tone(r['d'+g.id+'L'])+'">'+esc(signed(r['d'+g.id+'L']))+'</td><td class="num '+tone(r['d'+g.id+'S'])+'">'+esc(signed(r['d'+g.id+'S']))+'</td>'+
    '<td class="num">'+esc(share(r[g.id+'L']))+'</td><td class="num">'+esc(share(r[g.id+'S']))+'</td>'+
    '<td class="num">'+(g.id==='nr'?'—':esc(traders(g,'L'))+' / '+esc(traders(g,'S'))+(g.spread?' / '+esc(traders(g,'X')):''))+'</td></tr>').join('');
  const conc=[['4 plus grands opérateurs','g4','n4'],['8 plus grands opérateurs','g8','n8']].map(([name,gk,nk])=>
    '<tr><th scope="row">'+esc(name)+'</th><td class="num">'+esc(pct(r[gk+'L']))+'</td><td class="num">'+esc(pct(r[gk+'S']))+'</td><td class="num">'+esc(pct(r[nk+'L']))+'</td><td class="num">'+esc(pct(r[nk+'S']))+'</td></tr>').join('');
  return panel('<div class="cot-panel-head"><div><h3>Détail du rapport</h3><p class="small">'+esc(c.market.name+' · '+c.market.contract+' · '+reportNames[c.ds.report]+' · '+scopeNames[c.ds.scope])+'</p></div>'+
    '<label class="cot-select">Rapport du <select data-cot-detail aria-label="Date du rapport">'+choices.map(x=>'<option value="'+x.date+'"'+(x.date===date?' selected':'')+'>'+esc(fmtShort(x.date))+'</option>').join('')+'</select></label></div>'+
    '<div class="scroll"><table class="table cot-table cot-detail"><thead><tr><th scope="col">Catégorie</th><th scope="col">Longs</th><th scope="col">Shorts</th><th scope="col">Spreads</th><th scope="col">Net</th>'+
    '<th scope="col">Δ longs</th><th scope="col">Δ shorts</th><th scope="col">% OI longs</th><th scope="col">% OI shorts</th><th scope="col">Traders L / S'+(c.groups.some(g=>g.spread)?' / Sp':'')+'</th></tr></thead><tbody>'+rows+
    '<tr class="cot-total"><th scope="row">Intérêt ouvert</th><td class="num" colspan="4"><b>'+esc(num(r.oi))+'</b> contrats</td><td class="num '+tone(r.doi)+'" colspan="2">'+esc(signed(r.doi))+'</td><td colspan="2"></td><td class="num">'+esc(num(r.tT))+' traders</td></tr></tbody></table></div>'+
    '<h4 class="cot-subhead">Concentration · part de l’intérêt ouvert</h4><div class="scroll"><table class="table cot-table cot-conc"><thead><tr><th scope="col">Opérateurs</th><th scope="col">Brut long</th><th scope="col">Brut short</th><th scope="col">Net long</th><th scope="col">Net short</th></tr></thead><tbody>'+conc+'</tbody></table></div>'+
    '<p class="small">Spreads : positions longues et courtes compensées sur des échéances différentes d’un même opérateur. Les nombres de traders comptent les déclarants de chaque côté ; « — » signale une valeur non publiée par la CFTC.</p>');
}

function historySection(c){
  const rows=c.recs.slice(-state.historyRows).reverse();
  const idx=cotIndexSeries(c.recs.map(r=>r[c.lead.id+'N']),state.lookback);
  return panel('<div class="cot-panel-head"><div><h3>Historique</h3><p class="small">Positions nettes en contrats, du plus récent au plus ancien. Le CSV contient tout l’historique depuis 2010 et toutes les colonnes.</p></div>'+
    '<div class="cot-inline">'+seg('historyRows',{13:'13 sem.',26:'26 sem.',52:'52 sem.',104:'2 ans'},state.historyRows,'Nombre de rapports')+
    '<button type="button" class="button" data-cot-action="csv">CSV · '+esc(c.market.name)+'</button><button type="button" class="button ghost" data-cot-action="csv-all">CSV · deux marchés</button></div></div>'+
    '<div class="scroll cot-history"><table class="table cot-table"><thead><tr><th scope="col">Rapport du</th><th scope="col">Intérêt ouvert</th><th scope="col">Δ OI</th>'+
    c.groups.map(g=>'<th scope="col">'+groupKey(g)+esc(g.short)+'</th>').join('')+'<th scope="col">'+esc(c.lead.short)+' % OI</th><th scope="col">Indice '+esc(lookbacks[state.lookback])+'</th></tr></thead><tbody>'+
    rows.map((r,k)=>'<tr><th scope="row">'+esc(fmtShort(r.date))+'</th><td class="num">'+esc(num(r.oi))+'</td><td class="num '+tone(r.doi)+'">'+esc(signed(r.doi))+'</td>'+
      c.groups.map(g=>'<td class="num">'+esc(signed(r[g.id+'N']))+'</td>').join('')+
      '<td class="num">'+esc(signedPct(pctOf(r[c.lead.id+'N'],r.oi)))+'</td><td class="num">'+esc(Number.isFinite(idx[c.recs.length-1-k])?num(idx[c.recs.length-1-k],0):'—')+'</td></tr>').join('')+
    '</tbody></table></div>');
}

function methodSection(entry){
  const ds=entry.data;
  const groups=cotGroups[ds.report];
  const releases=upcomingReleases(new Date(),6);
  return panel('<details class="cot-method"><summary>Méthode, définitions et calendrier</summary><div class="cot-method-grid">'+
    '<div><h4>Catégories du format '+esc(reportNames[ds.report])+'</h4><dl>'+groups.map(g=>'<dt>'+groupKey(g)+esc(g.name)+' <small>'+esc(g.en)+'</small></dt><dd>'+esc(g.desc)+'</dd>').join('')+'</dl>'+
      '<p class="small">Le format désagrégé sépare les fonds, les opérateurs physiques et les courtiers en swaps. Le format Legacy, publié depuis 1986, ne distingue que commerciaux et non commerciaux. '+
      '« Futures + options » ajoute les options converties en équivalent futures selon leur delta.</p></div>'+
    '<div><h4>Calculs</h4><dl>'+
      '<dt>Position nette</dt><dd>Longs − shorts. Les spreads, compensés, n’entrent pas dans le net.</dd>'+
      '<dt>% de l’intérêt ouvert</dt><dd>Position ÷ intérêt ouvert total × 100.</dd>'+
      '<dt>Indice COT</dt><dd>(net − minimum) ÷ (maximum − minimum) × 100 sur la période choisie, rapport du jour compris.</dd>'+
      '<dt>Écart-type</dt><dd>(net − moyenne) ÷ écart-type sur la même période.</dd>'+
      '<dt>Saisonnalité</dt><dd>Semaine comptée depuis le 1er janvier. La fourchette couvre les années précédant l’année en cours.</dd></dl></div>'+
    '<div><h4>Publication et mise à jour</h4><p class="small">La CFTC arrête les positions le mardi et publie le rapport le vendredi à 15 h 30, heure de New York. '+
      'Un jour férié fédéral reporte la publication au lundi suivant.</p><ul class="cot-releases">'+releases.map(r=>'<li><b>'+esc(capital(longDate.format(at(r.date))))+'</b><span class="small">données au '+esc(fmtShort(r.asOf))+
      (r.delayed?' · reportée':'')+(r.official?'':' · estimée')+'</span></li>').join('')+'</ul>'+
      '<p class="small">Une tâche GitHub interroge l’API de la CFTC après chaque publication et met à jour la branche <code>cot-live</code>. '+
      'Si un rapport publié n’y figure pas encore, la page interroge directement l’API de la CFTC. Toute révision de l’historique par la CFTC est reprise.</p>'+
      '<p class="small"><a href="'+CFTC_ABOUT_URL+'" target="_blank" rel="noopener noreferrer">Rapports COT</a> · <a href="'+CFTC_EXPLANATORY_URL+'" target="_blank" rel="noopener noreferrer">Notes explicatives</a> · '+
      '<a href="'+CFTC_SCHEDULE_URL+'" target="_blank" rel="noopener noreferrer">Calendrier officiel</a> · <a href="'+esc(datasetPage(ds.dataset))+'" target="_blank" rel="noopener noreferrer">Jeu de données '+esc(ds.datasetId)+'</a></p>'+
      '<p class="small">Données publiques de la Commodity Futures Trading Commission, agence fédérale américaine.</p></div>'+
  '</div></details>');
}

function content(){
  charts.clear();
  const key=currentKey();
  const entry=cache.get(key);
  if(!entry)return controls()+panel('<div class="cot-loading"><span class="dot"></span>Chargement du rapport COT '+esc(reportNames[state.report]+' · '+scopeNames[state.scope])+'…</div>');
  if(entry.error||!entry.data?.markets?.[state.market]?.rows?.length)
    return controls()+panel('<p class="notice">Les données COT n’ont pas pu être chargées. Vérifiez la connexion puis réessayez.</p><button type="button" class="button" data-cot-action="refresh">Réessayer</button>');
  const c=context(entry);
  return statusPanel(entry)+controls()+kpis(c)+
    '<div class="cot-grid cot-grid-main">'+panel('<div class="cot-panel-head"><div><h3>Positions nettes par catégorie · '+esc(c.market.name)+'</h3><p class="small">Cliquez sur une catégorie pour l’afficher ou la masquer.</p></div></div>'+netChart(c))+
      panel('<h3>Lecture du rapport</h3>'+reading(c),'cot-reading-panel')+'</div>'+
    '<div class="cot-grid">'+panel(longShortChart(c))+panel(oiChart(c))+'</div>'+
    '<div class="cot-grid cot-grid-flows">'+panel(flows(c))+panel(heatTable(c))+'</div>'+
    sectionHead('Extrêmes et saisonnalité','Situer la position actuelle dans son historique.')+
    indexSection(c)+seasonalSection(c)+compareSection(entry)+
    sectionHead('Rapport détaillé','Positions par catégorie, concentration et historique exportable.')+
    detailSection(c)+historySection(c)+methodSection(entry);
}

export function renderCotView(){
  return '<div class="cot-view" data-cot-view>'+content()+'</div>';
}

/* ---------- Interactions ---------- */
function paint(){
  const view=document.querySelector('[data-cot-view]');
  if(!view)return;
  const active=document.activeElement;
  const focus=active&&view.contains(active)?(active.dataset.cotSet?'[data-cot-set="'+active.dataset.cotSet+'"][data-value="'+active.dataset.value+'"]':
    active.dataset.cotToggle?'[data-cot-list="'+active.dataset.cotList+'"][data-cot-toggle="'+active.dataset.cotToggle+'"]':active.dataset.cotAction?'[data-cot-action="'+active.dataset.cotAction+'"]':active.matches('[data-cot-detail]')?'[data-cot-detail]':null):null;
  view.innerHTML=content();
  if(focus)view.querySelector(focus)?.focus({preventScroll:true});
}
function ensureLoaded(){
  const key=currentKey();
  if(cache.has(key))return;
  loadDataset(key).then(paint);
}
let lastForced=0,timerStarted=false;
async function refresh({manual=false}={}){
  const key=currentKey();
  const before=cache.get(key)?.data?.latest;
  for(const k of Object.keys(cotDatasets))if(k!==key)cache.delete(k);
  lastForced=Date.now();
  const button=document.querySelector('[data-cot-action="refresh"]');
  if(button){button.disabled=true;button.textContent='Actualisation…';}
  const entry=await loadDataset(key,{force:true});
  paint();
  const after=entry.data?.latest;
  if(after&&before&&after>before)hooks.toast('Nouveau rapport COT : positions au '+fmtShort(after)+'.');
  else if(manual)hooks.toast(after?'Rapport COT à jour : positions au '+fmtShort(after)+'.':'Les données COT n’ont pas pu être actualisées.');
}
function autoCheck(){
  if(!document.querySelector('[data-cot-view]')||document.hidden)return;
  const entry=cache.get(currentKey());
  if(!entry?.data)return;
  if(entry.data.latest>=expectedLatest(new Date()))return;
  if(Date.now()-lastForced<10*60e3)return;
  refresh();
}
function startTimer(){
  if(timerStarted)return;
  timerStarted=true;
  setInterval(autoCheck,60e3);
  document.addEventListener('visibilitychange',autoCheck);
}

const traderHeader=groups=>field=>{
  if(field==='tT')return 'Traders total';
  const g=groups.find(x=>field.startsWith(x.id)&&field.length===x.id.length+2);
  return 'Traders '+(g?g.en:field)+' '+({L:'long',S:'short',X:'spread'}[field.at(-2)]??'');
};
function csvRows(ds,marketKeys){
  const groups=cotGroups[ds.report];
  const head=['Marché','Code CFTC','Rapport du','Format','Positions','Intérêt ouvert',
    ...groups.flatMap(g=>[g.en+' long',g.en+' short',...(g.spread?[g.en+' spread']:[]),g.en+' net']),
    ...ds.fields.filter(f=>/T$/.test(f)).map(traderHeader(groups)),'Top 4 brut long %','Top 4 brut short %','Top 8 brut long %','Top 8 brut short %','Top 4 net long %','Top 4 net short %','Top 8 net long %','Top 8 net short %','Source'];
  const rows=[head];
  for(const key of marketKeys){
    for(const r of records(ds,key))rows.push([cotMarkets[key].name,cotMarkets[key].code,r.date,reportNames[ds.report],scopeNames[ds.scope],r.oi,
      ...groups.flatMap(g=>[r[g.id+'L'],r[g.id+'S'],...(g.spread?[r[g.id+'X']]:[]),r[g.id+'N']]),
      ...ds.fields.filter(f=>/T$/.test(f)).map(f=>r[f]),r.g4L,r.g4S,r.g8L,r.g8S,r.n4L,r.n4S,r.n8L,r.n8S,'CFTC '+ds.datasetId]);
  }
  return rows;
}

export function bindCotView(root,{csv,toast}){
  const view=root.querySelector('[data-cot-view]');
  if(!view)return;
  hooks={csv,toast};
  startTimer();
  ensureLoaded();
  view.addEventListener('click',event=>{
    const set=event.target.closest('[data-cot-set]');
    if(set){
      const key=set.dataset.cotSet;
      const raw=set.dataset.value;
      state[key]=['lookback','seasonYears','historyRows','flowWeeks'].includes(key)?Number(raw):raw;
      if(key==='report'){state.lsGroup='';state.seasonGroup='';}
      if(key==='market'||key==='report'||key==='scope')state.detailDate='';
      persist();
      paint();
      ensureLoaded();
      return;
    }
    const toggle=event.target.closest('[data-cot-toggle]');
    if(toggle){
      const id=toggle.dataset.cotToggle,list=toggle.dataset.cotList==='hiddenIndex'?'hiddenIndex':'hidden';
      const groups=cotGroups[state.report].map(g=>g.id);
      const hidden=new Set(state[list]);
      if(hidden.has(id))hidden.delete(id);
      else if(groups.filter(g=>!hidden.has(g)).length>1)hidden.add(id);
      state[list]=[...hidden];
      persist();
      paint();
      return;
    }
    const action=event.target.closest('[data-cot-action]')?.dataset.cotAction;
    if(action==='refresh')refresh({manual:true});
    if(action==='csv'||action==='csv-all'){
      const entry=cache.get(currentKey());
      if(!entry?.data)return;
      const keys=action==='csv'?[state.market]:Object.keys(cotMarkets);
      hooks.csv('olea_cot_'+(action==='csv'?state.market:'soja')+'_'+entry.data.dataset+'_'+entry.data.latest+'.csv',csvRows(entry.data,keys));
    }
  });
  view.addEventListener('change',event=>{
    if(event.target.matches('[data-cot-detail]')){state.detailDate=event.target.value;paint();}
  });
  view.addEventListener('pointermove',event=>{
    const plot=event.target.closest('[data-cot-plot]');
    if(!plot)return;
    const cfg=charts.get(plot.dataset.cotPlot);
    if(!cfg)return;
    const rect=plot.getBoundingClientRect();
    const x0=cfg.xMin??cfg.xs[0],x1=cfg.xMax??cfg.xs.at(-1);
    const target=x0+(event.clientX-rect.left)/rect.width*(x1-x0);
    showPoint(plot,nearestIndex(cfg.xs,target));
  });
  view.addEventListener('pointerout',event=>{
    const plot=event.target.closest('[data-cot-plot]');
    if(plot&&!plot.contains(event.relatedTarget)&&document.activeElement!==plot)hidePoint(plot);
  });
  view.addEventListener('focusin',event=>{
    const plot=event.target.closest?.('[data-cot-plot]');
    if(plot)showPoint(plot,Number(plot.dataset.index??charts.get(plot.dataset.cotPlot)?.xs.length-1));
  });
  view.addEventListener('focusout',event=>{
    const plot=event.target.closest?.('[data-cot-plot]');
    if(plot)hidePoint(plot);
  });
  view.addEventListener('keydown',event=>{
    const plot=event.target.closest?.('[data-cot-plot]');
    if(!plot||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const cfg=charts.get(plot.dataset.cotPlot);
    const current=Number(plot.dataset.index??cfg.xs.length-1);
    const step=event.shiftKey?4:1;
    const next=event.key==='Home'?0:event.key==='End'?cfg.xs.length-1:current+(event.key==='ArrowLeft'?-step:step);
    showPoint(plot,next);
  });
}

// Prochaines publications du rapport COT pour le calendrier du terminal.
export function cotCalendarEntries(now=new Date()){
  const start=addDaysISO(now.toISOString().slice(0,10),-45);
  let asOf=addDaysISO(start,(2-new Date(start+'T00:00:00Z').getUTCDay()+7)%7);
  const out=[];
  for(let i=0;i<16;i++,asOf=addDaysISO(asOf,7)){
    const r=releaseFor(asOf);
    out.push({id:'cftc-cot-'+asOf,date:r.date,time:'15:30',zone:'New York (ET)',title:'CFTC · Commitments of Traders',short:'CFTC · COT',
      source:'CFTC',url:CFTC_SCHEDULE_URL,product:'sbo',origin:'us',importance:2,
      expected:'Positions au '+fmtShort(asOf)+' : fonds, opérateurs physiques et swaps sur l’huile de soja et les graines de soja CBOT.'+(r.delayed?' Publication reportée par un jour férié.':'')+(r.official?'':' Date estimée.'),
      previous:'Voir la page Rapport COT · CFTC du terminal',consensus:'Non applicable',
      impact:'Un positionnement extrême des fonds peut amplifier les mouvements de prix lors d’un retournement.'});
  }
  return out;
}
