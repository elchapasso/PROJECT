import {simulatorDefaults,gridDefaults,gridChoices,MAX_SCENARIOS,CONTRACT_POUNDS,checkInputs,checkGrid,simulate,sensitivity,priceAt,priceStatus,impliedBasis,round2,parseDecimal,scenarioName,encodeShare,decodeShare,readSimulatorStore} from './cbot-arg-model.mjs?v=20261112-simulateur';

const PAGE='cbot-arg';
const localKey='olea-cbot-arg-v1';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatters=new Map();
function num(value,digits=2,signed=false){
  if(!Number.isFinite(value))return '—';
  if(!formatters.has(digits))formatters.set(digits,new Intl.NumberFormat('fr-FR',{minimumFractionDigits:digits,maximumFractionDigits:digits}));
  const shown=Math.abs(value)<.5/10**digits?0:value;
  return (shown<0?'−':signed&&shown>0?'+':'')+formatters.get(digits).format(Math.abs(shown));
}
const toField=value=>value===null||value===undefined?'':String(value).replace('.',',');
const fieldsFrom=inputs=>({target:toField(inputs.target),freight:toField(inputs.freight),basis:toField(inputs.basis),cbot:toField(inputs.cbot),factor:toField(inputs.factor),volume:toField(inputs.volume),watch:toField(inputs.watch)});
const stampFormat=new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Casablanca'});
const stamp=()=>stampFormat.format(new Date());
// Pour l’acheteur, un prix inférieur ou égal à l’objectif est favorable.
const tone=value=>Math.abs(value)<.005?'neutral':value<0?'positive':'negative';

const fields={
  target:['Objectif · prix ARG fret inclus','USD/t'],
  freight:['Fret / prime inclus dans l’objectif','USD/t'],
  basis:['Base · fixe pour la journée','¢/lb'],
  cbot:['CBOT huile de soja · cours actuel','¢/lb'],
  factor:['Facteur de conversion ¢/lb → USD/t',''],
  volume:['Volume de la cargaison','t'],
  watch:['Zone de vigilance au-dessus de l’objectif','USD/t'],
};
const signals={
  buy:['ACHETER · objectif atteint','positive','Acheter'],
  watch:['SURVEILLER · proche de l’objectif','mixed','Surveiller'],
  wait:['ATTENDRE · au-dessus de l’objectif','negative','Attendre'],
};
const statusNames={good:'Bon · ≤ objectif',near:'Proche de l’objectif',above:'Au-dessus de l’objectif'};
const statusTone={good:'positive',near:'mixed',above:'negative'};
const stepChoices=key=>gridChoices[key].map(step=>[step,num(step)+' ¢/lb']);
const countChoices=key=>gridChoices[key].map(count=>[count,String(count)]);
const gridLabels={
  center:['Centre de la grille',[['required','CBOT requis'],['current','CBOT actuel']]],
  cbotStep:['Pas du CBOT',stepChoices('cbotStep')],
  cbotSteps:['Lignes de chaque côté',countChoices('cbotSteps')],
  basisStep:['Pas de la base',stepChoices('basisStep')],
  basisSteps:['Colonnes de chaque côté',countChoices('basisSteps')],
};

const state={raw:{},convention:'discount',valid:null,grid:{...gridDefaults},scenarios:[],compare:'saved',notice:'',sharedName:'',quote:null,stored:true,open:{}};
function load(inputs){
  state.raw=fieldsFrom(inputs);
  state.convention=inputs.convention;
  state.valid=inputs;
  state.sharedName='';
}
load(simulatorDefaults);
try{
  const store=readSimulatorStore(localStorage.getItem(localKey));
  if(store.inputs)load(store.inputs);
  if(store.grid)state.grid=store.grid;
  if(store.scenarios)state.scenarios=store.scenarios;
}catch{}

const current=()=>checkInputs({...state.raw,convention:state.convention});
// Les derniers paramètres valides sont conservés, même pendant une saisie incomplète.
function persist(){
  try{localStorage.setItem(localKey,JSON.stringify({inputs:state.valid,grid:state.grid,scenarios:state.scenarios}));return true;}catch{return false;}
}
function consumeSharedLink(){
  const [page,query]=location.hash.slice(1).split('?');
  if(page!==PAGE||query===undefined)return;
  const shared=decodeShare(query);
  if(shared){
    load(shared.inputs);
    state.sharedName=shared.name;
    state.notice='Simulation partagée chargée'+(shared.name?' · « '+shared.name+' »':'')+'. Enregistrez-la comme scénario pour la conserver dans ce navigateur.';
  }else state.notice='Le lien partagé est incomplet ou invalide. La simulation précédente est conservée.';
  history.replaceState(null,'',location.pathname+location.search+'#'+PAGE);
}
const shareUrl=(inputs,name='')=>location.origin+location.pathname+'#'+PAGE+'?'+encodeShare(inputs,name);

function field(key,hint=''){
  const [label,unit]=fields[key];
  const mode=key==='basis'&&state.convention==='premium'?'text':'decimal';
  return '<label class="sim-field" for="sim-'+key+'"><span>'+escape(label)+'</span><span class="sim-field-box"><input id="sim-'+key+'" type="text" inputmode="'+mode+'" autocomplete="off" maxlength="18" data-sim-input="'+key+'" value="'+escape(state.raw[key])+'"'+
    (hint?' aria-describedby="sim-hint-'+key+'"':'')+'>'+(unit?'<span aria-hidden="true">'+escape(unit)+'</span>':'')+'</span>'+
    (hint?'<small id="sim-hint-'+key+'">'+escape(hint)+'</small>':'')+'</label>';
}
const seg=(key,choices,value,label)=>'<div class="seg" role="group" aria-label="'+escape(label)+'">'+Object.entries(choices).map(([id,name])=>
  '<button type="button" data-sim-seg="'+key+'" data-value="'+id+'" aria-pressed="'+(id===value)+'" class="'+(id===value?'active':'')+'">'+escape(name)+'</button>').join('')+'</div>';
