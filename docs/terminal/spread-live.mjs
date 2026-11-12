// Prix des spreads et marges : copie intégrée au site, complétée par la branche prices-live
// qu’actualise la tâche GitHub « Actualiser les prix » (scripts/update-prices.py).
// Le chargement attend au plus 3 secondes ; au-delà, le site s’ouvre avec la copie intégrée.
import {spreadPrices as bundled} from './spread-prices.mjs?v=20261112-prix';
import {mergePrices,validLiveFeed,validStatus} from './price-feed.mjs?v=20261112-prix';

const LIVE='https://raw.githubusercontent.com/elchapasso/PROJECT/prices-live/docs/terminal/live/';
async function get(name){
  const response=await fetch(LIVE+name,{cache:'no-cache',signal:AbortSignal.timeout(3000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
}
const [prices,status]=await Promise.allSettled([get('spread-prices.json'),get('price-status.json')]);
const live=prices.status==='fulfilled'&&validLiveFeed(prices.value)?prices.value:null;

export const spreadPrices=mergePrices(bundled,live);
export const priceFeed={
  origin:live?'live':'bundled',
  generatedAt:live?.generatedAt??null,
  status:status.status==='fulfilled'&&validStatus(status.value)?status.value:null,
};
