// Importations chinoises de graines de soja, toutes origines, en millions de tonnes.
// Années civiles, de janvier à décembre. Sources douanières citées par millésime.
const soybeanImports={
  // Sitonia Consulting, tableau mensuel reclassé par année civile.
  2020:[8.008,5.504,4.278,6.715,9.377,11.159,10.093,9.605,9.789,8.679,9.585,7.523],
  // CCB Futures, rapport de février 2022, d’après les douanes chinoises.
  2021:[7.8449,5.5619,7.77,7.448,9.607,10.722,8.67,9.49,6.88,5.11,8.57,8.866],
  // NATESC (janvier–février) et CCB Futures (mars–décembre).
  2022:[8.85,5.09,6.35,8.079,9.674,8.25,7.883,7.166,7.715,4.136,7.35,10.555],
  // NATESC (janvier–février) et Founder CIFCO Futures (mars–décembre).
  2023:[9.13,7.04,6.85,7.26,12.02,10.27,9.73,9.36,7.15,5.16,7.92,9.82],
  // Sitonia Consulting (2024 et janvier–juin 2025), CBPA (juillet–décembre 2025).
  2024:[7.92,5.12,5.541,8.57,10.222,11.11,9.853,12.14,11.37,8.09,7.15,7.941],
  2025:[7.78,5.83,3.503,6.08,13.92,12.26,11.666,12.279,12.869,9.482,8.107,8.044],
  // MOFCOM et CBPA, avec les données détaillées de juillet (CLAL, Fastmarkets).
  2026:[6.571,5.976,4.019,8.478,11.791,13.547,11.77,12.141,11.88,null,null,null],
};

export const chinaSoybeanImports=Object.entries(soybeanImports).map(([year,volumes])=>({year,volumes}));

export const chinaSoybeanSources=[
  ['Sitonia · Historique 2020, 2024–25','https://sitoniaconsulting.com/wp-content/uploads/2025/09/China-Soybean-Update-August-2025.pdf'],
  ['CCB Futures · 2021','https://www.ccbfutures.com/upload/20220209/20220209093549317.pdf'],
  ['NATESC · 2022','https://www.natesc.org.cn/admin/UeditorUploadFiles/file/20230427/6381820919263671875837524.pdf'],
  ['CCB Futures · 2022','https://www.ccbfutures.com/upload/20230303/20230303170622870.pdf'],
  ['NATESC · Jan.–fév. 2023','https://www.natesc.org.cn/admin/UeditorUploadFiles/file/20230427/6381820927652734373875818.pdf'],
  ['Founder CIFCO · 2023','https://www.cfachina.org/servicesupport/analygarden/ncpl/dp_5802/202403/P020240322392939465103.pdf'],
  ['CBPA · 2025–26','https://www.cbpanet.com/dzp_news.aspx?bigid=3&smallid=40'],
  ['MOFCOM · Fév. 2026','https://fdi.mofcom.gov.cn/come-datatongji-con.html?id=16735'],
  ['Fastmarkets · Juil. 2026','https://www.fastmarkets.com/insights/china-july-agricultural-imports-soybean-arrivals-ease-sorghum-stays-strong-and-corn-rebounds/'],
];
