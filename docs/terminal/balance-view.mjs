import {balanceSections,balanceProducts,balanceOrigins,balanceRows,palmWorldBalance,soyBalances,supplyFields,useFields} from './balance-data.mjs?v=20261112-palme';
import {applyBalanceShock,balanceContributions,balanceInputFields,calculateBalance,normalizeCampaignLabel,parseBalanceVolume,readBalanceScenarios,scenarioName} from './balance-model.mjs?v=20261111-visualisations';

const localKey='olea-balance-scenarios-v1';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const volume=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
const signedVolume=new Intl.NumberFormat('fr-FR',{signDisplay:'exceptZero',minimumFractionDigits:2,maximumFractionDigits:2});
const format=(value,unit='MT',signed=false)=>Number.isFinite(value)?(signed?signedVolume:volume).format(Math.abs(value)<.005?0:value)+' '+unit:'—';
const deltaClass=value=>value>0?'positive':value<0?'negative':'neutral';
const units={supply:'MT',use:'MT',ending:'MT',ratio:'%'};
const state={section:'soy',product:'soy',origin:'us',campaigns:{},scenarios:{},comparison:{},historyMetric:'ending'};
try{state.scenarios=readBalanceScenarios(localStorage.getItem(localKey));}catch{}
const balanceId=()=>state.product+'-'+state.origin;
const currentBalance=()=>soyBalances[balanceId()];
const displayedBalance=()=>state.section==='palm'?palmWorldBalance:currentBalance();
const balanceTitle=balance=>balance.title??(balanceProducts[balance.product]+' · '+balanceOrigins[balance.origin]);
const rowLabel=(balance,key)=>balance.labels?.[key]??balanceRows[key];
const currentCampaign=()=>state.campaigns[balanceId()]||currentBalance().periods.at(-1)[0];
const currentScenario=()=>{
  const key=currentCampaign();
  const base=currentBalance().campaigns[key];
  return state.scenarios[balanceId()]?.[key]||{...base,reference:base.inputs};
};
const comparisonKey=()=>balanceId()+' '+currentCampaign();
function currentComparison(scenario=currentScenario()){
  const selected=state.comparison[comparisonKey()];
  return scenario.variants?.find(variant=>variant.name===selected)||{name:'Base de la campagne',inputs:scenario.reference};
}
function storeScenario(key,scenario){
  const id=balanceId();
  (state.scenarios[id]??={})[key]=scenario;
  try{localStorage.setItem(localKey,JSON.stringify(state.scenarios));return true;}catch{return false;}
}

