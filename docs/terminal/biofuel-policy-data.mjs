export const reviewedOn = '2026-11-13';

export const sources = {
  epaHistory: ['EPA · Mandats historiques', 'https://www.epa.gov/renewable-fuel-standard/renewable-fuel-annual-standards'],
  epaFinal: ['EPA · Règle finale Set 2', 'https://www.epa.gov/renewable-fuel-standard/final-renewable-fuel-standards-2026-and-2027'],
  epaGeneration: ['EPA · Fichiers EMTS de génération', 'https://www.epa.gov/fuels-registration-reporting-and-compliance-help/spreadsheet-rin-generation-data-renewable-fuel'],
  epaAvailable: ['EPA · RIN disponibles par millésime', 'https://www.epa.gov/fuels-registration-reporting-and-compliance-help/spreadsheet-available-rins-date-renewable-fuel'],
  farmdoc: ['University of Illinois · farmdoc daily, figure 1', 'https://farmdocdaily.illinois.edu/2026/11/rewriting-the-rfs-playbook-the-coming-battle-over-the-2027-biomass-based-diesel-rvos.html'],
  eia: ['EIA · Matières premières, publication du 30 octobre 2026', 'https://www.eia.gov/dnav/pet/pet_pnp_feedbiofuel_dcu_nus_m.htm'],
  eiaBd: ['EIA · SBO dans les usines de biodiesel', 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=M&n=PET&s=M_EPOOBDSOD_YIFBP_NUS_MMLB'],
  eiaRd: ['EIA · SBO dans les usines de renewable diesel', 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=M&n=PET&s=M_EPOOBDSOR_YIFBP_NUS_MMLB'],
  idHistory: ['ESDM · Historique des livraisons', 'https://www.esdm.go.id/id/media-center/arsip-berita/mandatori-biodiesel-perkuat-ketahanan-energi-pemerintah-targetkan-stop-impor-solar-2026'],
  idAllocation: ['ESDM · Allocation initiale 2026', 'https://www.esdm.go.id/id/media-center/arsip-berita/pemerintah-tetapkan-alokasi-biodiesel-tahun-2026-sebesar-1565-juta-kl'],
  idRollout: ['ESDM · Déploiement du B50', 'https://www.esdm.go.id/id/media-center/arsip-berita/kawal-implementasi-b50-kementerian-esdm-perkuat-uji-teknis-dan-dialog-dengan-industri-otomotif'],
  idLatest: ['ANTARA · Déclaration ESDM à l’IPOC', 'https://www.antaranews.com/berita/5850819/pemerintah-kaji-kecukupan-bahan-baku-b50-untuk-2027'],
  idDate: ['Reuters · Cumul au 10 novembre 2026', 'https://www.newsx.com/world/update-1-indonesian-2026-biodiesel-consumption-reaches-1384-million-kl-as-of-november-10-official-says/'],
  gapkiYear: ['GAPKI · Bilan 2025', 'https://gapki.id/news/2026/03/13/kinerja-sawit-2025-menguat-produksi-naik-ekspor-tembus-rp590-triliun/'],
  gapkiFeb: ['GAPKI · Janvier–février', 'https://gapki.id/news/2026/04/21/kinerja-sawit-februari-2026-melesat-produksi-konsumsi-ekspor-naik-stok-menipis/'],
  gapkiApr: ['GAPKI · Mars–avril', 'https://gapki.id/news/2026/06/29/kinerja-industri-sawit-indonesia-april-2026-menguat-produksi-dan-ekspor-naik-signifikan/'],
  gapkiJun: ['GAPKI · Mai–juin', 'https://gapki.id/news/2026/08/26/ekspor-sawit-indonesia-melonjak-64-pada-juni-2026-produksi-dan-konsumsi-ikut-naik/'],
  gapkiAug: ['GAPKI · Juillet–août', 'https://gapki.id/news/2026/10/10/ekspor-sawit-agustus-2026-naik-1256-stok-turun/'],
  gapkiYtd: ['GAPKI · Cumul janvier–août 2026', 'https://gapki.id/news/2026/10/12/ipoc-2026-bahas-prospek-industri-sawit-dan-harga-minyak-nabati-2027/'],
  gapkiForecast: ['GAPKI · Projections 2026 / 2027', 'https://gapki.id/news/2026/09/21/produksi-cpo-cukup-untuk-b50-tetapi-produktivitas-harus-jadi-kunci-menjaga-ekspor/'],
};

export const historicalGallons = [
  [2010, 1.15], [2011, .80], [2012, 1], [2013, 1.28], [2014, 1.63], [2015, 1.73],
  [2016, 1.90], [2017, 2], [2018, 2.10], [2019, 2.10], [2020, 2.43], [2021, 2.43],
  [2022, 2.76], [2023, 2.82], [2024, 3.04], [2025, 3.35],
];

// Obligations BBD en vigueur, réallocation adoptée incluse, en millions de RIN.
export const adoptedBbdMandates = [[2026, 9070], [2027, 9200]];

// Série nette publiée par farmdoc à partir d’EMTS, arrondie au million.
export const netD4 = [436, 478, 652, 709, 735, 838, 793, 714, 786]
  .map((value, index) => ['2026-' + String(index + 1).padStart(2, '0'), value]);

// EIA, millions de livres, tableaux des deux filières. Les totaux sont
// publiés indépendamment et peuvent différer d’un million de livres.
export const soyByFacility = {
  biodiesel: {
    2022: [543,537,657,578,594,560,626,643,596,640,594,534],
    2023: [557,536,592,579,663,627,679,618,620,645,613,603],
    2024: [549,524,550,509,604,582,642,636,673,709,724,697],
    2025: [384,425,501,575,581,533,593,592,590,568,509,485],
    2026: [541,577,697,686,747,790,816,775],
  },
  renewableDiesel: {
    2022: [248,222,262,264,262,250,331,282,337,266,350,352],
    2023: [384,398,360,348,478,580,594,575,587,417,452,539],
    2024: [408,367,479,553,479,689,497,581,403,523,473,469],
    2025: [330,160,374,324,445,509,516,449,464,438,421,374],
    2026: [437,481,587,537,687,766,871,625],
  },
};

// GAPKI, milliers de tonnes. Pas d’interpolation entre publications.
export const palmMonthly = [
  ['2026-01', 1068, 'gapkiFeb'], ['2026-02', 1144, 'gapkiFeb'],
  ['2026-03', 1056, 'gapkiApr'], ['2026-04', 1137, 'gapkiApr'],
  ['2026-05', 1035, 'gapkiJun'], ['2026-06', 1131, 'gapkiJun'],
  ['2026-07', 1285, 'gapkiAug'], ['2026-08', 1350, 'gapkiAug'],
];
export const palmForecast = [
  ['2024', 11.447, 'Observé · GAPKI', 'gapkiYear'],
  ['2025', 12.704, 'Observé · GAPKI', 'gapkiYear'],
  ['2026', 14.69, 'Estimation annuelle · GAPKI', 'gapkiForecast'],
  ['2027', 17.4, 'Scénario B50 sur douze mois · GAPKI', 'gapkiForecast'],
];
export const indonesiaDeliveries = [
  ['2021', 9.3, null, 'B30', 'idHistory'],
  ['2022', 10.4, null, 'B30', 'idHistory'],
  ['2023', 12.3, null, 'B35 dès février', 'idHistory'],
  ['2024', 13.2, null, 'B35', 'idHistory'],
  ['2025', 14.2, null, 'B40', 'idHistory'],
  ['2026', 13.84, 16.75, 'B40 → B50 · cumul au 10 novembre', 'idLatest'],
];
export const initialAllocation2026 = 15.646372;

// Catégories sélectionnées du tableau EIA, de mars à août 2026 (Mlb).
// Cette comparaison n’est pas un total de toutes les matières premières.
export const substituteSeries = [
  ['Suif animal', [559,660,796,754,771,511]],
  ['Yellow grease (dont huiles usagées)', [314,471,605,689,610,607]],
];

// Estimation du stock agrégé D4 + D5 en début d’année, farmdoc tableau 1.
export const bankEstimates = [[2023,250],[2024,1200],[2025,2610],[2026,1890],[2027,180]];
