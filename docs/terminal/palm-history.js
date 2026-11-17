// Observations mensuelles en tonnes, dans l’ordre des séries affichées.
export const mpobHistory=[
  ["2024-01",2020394,1402355,1349369],
  ["2024-02",1920346,1259382,1025538],
  ["2024-03",1712657,1392471,1329120],
  ["2024-04",1744873,1501905,1236523],
  ["2024-05",1753665,1704495,1385079],
  ["2024-06",1831571,1615283,1210309],
  ["2024-07",1754605,1840999,1696239],
  ["2024-08",1883465,1893859,1535194],
  ["2024-09",2012110,1821933,1559639],
  ["2024-10",1885194,1797348,1744333],
  ["2024-11",1835641,1621294,1490357],
  ["2024-12",1708756,1486942,1341784],
  ["2025-01",1580934,1239895,1179907],
  ["2025-02",1509942,1188443,996472],
  ["2025-03",1563831,1387616,1005641],
  ["2025-04",1865536,1686379,1104384],
  ["2025-05",1982895,1771621,1407595],
  ["2025-06",2031249,1692370,1260973],
  ["2025-07",2113881,1812467,1328798],
  ["2025-08",2201618,1854756,1326991],
  ["2025-09",2359572,1840983,1429575],
  ["2025-10",2508396,2043886,1696495],
  ["2025-11",2835578,1935510,1204150],
  ["2025-12",3051147,1829549,1331850],
  ["2026-01",2814199,1576013,1453143],
  ["2026-02",2702296,1284881,1075944],
  ["2026-03",2269173,1376672,1509953],
  ["2026-04",2307480,1629739,1292568],
  ["2026-05",2426093,1515912,1133948],
  ["2026-06",2541642,1638475,1215850],
  ["2026-07",2628213,1792596,1399547],
  ["2026-08",2819061,1817499,1275349],
  ["2026-09",3510555,2116950,1097074],
  ["2026-10",3621164,2153701,1708670],
];

// Les groupes palme, tournesol et soja suivent le périmètre SEA India.
export const seaHistory=[
  ["2024-01",782983,220079,188859],
  ["2024-02",497824,297092,172936],
  ["2024-03",485354,445723,218604],
  ["2024-04",684094,234801,385514],
  ["2024-05",763300,410727,324016],
  ["2024-06",786134,465647,275700],
  ["2024-07",1081730,366541,391791],
  ["2024-08",797482,284108,454639],
  ["2024-09",527314,152803,384382],
  ["2024-10",845682,239116,341818],
  ["2024-11",842872,346754,423987],
  ["2024-12",501974,270847,456769],
  ["2025-01",276771,294652,506433],
  ["2025-02",374901,234916,353255],
  ["2025-03",425563,197074,422189],
  ["2025-04",322218,185482,437864],
  ["2025-05",593221,187485,473436],
  ["2025-06",956519,219486,421143],
  ["2025-07",858922,202739,553276],
  ["2025-08",994384,261151,416391],
  ["2025-09",833017,275386,549240],
  ["2025-10",602381,260548,454619],
  ["2025-11",634825,145975,418300],
  ["2025-12",509008,353334,547226],
  ["2026-01",768889,272271,331258],
  ["2026-02",851426,147765,347071],
  ["2026-03",693219,199262,343077],
  ["2026-04",517411,436795,411912],
  ["2026-05",552274,298176,542399],
  ["2026-06",491361,245390,430260],
  ["2026-07",732965,255639,560881],
  ["2026-08",782761,160639,628736],
  ["2026-09",817884,108837,614965],
];

export const mpobHistorySources=[
  ['MPOB 2024','https://bepi.mpob.gov.my/stat/web_internal.php?val=202484'],
  ['MPOB 2025','https://bepi.mpob.gov.my/stat/web_internal.php?val=202584'],
  ['MPOB 2026','https://bepi.mpob.gov.my/stat/web_report1.php?val=202684'],
];

export const seaHistorySources=[
  ['SEA India EC-154','https://seaofindia.com/wp-content/uploads/2024/10/EC-154-dt-.-13.11.2024-Import-of-Edible-Oil-Nov.23-to-Oct.24.pdf'],
  ['SEA India EC-170','https://seaofindia.com/wp-content/uploads/2025/10/EC-170-dt.-13.11.2025-Import-of-Veg.-Oils-Nov.24-Oct.25.pdf'],
  ['SEA India EC-162','https://seaofindia.com/wp-content/uploads/2026/09/EC-162-dt.-15.10.2026-Import-of-Veg-Oil-Nov.25-Sept.26.pdf'],
];


