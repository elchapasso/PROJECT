export const balanceSections={
  soy:{title:'Soja',detail:'Soybeans / Soybean oil'},
  sun:{title:'Tournesol',detail:'Sunseed / Sunoil'},
  palm:{title:'Palme',detail:'Palm oil'},
};
export const balanceProducts={soy:'Graines de soja',sbo:'Huile de soja'};
export const balanceOrigins={us:'États-Unis',arg:'Argentine',bra:'Brésil'};
export const balanceRows={
  opening:'Stocks initiaux',production:'Production',imports:'Importations',supply:'Offre totale',
  seed:'Semences et résiduel',exports:'Exportations',crush:'Trituration',bio:'Biodiesel',
  hi:'H&I · Alimentaire et autres usages',use:'Utilisation totale',ending:'Stocks finaux',ratio:'Stocks / utilisation',
};
export const supplyFields=['opening','production','imports'];
export const useFields={soy:['seed','exports','crush'],sbo:['bio','hi','exports']};

const palmRows=[
  ['opening',balanceRows.opening,'14.62 14.59 13.08 14.43 14.86 0.43'],
  ['production',balanceRows.production,'81.85 80.54 84.02 85.8 83.82 -1.98'],
  ['production-id','Indonésie','48.67 46.31 49.72 49.91 48 -1.91','production'],
  ['production-my','Malaisie','18.39 19.71 19.38 20.27 19.55 -0.72','production'],
  ['production-other','Autres pays','14.79 14.52 14.92 15.62 16.27 0.65','production'],
  ['imports',balanceRows.imports,'53.39 48.84 48.46 49.89 47.92 -1.97'],
  ['imports-eu','UE-27','6.47 5.3 4.15 4 3.7 -0.3','imports'],
  ['imports-cn','Chine','6.91 5.38 4.49 5.36 4.7 -0.66','imports'],
  ['imports-in','Inde','10.26 9.08 8.01 8.28 8.17 -0.11','imports'],
  ['exports',balanceRows.exports,'53.58 48.5 49.27 50.4 47.77 -2.63'],
  ['exports-id','Indonésie','30.66 24.7 26.72 26.38 23.4 -2.98','exports'],
  ['exports-my','Malaisie','15.38 16.58 15.62 16 16.3 0.3','exports'],
  ['exports-other','Autres pays','7.54 7.21 6.92 8.02 8.07 0.05','exports'],
  ['consumption','Consommation','81.69 82.4 81.87 84.86 85.91 1.05'],
  ['consumption-eu','UE-27','6.29 5.26 4.09 3.9 3.62 -0.28','consumption'],
  ['consumption-cn','Chine','6.46 5.71 4.61 5.07 4.95 -0.12','consumption'],
  ['consumption-in','Inde','9.65 10.04 8.61 8.73 8.62 -0.11','consumption'],
  ['consumption-id','Indonésie','20.03 21.38 22.54 23.64 25.28 1.64','consumption'],
  ['ending',balanceRows.ending,'14.59 13.08 14.43 14.86 12.92 -1.94'],
  ['ratio',balanceRows.ratio,'17.90% 15.90% 17.60% 17.50% 15.00% -2.50%'],
];
export const palmWorldBalance={
  product:'palm',origin:'world',title:'Huile de palme · Monde',source:'Tableau fourni',
  periods:[['2022/23','22/23'],['2023/24','23/24'],['2024/25','24/25'],['2025/26','25/26'],['2026/27','26/27 F']],
  comparisons:['Δ 26/27 F / 25/26'],
  fields:palmRows.map(([key])=>key),
  labels:Object.fromEntries(palmRows.map(([key,label])=>[key,label])),
  rows:Object.fromEntries(palmRows.map(([key,,values])=>[key,values.split(' ')])),
  parents:Object.fromEntries(palmRows.filter(row=>row[3]).map(([key,,,parent])=>[key,parent])),
};

const american=[['2023/24','23/24'],['2024/25','24/25'],['2025/26','25/26'],['2026/27-10','26/27 · Oct.'],['2026/27-11','26/27 · Nov.']];
const southAmerican=[...american.slice(0,3),['2026/27-lc','26/27 · LC'],['2027/28','27/28']];
function balance(product,origin,source){
  const periods=origin==='us'?american:southAmerican;
  const fields=[...supplyFields,'supply',...useFields[product],'use','ending','ratio'];
  const rows=Object.fromEntries(source.trim().split('\n').map((line,i)=>[fields[i],line.trim().split(/\s+/)]));
  const campaigns=Object.fromEntries(periods.map(([id,label],i)=>[id,{label,
    inputs:Object.fromEntries([...supplyFields,...useFields[product]].map(key=>[key,Number(rows[key][i])])),
  }]));
  const comparisons=origin==='us'?['Δ Nov. / Oct.','Δ Nov. / 25/26']:['Δ 27/28 / 26/27',...(product==='soy'&&origin==='arg'?['Paraguay']:[])];
  return {product,origin,periods,fields,rows,campaigns,comparisons};
}

