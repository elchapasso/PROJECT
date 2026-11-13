import {
  reviewedOn, sources, historicalGallons, epaScenarios, netD4, soyByFacility, palmMonthly,
  palmForecast, indonesiaDeliveries, initialAllocation2026, substituteSeries, bankEstimates,
} from './biofuel-policy-data.mjs';
import {
  MILLION_LB_TO_MT, epaVolumes, defaultRenewableFactor, simulateSoy, indonesiaVolumes,
  palmBalanceImpact, monthlyHipGap, cumulativeNetRins,
} from './biofuel-policy-model.mjs';

const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const years = [2026, 2027];
const number = (name, label, min, max, step) => ({name, label, min, max, step});
const select = (name, label, options) => ({name, label, options});
const usFields = [
  select('year', 'Année de conformité', {2026:'2026', 2027:'2027'}),
  select('scenario', 'Décision EPA', epaScenarios),
  select('scope', 'Périmètre de la simulation', {extra:'Supplément par rapport à la règle en vigueur', total:'Obligation BBD totale'}),
  number('carryover', 'RIN reportés affectés (M RIN)', 0, 10000, 'any'),
  number('domestic', 'Part de la génération réalisée aux USA (%)', 0, 100, 'any'),
  number('rdMix', 'Part des nouveaux RIN US issue du renewable diesel (%)', 0, 100, 'any'),
  number('bdRate', 'Biodiesel · RIN/gal', .1, 3, 'any'),
  number('rdRate', 'Renewable diesel · RIN/gal', .1, 3, 'any'),
  number('bdOil', 'Biodiesel · matières premières (lb/gal)', 0, 30, 'any'),
  number('rdOil', 'Renewable diesel · matières premières (lb/gal)', 0, 30, 'any'),
  number('bdSoy', 'Biodiesel · part de SBO (%)', 0, 100, 'any'),
  number('rdSoy', 'Renewable diesel · part de SBO (%)', 0, 100, 'any'),
];
const idFields = [
  number('diesel', 'Marché annuel de diesel mélangé (Md l)', 0, 1000, 'any'),
  select('baseBlend', 'Mélange de référence', {30:'B30', 35:'B35', 40:'B40', 45:'B45', 50:'B50'}),
  select('targetBlend', 'Mélange simulé', {30:'B30', 35:'B35', 40:'B40', 45:'B45', 50:'B50', 60:'B60'}),
  select('startMonth', 'Mois d’application', Object.fromEntries(months.map((name, i) => [i + 1, name]))),
  number('realization', 'Part exécutée du volume théorique (%)', 0, 100, 'any'),
  number('cpoRate', 'Intensité de matière première (kg CPO/l de FAME)', .01, 3, 'any'),
  number('campaignShare', 'Part du choc attribuée au bilan 26/27 (%)', 0, 100, 'any'),
  number('productionShock', 'Variation de production indonésienne (Mt)', -100, 100, 'any'),
  select('closure', 'Bilan palme · lequel doit absorber le choc ?', {exports:'Exportations indonésiennes, stocks mondiaux fixes', stocks:'Stocks mondiaux, exportations indonésiennes fixes'}),
];
const defaults = {
  us: {year:2027, scenario:'all2027', scope:'extra', carryover:0, domestic:100, rdMix:50, bdRate:1.5, rdRate:1.5, bdOil:7.5, rdOil:8, bdSoy:30, rdSoy:30},
  id: {diesel:35.5, baseBlend:40, targetBlend:50, startMonth:1, realization:100, cpoRate:.92, campaignShare:100, productionShock:0, closure:'exports'},
};
const values = {us:{...defaults.us}, id:{...defaults.id}};

function controls(fields, current) {
  return fields.map(({name, label, options, min, max, step}) => '<label class="field">' + label +
    (options ? '<select name="' + name + '">' + Object.entries(options).map(([key, value]) =>
      '<option value="' + key + '"' + (String(current[name]) === key ? ' selected' : '') + '>' + value + '</option>').join('') + '</select>' :
      '<input type="number" name="' + name + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + current[name] + '" required>') +
    '</label>').join('');
}