// Indonésie · bilans mensuels GAPKI, en milliers de tonnes (ribu ton), dernière révision publiée.
// Colonnes : mois, production CPO, production PKO, consommation alimentaire, oléochimie, biodiesel,
// consommation intérieure totale, exportations totales, stock fin de mois, communiqué du mois.
// null : chiffre non publié. GAPKI n’a pas diffusé de bilan mensuel pour novembre et décembre 2025
// (seul le bilan annuel donne le stock de fin 2025), ni le stock de fin janvier et de fin juillet 2026.
const gapkiNews='https://gapki.id/news/';
export const gapkiHistory=[
  ["2024-01",4232,402,800,187,957,1942,2810,3032,gapkiNews+'2024/04/01/ekspor-tertinggi-ke-uni-eropa-naik-1463-persen-pada-januari-2024/'],
  ["2024-02",3883,369,769,175,920,1864,2166,3264,gapkiNews+'2024/05/01/produksi-ekspor-turun-stok-naik/'],
  ["2024-03",4102,391,827,187,884,1898,2560,3300,gapkiNews+'2024/05/29/produksi-ekspor-hingga-konsumsi-cpo-meningkat-begini-kata-gapki/'],
  ["2024-04",4115,393,862,188,842,1893,2178,3741,gapkiNews+'2024/06/24/ekspor-turun-stok-meningkat/'],
  ["2024-05",3885,368,849,187,907,1943,1966,4092,gapkiNews+'2024/07/30/produksi-ekspor-turun-stok-meningkat/'],
  ["2024-06",3691,354,850,192,898,1940,3385,2818,gapkiNews+'2024/08/29/ekspor-melonjak-stok-turun/'],
  ["2024-07",3617,344,810,185,1035,2030,2241,2513,gapkiNews+'2024/09/25/produksi-turun-stok-kembali-turun/'],
  ["2024-08",3986,391,898,183,979,2060,2384,2450,gapkiNews+'2024/10/22/produksi-ekspor-naik-stok-berkurang/'],
  ["2024-09",4021,394,865,190,934,1989,2260,2622,gapkiNews+'2024/11/21/ekspor-menurun-stok-bertambah/'],
  ["2024-10",4423,420,845,186,1052,2083,2888,2502,gapkiNews+'2024/12/24/produksi-dan-ekspor-naik-stok-berkurang/'],
  ["2024-11",4333,412,869,167,994,2030,2637,2583,gapkiNews+'2025/01/24/produksi-dan-ekspor-turun-stok-meningkat/'],
  ["2024-12",3876,361,961,180,1046,2187,2060,2577,'https://gapki.id/en/news/2025/03/07/production-drops-indonesian-market-shrinks/'],
  ["2025-01",3828,356,758,197,916,1871,1960,2936,gapkiNews+'2025/03/27/konsumsi-ekspor-turun-stok-naik/'],
  ["2025-02",3789,354,854,175,1003,2032,2803,2249,gapkiNews+'2025/04/30/sawit-februari-2025-produksi-turun-ekspor-melejit/'],
  ["2025-03",4391,417,889,182,1097,2168,2876,2017,gapkiNews+'2025/05/31/stok-cpo-turun-produksi-dan-konsumsi-dalam-negeri-naik-tajam-di-maret-2025/'],
  ["2025-04",4479,425,871,183,1046,2100,1779,3046,gapkiNews+'2025/06/24/produksi-cpo-naik-ekspor-anjlok/'],
  ["2025-05",4165,396,803,187,1039,2029,2664,2916,gapkiNews+'2025/07/23/produksi-cpo-turun-di-mei-2025-tapi-ekspor-sawit-indonesia-naik-4975-tembus-us-282-miliar/'],
  ["2025-06",4823,465,800,192,1080,2072,3606,2530,gapkiNews+'2025/08/21/ekspor-sawit-indonesia-juni-2025-meroket-35/'],
  ["2025-07",5113,493,798,185,1051,2034,3537,2568,gapkiNews+'2025/09/24/produksi-bertahan-tinggi-ekspor-turun/'],
  ["2025-08",5062,481,806,183,1111,2100,3473,2543,gapkiNews+'2025/10/29/konsumsi-meningkat-ekspor-turun/'],
  ["2025-09",3932,366,793,190,1070,2053,2200,2592,gapkiNews+'2025/11/27/harga-naik-ekspor-sawit-merosot-analisis-kinerja-september-2025/'],
  ["2025-10",4352,405,835,192,1200,2227,2796,2333,gapkiNews+'2025/12/19/produksi-cpo-naik-10-ekspor-sawit-capai-us-329-miliar-di-oktober-2025/'],
  ["2025-11",null,null,null,null,null,null,null,null,gapkiNews+'2026/03/13/kinerja-sawit-2025-menguat-produksi-naik-ekspor-tembus-rp590-triliun/'],
  ["2025-12",null,null,null,null,null,null,null,2068,gapkiNews+'2026/03/13/kinerja-sawit-2025-menguat-produksi-naik-ekspor-tembus-rp590-triliun/'],
  ["2026-01",4778,458,846,190,1068,2104,3081,null,gapkiNews+'2026/04/21/kinerja-sawit-februari-2026-melesat-produksi-konsumsi-ekspor-naik-stok-menipis/'],
  ["2026-02",5015,485,986,175,1144,2305,3297,2026,gapkiNews+'2026/04/21/kinerja-sawit-februari-2026-melesat-produksi-konsumsi-ekspor-naik-stok-menipis/'],
  ["2026-03",4403,418,897,162,1056,2115,2168,2568,gapkiNews+'2026/05/25/anjlok-serentak-produksi-konsumsi-dan-ekspor-sawit-turun-di-maret-2026-apa-penyebabnya/'],
  ["2026-04",4479,424,831,173,1137,2141,2777,2558,gapkiNews+'2026/06/29/kinerja-industri-sawit-indonesia-april-2026-menguat-produksi-dan-ekspor-naik-signifikan/'],
  ["2026-05",4165,387,856,187,1035,2078,1996,3042,gapkiNews+'2026/07/15/ekspor-sawit-turun-28-stok-cpo-nasional-capai-304-juta-ton/'],
  ["2026-06",4823,449,878,192,1131,2201,3275,2844,gapkiNews+'2026/08/26/ekspor-sawit-indonesia-melonjak-64-pada-juni-2026-produksi-dan-konsumsi-ikut-naik/'],
  ["2026-07",4904,466,805,185,1285,2275,3188,null,gapkiNews+'2026/10/10/ekspor-sawit-agustus-2026-naik-1256-stok-turun/'],
  ["2026-08",4880,464,775,180,1350,2304,3588,2214,gapkiNews+'2026/10/10/ekspor-sawit-agustus-2026-naik-1256-stok-turun/'],
];

