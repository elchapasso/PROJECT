// Fusion des prix intégrés au site et des prix actualisés automatiquement (branche prices-live).
// Module sans effet de bord, testé par tests/price-feed.test.mjs.
const DATE=/^\d{4}-\d{2}-\d{2}$/;

export function validLiveFeed(feed){
  if(!feed||feed.schema!==1||!feed.series||typeof feed.series!=='object')return false;
  return Object.values(feed.series).every(rows=>Array.isArray(rows)&&rows.every(r=>Array.isArray(r)&&DATE.test(r[0])&&Number.isFinite(r[1])));
}
// Séries que la branche futures-live a le droit de fournir. Toute autre clé de ce flux est ignorée.
export const FUTURES_SERIES=['zl','zs','zm','ho','gasoil','fcpo'];
export const onlySeries=(feed,keys)=>({...feed,series:Object.fromEntries(keys.filter(key=>Object.hasOwn(feed.series,key)).map(key=>[key,feed.series[key]]))});
export const validStatus=status=>!!status&&status.schema===1&&typeof status.series==='object'&&typeof status.sources==='object';

// Les séries du flux complètent celles du site : une date nouvelle s’ajoute, une valeur révisée remplace l’ancienne,
// une valeur identique garde la ligne du site (et son lien éventuel).
export function mergePrices(bundled,live){
  if(!validLiveFeed(live))return bundled;
  const out={...bundled};
  for(const [key,rows] of Object.entries(live.series)){
    const byDate=new Map((bundled[key]||[]).map(r=>[r[0],r]));
    for(const r of rows){
      const old=byDate.get(r[0]);
      if(!old||old[1]!==r[1])byDate.set(r[0],r);
    }
    out[key]=[...byDate.values()].sort((a,b)=>a[0].localeCompare(b[0]));
  }
  return out;
}

// Une source est considérée en échec prolongé au-delà de 48 heures.
export function sourceAlerts(status,now=new Date()){
  if(!validStatus(status))return [];
  return Object.entries(status.sources).filter(([,s])=>!s.ok).map(([id,s])=>({id,...s,
    long:!!s.failingSince&&now-new Date(s.failingSince)>48*3600e3}));
}
