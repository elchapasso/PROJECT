import {
  reviewedOn, sources, historicalGallons, adoptedBbdMandates, netD4, soyByFacility, palmMonthly,
  palmForecast, indonesiaDeliveries, initialAllocation2026, substituteSeries, bankEstimates,
} from './biofuel-policy-data.mjs?v=20261114-biofuel-observations-v2';
import {
  MILLION_LB_TO_MT, monthlyHipGap, cumulativeNetRins,
} from './biofuel-policy-model.mjs?v=20261114-biofuel-observations-v2';

const value = n => Number.isFinite(n) ? n : '';
const graphLine = (label, color, points) => ({label, color:'var(--series-' + color + ')', points});
const point = ([date, value]) => ({date, value});
const sourceList = refs => refs.map(ref => typeof ref === 'string' ? sources[ref] : ref);
const seriesValues = years => Object.entries(years).flatMap(([year, numbers]) =>
  numbers.map((value, index) => [year + '-' + String(index + 1).padStart(2, '0'), value]));

function chartCard(ui, id, title, caption, data, config, headings, rows, refs, reading) {
  const {section, panel, chart, table, e} = ui;
  const monthly = config.periodType !== 'year';
  const controls = {optionsOpen:true, quickRanges:true, movingAverage:monthly};
  return section(title, caption) + panel(
    chart(data, {height:220, label:title, sourceLinks:sourceList(refs), ...controls, ...config}) +
    '<div class="bio-reading"><strong>Comment lire ce graphique</strong><p>'+e(reading)+'</p></div>' +
    '<details class="bio-values"><summary>Voir les valeurs</summary>' +
    table(headings, rows.map(row => row.map(cell => e(cell)))) + '</details>' +
    '<button type="button" class="button ghost bio-csv" aria-label="'+e('Exporter le CSV · '+title)+'" data-bio-series="' + id + '">Exporter CSV</button>',
    'bio-chart-card');
}

function methodology(title, formula, explanation, refs, ui) {
  return '<details class="bio-method" open><summary>' + title + '</summary><p class="bio-formula">' +
    ui.e(formula) + '</p><p class="small">' + ui.e(explanation) + '</p>' + ui.chartSources(sourceList(refs)) + '</details>';
}

function kpis(ui, items) {
  return '<div class="bio-kpis">' + items.map(([label, number, detail]) =>
    '<div class="bio-kpi"><span>' + ui.e(label) + '</span><strong>' + ui.e(number) + '</strong>' +
    '<span>' + ui.e(detail) + '</span></div>').join('') + '</div>';
}

function regulation(ui, register) {
  const {num} = ui;
  const annual = historicalGallons.map(([year, gallons]) => [String(year), gallons]);
  const hisRows = historicalGallons.map(([year, gallons]) => [year, gallons, sources.epaHistory[1]]);
  register('epa-historique', ['Année', 'Milliards de gallons de biodiesel', 'Source'], hisRows);
  const mandates = adoptedBbdMandates.map(([year, millionRins]) =>
    ['Obligation BBD ' + year, num(millionRins / 1000, 2) + ' Md RIN', 'Règle en vigueur · EPA']);
  return kpis(ui, mandates) + ui.chartSources(sourceList(['epaFinal'])) +
    chartCard(ui, 'epa-historique', 'Mandats historiques EPA · 2010–2025',
      'Gallons de biodiesel indiqués par l’EPA · la règle 2026–2027 est exprimée en RIN',
      [graphLine('Mandat BBD', 1, annual.map(point))], {unit:'Md gal', periodType:'year', defaultScale:'zero'},
      ['Année','Md gal'], annual.map(([year, gallons]) => [year, num(gallons, 2)]), ['epaHistory'],
      'Chaque point indique l’obligation annuelle fixée pour le biodiesel à base de biomasse. Jusqu’en 2025, l’EPA la publiait en gallons de biodiesel. Pour comparer 2025 et 2026 dans une même unité, il faut expliciter le facteur RIN par gallon du carburant retenu.');
}