const details=(id,summary,body,klass='')=>'<details class="'+klass+'" data-sim-details="'+id+'"'+(state.open[id]?' open':'')+'><summary>'+escape(summary)+'</summary>'+body+'</details>';

function inputsPanel(){
  const premium=state.convention==='premium';
  const quote=state.quote;
  const quoteLine=quote?'<p class="sim-quote small"><span>Dernière clôture du terminal · <b>'+escape(quote.name)+'</b> · <span class="num">'+num(quote.value)+' ¢/lb</span> · '+escape(quote.date)+' · '+escape(quote.source)+'</span>'+
    '<button type="button" class="button ghost" data-sim-action="quote">Utiliser ce cours</button></p>':'';
  const advanced='<div class="sim-fields">'+
    '<div class="sim-field"><span>Convention de la base</span>'+seg('convention',{discount:'Décote · CBOT − base',premium:'Prime · CBOT + base'},state.convention,'Convention de la base')+
    '<small>Le changement de convention inverse le signe de la base et conserve le même prix.</small></div>'+
    field('factor','22,04622 par défaut : 1 t = 2 204,622 lb.')+
    field('watch','Signale « Surveiller » lorsque le prix dépasse l’objectif de moins que ce montant. 0 désactive la zone.')+
    '<form class="sim-implied" data-sim-implied><label class="sim-field" for="sim-fob"><span>Déduire la base d’un prix FOB ARG</span><span class="sim-field-box"><input id="sim-fob" name="fob" type="text" inputmode="decimal" autocomplete="off" maxlength="18" placeholder="1 128" required><span aria-hidden="true">USD/t</span></span></label>'+
    '<button type="submit" class="button">Calculer la base</button><p class="small" data-sim-implied-status role="status"></p></form></div>';
  return '<section class="panel sim-inputs" aria-labelledby="sim-inputs-title"><div class="sim-head"><div><h2 id="sim-inputs-title">Paramètres</h2><p class="small">Les résultats se recalculent à chaque modification.</p></div>'+
    '<button class="button ghost" type="button" data-sim-action="reset">Réinitialiser</button></div>'+
    '<div class="sim-fields">'+field('target')+field('freight')+
    field('basis',premium?'Prime ajoutée au CBOT. Saisissez une valeur négative pour une décote.':'Décote retranchée du CBOT. 1 ¢/lb = 1 USD/cwt.')+field('cbot')+
    '<label class="sim-slider"><span class="sr">Faire varier le cours CBOT</span><input type="range" data-sim-slider step="0.05"><span class="sim-slider-scale" aria-hidden="true"><span class="num" data-sim-slider-min></span><span>Glissez pour simuler le CBOT</span><span class="num" data-sim-slider-max></span></span></label>'+
    quoteLine+field('volume','Facultatif. Affiche la valeur de la cargaison et le nombre de contrats CBOT.')+'</div>'+
    '<p class="sim-status small" data-sim-status role="status"></p>'+
    details('advanced','Options avancées',advanced,'sim-more')+'</section>';
}

