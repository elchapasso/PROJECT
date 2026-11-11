import {balanceSections,balanceProducts,balanceOrigins,balanceRows,soyBalances,supplyFields,useFields} from './balance-data.mjs?v=20261111';
import {balanceInputFields,calculateBalance,normalizeCampaignLabel,parseBalanceVolume,readBalanceScenarios} from './balance-model.mjs?v=20261111';

const localKey='olea-balance-scenarios-v1';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const volume=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
const signedVolume=new Intl.NumberFormat('fr-FR',{signDisplay:'exceptZero',minimumFractionDigits:2,maximumFractionDigits:2});
const format=(value,unit='MT',signed=false)=>Number.isFinite(value)?(signed?signedVolume:volume).format(Math.abs(value)<.005?0:value)+' '+unit:'—';
const units={supply:'MT',use:'MT',ending:'MT',ratio:'%'};
const state={section:'soy',product:'soy',origin:'us',campaigns:{},scenarios:{}};
try{state.scenarios=readBalanceScenarios(localStorage.getItem(localKey));}catch{}
const balanceId=()=>state.product+'-'+state.origin;
const currentBalance=()=>soyBalances[balanceId()];
const currentCampaign=()=>state.campaigns[balanceId()]||currentBalance().periods.at(-1)[0];
const currentScenario=()=>{
  const key=currentCampaign();
  const base=currentBalance().campaigns[key];
  return state.scenarios[balanceId()]?.[key]||{...base,reference:base.inputs};
};
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
  const latest=balance.periods.length-1;
  const formatCell=value=>escape(value.replace('.',',').replace(/^-/,'−'));
  const campaignHeaders=balance.periods.map(([key,label],i)=>'<th scope="col" class="'+(i===latest?'balance-latest':'')+'"><button type="button" data-balance-campaign="'+key+'" aria-label="Simuler la campagne '+escape(label)+'">'+escape(label)+'</button></th>').join('');
  const comparisonHeaders=balance.comparisons.map(label=>'<th scope="col">'+escape(label)+'</th>').join('');
  const rows=balance.fields.map(key=>{
    const derived=Object.hasOwn(units,key);
    return '<tr class="'+(derived?'balance-total ':'')+(key==='ending'?'balance-stock':'')+'"><th scope="row">'+escape(balanceRows[key])+'</th>'+
      balance.rows[key].map((value,i)=>'<td class="num'+(i===latest?' balance-latest':'')+'">'+formatCell(value)+'</td>').join('')+'</tr>';
  }).join('');
  return '<section class="panel balance-reference" aria-labelledby="balance-reference-title"><div class="balance-section-head"><div><h2 id="balance-reference-title">Bilan de référence</h2><p class="small">'+escape(balanceProducts[balance.product]+' · '+balanceOrigins[balance.origin])+' · MT, sauf stocks / utilisation</p></div>'+
    '<button class="button ghost" type="button" data-balance-action="reference-csv">Exporter le bilan</button></div>'+
    '<div class="scroll balance-scroll" tabindex="0" role="region" aria-label="Tableau des campagnes et variations"><table class="table balance-table"><thead><tr><th scope="col">Indicateur</th>'+campaignHeaders+comparisonHeaders+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p class="small balance-source">Source · Tableaux fournis. Cliquez sur une campagne pour la simuler. Les écarts fournis sont reproduits avec leur précision d’origine.</p></section>';
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
    '<div class="balance-kpis" aria-live="polite" aria-atomic="true">'+cards+'</div>'+
    '<div class="balance-field-grid">'+inputFields('Offre',supplyFields,scenario)+inputFields('Utilisation',useFields[balance.product],scenario)+'</div>'+
    '<p class="balance-status small" data-balance-status role="status"></p>'+
    '<div class="balance-actions"><button class="button primary" type="button" data-balance-action="open-add">Ajouter une campagne</button><button class="button ghost" type="button" data-balance-action="scenario-csv">Exporter le scénario</button></div>'+
    '<form class="balance-add-form" data-balance-add hidden><label for="balance-new-campaign">Nouvelle campagne</label><input id="balance-new-campaign" name="campaign" placeholder="2028/29" maxlength="9" required><button class="button primary" type="submit">Créer</button><button class="button ghost" type="button" data-balance-action="cancel-add">Annuler</button><p class="small" data-balance-add-error role="alert"></p></form>'+
    '<details class="balance-method"><summary>Formules et données de départ</summary><dl><dt>Offre totale</dt><dd>Stocks initiaux + production + importations</dd><dt>Utilisation totale</dt><dd>'+consumption+'</dd><dt>Stocks finaux</dt><dd>Offre totale − utilisation totale</dd><dt>Stocks / utilisation</dt><dd>Stocks finaux ÷ utilisation totale</dd></dl><p class="small">Le simulateur part des postes du tableau. Les arrondis et écarts dans les valeurs fournies peuvent créer une différence avec le bilan de référence. Les scénarios sont enregistrés dans ce navigateur.</p></details></section>';
}