function group(label,items,value,key){
  return '<div class="seg balance-controls" role="group" aria-label="'+escape(label)+'">'+Object.entries(items).map(([id,name])=>
    '<button type="button" data-balance-'+key+'="'+id+'" aria-pressed="'+(value===id)+'" class="'+(value===id?'active':'')+'">'+escape(name)+'</button>').join('')+'</div>';
}
function referenceTable(balance){
  const palm=balance.product==='palm';
  const latest=balance.periods.length-1;
  const formatCell=value=>escape(value.replace('.',',').replace(/^-/,'−'));
  const campaignHeaders=balance.periods.map(([key,label],i)=>'<th scope="col" class="'+(i===latest?'balance-latest':'')+'">'+
    (palm?escape(label):'<button type="button" data-balance-campaign="'+key+'" aria-label="Simuler la campagne '+escape(label)+'">'+escape(label)+'</button>')+'</th>').join('');
  const comparisonHeaders=balance.comparisons.map(label=>'<th scope="col">'+escape(label)+'</th>').join('');
  const rows=balance.fields.map(key=>{
    const parent=balance.parents?.[key];
    const total=palm?!parent:Object.hasOwn(units,key);
    return '<tr class="'+(total?'balance-total ':'')+(key==='ending'?'balance-stock':'')+(parent?'balance-subrow':'')+'"><th scope="row">'+
      (parent?'<span class="sr">'+escape(rowLabel(balance,parent))+' · </span>':'')+escape(rowLabel(balance,key))+'</th>'+
      balance.rows[key].map((value,i)=>{
        const isDelta=balance.comparisons[i-balance.periods.length]?.startsWith('Δ');
        const change=isDelta?parseFloat(value):null;
        const cell=palm&&key==='ratio'&&isDelta?value.replace('%',' pts'):value;
        return '<td class="num'+(i===latest?' balance-latest':'')+(isDelta?' balance-delta '+deltaClass(change):'')+'">'+(change>0?'+':'')+formatCell(cell)+'</td>';
      }).join('')+'</tr>';
  }).join('');
  const title=palm?'Bilan mondial de l’huile de palme':'Bilan de référence';
  const subtitle=palm?'Millions de tonnes (MT), sauf stocks / utilisation. F = prévision.':balanceTitle(balance)+' · MT, sauf stocks / utilisation';
  const source=palm?escape(balance.source)+'. Les valeurs et leurs arrondis sont repris du tableau.':'Tableaux fournis. Cliquez sur une campagne pour la simuler. Les écarts fournis sont reproduits avec leur précision d’origine.';
  return '<section class="panel balance-reference" aria-labelledby="balance-reference-title"><div class="balance-section-head"><div><h2 id="balance-reference-title">'+title+'</h2><p class="small">'+escape(subtitle)+'</p></div>'+
    '<button class="button ghost" type="button" data-balance-action="reference-csv">Exporter le bilan</button></div>'+
    '<div class="scroll balance-scroll" tabindex="0" role="region" aria-label="Tableau des campagnes et variations"><table class="table balance-table"><thead><tr><th scope="col">Indicateur</th>'+campaignHeaders+comparisonHeaders+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p class="small balance-source">Source · '+source+'</p></section>';
}

function exportReference(balance,csv){
  csv('olea_bilan_'+balance.product+'-'+balance.origin+'.csv',[[balanceTitle(balance),...balance.periods.map(([,label])=>label),...balance.comparisons],
    ...balance.fields.map(key=>{
      const parent=balance.parents?.[key];
      const label=(parent?rowLabel(balance,parent)+' · ':'')+rowLabel(balance,key);
      const values=balance.rows[key].map(value=>value.replace('.',','));
      if(balance.product==='palm'&&key==='ratio')values[values.length-1]=values.at(-1).replace('%',' pts');
      return [label,...values];
    })]);
}

function scenarioControls(balance,scenario){
  const selected=state.comparison[comparisonKey()];
  const options=(scenario.variants||[]).map(({name})=>'<option value="'+escape(name)+'"'+(name===selected?' selected':'')+'>'+escape(name)+'</option>').join('');
  const fields=balanceInputFields(balance.product).map(field=>'<option value="'+field+'"'+(field==='production'?' selected':'')+'>'+escape(balanceRows[field])+'</option>').join('');
  return '<div class="balance-tools">'+
    '<details class="balance-tool"><summary>Appliquer une variation</summary><form data-balance-shock class="balance-tool-form"><label>Poste<select name="field">'+fields+'</select></label><label>Variation<input name="change" inputmode="decimal" autocomplete="off" maxlength="18" placeholder="−0,50" required></label><label>Unité<select name="unit"><option value="MT">MT</option><option value="%">%</option></select></label><button type="submit" class="button primary" data-balance-requires-valid>Appliquer</button><p class="small" data-balance-error role="alert"></p></form><p class="small">La variation s’applique à la valeur saisie actuellement.</p></details>'+
    '<details class="balance-tool"'+(options?' open':'')+'><summary>Enregistrer et comparer les scénarios</summary><div class="balance-tool-form"><label>Comparer avec<select data-balance-compare><option value="">Base de la campagne</option>'+options+'</select></label>'+
    '<button class="button ghost" type="button" data-balance-action="load-variant"'+(selected?'':' hidden')+'>Charger</button><button class="button ghost" type="button" data-balance-action="remove-variant"'+(selected?'':' hidden')+'>Supprimer</button></div>'+
    '<form data-balance-save class="balance-tool-form"><label>Nom du scénario<input name="scenario" maxlength="60" autocomplete="off" placeholder="Ex. Exportations élevées" required></label><button class="button primary" type="submit" data-balance-requires-valid>Enregistrer</button><p class="small" data-balance-error role="alert"></p></form></details></div>';
}