function content(){
  const g=state.grid;
  const gridControls=Object.entries(gridLabels).map(([key,[label,choices]])=>'<label>'+escape(label)+'<select data-sim-grid="'+key+'">'+
    choices.map(([id,name])=>'<option value="'+id+'"'+(g[key]===id?' selected':'')+'>'+escape(name)+'</option>').join('')+'</select></label>').join('');
  const formulaSign=state.convention==='premium'?'+':'−';
  const method='<dl class="sim-method-list"><dt>Prix ARG fret inclus</dt><dd>((CBOT '+formulaSign+' base) × facteur) + fret</dd>'+
    '<dt>CBOT requis</dt><dd>((objectif fret inclus − fret) ÷ facteur) '+(state.convention==='premium'?'−':'+')+' base</dd>'+
    '<dt>Objectif hors fret</dt><dd>Objectif fret inclus − fret</dd>'+
    '<dt>Base d’équilibre</dt><dd>Base qui amène exactement à l’objectif au CBOT actuel</dd>'+
    '<dt>Fret maximal</dt><dd>Objectif fret inclus − (CBOT '+formulaSign+' base) × facteur</dd>'+
    '<dt>Contrats CBOT</dt><dd>Volume × facteur × 100 ÷ '+num(CONTRACT_POUNDS,0)+' lb</dd></dl>'+
    '<p class="small">Règle de décision · si le CBOT du moment est inférieur ou égal au CBOT requis, l’objectif est atteint ou mieux, à base et fret fixes. Le signal applique cette règle à vos saisies.</p>'+
    '<p class="small">Les calculs reprennent le classeur « Simulateur CBOT ARG ». Les lignes de la grille sont arrondies à 0,01 ¢/lb. La simulation et les scénarios sont enregistrés dans ce navigateur. Le lien partagé transmet les paramètres à un collègue.</p>';
  const notice=state.notice?'<p class="notice" role="status">'+escape(state.notice)+'</p>':'';
  state.notice='';
  return notice+'<section class="panel sim-decision" data-sim-decision aria-live="polite"></section>'+
    '<div class="sim-layout">'+inputsPanel()+'<div class="sim-main"><section class="panel sim-results" aria-labelledby="sim-results-title"><div class="sim-head"><div><h2 id="sim-results-title">Résultats</h2><p class="small">Prix en USD/t, cours et base en ¢/lb.</p></div></div><div data-sim-results></div></section>'+
    '<section class="panel" aria-labelledby="sim-chart-title"><div class="sim-head"><div><h2 id="sim-chart-title">Prix ARG fret inclus selon le CBOT</h2><p class="small">La zone teintée couvre les cours où l’objectif est atteint avec la base actuelle.</p></div></div><div data-sim-chart></div></section></div></div>'+
    '<section class="panel" aria-labelledby="sim-matrix-title"><div class="sim-head"><div><h2 id="sim-matrix-title">Sensibilité CBOT × base</h2><p class="small">Prix ARG fret inclus en USD/t. CBOT en lignes, base en colonnes.</p></div>'+
    seg('display',{price:'Prix',gap:'Écart vs objectif'},g.display,'Affichage de la grille')+'</div>'+
    details('grid','Réglages de la grille','<div class="chart-controls sim-grid-controls">'+gridControls+'<button type="button" class="button" data-sim-action="grid-reset">Réinitialiser</button></div>','sim-grid-settings')+
    '<div data-sim-matrix></div></section>'+
    '<section class="panel" aria-labelledby="sim-ladder-title"><div class="sim-head"><div><h2 id="sim-ladder-title">Simulation CBOT à base fixe</h2><p class="small">Chaque ligne applique la base et le fret saisis à un niveau de CBOT.</p></div></div><div data-sim-ladder></div></section>'+
    '<section class="panel sim-scenarios" aria-labelledby="sim-scenarios-title"><div class="sim-head"><div><h2 id="sim-scenarios-title">Scénarios</h2><p class="small">Enregistrez plusieurs offres ou positions, puis comparez-les.</p></div>'+
    seg('compare',{saved:'CBOT du scénario',live:'CBOT actuel'},state.compare,'Cours CBOT utilisé pour la comparaison')+'</div>'+
    '<form class="sim-save" data-sim-save><label>Nom du scénario<input name="scenario" maxlength="60" autocomplete="off" placeholder="Ex. Offre décembre · base 16,15" value="'+escape(state.sharedName||'')+'" required></label>'+
    '<button class="button primary" type="submit" data-sim-requires-valid>Enregistrer la simulation</button><p class="small" data-sim-save-status role="status"></p></form>'+
    '<div data-sim-scenarios></div></section>'+
    '<section class="panel">'+details('method','Formules et méthode',method,'sim-method')+'</section>';
}

export function renderCbotArgView(quote){
  consumeSharedLink();
  state.quote=quote;
  return '<div class="sim-view" data-sim-view>'+content()+'</div>';
}

const kpi=(label,value,unit,detail='',klass='',valueTone='')=>'<div class="sim-kpi '+klass+'"><span>'+escape(label)+'</span><strong class="num '+valueTone+'">'+value+(unit?' <small>'+escape(unit)+'</small>':'')+'</strong>'+(detail?'<small>'+detail+'</small>':'')+'</div>';

function decisionHtml(inputs,result){
  const [label]=signals[result.signal];
  const gap=Math.abs(result.gap),move=Math.abs(result.cbotGap);
  const position=gap<.005?'exactement à l’objectif':'soit <b>'+num(gap)+' USD/t '+(result.gap<0?'sous':'au-dessus de')+' l’objectif</b>';
  const next=result.signal==='buy'?'Le CBOT peut encore monter de <b>'+num(move)+' ¢/lb</b> avant de dépasser le seuil.':
    'Le CBOT doit baisser de <b>'+num(move)+' ¢/lb</b> pour atteindre l’objectif.';
  const span=Math.max(state.grid.cbotStep*state.grid.cbotSteps,move*1.15,.5);
  const marker=50+50*result.cbotGap/span;
  const facts=[
    ['Objectif fret inclus',num(inputs.target)+' USD/t'],['Fret',num(inputs.freight)+' USD/t'],
    ['Base',num(inputs.basis)+' ¢/lb'],['Équivalent FOB de l’objectif',num(result.fobTarget)+' USD/t'],
    ['CBOT requis',num(result.requiredCbot)+' ¢/lb'],['CBOT actuel',num(inputs.cbot)+' ¢/lb'],
  ];
  return '<div class="sim-decision-main"><span class="eyebrow">Décision</span><strong class="sim-signal"><span class="dot"></span>'+escape(label)+'</strong>'+
    '<p class="sim-decision-text">Au CBOT de <b>'+num(inputs.cbot)+' ¢/lb</b>, le prix ARG fret inclus ressort à <b>'+num(result.price)+' USD/t</b>, '+position+'. '+next+'</p>'+
    '<div class="sim-gauge" aria-hidden="true"><div class="sim-gauge-zones"><span class="positive">Zone d’achat</span><span class="negative">Zone d’attente</span></div>'+
    '<div class="sim-gauge-track"><i style="--x:'+Math.max(0,Math.min(100,marker))+'%"></i></div>'+
    '<div class="sim-gauge-scale num"><span>'+num(result.requiredCbot-span)+'</span><span>Requis '+num(result.requiredCbot)+'</span><span>'+num(result.requiredCbot+span)+'</span></div></div></div>'+
    '<div class="sim-decision-side"><dl class="sim-facts">'+facts.map(([name,value])=>'<div><dt>'+escape(name)+'</dt><dd class="num">'+value+'</dd></div>').join('')+'</dl>'+
    '<div class="sim-share"><button type="button" class="button" data-sim-action="copy-summary">Copier le résumé</button><button type="button" class="button" data-sim-action="copy-link">Copier le lien</button>'+
    '<button type="button" class="button" data-sim-action="csv">Exporter en CSV</button></div><textarea class="sim-copy" data-sim-copy rows="3" readonly hidden aria-label="Texte à copier"></textarea></div>';
}

