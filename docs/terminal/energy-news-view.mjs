const LIVE = 'https://raw.githubusercontent.com/elchapasso/PROJECT/energy-news-live/docs/terminal/live/energy-news.json';
const SEED = new URL('./energy-news-seed.json', import.meta.url);
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const PAGE_SIZE = 8;

const topics = {
  energy: {label:'Pétrole & gazole', impact:'Comparer le mouvement du Brent à celui du gazole. Le gazole est un repère plus direct pour les marges du biodiesel.'},
  shipping: {label:'Fret & routes', impact:'Vérifier le fret sur la route réelle, l’assurance et les dates de chargement avant de réviser le prix rendu Maroc.'},
  oils: {label:'Huiles végétales', impact:'Comparer les offres FOB et le coût rendu de l’huile concernée avec ses substituts, à qualité et livraison comparables.'},
  biofuels: {label:'Biocarburants', impact:'Vérifier la date d’application, les matières éligibles et l’effet potentiel sur la demande d’huile de soja, de palme ou de colza.'},
  policy: {label:'Sanctions & commerce', impact:'Vérifier les origines, produits et routes concernés ainsi que la date d’entrée en vigueur de la mesure.'},
  fx: {label:'Devises & taux', impact:'Suivre le USD/MAD pour convertir l’exposition en dollars en coût d’achat en dirhams.'},
};

const channels = {
  rss:'RSS éditeur', google:'Google News', api:'API éditeur', official:'API officielle', editorial:'Sélection Oléa',
};

const regions = [
  ['Moyen-Orient · Ormuz', 'Offre de brut, prix du gazole et risque maritime pour les navires qui transitent par le détroit.'],
  ['Mer Rouge · Suez', 'Détours et délais sur les lignes Asie–Europe. Vérifier si la route vers le Maroc emprunte effectivement Suez.'],
  ['Mer Noire · Danube', 'Chargements ukrainiens et roumains, capacité des ports et disponibilité d’huile de tournesol.'],
  ['Atlantique Sud · Argentine–Maroc', 'Fret vraquier liquide, fenêtres de chargement au Paraná et disponibilité d’huile de soja à l’export.'],
];

const dateTime = new Intl.DateTimeFormat('fr-FR', {dateStyle:'medium', timeStyle:'short', timeZone:'Africa/Casablanca'});
const dateOnly = new Intl.DateTimeFormat('fr-FR', {dateStyle:'medium', timeZone:'Africa/Casablanca'});
const day = value => dateOnly.format(new Date(value));
const date = value => dateTime.format(new Date(value));
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const fold = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function url(value) {
  try {
    const link = new URL(value);
    return link.protocol === 'https:' && !link.username && !link.password ? link.href : '';
  } catch {
    return '';
  }
}

export function validateEnergySnapshot(raw) {
  if (raw?.schema !== 1 || !Array.isArray(raw.articles) || !Array.isArray(raw.providers) || !raw.spot) return null;
  const articles = raw.articles.filter(item => item && typeof item.title === 'string' && typeof item.source === 'string' &&
    url(item.url) && validTime(item.publishedAt) && Array.isArray(item.topics) && item.topics.some(key => Object.hasOwn(topics, key)))
    .map(item => ({...item, topics:item.topics.filter(key => Object.hasOwn(topics, key))}));
  if (raw.articles.length && !articles.length) return null;
  const spot = Object.fromEntries(['brent','wti'].map(key => {
    const points = Array.isArray(raw.spot[key]) ? raw.spot[key].filter(row => Array.isArray(row) &&
      /^\d{4}-\d{2}-\d{2}$/.test(row[0]) && validTime(row[0]) && Number.isFinite(row[1])) : [];
    return [key, [...new Map(points)].sort(([a],[b]) => a.localeCompare(b))];
  }));
  const providers = raw.providers.filter(row => row && typeof row.name === 'string' && Array.isArray(row.channels));
  return {articles, spot, providers, checkedAt:validTime(raw.checkedAt) ? raw.checkedAt : null,
    collectedAt:validTime(raw.collectedAt) ? raw.collectedAt : null};
}

