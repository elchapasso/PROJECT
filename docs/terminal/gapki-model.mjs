// Indonésie · bilans GAPKI : format du flux, contrôles et choix du flux le plus récent.
// Partagé par le site (docs/terminal/app.js), le script de publication (scripts/update-gapki.mjs) et les tests.
// Unité : milliers de tonnes (ribu ton), comme dans les communiqués GAPKI. null = chiffre non publié.

export const gapkiMonthFields=['cpo','pko','food','oleo','biodiesel','consumption','exports','stock'];
export const gapkiFlowFields=['cpo','pko','food','oleo','biodiesel','consumption','exports'];
export const gapkiLabels={cpo:'Production CPO',pko:'Production PKO',production:'Production CPO + PKO',food:'Consommation alimentaire',
  oleo:'Oléochimie',biodiesel:'Biodiesel',consumption:'Consommation intérieure',exports:'Exportations',stock:'Stocks fin de mois'};
// Bornes de vraisemblance mensuelles (kt) : une valeur hors bornes est presque toujours une faute de recopie.
const monthRanges={cpo:[2500,7000],pko:[200,700],food:[400,1500],oleo:[80,400],biodiesel:[400,2500],consumption:[1200,3600],exports:[800,5200],stock:[800,6000]};
const annualRanges={cpo:[40000,70000],pko:[3500,7000],food:[6000,15000],oleo:[1500,4000],biodiesel:[8000,25000],consumption:[18000,36000],exports:[20000,40000],stock:[800,6000]};
const outlookRanges={production:[45000,80000],consumption:[18000,40000],biodiesel:[8000,30000],food:[6000,15000],oleo:[1500,4000],exports:[18000,42000],stock:[800,6000]};

const monthRe=/^\d{4}-(0[1-9]|1[0-2])$/;
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
const isoRe=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;
const gapkiUrl=u=>typeof u==='string'&&/^https:\/\/gapki\.id\//.test(u);
const nextMonth=m=>{const [y,mo]=m.split('-').map(Number);return mo===12?(y+1)+'-01':y+'-'+String(mo+1).padStart(2,'0');};
const finite=v=>Number.isFinite(v);

export const gapkiProduction=r=>finite(r?.cpo)&&finite(r?.pko)?r.cpo+r.pko:null;
export const gapkiRows=feed=>(feed?.months??[]).map(r=>({...r,date:r.month,production:gapkiProduction(r)}));
// Le mois a un bilan complet de flux (les stocks peuvent manquer).
export const gapkiPublished=r=>gapkiFlowFields.every(k=>finite(r[k]));

// Écart à l'équation des stocks : stock − (stock précédent + production − consommation − exportations).
// Il vaut à peu près les importations (quelques kt) ; un écart important signale une valeur mal recopiée.
export function gapkiStockResiduals(months){
  const out=[];
  for(let i=1;i<months.length;i++){
    const prev=months[i-1],r=months[i];
    if(!finite(prev.stock)||!finite(r.stock)||!gapkiPublished(r))continue;
    out.push({month:r.month,residual:r.stock-(prev.stock+r.cpo+r.pko-r.consumption-r.exports)});
  }
  return out;
}

// Mois d'une année sans bilan mensuel : cumul = bilan annuel − mois publiés.
export function gapkiMissingMonths(feed,year){
  const annual=(feed?.annual??[]).find(a=>a.year===year);
  const months=(feed?.months??[]).filter(r=>r.month.startsWith(String(year)));
  const gaps=months.filter(r=>!gapkiPublished(r)).map(r=>r.month);
  if(!annual||months.length!==12||!gaps.length)return null;
  const rest=key=>annual[key]-months.reduce((sum,r)=>sum+(finite(r[key])?r[key]:0),0);
  return {year,months:gaps,cpo:rest('cpo'),pko:rest('pko'),production:rest('cpo')+rest('pko'),food:rest('food'),oleo:rest('oleo'),
    biodiesel:rest('biodiesel'),consumption:rest('consumption'),exports:rest('exports'),stock:annual.stock,source:annual.source};
}