function resultsHtml(inputs,result){
  const premium=inputs.convention==='premium';
  const main='<div class="sim-kpis">'+
    kpi('CBOT requis pour l’objectif',num(result.requiredCbot),'¢/lb','Seuil d’achat à base et fret fixes','sim-kpi-main')+
    kpi('Prix ARG actuel fret inclus',num(result.price),'USD/t','FOB '+num(result.fob)+' USD/t · '+num(result.fobCents)+' ¢/lb')+
    kpi('Écart vs objectif',num(result.gap,2,true),'USD/t',num(result.gap/inputs.target*100,2,true)+' % de l’objectif','',tone(result.gap))+
    kpi('Écart vs CBOT requis',num(result.cbotGap,2,true),'¢/lb',result.cbotGap<=0?'Marge avant le seuil':'Baisse nécessaire','',tone(result.cbotGap))+
    kpi('Objectif hors fret · FOB ARG',num(result.fobTarget),'USD/t',num(result.fobTargetCents)+' ¢/lb')+'</div>';
  const even='<h3 class="sim-subtitle">Points d’équilibre au CBOT actuel</h3><div class="sim-kpis">'+
    kpi('Base d’équilibre',num(result.requiredBasis),'¢/lb',premium?'Base maximale pour atteindre l’objectif':'Décote minimale pour atteindre l’objectif')+
    kpi('Fret maximal',num(result.maxFreight),'USD/t','Fret qui amène exactement à l’objectif')+'</div>';
  const cargo=result.cargo?'<h3 class="sim-subtitle">Cargaison et couverture · '+num(inputs.volume,0)+' t</h3><div class="sim-kpis">'+
    kpi('Valeur fret inclus',num(result.cargo.value,0),'USD','Au prix ARG actuel')+
    kpi('Écart total vs objectif',num(result.cargo.gapValue,0,true),'USD','Écart unitaire × volume','',tone(result.cargo.gapValue))+
    kpi('Couverture CBOT',num(result.cargo.contracts,1),'contrats',num(CONTRACT_POUNDS,0)+' lb par contrat')+
    kpi('Valeur de 1 ¢/lb',num(result.cargo.centValue,0),'USD','Effet d’une variation de 1 ¢/lb du CBOT')+'</div>':'';
  return main+even+cargo;
}

function axis(low,high,count=4){
  const range=high-low||Math.abs(high)*.1||1;
  const raw=range/count,exponent=Math.floor(Math.log10(raw));
  const mantissa=[1,2,2.5,5,10].find(n=>n>=raw/10**exponent)??10;
  const step=mantissa*10**exponent;
  const first=Math.floor(low/step),last=Math.ceil(high/step);
  const digits=Math.max(0,(mantissa===2.5?1:mantissa===10?-1:0)-exponent);
  return {values:Array.from({length:last-first+1},(_,i)=>(first+i)*step),digits};
}
const lineColors=['var(--series-2)','var(--series-1)','var(--series-3)'];

function chartModel(inputs,result,levels){
  const domain=[...levels.rows,inputs.cbot,result.requiredCbot];
  let x0=Math.min(...domain),x1=Math.max(...domain);
  const pad=(x1-x0)*.03||.5;
  x0-=pad;x1+=pad;
  const step=state.grid.basisStep;
  const lines=[inputs.basis-step,inputs.basis,inputs.basis+step].map((basis,i)=>({basis,color:lineColors[i],current:i===1,from:priceAt(inputs,x0,basis),to:priceAt(inputs,x1,basis)}));
  const yAxis=axis(Math.min(inputs.target,...lines.map(line=>line.from)),Math.max(inputs.target,...lines.map(line=>line.to)));
  return {inputs,result,lines,x0,x1,yAxis,yMin:yAxis.values[0],yMax:yAxis.values.at(-1)};
}