function form(id, fields, output) {
  return '<div class="panel bio-simulator"><form data-bio-form="' + id + '">' +
    '<div class="bio-controls">' + controls(fields, values[id]) + '</div>' +
    '<div class="bio-actions"><button type="button" class="button ghost" data-bio-reset>Réinitialiser</button>' +
    '<button type="button" class="button ghost" data-bio-export>Exporter la simulation CSV</button></div>' +
    '<p class="small bio-error" data-bio-error role="status" hidden></p></form>' +
    '<div data-bio-output="' + id + '" aria-live="polite">' + output + '</div></div>';
}

const value = n => Number.isFinite(n) ? n : '';
const graphLine = (label, color, points) => ({label, color:'var(--series-' + color + ')', points});
const point = ([date, value]) => ({date, value});
const sourceList = refs => refs.map(ref => typeof ref === 'string' ? sources[ref] : ref);
const seriesValues = years => Object.entries(years).flatMap(([year, numbers]) =>
  numbers.map((value, index) => [year + '-' + String(index + 1).padStart(2, '0'), value]));

function chartCard(ui, id, title, caption, data, config, headings, rows, refs) {
  const {section, panel, chart, table, e} = ui;
  return section(title, caption) + panel(
    chart(data, {height:220, label:title, sourceLinks:sourceList(refs), ...config}) +
    '<details><summary class="small">Voir les valeurs</summary>' +
    table(headings, rows.map(row => row.map(cell => e(cell)))) + '</details>' +
    '<button type="button" class="button ghost bio-csv" data-bio-series="' + id + '">Exporter CSV</button>');
}

function methodology(title, formula, explanation, refs, ui) {
  return '<details class="bio-method" open><summary>' + title + '</summary><p class="bio-formula">' +
    ui.e(formula) + '</p><p class="small">' + ui.e(explanation) + '</p>' + ui.chartSources(sourceList(refs)) + '</details>';
}

function kpis(ui, items) {
  return '<div class="bio-kpis">' + items.map(([label, number, detail, delta]) =>
    '<div class="bio-kpi"><span>' + ui.e(label) + '</span><strong class="' +
    (delta > 0 ? 'bio-positive' : delta < 0 ? 'bio-negative' : '') + '">' + ui.e(number) + '</strong>' +
    '<span>' + ui.e(detail) + '</span></div>').join('') + '</div>';
}