function inputFields(title,keys,scenario){
  return '<fieldset class="balance-fields"><legend>'+title+'</legend>'+keys.map(key=>
    '<label for="balance-input-'+key+'">'+escape(balanceRows[key])+' <span class="balance-field-value"><input id="balance-input-'+key+'" type="text" inputmode="decimal" autocomplete="off" maxlength="18" data-balance-input="'+key+'" value="'+escape(String(scenario.inputs[key]).replace('.',','))+'" aria-describedby="balance-units"><span aria-hidden="true">MT</span></span></label>').join('')+'</fieldset>';
}
function simulator(balance){
  const scenario=currentScenario(),selected=currentCampaign();
  const available={...balance.campaigns,...state.scenarios[balanceId()]};
  const options=Object.entries(available).map(([id,{label}])=>'<option value="'+id+'"'+(selected===id?' selected':'')+'>'+escape(label)+(balance.campaigns[id]?'':' · personnelle')+'</option>').join('');
  const cards=Object.keys(units).map(key=>'<div class="balance-kpi'+(key==='ending'?' balance-kpi-main':'')+'"><span>'+escape(balanceRows[key])+'</span><strong class="num" data-balance-result="'+key+'"></strong><small data-balance-delta="'+key+'"></small></div>').join('');
  const consumption=balance.product==='soy'?'Semences et résiduel + exportations + trituration':'Biodiesel + H&I + exportations';
  return '<section class="panel balance-simulator" id="balance-simulator" aria-labelledby="balance-simulator-title"><div class="balance-section-head"><div><h2 id="balance-simulator-title" tabindex="-1">Simulateur de bilan</h2><p class="small" id="balance-units">Volumes en millions de tonnes (MT). Les stocks se recalculent à chaque modification.</p></div>'+
    '<div class="balance-campaign-actions"><label for="balance-campaign">Campagne</label><select id="balance-campaign" data-balance-select>'+options+'</select><button class="button ghost" type="button" data-balance-action="reset">Réinitialiser</button></div></div>'+
    '<p class="small balance-compare-label" data-balance-reference-name></p><div class="balance-kpis" aria-live="polite" aria-atomic="true">'+cards+'</div>'+
    '<div class="balance-field-grid">'+inputFields('Offre',supplyFields,scenario)+inputFields('Utilisation',useFields[balance.product],scenario)+'</div>'+
    '<p class="balance-status small" data-balance-status role="status"></p>'+
    '<div class="balance-actions"><button class="button primary" type="button" data-balance-action="open-add">Ajouter une campagne</button><button class="button ghost" type="button" data-balance-action="scenario-csv">Exporter le scénario</button></div>'+
    '<form class="balance-add-form" data-balance-add hidden><label for="balance-new-campaign">Nouvelle campagne</label><input id="balance-new-campaign" name="campaign" placeholder="2028/29" maxlength="9" required><button class="button primary" type="submit">Créer</button><button class="button ghost" type="button" data-balance-action="cancel-add">Annuler</button><p class="small" data-balance-add-error role="alert"></p></form>'+
    scenarioControls(balance,scenario)+'<div class="balance-impact"><h3>Impact des postes sur les stocks finaux</h3><div data-balance-impacts></div></div>'+
    '<details class="balance-method"><summary>Formules et données de départ</summary><dl><dt>Offre totale</dt><dd>Stocks initiaux + production + importations</dd><dt>Utilisation totale</dt><dd>'+consumption+'</dd><dt>Stocks finaux</dt><dd>Offre totale − utilisation totale</dd><dt>Stocks / utilisation</dt><dd>Stocks finaux ÷ utilisation totale</dd></dl><p class="small">Le simulateur part des postes du tableau. Les arrondis et écarts dans les valeurs fournies peuvent créer une différence avec le bilan de référence. Les scénarios sont enregistrés dans ce navigateur.</p></details></section>';
}