function chartHtml(model){
  const {inputs,result,lines,x0,x1,yAxis,yMin,yMax}=model;
  const x=value=>100*(value-x0)/(x1-x0),y=value=>100*(yMax-value)/(yMax-yMin);
  const xAxis=axis(x0,x1,6);
  const xTicks=xAxis.values.filter(value=>value>=x0&&value<=x1),yTicks=yAxis.values;
  const yDigits=yAxis.digits,xDigits=xAxis.digits;
  const zone=Math.max(0,Math.min(100,x(result.requiredCbot)));
  const legend=lines.map(line=>'<span><i style="--series:'+line.color+'"></i>Base '+num(line.basis)+(line.current?' · actuelle':'')+'</span>').join('')+
    '<span><i class="sim-key-target"></i>Objectif '+num(inputs.target)+' USD/t</span><span><i class="sim-key-required"></i>CBOT requis '+num(result.requiredCbot)+' ¢/lb</span>'+
    '<span><i class="sim-key-dot"></i>CBOT actuel '+num(inputs.cbot)+' ¢/lb</span>';
  return '<figure class="chart-wrap sim-chart" aria-label="Prix ARG fret inclus en fonction du cours CBOT. Les valeurs figurent dans le tableau de simulation.">'+
    '<figcaption class="chart-key"><div class="legend sim-legend">'+legend+'</div><span class="chart-unit">USD/t</span></figcaption>'+
    '<div class="chart-view" style="--plot-height:270px"><div class="chart-frame"><div class="chart-axis-y" aria-hidden="true">'+yTicks.map(value=>'<span style="--y:'+y(value)+'%">'+num(value,yDigits)+'</span>').join('')+'</div>'+
    '<div class="chart-plot" data-sim-plot><svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+
    '<rect class="sim-zone" x="0" y="0" width="'+zone+'" height="100"/>'+yTicks.map(value=>'<line class="grid" x1="0" x2="100" y1="'+y(value)+'" y2="'+y(value)+'"/>').join('')+
    '<line class="sim-target-line" x1="0" x2="100" y1="'+y(inputs.target)+'" y2="'+y(inputs.target)+'"/>'+
    '<line class="sim-required-line" x1="'+x(result.requiredCbot)+'" x2="'+x(result.requiredCbot)+'" y1="0" y2="100"/>'+
    lines.map(line=>'<path class="chart-line" d="M0,'+y(line.from)+' L100,'+y(line.to)+'" stroke="'+line.color+'" stroke-width="'+(line.current?3.25:1.75)+'"/>').join('')+'</svg>'+
    (zone>16?'<span class="sim-zone-label" aria-hidden="true">Zone d’achat</span>':'')+
    '<span class="sim-chart-dot" style="--x:'+x(inputs.cbot)+'%;--y:'+y(result.price)+'%" aria-hidden="true"></span><div class="chart-guide" hidden></div></div>'+
    '<div class="chart-axis-x" aria-hidden="true">'+xTicks.map(value=>'<span style="--x:'+x(value)+'%">'+num(value,xDigits)+'</span>').join('')+'</div></div>'+
    '<div class="chart-tooltip" aria-hidden="true" hidden></div></div><p class="small sim-axis-title">CBOT huile de soja · ¢/lb</p></figure>';
}

function bindChart(container,model){
  const plot=container.querySelector('[data-sim-plot]');
  if(!plot)return;
  const wrap=container.querySelector('.chart-view'),tooltip=container.querySelector('.chart-tooltip'),guide=plot.querySelector('.chart-guide');
  const {inputs,lines,x0,x1}=model;
  const hide=()=>{tooltip.hidden=guide.hidden=true;};
  function show(event){
    const bounds=plot.getBoundingClientRect(),outer=wrap.getBoundingClientRect();
    const share=Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width));
    const cbot=round2(x0+share*(x1-x0));
    const position=(cbot-x0)/(x1-x0);
    tooltip.hidden=guide.hidden=false;
    guide.style.left=position*100+'%';
    tooltip.innerHTML='<strong>CBOT '+num(cbot)+' ¢/lb</strong>'+lines.map(line=>{
      const price=priceAt(inputs,cbot,line.basis);
      return '<div class="chart-reading'+(line.current?' selected':'')+'"><i style="--series:'+line.color+'"></i><span>Base '+num(line.basis)+'</span><b>'+num(price)+' USD/t</b></div>';
    }).join('')+'<div class="chart-reading"><i></i><span>Écart vs objectif</span><b>'+num(priceAt(inputs,cbot)-inputs.target,2,true)+' USD/t</b></div>';
    const center=bounds.left-outer.left+position*bounds.width,width=tooltip.offsetWidth;
    const left=center+14+width<=outer.width?center+14:center-14-width;
    tooltip.style.left=Math.max(0,Math.min(left,outer.width-width))+'px';
    tooltip.style.top=(bounds.top-outer.top+9)+'px';
  }
  plot.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')show(event);});
  plot.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')hide();});
  plot.addEventListener('click',show);
}

function nearestRow(rows,value){
  return rows.reduce((best,row,i)=>Math.abs(row-value)<Math.abs(rows[best]-value)?i:best,0);
}