function regulation(ui, register) {
  const {section, panel, table, e, num, chartSources} = ui;
  const annual = historicalGallons.map(([year, gallons]) => [String(year), gallons]);
  const hisRows = historicalGallons.map(([year, gallons]) => [year, gallons, sources.epaHistory[1]]);
  register('epa-historique', ['Année', 'Milliards de gallons de biodiesel', 'Source'], hisRows);
  const policyRows = years.flatMap(year => Object.entries(epaScenarios).map(([key, label]) => {
    const row = epaVolumes(year, key);
    return [year, label, row.base, row.adopted, row.extra, row.total, sources[key === 'adopted' ? 'epaFinal' : 'epaProposal'][1]];
  }));
  register('epa-regles', ['Année', 'Statut', 'Base M RIN', 'Réallocation adoptée M RIN', 'Supplément M RIN', 'Total M RIN', 'Source'], policyRows);
  const bars = policyRows.map(([year, label, base, adopted, extra, total]) => {
    const width = part => part / 10000 * 100 + '%';
    return '<div class="bio-bar-row"><span>' + year + ' · ' + e(label) + '</span>' +
      '<span class="bio-bar" aria-hidden="true"><i style="width:' + width(base) + '"></i><i style="width:' +
      width(adopted) + '"></i><i style="width:' + width(extra) + '"></i></span>' +
      '<strong>' + num(total / 1000, 2) + '</strong></div>';
  }).join('');
  return kpis(ui, years.map(year => ['Obligation BBD ' + year, num(epaVolumes(year,'adopted').total / 1000, 2) + ' Md RIN', 'Règle en vigueur · EPA'])) +
    section('Obligation BBD · Base et réallocations', 'Millions de RIN dans le tableau · milliards de RIN dans le graphique') +
    panel('<div class="bio-bars">' + bars + '</div><p class="small bio-legend"><span>Base</span><span>Réallocation adoptée</span><span>Supplément proposé</span></p>' +
      chartSources(sourceList(['epaFinal','epaProposal'])) +
      '<p class="small">La proposition d’octobre porte sur 770 M RIN pour l’obligation renouvelable totale, dont environ 180 M pour la catégorie biomass-based diesel (BBD). Les D4 peuvent également servir à honorer les obligations imbriquées de biocarburants avancés et renouvelables.</p>' +
      '<details><summary class="small">Voir les valeurs</summary>' + table(['Année','Statut','Base','Réallocation adoptée','Supplément proposé','Total'],
        policyRows.map(row => row.slice(0, 6).map((cell, index) => index > 1 ? num(cell, 0) : e(cell)))) + '</details>' +
      '<button type="button" class="button ghost bio-csv" data-bio-series="epa-regles">Exporter CSV</button>') +
    chartCard(ui, 'epa-historique', 'Mandats historiques EPA · 2010–2025',
      'Gallons de biodiesel indiqués par l’EPA · la règle 2026–2027 est exprimée en RIN',
      [graphLine('Mandat BBD', 1, annual.map(point))], {unit:'Md gal', periodType:'year', zeroLine:true},
      ['Année','Md gal'], annual.map(([year, gallons]) => [year, num(gallons, 2)]), ['epaHistory']);
}

function soyOutput(ui) {
  const {num, table} = ui;
  const s = simulateSoy(values.us);
  const rows = [['Biodiesel',s.bdGallons,s.bdLipids,s.bdSoyLb], ['Renewable diesel',s.rdGallons,s.rdLipids,s.rdSoyLb]];
  return kpis(ui, [
    ['Obligation sélectionnée', num(s.obligation,0) + ' M RIN', values.us.scope === 'total' ? 'Obligation BBD totale' : 'Supplément au mandat en vigueur'],
    ['Nouvelle génération américaine simulée', num(s.domesticRins,2) + ' M RIN', 'Après couverture et part américaine'],
    ['Huile de soja simulée', num(s.soyLb,2) + ' Mlb', num(s.soyMt,4) + ' Mt'],
  ]) + table(['Filière','Carburant (M gal)','Matières premières (Mlb)','SBO (Mlb)'], rows.map(([label,...numbers]) => [label,...numbers.map(n=>num(n,2))])) +
    '<p class="small">RIN reportés affectés · ' + num(s.coverage,2) + ' M RIN sur un plafond théorique de '+num(s.ceiling,2)+' M RIN dans ce scénario.</p>';
}

function soySimulator(ui) {
  return ui.section('Simulateur EPA · Des RIN à l’huile de soja', 'Modifie les hypothèses pour calculer la demande physique associée au scénario.') +
    form('us', usFields, soyOutput(ui) +
      methodology('Formule et lecture', 'Nouveaux RIN US = (obligation − min(RIN saisis, obligation sélectionnée, 20 % du mandat BBD total)) × part US. Pour chaque filière, SBO (Mlb) = RIN US de la filière (M) ÷ RIN/gal × lb de matières premières/gal × part de SBO. SBO (Mt) = SBO (Mlb) × 0,00045359237.',
        'La part renewable diesel répartit les nouveaux RIN US entre les deux filières. Les consommations par gallon, parts de SBO et RIN reportés sont des hypothèses de travail éditables. Le plafond théorique de 20 % s’applique à l’obligation de chaque redevable. Les RIN effectivement utilisables dépendent du millésime et du stock de chaque redevable. Le Set 2 fixe 1,5 RIN/gal au renewable diesel à compter du 1er janvier 2027, avec possibilité de valeur approuvée différente. Le réglage initial 2026 de 1,7 correspond à un cas admissible en 2026. L’équivalent physique couvre le périmètre BBD choisi. Les autres obligations RFS, exportations, déficits et crédits effectivement disponibles doivent être analysés séparément.', ['epaFactors','epaAvailable'], ui));
}