function history(balance,renderCharts){
  const detail=balance.product==='palm'?' · F = prévision':' · valeurs du bilan de référence';
  return '<section class="panel balance-history" aria-labelledby="balance-history-title"><div class="balance-section-head"><div><h2 id="balance-history-title">Évolution du bilan</h2><p class="small">'+escape(balanceTitle(balance)+detail)+'</p></div>'+
    '<label class="balance-history-picker">Indicateur de stock <select data-balance-history><option value="ending">Stocks finaux</option><option value="ratio"'+(state.historyMetric==='ratio'?' selected':'')+'>Stocks / utilisation</option></select></label></div>'+renderCharts(balance,state.historyMetric)+'</section>';
}

function content(renderCharts){
  const tabs='<div class="balance-tabs" role="group" aria-label="Familles de bilans">'+Object.entries(balanceSections).map(([id,{title,detail}])=>
    '<button type="button" data-balance-section="'+id+'" aria-pressed="'+(id===state.section)+'"><strong>'+escape(title)+'</strong><span>'+escape(detail)+'</span></button>').join('')+'</div>';
  if(state.section==='palm')return tabs+history(palmWorldBalance,renderCharts)+referenceTable(palmWorldBalance);
  if(state.section==='sun')return tabs+'<section class="panel balance-empty"><h2>'+escape(balanceSections[state.section].title)+'</h2><p>Les bilans seront disponibles après intégration des données de campagne.</p></section>';
  const balance=currentBalance();
  return tabs+'<div class="panel balance-selection"><div><span class="balance-control-label">Produit</span>'+group('Produit',balanceProducts,state.product,'product')+'</div><div><span class="balance-control-label">Origine</span>'+group('Origine',balanceOrigins,state.origin,'origin')+'</div></div>'+
    simulator(balance)+history(balance,renderCharts)+referenceTable(balance);
}

export const renderBalanceView=renderCharts=>'<div class="balance-view" data-balance-view>'+content(renderCharts)+'</div>';

function renderImpacts(product,inputs,reference){
  if(!inputs)return '<p class="small">Renseignez les volumes pour afficher les contributions.</p>';
  const impacts=balanceContributions(product,inputs,reference).filter(({value})=>Math.abs(value)>=.005);
  if(!impacts.length)return '<p class="small">Aucun effet visible sur les stocks à la précision de 0,01 MT.</p>';
  const max=Math.max(...impacts.map(({value})=>Math.abs(value)));
  return '<ul class="balance-impact-list">'+impacts.map(({field,value})=>{
    const width=Math.abs(value)/max*50;
    return '<li><span>'+escape(balanceRows[field])+'</span><div class="balance-impact-track" aria-hidden="true"><i class="'+deltaClass(value)+'" style="--bar-width:'+width+'%;--bar-start:'+(value>0?50:50-width)+'%"></i></div><strong class="num '+deltaClass(value)+'">'+format(value,'MT',true)+'</strong></li>';
  }).join('')+'</ul>';
}

