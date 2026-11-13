// Prix des spreads et marges : copie intégrée au site, complétée par deux branches de données.
// prices-live : sources publiques, actualisées par la tâche GitHub « Actualiser les prix » (scripts/update-prices.py).
// futures-live : contrats à terme relevés chaque jour sur TradingView (scripts/update-futures.py).
// Le chargement attend au plus 3 secondes ; au-delà, le site s’ouvre avec la copie intégrée.
import {spreadPrices as bundled} from './spread-prices.mjs?v=20261113-futures';
import {mergePrices,onlySeries,validLiveFeed,validStatus,FUTURES_SERIES} from './price-feed.mjs?v=20261113-futures';

const RAW='https://raw.githubusercontent.com/elchapasso/PROJECT/';
const LIVE=RAW+'prices-live/docs/terminal/live/';
const FUTURES=RAW+'futures-live/docs/terminal/live/';
async function get(url){
  const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(3000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
}
const [prices,status,futures,futuresStatus]=await Promise.allSettled(
  [get(LIVE+'spread-prices.json'),get(LIVE+'price-status.json'),get(FUTURES+'futures-prices.json'),get(FUTURES+'futures-status.json')]);
const live=prices.status==='fulfilled'&&validLiveFeed(prices.value)?prices.value:null;
const liveFutures=futures.status==='fulfilled'&&validLiveFeed(futures.value)?onlySeries(futures.value,FUTURES_SERIES):null;
const checked=result=>result.status==='fulfilled'&&validStatus(result.value)?result.value:null;

export const spreadPrices=mergePrices(mergePrices(bundled,live),liveFutures);
export const priceFeed={
  origin:live?'live':'bundled',
  generatedAt:live?.generatedAt??null,
  status:checked(status),
  futures:{origin:liveFutures?'live':'bundled',generatedAt:liveFutures?.generatedAt??null,status:liveFutures?checked(futuresStatus):null},
};