function usObservations(ui, totalSoy, canola, register) {
  const {num, panel, chartSources} = ui;
  const rins = cumulativeNetRins();
  const quotes = rins.map(({date, value, total}) => [date, value, total, sources.farmdoc[1], sources.epaGeneration[1]]);
  register('d4-generation', ['Mois','Génération nette (M RIN)','Cumul (M RIN)','Source série','Source primaire'], quotes);
  const dates = rins.map(({date}) => date);
  const net = chartCard(ui, 'd4-generation', 'D4 · Génération nette mensuelle', 'Janvier à septembre 2026 · série farmdoc issue de l’EPA, arrondie au million',
    [graphLine('Génération nette',1,netD4.map(point))], {unit:'M RIN', zeroLine:true}, ['Mois','M RIN','Cumul M RIN'],
    rins.map(({date,value,total}) => [date,num(value,0),num(total,0)]), ['farmdoc','epaGeneration']);
  const eiaSeries = [seriesValues(soyByFacility.biodiesel), seriesValues(soyByFacility.renewableDiesel)];
  const byDate = new Map(eiaSeries[1]);
  const eiaRows = eiaSeries[0].map(([date, bd]) => [date, bd, byDate.get(date)]);
  register('eia-filiere', ['Mois','Biodiesel Mlb','Renewable diesel Mlb','Biodiesel Mt','Renewable diesel Mt','Source biodiesel','Source renewable diesel'],
    eiaRows.map(([date,bd,rd]) => [date, bd, rd, bd*MILLION_LB_TO_MT, rd*MILLION_LB_TO_MT, sources.eiaBd[1], sources.eiaRd[1]]));
  const facility = chartCard(ui, 'eia-filiere', 'Huile de soja · Consommation par filière', 'EIA · janvier 2022 à août 2026 · séries publiées pour les deux catégories d’usines',
    eiaSeries.map((series,i)=>graphLine(['Biodiesel','Renewable diesel'][i],i+1,series.map(([date,n])=>({date,value:n*MILLION_LB_TO_MT})))), {unit:'Mt'},
    ['Mois','Biodiesel (Mlb)','Renewable diesel (Mlb)','Biodiesel (Mt)','Renewable diesel (Mt)'],
    eiaRows.slice().reverse().map(([date,bd,rd])=>[date,num(bd,0),num(rd,0),num(bd*MILLION_LB_TO_MT,4),num(rd*MILLION_LB_TO_MT,4)]), ['eiaBd','eiaRd']);
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
    ],{unit:'M RIN',periodType:'year',zeroLine:true}, ['Début d’année','Stock estimé D4 + D5 (M RIN)','Statut'],
    bankEstimates.map(([year,n])=>[year,num(n,0),year===2027?'Projection':'Estimation']),['farmdoc','epaAvailable']);
  return net + bank + panel('<p class="small">Le stock farmdoc agrège les catégories D4 et D5. Pour isoler la disponibilité mensuelle du D4 par millésime, consulte le fichier officiel de l’EPA. Le champ de couverture du simulateur reste une hypothèse choisie par l’utilisateur.</p>' +
    chartSources(sourceList(['epaAvailable']))) + facility +
    chartCard(ui, 'eia-matieres', 'Matières premières concurrentes', 'Comparaison des volumes consommés · mars à août 2026 · catégories EIA sélectionnées',
      comparisons.map(([label,list],i)=>graphLine(label,i+1,recent.map((date,m)=>({date,value:list[m]})))), {unit:'Mlb'},
      ['Mois',...comparisons.map(([label])=>label)], compRows.map(([date,...list])=>[date,...list.map(n=>num(n,0))]),['eia']);
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
    ], {unit:'Md l',periodType:'year',zeroLine:true}, ['Année','Livré (Md l)','Allocation (Md l)','Mélange / période'],
    indonesiaDeliveries.map(([year,actual,allocation,status])=>[year,num(actual,2),num(allocation,2),status]),
    ['idHistory','idRollout','idLatest','idDate']);
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
      ['Mois','Milliers de tonnes','Mt'], palmMonthly.map(([date,kt])=>[date,num(kt,0),num(kt/1000,3)]), ['gapkiFeb','gapkiApr','gapkiJun','gapkiAug','gapkiYtd']) +
    chartCard(ui, 'indonesie-palme-annuelle', 'Huile de palme absorbée · Annuel', 'Observations GAPKI, estimation 2026 et scénario 2027',
      [
        graphLine('Observé',1,palmForecast.slice(0,2).map(point)),
        graphLine('Estimation 2026',2,[point(palmForecast[2])]),
        graphLine('Scénario B50 2027',3,[point(palmForecast[3])]),
      ], {unit:'Mt',periodType:'year',zeroLine:true}, ['Année','Mt','Statut'],
      palmForecast.map(([year,mt,status])=>[year,num(mt,3),status]), ['gapkiYear','gapkiForecast']);
}