function refreshResults(view,inputs,saved=true){
  const product=state.product;
  const result=calculateBalance(product,inputs);
  const comparison=currentComparison();
  const reference=calculateBalance(product,comparison.inputs);
  view.querySelector('[data-balance-reference-name]').textContent='Comparaison · '+comparison.name;
  for(const [key,unit] of Object.entries(units)){
    const value=result?.[key];
    const delta=Number.isFinite(value)&&Number.isFinite(reference[key])?value-reference[key]:null;
    const output=view.querySelector('[data-balance-result="'+key+'"]');
    output.textContent=format(value,unit);
    output.classList.toggle('negative',key==='ending'&&value<0);
    const label=view.querySelector('[data-balance-delta="'+key+'"]');
    label.textContent=delta===null?'':format(delta,key==='ratio'?'pt':'MT',true);
    label.className='balance-delta '+deltaClass(delta===null||Math.abs(delta)<.005?0:delta);
    if(delta!==null)label.title='Comparaison · '+format(reference[key],unit);
  }
  view.querySelector('[data-balance-impacts]').innerHTML=renderImpacts(product,result?inputs:null,comparison.inputs);
  const status=view.querySelector('[data-balance-status]');
  status.textContent=!result?'Saisissez un volume positif ou nul dans chaque champ.':result.ending<0?'Stocks finaux négatifs · l’utilisation dépasse l’offre disponible.':result.use===0?'Ratio indisponible lorsque l’utilisation totale est nulle.':!saved?'Le navigateur a bloqué l’enregistrement local. Le scénario reste disponible sur cette page.':'';
  status.classList.toggle('negative',!result||result.ending<0);
  view.querySelectorAll('[data-balance-action="open-add"], [data-balance-action="scenario-csv"], [data-balance-requires-valid]').forEach(button=>{button.disabled=!result;});
}