function content(){
  const tabs='<div class="balance-tabs" role="group" aria-label="Familles de bilans">'+Object.entries(balanceSections).map(([id,{title,detail}])=>
    '<button type="button" data-balance-section="'+id+'" aria-pressed="'+(id===state.section)+'"><strong>'+escape(title)+'</strong><span>'+escape(detail)+'</span></button>').join('')+'</div>';
  if(state.section!=='soy')return tabs+'<section class="panel balance-empty"><h2>'+escape(balanceSections[state.section].title)+'</h2><p>Les bilans seront disponibles après intégration des données de campagne.</p></section>';
  const balance=currentBalance();
  return tabs+'<div class="panel balance-selection"><div><span class="balance-control-label">Produit</span>'+group('Produit',balanceProducts,state.product,'product')+'</div><div><span class="balance-control-label">Origine</span>'+group('Origine',balanceOrigins,state.origin,'origin')+'</div></div>'+
    simulator(balance)+referenceTable(balance);
}

export const renderBalanceView=()=>'<div class="balance-view" data-balance-view>'+content()+'</div>';

function refreshResults(view,inputs,saved=true){
  const product=state.product;
  const result=calculateBalance(product,inputs);
  const reference=calculateBalance(product,currentScenario().reference);
  for(const [key,unit] of Object.entries(units)){
    const value=result?.[key];
    const delta=Number.isFinite(value)&&Number.isFinite(reference[key])?value-reference[key]:null;
    const output=view.querySelector('[data-balance-result="'+key+'"]');
    output.textContent=format(value,unit);
    output.classList.toggle('negative',key==='ending'&&value<0);
    view.querySelector('[data-balance-delta="'+key+'"]').textContent=delta===null?'':format(delta,key==='ratio'?'pt':'MT',true)+' vs base';
  }
  const status=view.querySelector('[data-balance-status]');
  status.textContent=!result?'Saisissez un volume positif ou nul dans chaque champ.':result.ending<0?'Stocks finaux négatifs · l’utilisation dépasse l’offre disponible.':result.use===0?'Ratio indisponible lorsque l’utilisation totale est nulle.':!saved?'Le navigateur a bloqué l’enregistrement local. Le scénario reste disponible sur cette page.':'';
  status.classList.toggle('negative',!result||result.ending<0);
  view.querySelectorAll('[data-balance-action="open-add"], [data-balance-action="scenario-csv"]').forEach(button=>{button.disabled=!result;});
}

export function bindBalanceView(root,csv){
  const view=root.querySelector('[data-balance-view]');
  if(!view)return;
  function refresh(focusSelector){
    view.innerHTML=content();
    if(state.section==='soy')refreshResults(view,currentScenario().inputs);
    if(focusSelector)view.querySelector(focusSelector)?.focus({preventScroll:true});
  }
  if(state.section==='soy')refreshResults(view,currentScenario().inputs);
  view.addEventListener('input',event=>{
    if(!event.target.hasAttribute('data-balance-input'))return;
    const inputs={};
    for(const field of view.querySelectorAll('[data-balance-input]')){
      const value=parseBalanceVolume(field.value);
      field.setAttribute('aria-invalid',String(value===null));
      inputs[field.dataset.balanceInput]=value;
    }
    const valid=calculateBalance(state.product,inputs);
    const saved=valid?storeScenario(currentCampaign(),{...currentScenario(),inputs}):true;
    refreshResults(view,inputs,saved);
  });
  view.addEventListener('change',event=>{
    if(!event.target.hasAttribute('data-balance-select'))return;
    state.campaigns[balanceId()]=event.target.value;
    refresh('[data-balance-select]');
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
    const balance=currentBalance(),scenario=currentScenario();
    const form=view.querySelector('[data-balance-add]');
    if(action==='reset'){
      storeScenario(currentCampaign(),{...scenario,inputs:scenario.reference});
      refresh('[data-balance-action="reset"]');
    }else if(action==='open-add'){
      form.hidden=false;
      form.elements.campaign.focus();
    }else if(action==='cancel-add'){
      form.reset();form.hidden=true;form.querySelector('[data-balance-add-error]').textContent='';
      view.querySelector('[data-balance-action="open-add"]').focus();
    }else if(action==='reference-csv'){
      csv('olea_bilan_'+balanceId()+'.csv',[[balanceProducts[balance.product]+' · '+balanceOrigins[balance.origin],...balance.periods.map(([,label])=>label),...balance.comparisons],
        ...balance.fields.map(key=>[balanceRows[key],...balance.rows[key].map(value=>value.replace('.',','))])]);
    }else if(action==='scenario-csv'){
      const values={...scenario.inputs,...calculateBalance(balance.product,scenario.inputs)};
      csv('olea_scenario_'+balanceId()+'_'+currentCampaign().replace('/','-')+'.csv',[[balanceProducts[balance.product]+' · '+balanceOrigins[balance.origin],scenario.label,'Unité'],
        ...balance.fields.map(key=>[balanceRows[key],values[key]===null?'':String(Number(values[key].toFixed(8))).replace('.',','),units[key]||'MT'])]);
    }
  });
  view.addEventListener('submit',event=>{
    if(!event.target.matches('[data-balance-add]'))return;
    event.preventDefault();
    const form=event.target;
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