function balanceInputs(balance) {
  const index = balance.periods.findIndex(([id])=>id === '2026/27');
  return {
    production:Number(balance.rows['production-id'][index]),
    exports:Number(balance.rows['exports-id'][index]),
    stocks:Number(balance.rows.ending[index]),
  };
}

function indonesiaOutput(ui, baseline) {
  const {num, sign, table} = ui;
  const result = indonesiaVolumes(values.id);
  const impact = palmBalanceImpact(baseline, result.extraPalm, values.id);
  const balanceRows = [
    ['Production · Indonésie',baseline.production,impact.production],
    ['Exportations · Indonésie',baseline.exports,impact.exports],
    ['Stocks finaux · Monde',baseline.stocks,impact.stocks],
  ];
  return kpis(ui, [
    ['Biodiesel simulé', num(result.scenarioLitres,3)+' Md l', 'vs '+num(result.baselineLitres,3)+' Md l de référence'],
    ['CPO absorbé', num(result.scenarioPalm,3)+' Mt', 'vs '+num(result.baselinePalm,3)+' Mt de référence'],
    ['Variation de demande CPO', sign(result.extraPalm,3)+' Mt', sign(impact.demandShock,3)+' Mt attribuées au bilan 26/27', result.extraPalm],
  ]) + table(['Bilan 26/27 (Mt)','Référence Oléa','Simulation','Variation'], balanceRows.map(([label,base,next])=>{
    const change = next-base;
    return [label,num(base,3),num(next,3),'<strong class="'+(change>0?'bio-positive':change<0?'bio-negative':'')+'">'+sign(change,3)+'</strong>'];
  })) + (Object.values(impact).slice(1).some(n=>n<0) ? '<p class="small bio-error">Le scénario crée un solde négatif. Ajuste la production, le taux de mélange ou le poste qui absorbe le choc.</p>' : '');
}