export function bindBalanceView(root,{csv,renderCharts,bindCharts}){
  const view=root.querySelector('[data-balance-view]');
  if(!view)return;
  function refresh(focusSelector){
    view.innerHTML=content(renderCharts);
    bindCharts(view);
    if(state.section==='soy')refreshResults(view,currentScenario().inputs);
    if(focusSelector)view.querySelector(focusSelector)?.focus({preventScroll:true});
  }
  function fieldValues(){
    return Object.fromEntries([...view.querySelectorAll('[data-balance-input]')].map(field=>[field.dataset.balanceInput,parseBalanceVolume(field.value)]));
  }
  function applyInputs(inputs){
    const saved=storeScenario(currentCampaign(),{...currentScenario(),inputs});
    for(const field of view.querySelectorAll('[data-balance-input]')){
      field.value=String(inputs[field.dataset.balanceInput]).replace('.',',');
      field.removeAttribute('aria-invalid');
    }
    refreshResults(view,inputs,saved);
  }
  if(state.section==='soy')refreshResults(view,currentScenario().inputs);
  view.addEventListener('input',event=>{
    if(!event.target.hasAttribute('data-balance-input'))return;
    const inputs=fieldValues();
    for(const field of view.querySelectorAll('[data-balance-input]')){
      field.setAttribute('aria-invalid',String(inputs[field.dataset.balanceInput]===null));
    }
    const valid=calculateBalance(state.product,inputs);
    const saved=valid?storeScenario(currentCampaign(),{...currentScenario(),inputs}):true;
    refreshResults(view,inputs,saved);
  });
  view.addEventListener('change',event=>{
    const target=event.target;
    if(target.hasAttribute('data-balance-select')){
      state.campaigns[balanceId()]=target.value;
      refresh('[data-balance-select]');
    }else if(target.hasAttribute('data-balance-compare')){
      state.comparison[comparisonKey()]=target.value;
      view.querySelectorAll('[data-balance-action="load-variant"], [data-balance-action="remove-variant"]').forEach(button=>{button.hidden=!target.value;});
      refreshResults(view,fieldValues());
    }else if(target.hasAttribute('data-balance-history')){
      state.historyMetric=target.value;
      const charts=view.querySelector('.balance-history-charts');
      charts.outerHTML=renderCharts(displayedBalance(),state.historyMetric);
      bindCharts(view.querySelector('.balance-history-charts'));
    }
  });
  view.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    for(const key of ['section','product','origin']){
      const value=button.getAttribute('data-balance-'+key);
      if(value){state[key]=value;refresh('[data-balance-'+key+'="'+value+'"]');return;}
    }
    if(button.dataset.balanceCampaign){
      state.campaigns[balanceId()]=button.dataset.balanceCampaign;
      refresh();
      view.querySelector('#balance-simulator-title').focus();
      return;
    }
    const action=button.dataset.balanceAction;
    if(!action)return;
    if(action==='reference-csv'){exportReference(displayedBalance(),csv);return;}
    const balance=currentBalance(),scenario=currentScenario();
    const form=view.querySelector('[data-balance-add]');
    if(action==='reset'){
      applyInputs(scenario.reference);
    }else if(action==='load-variant'){
      applyInputs(currentComparison(scenario).inputs);
    }else if(action==='remove-variant'){
      const name=state.comparison[comparisonKey()];
      const saved=storeScenario(currentCampaign(),{...scenario,variants:scenario.variants.filter(variant=>variant.name!==name)});
      delete state.comparison[comparisonKey()];
      refresh('[data-balance-compare]');
      if(!saved)refreshResults(view,scenario.inputs,false);
    }else if(action==='open-add'){
      form.hidden=false;
      form.elements.campaign.focus();
    }else if(action==='cancel-add'){
      form.reset();form.hidden=true;form.querySelector('[data-balance-add-error]').textContent='';
      view.querySelector('[data-balance-action="open-add"]').focus();
    }else if(action==='scenario-csv'){
      const values={...scenario.inputs,...calculateBalance(balance.product,scenario.inputs)};
      const comparison=currentComparison(scenario);
      const reference={...comparison.inputs,...calculateBalance(balance.product,comparison.inputs)};
      const cell=value=>value===null?'':String(Number(value.toFixed(8))).replace('.',',');
      csv('olea_scenario_'+balanceId()+'_'+currentCampaign().replace('/','-')+'.csv',[[balanceProducts[balance.product]+' · '+balanceOrigins[balance.origin],scenario.label,'Unité',comparison.name,'Écart (MT ou points)'],
        ...balance.fields.map(key=>[balanceRows[key],cell(values[key]),units[key]||'MT',cell(reference[key]),cell(values[key]===null||reference[key]===null?null:values[key]-reference[key])])]);
    }
  });
  view.addEventListener('submit',event=>{
    const form=event.target;
    if(!form.matches('[data-balance-add], [data-balance-shock], [data-balance-save]'))return;
    event.preventDefault();
    if(form.matches('[data-balance-shock]')){
      const error=form.querySelector('[data-balance-error]');
      const {field,change,unit}=form.elements;
      const inputs=applyBalanceShock(state.product,fieldValues(),field.value,change.value,unit.value);
      if(!inputs){error.textContent='Saisissez une variation qui conserve un volume valide et positif ou nul.';return;}
      error.textContent='';
      change.value='';
      applyInputs(inputs);
      return;
    }
    if(form.matches('[data-balance-save]')){
      const name=scenarioName(form.elements.scenario.value);
      const scenario=currentScenario(),variants=scenario.variants||[];
      const error=form.querySelector('[data-balance-error]');
      if(!name){error.textContent='Saisissez un nom pour le scénario.';return;}
      if(variants.some(variant=>variant.name.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr'))){error.textContent='Un scénario porte déjà ce nom.';return;}
      const saved=storeScenario(currentCampaign(),{...scenario,variants:[...variants,{name,inputs:scenario.inputs}]});
      refresh('[data-balance-compare]');
      if(!saved)refreshResults(view,scenario.inputs,false);
      return;
    }
    const label=normalizeCampaignLabel(form.elements.campaign.value);
    const error=form.querySelector('[data-balance-add-error]');
    const duplicate=label&&[...Object.keys(currentBalance().campaigns),...Object.keys(state.scenarios[balanceId()]||{})].some(key=>key.slice(0,7)===label);
    if(!label||duplicate){error.textContent=duplicate?'Cette campagne existe déjà.':'Saisissez deux années consécutives, par exemple 2028/29.';return;}
    if(view.querySelector('[data-balance-input][aria-invalid="true"]')){error.textContent='Corrigez les volumes avant de créer la campagne.';return;}
    const {inputs}=currentScenario();
    const saved=storeScenario(label,{label,inputs,reference:inputs});
    state.campaigns[balanceId()]=label;
    refresh('[data-balance-select]');
    if(!saved)refreshResults(view,inputs,false);
  });
}