// Bilans annuels GAPKI (milliers de tonnes) : contrôle des cumuls mensuels.
export const gapkiAnnual={
  2024:{cpo:48164,pko:4598,food:10205,oleo:2207,biodiesel:11447,consumption:23859,exports:29535,stock:2577,
    url:'https://gapki.id/en/news/2025/03/07/production-drops-indonesian-market-shrinks/'},
  2025:{cpo:51660,pko:4893,food:9834,oleo:2234,biodiesel:12704,consumption:24772,exports:32343,stock:2068,
    url:gapkiNews+'2026/03/13/kinerja-sawit-2025-menguat-produksi-naik-ekspor-tembus-rp590-triliun/'},
};

export const gapkiRelease={period:'2026-08',published:'2026-10-09',url:gapkiNews+'2026/10/10/ekspor-sawit-agustus-2026-naik-1256-stok-turun/'};

export const gapkiHistorySources=[
  ['GAPKI · Communiqués mensuels','https://gapki.id/en/news/category/press-release/'],
  ['GAPKI · Bilan 2025','https://gapki.id/news/2026/03/13/kinerja-sawit-2025-menguat-produksi-naik-ekspor-tembus-rp590-triliun/'],
  ['GAPKI · Août 2026','https://gapki.id/news/2026/10/10/ekspor-sawit-agustus-2026-naik-1256-stok-turun/'],
];