// Cumul de l'année en cours (mois publiés) et rythme implicite pour atteindre l'estimation GAPKI de l'année.
export function gapkiYearToDate(feed,year){
  const months=(feed?.months??[]).filter(r=>r.month.startsWith(String(year))&&gapkiPublished(r));
  if(!months.length)return null;
  const sum=key=>months.reduce((s,r)=>s+r[key],0);
  const last=months.at(-1);
  const ytd={year,from:months[0].month,to:last.month,count:months.length,production:sum('cpo')+sum('pko'),cpo:sum('cpo'),pko:sum('pko'),food:sum('food'),
    oleo:sum('oleo'),biodiesel:sum('biodiesel'),consumption:sum('consumption'),exports:sum('exports'),stock:(feed.months.find(r=>r.month===last.month)?.stock)??null};
  const outlook=(feed?.outlook??[]).find(o=>o.year===year);
  const remaining=12-Number(last.month.slice(5));
  if(outlook&&remaining>0)ytd.implied={remaining,outlook,
    production:finite(outlook.production)?(outlook.production-ytd.production)/remaining:null,
    consumption:finite(outlook.consumption)?(outlook.consumption-ytd.consumption)/remaining:null,
    biodiesel:finite(outlook.biodiesel)?(outlook.biodiesel-ytd.biodiesel)/remaining:null,
    exports:finite(outlook.exports)?(outlook.exports-ytd.exports)/remaining:null};
  return ytd;
}

const checkNumber=(errors,where,key,value,range,{nullable=true}={})=>{
  if(value===null||value===undefined){if(!nullable)errors.push(where+' · '+key+' manquant');return null;}
  if(!Number.isInteger(value)||value<0){errors.push(where+' · '+key+' doit être un entier positif en kt (reçu '+JSON.stringify(value)+')');return null;}
  if(range&&(value<range[0]||value>range[1]))errors.push(where+' · '+key+' = '+value+' kt hors des bornes '+range[0]+'–'+range[1]+' : vérifier l’unité et la recopie');
  return value;
};

