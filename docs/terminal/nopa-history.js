// NOPA · millions de boisseaux et millions de livres, tels que publiés par les sources citées.
const references=[
  ["ADM Investor Services · 18 fév. 2026","https://www.admis.com/global-ag-news-for-feb-18-2026/"],
  ["NEW Cooperative · 16 avr. 2025","https://www.newcoop.com/wp-content/uploads/2025/04/Bulls-and-Bears-04162025.pdf"],
  ["ADM Investor Services · 16 avr. 2026","https://www.admis.com/global-ag-news-for-april-16-2026/"],
  ["Reuters · 15 mai 2026","https://www.reuters.com/business/nopa-april-us-soybean-crush-below-most-estimates-211856-mln-bushels-2026-05-15/"],
  ["StoneX · Mai 2025","https://www.stonex.com/en/insights/nopa-soybean-crush-summary---may-2025/"],
  ["ADM Investor Services · 18 août 2025","https://www.admis.com/global-ag-news-for-aug-18-2025/"],
  ["Reuters et Barchart · 15 oct. 2025","https://finance.yahoo.com/news/soybeans-popping-higher-large-nopa-172026161.html"],
  ["StoneX · Novembre 2025","https://www.stonex.com/en-gb/insights/canada-know-risk-market-outlook-nopa-bearish-oilseeds/"],
  ["Martinson Ag · Juin 2026","https://martinsonag.com/soybean-weekly-comments-june-18/"],
  ["StoneX · 15 juil. 2026","https://www.stonex.com/en-us/insights/cme-livestock-daily-options-report-2026-07-15-19-10/"],
  ["Price Futures Group · 18 août 2026","https://blog.pricegroup.com/2026/08/18/grains-report-08-18-2026/"],
  ["Teucrium · Septembre 2026","https://blog.teucrium.com/teucrium-insights/grains-sugar-weekly-09/18/2026"],
  ["Barchart · 15 oct. 2026","https://finance.yahoo.com/markets/commodities/articles/soybeans-fading-another-round-chinese-170940520.html"],
];
const reported=[
  ["2025-01",200.383,1274,0],
  ["2025-02",177.87,1503,1],
  ["2025-03",194.551,1498,2],
  ["2025-04",190.226,1527,3],
  ["2025-05",192.3,1373,4],
  ["2025-06",185.27,1384,5],
  ["2025-07",195.699,1379,5],
  ["2025-08",189.81,1245,6],
  ["2025-09",197.863,1243,6],
  ["2025-10",227.6,1305,7],
  ["2025-11",216,1513,7],
  ["2025-12",224.991,1642,0],
  ["2026-01",221.564,1900,0],
  ["2026-02",208.785,2080,2],
  ["2026-03",226.161,2039,2],
  ["2026-04",211.856,1947,3],
  ["2026-05",208.8,1735,8],
  ["2026-06",214.34,1501,9],
  ["2026-07",216.647,1360,10],
  ["2026-08",205.456,1201,11],
  ["2026-09",196.3,1053,12],
];

export const nopaReport='https://www.nopa.org/resources/nopa-monthly-crush-report/';
export const nopaHistory=new Map(reported.map(([month,crush,stocks,ref])=>[
  month,{crush:crush*0.0272155422,stocks:stocks*0.00045359237,source:references[ref]},
]));