function usObservations(ui, totalSoy, canola, register) {
  const {num} = ui;
  const rins = cumulativeNetRins();
  const quotes = rins.map(({date, value, total}) => [date, value, total, sources.farmdoc[1], sources.epaGeneration[1]]);
  register('d4-generation', ['Mois','Génération nette (M RIN)','Cumul (M RIN)','Source série','Source primaire'], quotes);
  const dates = rins.map(({date}) => date);
  const net = chartCard(ui, 'd4-generation', 'D4 · Génération nette mensuelle', 'Janvier à septembre 2026 · série farmdoc issue de l’EPA, arrondie au million',
    [graphLine('Génération nette',1,netD4.map(point))], {unit:'M RIN', defaultScale:'zero'}, ['Mois','M RIN','Cumul M RIN'],
    rins.map(({date,value,total}) => [date,num(value,0),num(total,0)]), ['farmdoc','epaGeneration'],
    'La courbe suit les nouveaux crédits D4 générés chaque mois, après corrections et autres usages retranchés par farmdoc. Le tableau donne aussi le cumul depuis janvier. Compare le rythme des derniers mois, en gardant à part le stock reportable et les obligations exprimées sur une année entière.');
  const eiaSeries = [seriesValues(soyByFacility.biodiesel), seriesValues(soyByFacility.renewableDiesel)];
  const byDate = new Map(eiaSeries[1]);
  const eiaRows = eiaSeries[0].map(([date, bd]) => [date, bd, byDate.get(date)]);
  register('eia-filiere', ['Mois','Biodiesel Mlb','Renewable diesel Mlb','Biodiesel Mt','Renewable diesel Mt','Source biodiesel','Source renewable diesel'],
    eiaRows.map(([date,bd,rd]) => [date, bd, rd, bd*MILLION_LB_TO_MT, rd*MILLION_LB_TO_MT, sources.eiaBd[1], sources.eiaRd[1]]));
  const facility = chartCard(ui, 'eia-filiere', 'Huile de soja · Consommation par filière', 'EIA · janvier 2022 à août 2026 · séries publiées pour les deux catégories d’usines',
    eiaSeries.map((series,i)=>graphLine(['Biodiesel','Renewable diesel'][i],i+1,series.map(([date,n])=>({date,value:n*MILLION_LB_TO_MT})))), {unit:'Mt'},
    ['Mois','Biodiesel (Mlb)','Renewable diesel (Mlb)','Biodiesel (Mt)','Renewable diesel (Mt)'],
    eiaRows.slice().reverse().map(([date,bd,rd])=>[date,num(bd,0),num(rd,0),num(bd*MILLION_LB_TO_MT,4),num(rd*MILLION_LB_TO_MT,4)]), ['eiaBd','eiaRd'],
    'Chaque série mesure le volume d’huile de soja utilisé par une catégorie d’usines. La pente indique quelle filière augmente ou réduit sa consommation. L’EIA publie les valeurs en millions de livres, converties ici en Mt avec le facteur 0,00045359237. Les séries et le total EIA sont arrondis séparément.');
  const recent = dates.slice(2,8);
  const comparisons = [['Huile de soja',totalSoy.slice(2,8)],['Huile de canola',canola.slice(2,8)],...substituteSeries];
  const compRows = recent.map((date,i)=>[date,...comparisons.map(([,list])=>value(list[i]))]);
  register('eia-matieres', ['Mois',...comparisons.map(([label])=>label+' Mlb'),'Source'], compRows.map(row=>[...row,sources.eia[1]]));
  register('epa-banque-rin', ['Début d’année','Stock estimé D4 + D5 (M RIN)','Source'],
    bankEstimates.map(([year,n])=>[year,n,sources.farmdoc[1]]));
  const bank = chartCard(ui,'epa-banque-rin','RIN reportables · Estimation du stock D4 + D5',
    'Estimation farmdoc · stocks agrégés de début d’année, 2027 projeté',
    [
      graphLine('Estimation D4 + D5',2,bankEstimates.slice(0,-1).map(([year,value])=>({date:String(year),value}))),
      graphLine('Projection D4 + D5',3,[{date:'2027',value:bankEstimates.at(-1)[1]}]),
    ],{unit:'M RIN',periodType:'year',defaultScale:'zero'}, ['Début d’année','Stock estimé D4 + D5 (M RIN)','Statut'],
    bankEstimates.map(([year,n])=>[year,num(n,0),year===2027?'Projection':'Estimation']),['farmdoc','epaAvailable'],
    'Chaque point est une estimation du stock combiné D4 + D5 au début de l’année. Un stock plus élevé peut couvrir une partie des obligations et réduire le besoin de nouvelle génération. Le point 2027 est projeté. Le tableau officiel de l’EPA permet de consulter les D4 disponibles par millésime.');
  return net + bank + facility +
    chartCard(ui, 'eia-matieres', 'Matières premières concurrentes', 'Comparaison des volumes consommés · mars à août 2026 · catégories EIA sélectionnées',
      comparisons.map(([label,list],i)=>graphLine(label,i+1,recent.map((date,m)=>({date,value:list[m]})))), {unit:'Mlb'},
      ['Mois',...comparisons.map(([label])=>label)], compRows.map(([date,...list])=>[date,...list.map(n=>num(n,0))]),['eia'],
      'Compare les volumes de soja, canola, suif et yellow grease consommés au cours d’un même mois. Des évolutions opposées peuvent signaler un changement du mix. Les séries couvrent une sélection de matières premières et ne permettent pas de calculer leurs parts dans la consommation totale.');
}