// Contrôle complet. today = date du jour AAAA-MM-JJ (Casablanca). Retourne le flux normalisé, les erreurs et les avertissements.
export function validateGapkiFeed(input,{today}={}){
  const errors=[],warnings=[];
  if(!input||typeof input!=='object')return {feed:null,errors:['Flux GAPKI illisible'],warnings};
  const currentMonth=(today??new Date().toISOString().slice(0,10)).slice(0,7);
  const months=Array.isArray(input.months)?input.months.map(r=>({...r})):[];
  if(!months.length)errors.push('months : aucun mois');
  months.sort((a,b)=>String(a.month).localeCompare(String(b.month)));
  months.forEach((r,i)=>{
    const where=String(r.month);
    if(!monthRe.test(r.month??''))errors.push(where+' · mois au format AAAA-MM attendu');
    else if(r.month>=currentMonth)errors.push(where+' · mois non terminé ou futur');
    if(i>0&&monthRe.test(months[i-1].month??'')&&r.month!==nextMonth(months[i-1].month))
      errors.push(where+' · mois manquant ou en double après '+months[i-1].month+' (laisser un mois non publié avec des null)');
    for(const key of gapkiMonthFields)checkNumber(errors,where,key,r[key],monthRanges[key]);
    for(const key of Object.keys(r))if(!['month','source',...gapkiMonthFields].includes(key))errors.push(where+' · champ inconnu '+key);
    if(!gapkiUrl(r.source))errors.push(where+' · source : lien https://gapki.id/… attendu');
    const parts=['food','oleo','biodiesel'];
    if(finite(r.consumption)&&parts.every(k=>finite(r[k]))){
      const gap=Math.abs(r.food+r.oleo+r.biodiesel-r.consumption);
      if(gap>8)errors.push(where+' · alimentaire + oléochimie + biodiesel = '+(r.food+r.oleo+r.biodiesel)+' kt ≠ consommation '+r.consumption+' kt');
      else if(gap>3)warnings.push(where+' · somme des usages et consommation totale diffèrent de '+gap+' kt');
    }
    const flows=gapkiFlowFields.filter(k=>finite(r[k])).length;
    if(flows&&flows<gapkiFlowFields.length)warnings.push(where+' · bilan partiel ('+flows+' flux sur '+gapkiFlowFields.length+')');
  });
  if(months.length&&months[0].month>'2024-01')errors.push('months : l’historique doit commencer en janvier 2024');
  for(const {month,residual} of gapkiStockResiduals(months)){
    if(residual<-60||residual>150)errors.push(month+' · l’équation des stocks ne boucle pas (écart '+residual+' kt) : vérifier stock, production, consommation et exportations');
    else if(residual<-10||residual>40)warnings.push(month+' · écart de '+residual+' kt sur l’équation des stocks (importations ou révision)');
  }

  const release=input.release&&typeof input.release==='object'?{...input.release}:null;
  const lastPublished=months.filter(r=>gapkiPublished(r)).at(-1);
  if(!release)errors.push('release manquant');
  else{
    if(!lastPublished||release.period!==lastPublished.month)errors.push('release.period doit être le dernier mois publié ('+(lastPublished?.month??'aucun')+')');
    if(lastPublished&&lastPublished.month!==months.at(-1)?.month)errors.push('le dernier mois du flux doit être publié ('+months.at(-1)?.month+')');
    if(!dateRe.test(release.published??''))errors.push('release.published au format AAAA-MM-JJ attendu');
    else{
      if(monthRe.test(release.period??'')&&release.published<nextMonth(release.period)+'-01')errors.push('release.published antérieur à la fin du mois publié');
      if(today&&release.published>today)errors.push('release.published dans le futur');
    }
    if(!gapkiUrl(release.url))errors.push('release.url : lien https://gapki.id/… attendu');
  }

  const annual=Array.isArray(input.annual)?input.annual.map(a=>({...a})).sort((a,b)=>a.year-b.year):[];
  for(const a of annual){
    const where='bilan '+a.year;
    if(!Number.isInteger(a.year))errors.push(where+' · année invalide');
    for(const key of gapkiMonthFields)checkNumber(errors,where,key,a[key],annualRanges[key],{nullable:false});
    if(!gapkiUrl(a.source))errors.push(where+' · source : lien https://gapki.id/… attendu');
    const year=months.filter(r=>r.month.startsWith(String(a.year)));
    if(year.length===12&&year.every(gapkiPublished)){
      for(const key of gapkiFlowFields){
        const diff=year.reduce((s,r)=>s+r[key],0)-a[key];
        if(Math.abs(diff)>40)errors.push(where+' · cumul mensuel '+key+' différent du bilan annuel de '+diff+' kt');
        else if(Math.abs(diff)>15)warnings.push(where+' · cumul mensuel '+key+' différent du bilan annuel de '+diff+' kt');
      }
    }
    const dec=months.find(r=>r.month===a.year+'-12');
    if(dec&&finite(dec.stock)&&finite(a.stock)&&dec.stock!==a.stock)errors.push(where+' · stock de fin d’année '+a.stock+' ≠ stock de décembre '+dec.stock);
    const gap=gapkiMissingMonths({months,annual},a.year);
    if(gap)for(const key of gapkiFlowFields){
      const perMonth=gap[key]/gap.months.length,range=monthRanges[key];
      if(perMonth<range[0]||perMonth>range[1])errors.push(where+' · cumul des mois non publiés incohérent pour '+key+' ('+gap[key]+' kt sur '+gap.months.length+' mois)');
    }
  }

  const outlook=Array.isArray(input.outlook)?input.outlook.map(o=>({...o})).sort((a,b)=>a.year-b.year):[];
  for(const o of outlook){
    const where='perspective '+o.year;
    if(!Number.isInteger(o.year))errors.push(where+' · année invalide');
    if(!['estimate','projection'].includes(o.kind))errors.push(where+' · kind = estimate ou projection');
    if(!dateRe.test(o.published??''))errors.push(where+' · published au format AAAA-MM-JJ attendu');
    else if(today&&o.published>today)errors.push(where+' · published dans le futur');
    if(!gapkiUrl(o.source))errors.push(where+' · source : lien https://gapki.id/… attendu');
    if(typeof o.event!=='string'||!o.event.trim())errors.push(where+' · event : nom de la publication attendu (ex. IPOC 2026)');
    for(const key of Object.keys(outlookRanges))checkNumber(errors,where,key,o[key],outlookRanges[key]);
    if(!finite(o.production)&&!finite(o.exports)&&!finite(o.consumption))errors.push(where+' · aucun chiffre');
    if(annual.some(a=>a.year===o.year))warnings.push(where+' · le bilan annuel réalisé existe : retirer la perspective');
  }

  for(const key of ['updatedAt','checkedAt'])if(!isoRe.test(input[key]??''))errors.push(key+' : horodatage ISO UTC attendu (AAAA-MM-JJTHH:MM:SSZ)');
  if(input.unit!=='kt')errors.push('unit doit valoir "kt"');
  const feed={updatedAt:input.updatedAt,checkedAt:input.checkedAt,unit:'kt',release,
    months:months.map(r=>Object.fromEntries(['month',...gapkiMonthFields,'source'].map(k=>[k,r[k]??null]))),annual,outlook};
  return {feed,errors,warnings};
}

// Le flux le plus avancé l'emporte : dernier mois publié, puis date du communiqué, puis dernière modification.
export function gapkiFeedRank(feed){
  return [feed?.release?.period??'',feed?.release?.published??'',feed?.updatedAt??''].join('|');
}
export const newerGapkiFeed=(a,b)=>!a?b:!b?a:gapkiFeedRank(b)>gapkiFeedRank(a)?b:a;