function indonesiaSimulator(ui, baseline) {
  return ui.section('Simulateur B50 · Impact sur le bilan palme', 'Référence paramétrable · le choc est appliqué au bilan 26/27 saisi dans Oléa.') +
    form('id', idFields, indonesiaOutput(ui,baseline) +
      methodology('Formule du besoin de CPO', 'FAME (Md l) = diesel mélangé (Md l) × [taux initial + (taux cible − taux initial) × mois au taux cible ÷ 12] × réalisation. CPO (Mt) = FAME (Md l) × kg de CPO/l de FAME.',
        'Le mois de lancement est inclus et le diesel est réparti uniformément sur douze mois. L’exemple initial de 35,5 Md l est un marché implicite dérivé de 14,2 Md l livrés en 2025 à B40. Le coefficient de 0,92 est un arrondi du ratio prévisionnel USDA 2026 de 16,191 Mt de CPO pour 17,6 Md l de biodiesel produit. Ces deux valeurs sont éditables. Le coefficient de matière première mesure des kg de CPO consommés par litre de FAME.', ['idHistory','usda'],ui) +
      methodology('Formule de transmission au bilan', 'Choc net (Mt) = variation de production − variation de CPO absorbé × part affectée à 26/27. Exportations Indonésie = référence + choc net si les stocks sont fixes. Stocks mondiaux = référence + choc net si les exportations sont fixes.',
        'Le résultat est une sensibilité du bilan de référence. Le taux d’attribution permet d’aligner un scénario en année civile avec la campagne 26/27. Les autres postes sont tenus constants dans ce calcul.', [['Oléa · Bilans offre / demande','https://elchapasso.github.io/PROJECT/#balances']],ui));
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
    ], {unit:'Rp/l',zeroLine:true}, ['Mois','HIP Rp/l','Gazole Rp/l','Écart Rp/l','Séances','Dernière séance','Période'],
    observations.slice().reverse().map(r=>[r.date,num(r.hip,0),num(r.proxy,0),num(r.gap,0),r.count,r.last,r.partial?'En cours':'Clos']), refs) +
    panel(methodology('Formule et lecture', 'Écart (Rp/l) = HIP BBN hors fret − moyenne mensuelle de [gazole ICE (USD/t) × '+num(density,3)+' kg/l ÷ 1 000 kg/t × USD/IDR (Rp/USD)].',
      'La moyenne ne retient que les séances disposant des deux observations le même jour. Le point du mois en cours est partiel. Le gazole ICE est un proxy de marché, distinct de la référence diesel réglementaire indonésienne. Un écart positif mesure le surcoût par litre face au proxy et permet de suivre la pression sur le financement du mandat.', refs,ui));
}

let datasets = new Map();
let palmBaseline;

export function renderBiofuelPolicy(ui, {totalSoy, canola, balance, prices}) {
  datasets = new Map();
  palmBaseline = balanceInputs(balance);
  const register = (id, header, rows) => datasets.set(id,[header,...rows]);
  return '<div class="bio-policy" data-bio-policy><nav class="bio-actions" aria-label="Aller à un module">' +
    '<button type="button" class="button ghost" data-bio-jump="bio-us">États-Unis · EPA</button>' +
    '<button type="button" class="button ghost" data-bio-jump="bio-id">Indonésie · B50</button>' +
    '<button type="button" class="button ghost" data-bio-jump="bio-eia">Graphiques saisonniers EIA</button></nav><p class="small">Statuts réglementaires vérifiés le '+ui.e(ui.formatDate(reviewedOn))+'.</p>' +
    '<div id="bio-us" tabindex="-1">'+ui.section('États-Unis · Mandats EPA et demande de soja','RIN adoptés, propositions et demande physique simulée') +
    regulation(ui,register) + soySimulator(ui) + usObservations(ui,totalSoy,canola,register) +
    '</div><div id="bio-id" tabindex="-1">'+ui.section('Indonésie · B50 et demande de CPO','Déploiement, volumes livrés et impact sur le bilan palme') +
    indonesiaObservations(ui,register) + indonesiaSimulator(ui,palmBaseline) + hipCard(ui,prices,register) + '</div></div>';
}