function matrixHtml(inputs,levels){
  const {rows,columns,cells}=levels;
  const middle=(rows.length-1)/2,currentColumn=(columns.length-1)/2;
  const nearest=nearestRow(rows,inputs.cbot);
  const now=Math.abs(rows[nearest]-inputs.cbot)<=state.grid.cbotStep/2+1e-9?nearest:-1;
  const showGap=state.grid.display==='gap';
  const largest=Math.max(...cells.flat().map(cell=>Math.abs(cell.gap)))||1;
  const rowTag=i=>[i===middle?(state.grid.center==='current'?'actuel':'requis'):'',i===now&&!(i===middle&&state.grid.center==='current')?(rows[i]===inputs.cbot?'actuel':'≈ actuel'):''].filter(Boolean).join(' · ');
  return '<div class="scroll sim-scroll" tabindex="0" role="region" aria-label="Grille de sensibilité du prix ARG fret inclus"><table class="table sim-matrix"><thead><tr><th scope="col">CBOT ↓<small>Base →</small></th>'+
    columns.map((basis,j)=>'<th scope="col" class="'+(j===currentColumn?'sim-current':'')+'">'+num(basis)+(j===currentColumn?'<small>actuelle</small>':'')+'</th>').join('')+'</tr></thead><tbody>'+
    rows.map((cbot,i)=>'<tr class="'+(i===now?'sim-now':'')+'"><th scope="row"><span class="num">'+num(cbot)+'</span>'+(rowTag(i)?'<small>'+rowTag(i)+'</small>':'')+'</th>'+
      cells[i].map((cell,j)=>'<td class="num sim-cell sim-'+cell.status+(j===currentColumn?' sim-current':'')+'" style="--heat:'+Math.round(10+32*Math.abs(cell.gap)/largest)+'%" title="CBOT '+num(cbot)+' · base '+num(columns[j])+' · '+statusNames[cell.status]+'">'+
        (showGap?num(cell.gap,2,true):num(cell.price))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
    '<p class="small sim-matrix-key"><span class="sim-swatch sim-good"></span>Objectif atteint'+(inputs.watch>0?'<span class="sim-swatch sim-near"></span>Zone de vigilance':'')+'<span class="sim-swatch sim-above"></span>Au-dessus de l’objectif · objectif '+num(inputs.target)+' USD/t</p>';
}

function ladderHtml(inputs,result,levels){
  const live={cbot:inputs.cbot,basis:inputs.basis,fob:result.fob,price:result.price,gap:result.gap,status:priceStatus(inputs,result.price),live:true};
  const rows=levels.ladder.some(row=>row.cbot===live.cbot)?levels.ladder.map(row=>row.cbot===live.cbot?{...row,live:true}:row):[...levels.ladder,live].sort((a,b)=>a.cbot-b.cbot);
  return '<div class="scroll sim-scroll" tabindex="0" role="region" aria-label="Simulation du prix selon le CBOT"><table class="table sim-ladder"><thead><tr>'+
    ['CBOT (¢/lb)','Base (¢/lb)','FOB ARG (USD/t)','Prix ARG fret inclus (USD/t)','Écart vs objectif (USD/t)','Statut'].map(name=>'<th scope="col">'+name+'</th>').join('')+'</tr></thead><tbody>'+
    rows.map(row=>'<tr class="'+(row.live?'sim-now':'')+'"><th scope="row"><span class="num">'+num(row.cbot)+'</span>'+(row.live?'<small>CBOT actuel</small>':'')+'</th><td class="num">'+num(row.basis)+'</td><td class="num">'+num(row.fob)+'</td>'+
      '<td class="num"><b>'+num(row.price)+'</b></td><td class="num '+tone(row.gap)+'">'+num(row.gap,2,true)+'</td><td><span class="badge '+statusTone[row.status]+'"><span class="dot"></span>'+statusNames[row.status]+'</span></td></tr>').join('')+'</tbody></table></div>';
}

function scenariosHtml(liveInputs){
  if(!state.scenarios.length)return '<div class="empty">Aucun scénario enregistré. Nommez la simulation en cours pour la retrouver et la comparer.</div>';
  const live=state.compare==='live'&&liveInputs;
  const rows=state.scenarios.map((scenario,i)=>{
    const inputs=live?{...scenario.inputs,cbot:liveInputs.cbot}:scenario.inputs;
    const result=simulate(inputs);
    const [, signalTone,signalName]=signals[result.signal];
    const button=(action,label)=>'<button type="button" class="button ghost" data-sim-action="'+action+'" data-index="'+i+'" aria-label="'+label+' · '+escape(scenario.name)+'">'+label+'</button>';
    return '<tr><th scope="row">'+escape(scenario.name)+'</th><td class="num">'+num(inputs.target)+'</td><td class="num">'+num(inputs.freight)+'</td><td class="num">'+num(inputs.basis)+(inputs.convention==='premium'?'<small>prime</small>':'')+'</td>'+
      '<td class="num">'+num(inputs.cbot)+'</td><td class="num">'+num(result.requiredCbot)+'</td><td class="num"><b>'+num(result.price)+'</b></td><td class="num '+tone(result.gap)+'">'+num(result.gap,2,true)+'</td>'+
      '<td><span class="badge '+signalTone+'"><span class="dot"></span>'+signalName+'</span></td><td><div class="sim-row-actions">'+button('scenario-load','Charger')+button('scenario-link','Lien')+button('scenario-remove','Supprimer')+'</div></td></tr>';
  }).join('');
  return '<div class="scroll sim-scroll" tabindex="0" role="region" aria-label="Comparaison des scénarios"><table class="table sim-compare"><thead><tr>'+
    ['Scénario','Objectif','Fret','Base','CBOT'+(live?' actuel':''),'CBOT requis','Prix ARG fret inclus','Écart','Signal','Actions'].map(name=>'<th scope="col">'+name+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    (state.compare==='live'&&!liveInputs?'<p class="small">Corrigez les paramètres pour comparer au CBOT actuel.</p>':'');
}

function exportCsv(csv,inputs,result,levels){
  const cell=(value,digits=6)=>Number.isFinite(value)?String(Number(value.toFixed(digits))).replace('.',','):'';
  csv('olea_simulateur_cbot_arg.csv',[
    ['Simulateur CBOT → ARG',stamp()],[],
    ['Paramètre','Valeur','Unité'],
    ['Objectif prix ARG fret inclus',cell(inputs.target),'USD/t'],['Fret / prime inclus dans l’objectif',cell(inputs.freight),'USD/t'],
    ['Base ('+(inputs.convention==='premium'?'ajoutée au CBOT':'retranchée du CBOT')+')',cell(inputs.basis),'¢/lb'],['CBOT huile de soja',cell(inputs.cbot),'¢/lb'],
    ['Facteur de conversion',cell(inputs.factor,8),'USD/t par ¢/lb'],...(inputs.volume?[['Volume',cell(inputs.volume),'t']]:[]),
    ...(inputs.watch?[['Zone de vigilance au-dessus de l’objectif',cell(inputs.watch),'USD/t']]:[]),[],
    ['Résultat','Valeur','Unité'],
    ['Signal',signals[result.signal][0],''],['Objectif hors fret / FOB ARG',cell(result.fobTarget),'USD/t'],['CBOT requis pour l’objectif',cell(result.requiredCbot),'¢/lb'],
    ['Prix ARG actuel fret inclus',cell(result.price),'USD/t'],['Écart vs objectif',cell(result.gap),'USD/t'],['Écart vs CBOT requis',cell(result.cbotGap),'¢/lb'],
    ['Base d’équilibre au CBOT actuel',cell(result.requiredBasis),'¢/lb'],['Fret maximal au CBOT actuel',cell(result.maxFreight),'USD/t'],
    ...(result.cargo?[['Valeur de la cargaison',cell(result.cargo.value,2),'USD'],['Écart total vs objectif',cell(result.cargo.gapValue,2),'USD'],['Contrats CBOT',cell(result.cargo.contracts,2),'contrats'],['Valeur de 1 ¢/lb',cell(result.cargo.centValue,2),'USD']]:[]),[],
    ['Simulation CBOT à base fixe'],
    ['CBOT (¢/lb)','Base (¢/lb)','FOB ARG (USD/t)','Prix ARG fret inclus (USD/t)','Écart vs objectif (USD/t)','Statut'],
    ...levels.ladder.map(row=>[cell(row.cbot),cell(row.basis),cell(row.fob),cell(row.price),cell(row.gap),statusNames[row.status]]),[],
    ['Sensibilité · prix ARG fret inclus (USD/t)'],
    ['CBOT (¢/lb) / Base (¢/lb)',...levels.columns.map(basis=>cell(basis))],
    ...levels.rows.map((cbot,i)=>[cell(cbot),...levels.cells[i].map(point=>cell(point.price))]),
  ]);
}

function summaryText(inputs,result){
  return ['Oléa Terminal · Simulateur CBOT → ARG · '+stamp(),
    'Signal : '+signals[result.signal][0],
    'Objectif fret inclus : '+num(inputs.target)+' USD/t (FOB '+num(result.fobTarget)+' · fret '+num(inputs.freight)+')',
    'Base : '+num(inputs.basis)+' ¢/lb '+(inputs.convention==='premium'?'ajoutée au CBOT':'sous le CBOT'),
    'CBOT requis : '+num(result.requiredCbot)+' ¢/lb · CBOT actuel : '+num(inputs.cbot)+' ¢/lb ('+num(result.cbotGap,2,true)+')',
    'Prix ARG fret inclus : '+num(result.price)+' USD/t ('+num(result.gap,2,true)+' vs objectif)',
    ...(result.cargo?['Volume : '+num(inputs.volume,0)+' t · '+num(result.cargo.contracts,1)+' contrats CBOT · écart total '+num(result.cargo.gapValue,0,true)+' USD']:[]),
    shareUrl(inputs)].join('\n');
}

export function bindCbotArgView(root,{csv,toast}){
  const view=root.querySelector('[data-sim-view]');
  if(!view)return;
  const find=selector=>view.querySelector(selector);
  const blank='<div class="empty">Renseignez des paramètres valides pour afficher les résultats.</div>';
  function update(source){
    const {inputs,invalid}=current();
    for(const input of view.querySelectorAll('[data-sim-input]'))input.setAttribute('aria-invalid',String(invalid.includes(input.dataset.simInput)));
    if(inputs)state.valid=inputs;
    state.stored=persist();
    const status=find('[data-sim-status]');
    status.textContent=!inputs?'Corrigez · '+invalid.map(key=>fields[key][0]).join(', ')+'.':state.stored?'':'Le navigateur a bloqué l’enregistrement local. La simulation reste disponible sur cette page.';
    status.classList.toggle('negative',!inputs);
    view.querySelectorAll('[data-sim-requires-valid]').forEach(button=>{button.disabled=!inputs;});
    for(const button of view.querySelectorAll('[data-sim-seg]')){
      const key=button.dataset.simSeg;
      const active=button.dataset.value===(key==='display'?state.grid.display:state[key]);
      button.setAttribute('aria-pressed',String(active));
      button.classList.toggle('active',active);
    }
    const slider=find('[data-sim-slider]'),decision=find('[data-sim-decision]');
    slider.disabled=!inputs;
    find('[data-sim-scenarios]').innerHTML=scenariosHtml(inputs);
    if(!inputs){
      decision.dataset.signal='none';
      decision.innerHTML='<div class="sim-decision-main"><span class="eyebrow">Décision</span><strong class="sim-signal">Paramètres à compléter</strong><p class="sim-decision-text">Le signal s’affiche dès que tous les champs obligatoires sont valides.</p></div>';
      for(const name of ['results','chart','matrix','ladder'])find('[data-sim-'+name+']').innerHTML=blank;
      return;
    }
    const result=simulate(inputs),levels=sensitivity(inputs,state.grid);
    if(source!=='slider'){
      // La plage du curseur reste fixe pendant le glissement.
      const reach=Math.max(2*state.grid.cbotStep*state.grid.cbotSteps,2);
      const low=Math.max(.05,Math.floor(Math.min(result.requiredCbot-reach,inputs.cbot)*20)/20),high=Math.ceil(Math.max(result.requiredCbot+reach,inputs.cbot)*20)/20;
      slider.min=low;slider.max=high;slider.value=inputs.cbot;
      find('[data-sim-slider-min]').textContent=num(low);
      find('[data-sim-slider-max]').textContent=num(high);
    }
    decision.dataset.signal=result.signal;
    decision.innerHTML=decisionHtml(inputs,result);
    find('[data-sim-results]').innerHTML=resultsHtml(inputs,result);
    const model=chartModel(inputs,result,levels),chart=find('[data-sim-chart]');
    chart.innerHTML=chartHtml(model);
    bindChart(chart,model);
    find('[data-sim-matrix]').innerHTML=matrixHtml(inputs,levels);
    find('[data-sim-ladder]').innerHTML=ladderHtml(inputs,result,levels);
  }
  function refresh(focus){
    view.innerHTML=content();
    update();
    if(focus)find(focus)?.focus({preventScroll:true});
  }
  async function copy(text,done){
    try{
      await navigator.clipboard.writeText(text);
      toast(done);
    }catch{
      const box=find('[data-sim-copy]');
      if(!box){toast('Copie automatique indisponible dans ce navigateur.');return;}
      box.hidden=false;box.value=text;box.focus();box.select();
      toast('Copie automatique indisponible. Le texte est sélectionné sous les boutons.');
    }
  }
  update();
  view.addEventListener('input',event=>{
    const target=event.target;
    if(target.hasAttribute('data-sim-input')){
      state.raw[target.dataset.simInput]=target.value;
      update();
    }else if(target.hasAttribute('data-sim-slider')){
      state.raw.cbot=toField(round2(Number(target.value)));
      find('#sim-cbot').value=state.raw.cbot;
      update('slider');
    }
  });
  view.addEventListener('change',event=>{
    const key=event.target.dataset.simGrid;
    if(!key)return;
    state.grid=checkGrid({...state.grid,[key]:event.target.value});
    update();
  });
  view.addEventListener('toggle',event=>{
    const id=event.target.dataset?.simDetails;
    if(id)state.open[id]=event.target.open;
  },true);
  view.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    const key=button.dataset.simSeg,value=button.dataset.value;
    if(key==='convention'){
      if(value===state.convention)return;
      const basis=parseDecimal(state.raw.basis);
      if(basis!==null)state.raw.basis=toField(-basis||0);
      state.convention=value;
      refresh('[data-sim-seg="convention"][data-value="'+value+'"]');
      return;
    }
    if(key==='display'){state.grid=checkGrid({...state.grid,display:value});update();return;}
    if(key==='compare'){state.compare=value;update();return;}
    const action=button.dataset.simAction;
    if(!action)return;
    const {inputs}=current();
    const scenario=state.scenarios[Number(button.dataset.index)];
    if(action==='reset'){
      load(simulatorDefaults);
      refresh('#sim-target');
    }else if(action==='grid-reset'){
      state.grid={...gridDefaults};
      refresh('[data-sim-details="grid"] summary');
    }else if(action==='quote'){
      state.raw.cbot=toField(state.quote.value);
      refresh('#sim-cbot');
    }else if(action==='scenario-load'&&scenario){
      load(scenario.inputs);
      refresh('#sim-cbot');
      toast('Scénario « '+scenario.name+' » chargé.');
    }else if(action==='scenario-link'&&scenario){
      copy(shareUrl(scenario.inputs,scenario.name),'Lien du scénario copié.');
    }else if(action==='scenario-remove'&&scenario){
      state.scenarios=state.scenarios.filter(item=>item!==scenario);
      update();
    }else if(inputs&&action==='copy-link'){
      copy(shareUrl(inputs),'Lien de la simulation copié.');
    }else if(inputs&&action==='copy-summary'){
      copy(summaryText(inputs,simulate(inputs)),'Résumé copié dans le presse-papiers.');
    }else if(inputs&&action==='csv'){
      exportCsv(csv,inputs,simulate(inputs),sensitivity(inputs,state.grid));
    }
  });
  view.addEventListener('submit',event=>{
    const form=event.target;
    if(!form.matches('[data-sim-save], [data-sim-implied]'))return;
    event.preventDefault();
    if(form.matches('[data-sim-implied]')){
      const status=form.querySelector('[data-sim-implied-status]');
      const fob=parseDecimal(form.elements.fob.value),cbot=parseDecimal(state.raw.cbot),factor=parseDecimal(state.raw.factor);
      if(fob===null||fob<=0||cbot===null||!(factor>0)){status.textContent='Saisissez un prix FOB positif, avec un CBOT et un facteur valides.';return;}
      state.raw.basis=toField(Number(impliedBasis({convention:state.convention,cbot,factor},fob).toFixed(4)));
      refresh('#sim-basis');
      return;
    }
    const status=form.querySelector('[data-sim-save-status]');
    const {inputs}=current(),name=scenarioName(form.elements.scenario.value);
    if(!inputs||!name){status.textContent='Saisissez un nom et des paramètres valides.';return;}
    const existing=state.scenarios.findIndex(item=>item.name.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr'));
    if(existing<0&&state.scenarios.length>=MAX_SCENARIOS){status.textContent='Limite de '+MAX_SCENARIOS+' scénarios atteinte. Supprimez-en un pour continuer.';return;}
    if(existing<0)state.scenarios=[...state.scenarios,{name,inputs}];
    else state.scenarios=state.scenarios.map((item,i)=>i===existing?{name,inputs}:item);
    state.sharedName='';
    form.reset();
    form.elements.scenario.value='';
    update();
    status.textContent=state.stored?'Scénario « '+name+' » '+(existing<0?'enregistré.':'mis à jour.'):'Le navigateur a bloqué l’enregistrement local.';
  });
}