function indonesiaObservations(ui, register) {
  const {num, panel, chartSources} = ui;
  const annualRows = indonesiaDeliveries.map(([year, actual, allocation, status, source]) =>
    [year,actual,allocation,status,sources[source][1]]);
  register('indonesie-livraisons', ['Année','Livré Md l','Allocation Md l','Période','Source'], annualRows);
  const latest = indonesiaDeliveries.at(-1);
  const annual = chartCard(ui, 'indonesie-livraisons', 'Biodiesel · Livraisons et allocation', 'Le point 2026 correspond au cumul au 10 novembre',
    [
      graphLine('Livraisons annuelles',1,indonesiaDeliveries.slice(0,-1).map(point)),
      graphLine('Livré en 2026 au 10 novembre',2,[point(latest)]),
      graphLine('Allocation 2026 annoncée en novembre',3,[{date:latest[0],value:latest[2]}]),
    ], {unit:'Md l',periodType:'year',defaultScale:'zero'}, ['Année','Livré (Md l)','Allocation (Md l)','Mélange / période'],
    indonesiaDeliveries.map(([year,actual,allocation,status])=>[year,num(actual,2),num(allocation,2),status]),
    ['idHistory','idRollout','idLatest','idDate'],
    'Les points 2021 à 2025 couvrent des années civiles complètes. En 2026, compare le cumul livré au 10 novembre à l’allocation de l’année. Le rapport entre les deux mesure l’avancement des livraisons, tandis que B40 et B50 désignent la proportion de biodiesel dans le mélange.');
  register('indonesie-palme', ['Mois','Consommation filière biodiesel kt','Source'], palmMonthly.map(([date,kt,source])=>[date,kt,sources[source][1]]));
  register('indonesie-palme-annuelle', ['Année','Consommation Mt','Statut','Source'], palmForecast.map(([date,mt,status,source])=>[date,mt,status,sources[source][1]]));
  return kpis(ui, [
    ['Biodiesel livré en 2026', num(latest[1],2)+' Md l', num(latest[1]/latest[2]*100,1)+' % de l’allocation annoncée · au 10 nov.'],
    ['Palme absorbée par le biodiesel', num(palmMonthly.at(-1)[1]/1000,3)+' Mt', 'Août 2026 · GAPKI'],
    ['Palme utilisée de janvier à août', num(palmMonthly.reduce((sum,[,kt])=>sum+kt,0)/1000,3)+' Mt', 'Somme des mois GAPKI 2026 · total publié arrondi à 9,2 Mt'],
    ['Scénario B50 sur douze mois', num(palmForecast.at(-1)[1],2)+' Mt', '2027 · GAPKI'],
  ]) + annual + panel('<p class="small">L’ESDM avait initialement alloué '+num(initialAllocation2026,6)+' Md l pour 2026. Le ministère a lancé le B50 le 1er juillet 2026 avec une période de transition. Au 13 novembre, les modalités 2027 restaient en cours d’évaluation.</p>' +
    chartSources(sourceList(['idAllocation','idRollout','idLatest']))) +
    chartCard(ui, 'indonesie-palme', 'Huile de palme absorbée · Historique mensuel', 'GAPKI · consommation de la filière biodiesel, janvier à août 2026',
      [graphLine('Consommation mensuelle',1,palmMonthly.map(([date,kt])=>({date,value:kt/1000})))], {unit:'Mt'},
      ['Mois','Milliers de tonnes','Mt'], palmMonthly.map(([date,kt])=>[date,num(kt,0),num(kt/1000,3)]), ['gapkiFeb','gapkiApr','gapkiJun','gapkiAug','gapkiYtd'],
      'Chaque point mesure la quantité d’huile de palme utilisée par la filière biodiesel pendant le mois. Une hausse indique que davantage de palme part vers cet usage domestique. Les chiffres sont publiés en milliers de tonnes par GAPKI et affichés en millions de tonnes.') +
    chartCard(ui, 'indonesie-palme-annuelle', 'Huile de palme absorbée · Annuel', 'Observations GAPKI, estimation 2026 et scénario 2027',
      [
        graphLine('Observé',1,palmForecast.slice(0,2).map(point)),
        graphLine('Estimation 2026',2,[point(palmForecast[2])]),
        graphLine('Scénario B50 2027',3,[point(palmForecast[3])]),
      ], {unit:'Mt',periodType:'year',defaultScale:'zero'}, ['Année','Mt','Statut'],
      palmForecast.map(([year,mt,status])=>[year,num(mt,3),status]), ['gapkiYear','gapkiForecast'],
      'Les deux premières années sont observées. Le point 2026 est une estimation annuelle et celui de 2027 suppose douze mois de B50 selon GAPKI. L’écart entre ces deux points mesure une hausse de demande dans ce scénario. L’effet sur les exportations dépend aussi de la production et des stocks.');
}