function simulationRows(id) {
  const settings = values[id];
  const calculated = id === 'us' ? simulateSoy(settings) : indonesiaVolumes(settings);
  const positions = id === 'us' ? [] : Object.entries(palmBalanceImpact(palmBaseline,calculated.extraPalm,settings));
  const fields = id === 'us' ? usFields : idFields;
  return [
    ['Nature','Paramètre / résultat','Valeur'],
    ...fields.map(({name,label,options})=>['Hypothèse',label,options?.[settings[name]]??settings[name]]),
    ...Object.entries(calculated).map(([key,n])=>['Calcul',exportLabels[key],n]),
    ...positions.map(([key,n])=>['Bilan 26/27 (Mt)',exportLabels[key],n]),
  ];
}

const exportLabels = {
  obligation:'Obligation (M RIN)', coverage:'RIN reportés affectés (M RIN)', ceiling:'Plafond théorique de couverture (M RIN)', newRins:'Nouveaux RIN (M RIN)',
  domesticRins:'Nouveaux RIN US (M RIN)', bdGallons:'Biodiesel (M gal)', rdGallons:'Renewable diesel (M gal)',
  bdLipids:'Matières premières biodiesel (Mlb)', rdLipids:'Matières premières renewable diesel (Mlb)',
  bdSoyLb:'SBO filière biodiesel (Mlb)', rdSoyLb:'SBO filière renewable diesel (Mlb)', soyLb:'SBO total (Mlb)',
  soyMt:'SBO total (Mt)', effectiveBlend:'Mélange annuel moyen (%)', baselineLitres:'FAME de référence (Md l)',
  scenarioLitres:'FAME simulé (Md l)', baselinePalm:'CPO de référence (Mt)', scenarioPalm:'CPO simulé (Mt)',
  extraPalm:'Variation de CPO (Mt)', demandShock:'Choc de demande attribué à 26/27', production:'Production indonésienne',
  exports:'Exportations indonésiennes', stocks:'Stocks mondiaux finaux',
};

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
  page.querySelectorAll('[data-bio-form]').forEach(form=>{
    const id = form.dataset.bioForm;
    const output = page.querySelector('[data-bio-output="'+id+'"]');
    const error = form.querySelector('[data-bio-error]');
    const exportButton = form.querySelector('[data-bio-export]');
    const render = ()=>{
      const details = [...output.querySelectorAll('details')].map(element=>element.open);
      const methods = [...output.querySelectorAll('.bio-method')].map(element=>element.outerHTML).join('');
      output.innerHTML = (id === 'us' ? soyOutput(ui) : indonesiaOutput(ui,palmBaseline)) + methods;
      output.querySelectorAll('details').forEach((element,i)=>{element.open = details[i];});
    };
    form.addEventListener('submit', event=>event.preventDefault());
    form.addEventListener('input',event=>{
      if (id === 'us' && event.target.name === 'year') {
        form.elements.rdRate.value = defaultRenewableFactor(event.target.value);
      }
      if (!form.checkValidity()) {
        error.textContent = 'Vérifie les valeurs saisies et les limites de chaque champ. Dernier résultat valide affiché.';
        error.hidden = false;
        exportButton.disabled = true;
        return;
      }
      error.hidden = true;
      exportButton.disabled = false;
      const next = new FormData(form);
      values[id] = Object.fromEntries(Object.entries(defaults[id]).map(([key, initial])=>
        [key,typeof initial === 'number' ? Number(next.get(key)) : next.get(key)]));
      render();
    });
    form.querySelector('[data-bio-reset]').addEventListener('click',()=>{
      values[id] = {...defaults[id]};
      Object.entries(values[id]).forEach(([key,initial])=>{form.elements.namedItem(key).value = initial;});
      error.hidden = true;
      exportButton.disabled = false;
      render();
    });
    exportButton.addEventListener('click',()=>ui.csv('olea-simulation-'+(id==='us'?'epa':'b50')+'.csv',simulationRows(id)));
  });
}