export function selectEnergyArticles(articles, filters, now = Date.now()) {
  const words = fold(filters.query.trim()).split(/\s+/).filter(Boolean);
  return articles.filter(item => {
    const age = now - Date.parse(item.publishedAt);
    if (age > Number(filters.period) * DAY || age < -2 * HOUR) return false;
    if (filters.topic && !item.topics.includes(filters.topic)) return false;
    if (filters.source && item.source !== filters.source) return false;
    const text = fold([item.title, item.source, item.summary, ...item.topics.map(key => topics[key].label)].join(' '));
    return words.every(word => text.includes(word));
  }).sort((a,b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

const filters = {query:'', topic:'', source:'', period:'7', limit:PAGE_SIZE};
let snapshot = null;
let feedState = 'loading';
let lastRead = 0;
let pending = null;

async function read(address) {
  try {
    const response = await fetch(address, {cache:'no-cache', signal:AbortSignal.timeout(6000)});
    return response.ok ? validateEnergySnapshot(await response.json()) : null;
  } catch {
    return null;
  }
}

function refresh() {
  if (pending) return pending;
  pending = (async () => {
    // Read the integrated data in parallel so that a failed request has a usable fallback.
    const [live, seed] = await Promise.all([read(LIVE), snapshot ? Promise.resolve(null) : read(SEED)]);
    if (live?.checkedAt && (!snapshot?.checkedAt || live.checkedAt >= snapshot.checkedAt)) {
      snapshot = live;
      feedState = 'live';
    } else {
      snapshot ??= seed;
      feedState = snapshot?.checkedAt ? 'retained' : snapshot ? 'seed' : 'unavailable';
    }
    lastRead = Date.now();
  })().finally(() => {pending = null;});
  return pending;
}

function statusMarkup(e) {
  if (feedState === 'loading') return '<span class="dot"></span> Chargement des sources';
  if (feedState === 'unavailable') return 'Flux momentanément indisponible';
  if (feedState === 'seed') return 'Sélection initiale · Flux en attente de synchronisation';
  const checked = snapshot.checkedAt;
  const collected = snapshot.collectedAt;
  const delayed = feedState === 'retained' || !collected || Date.now() - Date.parse(collected) > 3 * HOUR;
  const reachable = snapshot.providers.filter(source => source.available).length;
  const coverage = `${reachable}/${snapshot.providers.length} sources joignables`;
  const detail = `Vérifié le ${date(checked)} · Casablanca · ${coverage}`;
  return '<span class="dot"></span> ' + e((delayed ? 'Collecte retardée · ' : '') + detail);
}

function articleMarkup(item, {e,icon}) {
  const topic = topics[filters.topic || item.topics[0]];
  const time = item.dateOnly ? day(item.publishedAt) : date(item.publishedAt);
  return '<article class="energy-story"><div class="energy-story-meta"><span class="energy-topic">'+e(topic.label)+'</span><strong>'+e(item.source)+'</strong><time datetime="'+e(item.publishedAt)+'">'+e(time)+'</time></div>'+
    '<h3><a href="'+e(url(item.url))+'" target="_blank" rel="noopener noreferrer">'+e(item.title)+' '+icon('arrow', 14)+'</a></h3>'+
    (typeof item.summary === 'string' ? '<p>'+e(item.summary)+'</p>' : '')+
    '<p class="energy-impact"><strong>À surveiller</strong> '+e(topic.impact)+'</p>'+
    (item.via === 'google' ? '<small>Repéré via Google News</small>' : '')+'</article>';
}

function sourceStatus({e}) {
  const rows = snapshot?.providers ?? [];
  const text = rows.length ? '<ul class="energy-provider-grid">'+rows.map(row => {
    const name = e(row.name);
    const method = row.channels.map(key => channels[key]).filter(Boolean).join(' · ');
    const label = row.available ? (row.partial ? 'Partiellement joignable' : 'Joignable') : 'Indisponible';
    return '<li><strong>'+name+'</strong><span>'+e(label+(method ? ' · '+method : ''))+'</span></li>';
  }).join('')+'</ul>' : '';
  return '<details class="energy-sources"><summary>Sources et méthode</summary><p>Collecte planifiée chaque heure. Le fil conserve les titres et liens pertinents sur 30 jours et regroupe les doublons de titre ou de lien. Les titres automatiques gardent la langue de la source. Les repères « À surveiller » décrivent des effets possibles, à confirmer avec les cotations et les offres.</p><p>Les flux des éditeurs et les publications officielles sont complétés par Google News. Trading Economics peut aussi être connecté via son API. La date affichée correspond à la publication et les heures sont affichées à Casablanca.</p>'+text+'</details>';
}

function energyCharts({chart,e,link,num,formatDate,colors,series,spreadPrices,spreadLegs}) {
  const spot = snapshot?.spot ?? {};
  const market = [
    {name:'Brent', kind:'Spot · Europe', unit:'USD/baril', rows:spot.brent, ref:['EIA via FRED','https://fred.stlouisfed.org/series/DCOILBRENTEU']},
    {name:'WTI', kind:'Spot · Cushing', unit:'USD/baril', rows:spot.wti, ref:['EIA via FRED','https://fred.stlouisfed.org/series/DCOILWTICO']},
    ...[['gasoil','ICE Gasoil'],['ho','NY Harbor ULSD']].map(([key,name]) => ({name, kind:'Future continu', unit:spreadLegs[key].unit, rows:spreadPrices[key], ref:[spreadLegs[key].source,spreadLegs[key].url]})),
  ];
  const mad = series('fx-mad', {});
  const fxRows = Object.entries(mad.values);
  const latestFx = mad.points[fxRows.at(-1)?.[0]];
  const fx = {name:'USD/MAD', kind:'Fixing indicatif', unit:'MAD/USD', rows:fxRows, ref:[latestFx?.source||mad.source,latestFx?.url||mad.url]};
  const cards = [...market,fx].map(({name,kind,unit,rows,ref}) => {
    const last = rows?.at(-1);
    const previous = rows?.at(-2);
    const change = last && previous && previous[1] > 0 ? (last[1]/previous[1]-1)*100 : null;
    const trend = change > 0 ? 'positive' : change < 0 ? 'negative' : 'muted';
    return '<article class="energy-quote"><h3>'+e(name)+'</h3><p class="small">'+e(kind)+'</p>'+
      '<p class="energy-value">'+(last ? '<strong class="num">'+num(last[1])+'</strong> <span>'+e(unit)+'</span>' : '<strong>Non disponible</strong>')+'</p>'+
      '<p class="small">'+(last ? e(formatDate(last[0])) : 'Observation à venir')+
      (change !== null ? ' · <span class="'+trend+'" title="Variation vs observation précédente">'+(change>0?'+':'')+num(change,2)+' %</span>' : '')+'</p>'+
      '<p class="small">'+link(ref[1],ref[0])+'</p></article>';
  }).join('');
  const plot = (items, label, index) => chart(items.map((item,i) => ({label:item.name,color:colors[index+i],points:(item.rows ?? []).slice(-285).map(([date,value]) => ({date,value}))})), {
    unit:items[0].unit, periodType:'day', label, sourceLinks:[...new Map(items.map(item => [item.ref[1],item.ref])).values()],
    quickRanges:true, movingAverage:true, height:205,
  });
  return '<div class="energy-quotes">'+cards+'</div><div class="energy-chart-grid">'+
    '<section class="panel energy-plot"><h3>Brut spot · Brent et WTI</h3>'+plot(market.slice(0,2),'Cours spot du Brent et du WTI',0)+'</section>'+
    '<section class="panel energy-plot"><h3>ICE Gasoil</h3>'+plot([market[2]],'Clôtures quotidiennes du gazole ICE',2)+'</section>'+
    '<section class="panel energy-plot"><h3>NY Harbor ULSD</h3>'+plot([market[3]],'Clôtures quotidiennes du NY Harbor ULSD',3)+'</section></div>';
}

export function renderEnergyNews(ui) {
  const {e,icon} = ui;
  return '<div class="energy-page" data-energy-page><header class="energy-hero"><div><h1>Énergie & géopolitique</h1><p>Suivez le pétrole, les routes maritimes et les décisions qui peuvent modifier le prix des huiles végétales et le coût rendu Maroc.</p></div>'+
    '<div class="energy-hero-actions"><p class="energy-status" data-energy-status role="status">'+statusMarkup(e)+'</p><button type="button" class="button" data-energy-refresh>'+icon('refresh')+' Relire le flux</button></div></header>'+
    '<section class="energy-feed panel" aria-labelledby="energy-feed-title"><div class="energy-heading"><div><h2 id="energy-feed-title">Dernières actualités</h2><p class="small">Fil de veille sur les marchés, le fret et la réglementation.</p></div><p class="small" data-energy-count aria-live="polite"></p></div>'+
    '<form class="energy-filters" data-energy-filters><label>Thème<select name="topic"><option value="">Tous les thèmes</option>'+
    Object.entries(topics).map(([key,topic]) => '<option value="'+key+'">'+e(topic.label)+'</option>').join('')+'</select></label>'+
    '<label>Source<select name="source"><option value="">Toutes les sources</option></select></label>'+
    '<label>Période<select name="period"><option value="2">48 heures</option><option value="7">7 jours</option><option value="30">30 jours</option></select></label>'+
    '<label>Recherche<input type="search" name="query" placeholder="Ormuz, Brent, biodiesel…" maxlength="100"></label></form>'+
    '<div data-energy-results></div><div data-energy-sources></div></section>'+
    '<section aria-labelledby="energy-prices-title"><div class="energy-heading"><div><h2 id="energy-prices-title">Repères de marché</h2><p class="small">Dernière observation par série et variation depuis l’observation précédente.</p></div><a href="#cross">Spreads & marges '+icon('arrow',14)+'</a></div>'+energyCharts(ui)+'</section>'+
    '<section aria-labelledby="energy-routes-title"><div class="energy-heading"><div><h2 id="energy-routes-title">Routes à surveiller</h2><p class="small">Points de vigilance pour les approvisionnements au Maroc.</p></div></div><div class="energy-route-grid">'+
    regions.map(([title,description]) => '<article class="panel"><h3>'+e(title)+'</h3><p>'+e(description)+'</p></article>').join('')+'</div></section></div>';
}

function paint(page, ui) {
  const {e} = ui;
  const articles = snapshot?.articles ?? [];
  const names = [...new Set(articles.map(item => item.source))].sort((a,b) => a.localeCompare(b, 'fr'));
  const sources = page.querySelector('[name="source"]');
  if (!names.includes(filters.source)) filters.source = '';
  const options = '<option value="">Toutes les sources</option>'+names.map(name => '<option value="'+e(name)+'">'+e(name)+'</option>').join('');
  if (sources.dataset.options !== options) {
    sources.innerHTML = options;
    sources.dataset.options = options;
  }
  sources.value = filters.source;
  page.querySelector('[data-energy-status]').innerHTML = statusMarkup(e);
  const rows = selectEnergyArticles(articles, filters);
  const visible = rows.slice(0,filters.limit);
  page.querySelector('[data-energy-count]').textContent = feedState === 'loading' ? '' : `${rows.length} ${rows.length === 1 ? 'article' : 'articles'}`;
  const empty = feedState === 'loading' ? 'Chargement des actualités…' : feedState === 'unavailable' ? 'Le flux est indisponible. Vous pouvez réessayer.' : 'Aucun article pour ces filtres.';
  page.querySelector('[data-energy-results]').innerHTML = (visible.length ? visible.map(item => articleMarkup(item, ui)).join('') : '<p class="empty">'+e(empty)+'</p>')+
    (rows.length > visible.length ? '<button type="button" class="button energy-more" data-energy-more>Afficher plus d’articles</button>' : '');
  const method = page.querySelector('[data-energy-sources]');
  const expanded = method.querySelector('details')?.open;
  const markup = sourceStatus(ui);
  if (method.dataset.content !== markup) {
    method.innerHTML = markup;
    method.dataset.content = markup;
    if (expanded) method.querySelector('details').open = true;
  }
}

let binding = null;

export function bindEnergyNews(root, ui, render) {
  const page = root.querySelector('[data-energy-page]');
  binding = null;
  if (!page) return;
  const form = page.querySelector('[data-energy-filters]');
  for (const key of ['query','topic','period']) form.elements[key].value = filters[key];
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    const {name,value} = event.target;
    if (!['query','topic','source','period'].includes(name)) return;
    filters[name] = value;
    filters.limit = PAGE_SIZE;
    paint(page,ui);
  });
  page.addEventListener('click', event => {
    if (event.target.closest('[data-energy-more]')) {
      filters.limit += PAGE_SIZE;
      paint(page,ui);
      page.querySelectorAll('.energy-story h3 a')[filters.limit - PAGE_SIZE]?.focus();
    }
    if (event.target.closest('[data-energy-refresh]')) refreshEnergyNews(true);
  });
  binding = {page,ui,render};
  paint(page,ui);
  if (!lastRead || Date.now()-lastRead > 15*60_000) refreshEnergyNews();
}

export async function refreshEnergyNews(manual = false) {
  if (!binding || !manual && pending) return;
  const before = JSON.stringify(snapshot?.spot);
  const button = binding.page.querySelector('[data-energy-refresh]');
  button.disabled = true;
  await refresh();
  button.disabled = false;
  if (!binding) return;
  const {page,ui,render} = binding;
  if (before !== JSON.stringify(snapshot?.spot)) {
    const control = page.contains(document.activeElement) ? document.activeElement.getAttribute('name') : null;
    render();
    if (control) binding?.page.querySelector('[name="'+control+'"]')?.focus({preventScroll:true});
    else if (manual) binding?.page.querySelector('[data-energy-refresh]')?.focus({preventScroll:true});
  } else {
    paint(page,ui);
  }
}