function hipCard(ui, priceData, register) {
  const {num, chartSources, panel} = ui;
  const {hip, gasoil, rates, density, date, refs} = priceData;
  const observations = monthlyHipGap(hip, gasoil, rates, density, date);
  if (!observations.length) {
    return ui.section('Indonésie · HIP biodiesel et gazole', 'Rp/l · observations communes') +
      panel('<p>Non disponible</p><p class="small">Le calcul exige un bulletin HIP et des séances du même mois disposant du gazole ICE et du taux USD/IDR.</p>' + chartSources(refs));
  }
  register('hip-gazole', ['Mois','HIP BBN Rp/l','Proxy gazole Rp/l','Écart Rp/l','Séances appariées','Dernière séance','Période','Source HIP'],
    observations.map(r=>[r.date,r.hip,r.proxy,r.gap,r.count,r.last,r.partial?'Mois en cours':'Mois clos',r.url]));
  const latest = observations.at(-1);
  const indexed = new Map(observations.map(row=>[row.date,row]));
  const [year, month] = observations[0].date.split('-').map(Number);
  const periods = [];
  for (const cursor = new Date(Date.UTC(year,month-1)); cursor.toISOString().slice(0,7)<=latest.date; cursor.setUTCMonth(cursor.getUTCMonth()+1)) {
    periods.push(cursor.toISOString().slice(0,7));
  }
  const curve = key => periods.map(date=>({date,value:indexed.get(date)?.[key]??null}));
  return chartCard(ui, 'hip-gazole', 'Indonésie · HIP biodiesel et gazole',
    'Dernier mois · '+latest.date+' · '+num(latest.gap,0)+' Rp/l d’écart'+(latest.partial?' · mois en cours':''),
    [
      graphLine('HIP biodiesel hors fret',1,curve('hip')),
      graphLine('Gazole ICE converti',2,curve('proxy')),
      graphLine('Écart HIP − gazole',3,curve('gap')),
    ], {unit:'Rp/l',defaultScale:'zero'}, ['Mois','HIP Rp/l','Gazole Rp/l','Écart Rp/l','Séances','Dernière séance','Période'],
    observations.slice().reverse().map(r=>[r.date,num(r.hip,0),num(r.proxy,0),num(r.gap,0),r.count,r.last,r.partial?'En cours':'Clos']), refs,
    'Le HIP est le prix de référence du biodiesel indonésien hors fret. L’écart compare ce prix à un gazole ICE converti en roupies par litre. S’il augmente, le biodiesel devient plus coûteux face à ce repère. Le nombre de séances et la dernière date appariée figurent dans le tableau.') +
    panel(methodology('Formule et lecture', 'Écart (Rp/l) = HIP BBN hors fret − moyenne mensuelle de [gazole ICE (USD/t) × '+num(density,3)+' kg/l ÷ 1 000 kg/t × USD/IDR (Rp/USD)].',
      'La moyenne ne retient que les séances disposant des deux observations le même jour. Le point du mois en cours est partiel. Le gazole ICE est un proxy de marché, distinct de la référence diesel réglementaire indonésienne. Un écart positif mesure le surcoût par litre face au proxy et permet de suivre la pression sur le financement du mandat.', refs,ui));
}