export const soyBalances={
  'soy-us':balance('soy','us',`
    7.20 9.30 8.84 8.57 8.57 0.00 -0.27
    113.30 119.04 116.00 124.16 124.48 0.32 8.48
    0.60 0.82 0.60 0.68 0.68 0.00 0.08
    121.10 129.16 125.44 133.41 133.73 0.32 8.29
    3.40 2.60 3.62 3.04 3.10 0.06 -0.52
    46.10 51.20 41.25 46.13 46.81 0.68 5.56
    62.20 66.52 72.00 75.66 75.66 0.00 3.66
    111.70 120.32 116.87 124.83 125.57 0.74 8.70
    9.30 8.84 8.57 8.58 8.16 -0.42 -0.41
    8.3% 7.3% 7.3% 6.9% 6.5% -0.37% -0.01
  `),
  'soy-bra':balance('soy','bra',`
    3.7 5.8 4.1 6.8 6.9 0.10
    160.3 154.4 171.5 181.0 183 2.00
    0.2 0.8 1.0 0.9 0.9 0.00
    164.2 161.0 176.6 188.7 190.8 2.10
    2.3 2.3 2.9 3.2 3.3 0.10
    101.9 98.8 108.2 116.0 117.1 1.10
    54.2 55.8 58.7 62.6 63.5 0.90
    158.4 156.9 169.8 181.8 183.9 2.10
    5.8 4.1 6.8 6.9 6.9 0.00
    3.7% 2.6% 4.0% 3.8% 3.8% 0.0%
  `),
  'soy-arg':balance('soy','arg',`
    6.4 3.1 5.3 2.1 5.2 3.10 0.3
    22.5 49.0 51.0 50.4 51.5 1.10 11.1
    10.4 7.2 6.0 7.3 6.9 -0.40 0.0
    39.3 59.3 62.3 59.8 63.6 3.80 11.42
    5.3 5.9 6.0 6.0 6.0 0.00 0.1
    1.9 4.5 12.4 4.6 6 1.40 7.35
    29.0 43.6 41.8 44 44.5 0.50 3.6
    36.2 54.0 60.2 54.6 56.5 1.90 11.1
    3.1 5.3 2.1 5.2 7.1 1.90 0.4
    8.6% 9.8% 3.5% 9.5% 12.6% 3% —
  `),
  'sbo-us':balance('sbo','us',`
    0.70 0.70 0.80 0.75 0.66 -0.09 -0.14
    12.20 13.10 13.87 14.94 14.94 0.00 1.07
    0.30 0.20 0.23 0.31 0.32 0.01 0.09
    13.20 14.00 14.90 16.00 15.92 -0.08 1.02
    5.80 5.30 6.76 8.07 8.07 0.00 1.32
    6.40 6.80 7.04 6.94 6.90 -0.04 -0.14
    0.30 1.10 0.45 0.18 0.18 0.00 -0.26
    12.50 13.20 14.24 15.19 15.15 -0.04 0.91
    0.70 0.80 0.660 0.81 0.77 -0.04 0.11
    5.6% 6.1% 4.6% 5.3% 5.1% -0.27% 0.44%
  `),
  'sbo-bra':balance('sbo','bra',`
    0.5 0.3 0.5 0.7 0.4 -0.28
    10.8 11.3 11.9 12.5 12.7 0.18
    0.0 0.1 0.1 0.1 0.1 0.00
    11.3 11.7 12.5 13.3 13.2 -0.10
    4.6 5.7 6.3 7.1 7.1 0.00
    4.1 4.1 4.1 4.1 4.1 0.00
    2.3 1.4 1.4 1.7 1.7 0.00
    11.0 11.2 11.8 12.9 12.9 0.00
    0.3 0.5 0.7 0.4 0.3 -0.10
    2.6% 4.6% 6.1% 3.3% 2.5% -1%
  `),
  'sbo-arg':balance('sbo','arg',`
    0.2 0.3 0.2 0.4 0.4 0.08
    5.7 8.7 8.2 8.6 8.7 0.10
    0.0 0.0 0.2 0.1 0.1 0.00
    5.9 9.0 8.6 9.0 9.2 0.18
    0.9 1.2 1.0 1.2 1.2 0.00
    0.5 0.6 0.5 0.6 0.6 0.00
    4.2 7.0 6.7 6.8 7 0.20
    5.6 8.8 8.2 8.6 8.8 0.20
    0.26 0.18 0.35 0.43 0.41 -0.02
    4.6% 2.0% 4.3% 5.0% 4.6% -0.4%
  `),
};
