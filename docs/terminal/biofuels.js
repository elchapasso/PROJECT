// EIA · Petroleum Supply Monthly, publication du 30 octobre 2026.
// Valeurs des tableaux historiques EIA, de janvier à décembre, en millions de livres.
// null indique un chiffre masqué par l’EIA ou un mois à venir dans la série.
export const biofuelReleaseDate='2026-10-30';
const millionPoundsToMillionTonnes=0.00045359237;
const sourceSeries={
  soybean:{
    2021:[683,553,749,700,786,680,808,823,779,832,818,938],
    2022:[791,758,919,842,856,810,956,925,932,906,943,886],
    2023:[941,934,952,927,1141,1207,1273,1192,1207,1062,1065,1142],
    2024:[957,891,1029,1063,1083,1270,1139,1217,1076,1232,1197,1166],
    2025:[714,585,875,899,1026,1043,1108,1041,1053,1006,930,859],
    2026:[978,1058,1283,1224,1434,1556,1687,1400,null,null,null,null],
  },
  canola:{
    2021:[null,85,123,null,null,null,123,142,106,116,133,126],
    2022:[65,null,null,102,122,125,133,133,132,167,113,171],
    2023:[242,169,322,257,296,317,296,278,285,286,291,343],
    2024:[376,296,326,357,397,386,546,440,289,452,411,559],
    2025:[197,92,237,139,142,239,219,270,266,258,276,301],
    2026:[189,189,403,365,293,320,330,381,null,null,null,null],
  },
};

export const biofuelSeries=Object.fromEntries(Object.entries(sourceSeries).map(([oil,years])=>[
  oil,Object.entries(years).map(([year,months])=>({
    year,volumes:months.map(value=>value===null?null:value*millionPoundsToMillionTonnes),
  })),
]));