let datasets = new Map();

export function renderBiofuelPolicy(ui, {totalSoy, canola, prices}) {
  datasets = new Map();
  const register = (id, header, rows) => datasets.set(id,[header,...rows]);
  return '<div class="bio-policy" data-bio-policy><nav class="bio-actions" aria-label="Aller à un module">' +
    '<button type="button" class="button ghost" data-bio-jump="bio-us">États-Unis · EPA</button>' +
    '<button type="button" class="button ghost" data-bio-jump="bio-id">Indonésie · B50</button>' +
    '<button type="button" class="button ghost" data-bio-jump="bio-eia">Graphiques saisonniers EIA</button></nav><p class="small">Statuts réglementaires vérifiés le '+ui.e(ui.formatDate(reviewedOn))+'.</p>' +
    '<p class="small">La légende permet de choisir les séries. Les réglages contrôlent la période, la hauteur et l’échelle. Sur les séries mensuelles, la moyenne mobile s’affiche en pointillé et nécessite une fenêtre complète de données.</p>' +
    '<div id="bio-us" tabindex="-1">'+ui.section('États-Unis · Mandats EPA et demande de soja','Obligations en vigueur, génération de RIN et consommation d’huile de soja') +
    regulation(ui,register) + usObservations(ui,totalSoy,canola,register) +
    '</div><div id="bio-id" tabindex="-1">'+ui.section('Indonésie · B50 et demande de CPO','Déploiement, volumes livrés et consommation d’huile de palme') +
    indonesiaObservations(ui,register) + hipCard(ui,prices,register) + '</div></div>';
}

export function bindBiofuelPolicy(root, ui) {
  const page = root.querySelector('[data-bio-policy]');
  if (!page) return;
  page.querySelectorAll('[data-bio-jump]').forEach(button=>{
    button.addEventListener('click',()=>{
      const target = root.querySelector('#'+button.dataset.bioJump);
      target.focus({preventScroll:true});
      target.scrollIntoView({block:'start'});
    });
  });
  page.querySelectorAll('[data-bio-series]').forEach(button=>{
    button.addEventListener('click',()=>ui.csv('olea-'+button.dataset.bioSeries+'.csv',datasets.get(button.dataset.bioSeries)));
  });
}
