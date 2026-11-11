
export const AS_OF = '2026-11-11';
export const labels = {
  impact: {positive:'Haussier',negative:'Baissier',mixed:'Mixte',neutral:'Neutre'},
  horizon: {short:'Court terme',medium:'Moyen terme',long:'Long terme'},
  status: {confirmed:'Confirmé',estimate:'Estimation',consensus:'Consensus',projection:'Projection',rumor:'Rumeur',pending:'À confirmer'},
  category: {supply:'Offre',demand:'Demande',stocks:'Stocks',trade:'Commerce',energy:'Énergie',geo:'Géopolitique',weather:'Météo',logistics:'Logistique',policy:'Politique',fx:'Devises'},
  intensity: {1:'Faible',2:'Modérée',3:'Forte'},
};
export const products = {
  sbo:'Huile de soja',soy:'Graines de soja',sm:'Tourteau de soja',
  sfo:'Huile de tournesol',sun:'Graines de tournesol',sfm:'Tourteau de tournesol',
  palm:'Huile de palme (CPO)',rbd:'Palme raffinée (RBD)',olein:'Oléine de palme',pko:'Huile de palmiste (PKO)',
  rso:'Huile de colza',rape:'Graines de colza',rsm:'Tourteau de colza',canola:'Canola',
  energy:'Énergie',bio:'Biocarburants',fx:'Devises',freight:'Fret maritime',
};
export const origins = {us:'États-Unis',arg:'Argentine',bra:'Brésil',chn:'Chine',ind:'Inde',eu:'Union européenne',ukr:'Ukraine',rus:'Russie',bgr:'Bulgarie',rou:'Roumanie',sea:'Mer Noire',mys:'Malaisie',idn:'Indonésie',can:'Canada',aus:'Australie',mar:'Maroc',world:'Monde'};
export const groups = {
  soy:{name:'Complexe soja',products:['sbo','soy','sm'],origins:['us','arg','bra','chn','ind','eu'],watch:['USDA WASDE et Crop Progress','Crush et stocks NOPA','Ventes USDA et demande chinoise','CONAB, ANEC et Bolsa de Cereales','EPA, CBOT et marges de crush'], channels:[
    ['Offre','Une récolte plus rapide peut accélérer les livraisons aux usines. Une hausse du crush augmente en parallèle l’offre d’huile et de tourteau.'],
    ['Demande','Le biodiesel américain et les achats indiens absorbent l’huile. Les achats chinois de graines modifient la géographie du crush.'],
    ['Stocks','Des stocks d’huile bas renforcent les tensions à court terme si les stocks commerciaux et la production ne compensent pas.'],
    ['Commerce','Comparer des prix FOB à date et qualité équivalentes avant d’interpréter l’écart Argentine / États-Unis.']
  ]},
  sun:{name:'Complexe tournesol',products:['sfo','sun','sfm'],origins:['ukr','rus','bgr','rou','eu','sea'],watch:['Surfaces, rendement et récolte','Trituration et stocks','FOB mer Noire','Taxes russes et continuité portuaire','Spreads SFO / SBO / CPO'],channels:[
    ['Graines','Les surfaces et rendements déterminent le potentiel de production. Une rétention des ventes de graines peut maintenir les coûts des triturateurs.'],
    ['Huile','La disponibilité exportable dépend du crush, des stocks, des taxes et des capacités de chargement.'],
    ['Demande','Les acheteurs indiens et européens peuvent arbitrer vers le soja ou la palme lorsque le tournesol se renchérit.'],
    ['Commerce','Une perturbation portuaire peut tendre l’huile FOB même si le bilan de graines s’améliore.']
  ]},
  palm:{name:'Complexe palme',products:['palm','rbd','olein','pko'],origins:['mys','idn','ind','chn'],watch:['MPOB et estimations avant publication','Inspections ITS / AmSpec','Stocks et flux GAPKI','Mandats B40 / B50','Importations SEA India et spreads'],channels:[
    ['Offre','La production et les rendements varient avec la saison, les pluies et la disponibilité de main-d’œuvre.'],
    ['Demande','Les mandats biodiesel peuvent retenir du CPO en Indonésie. Le prix relatif influence les achats indiens et chinois.'],
    ['Stocks','Un gonflement des stocks malaisiens peut peser sur le FCPO, en particulier si les exportations ralentissent.'],
    ['Commerce','Comparer la parité import par grade et origine, y compris droits et fret.']
  ]},
  rape:{name:'Colza & canola',products:['rso','rape','rsm','canola'],origins:['eu','can','aus','ukr','chn'],watch:['Production UE / Canada / Australie / Ukraine','Trituration et stocks','Importations et exportations','Biodiesel européen','Prix européens et canadiens'],channels:[
    ['Offre','Les récoltes UE et Canada modifient le coût des graines et le taux d’utilisation des usines.'],
    ['Demande','La demande de biodiesel européenne et la consommation alimentaire soutiennent l’écoulement de l’huile.'],
    ['Stocks','Surveiller les stocks de graines et d’huile séparément pour distinguer la pression amont et le marché physique.'],
    ['Commerce','La compétitivité du colza dépend des prix du soja et du tournesol ainsi que des spécifications requises.']
  ]},
  macro:{name:'Énergie, FX & géopolitique',products:['energy','bio','fx','freight'],origins:Object.keys(origins),watch:['Brent, WTI, ICE Gasoil et Heating Oil','EPA, HVO et SAF','Mer Noire, mer Rouge et Ormuz','Fed, EUR/USD, USD/MAD, USD/BRL, USD/ARS et USD/CNY','Fret, sanctions et droits'],channels:[
    ['Énergie','Le diesel et les crédits réglementaires modifient la marge de transformation des huiles en carburants.'],
    ['Logistique','Les détours et surcoûts d’assurance peuvent augmenter le prix rendu et ralentir les arrivées.'],
    ['Devises','Un dollar plus fort renchérit le coût rendu en devise locale pour les importateurs à prix USD inchangé.'],
    ['Politique','Un mandat n’implique une hausse d’usage de l’huile que si la filière dispose de capacités et que cette huile reste compétitive.']
  ]},
};
const archive='https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026';
export const sources = {
  'Banque mondiale':{url:archive+'/world-bank-commodities-price-data-the-pink-sheet',scope:'Prix physiques mensuels · Pink Sheet'},
  'USDA WASDE':{url:'https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report',scope:'Bilans, projections, révisions et calendrier'},
  'Forex Factory':{url:'https://www.forexfactory.com/calendar',scope:'Calendrier économique · annonces USD et EUR à fort impact'},
  'USDA NASS':{url:'https://esmis.nal.usda.gov/publication/crop-progress',scope:'Semis, état des cultures et récolte'},
  'USDA FAS':{url:'https://www.fas.usda.gov/data/oilseeds-world-markets-and-trade',scope:'Bilans mondiaux des graines, huiles et tourteaux'},
  'USDA Export Sales':{url:'https://www.fas.usda.gov/programs/export-sales-reporting-program',scope:'Ventes et expéditions américaines'},
  NOPA:{url:'https://www.nopa.org/resources/nopa-monthly-crush-report/',scope:'Crush et stocks américains · données détaillées sous licence'},
  'StoneX (NOPA)':{url:'https://www.stonex.com/en-gb/insights/canada-know-risk-market-outlook-bearish-nopa-report-sends-oilseeds-lower/',scope:'Reprise publique du rapport NOPA'},
  MPOB:{url:'https://bepi.mpob.gov.my/',scope:'Production, stocks et échanges de palme malaisiens'},
  'Bernama (Reuters)':{url:'https://bernama.com/en/news.php?id=2631217',scope:'Reprise publique du consensus Reuters'},
  Bernama:{url:'https://bernama.com/en/news.php?id=2631217',scope:'Clôtures Bursa publiées par la presse'},
  GAPKI:{url:'https://gapki.id/',scope:'Production, stocks et exportations indonésiens'},
  CONAB:{url:'https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/safra-de-graos',scope:'Estimations et suivi des cultures brésiliennes'},
  ANEC:{url:'https://anec.com.br/',scope:'Estimations des exportations brésiliennes'},
  'Bolsa de Cereales':{url:'https://www.bolsadecereales.com/',scope:'Estimations et suivi des cultures argentines'},
  'SEA India':{url:'https://seaofindia.com/',scope:'Importations indiennes et arbitrages entre huiles'},
  'Oil World':{url:'https://www.oilworld.biz/',scope:'Données et analyses sous licence'},
  Reuters:{url:'https://www.reuters.com/markets/commodities/',scope:'Actualités et consensus · selon accès'},
  LSEG:{url:'https://www.lseg.com/en/data-analytics',scope:'Prix, actualités et séries sous licence'},
  'ITS / AmSpec':{url:'https://www.amspecgroup.com/',scope:'Inspections des expéditions'},
  EPA:{url:'https://www.epa.gov/renewable-fuel-standard/final-renewable-fuel-standards-2026-and-2027',scope:'Volumes réglementaires et dates des règles'},
  Fed:{url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',scope:'Réunions et décisions FOMC'},
  BCE:{url:'https://data.ecb.europa.eu/help/api/data',scope:'Cours de référence via API publique'},
  'Bank Al-Maghrib':{url:'https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-des-changes/Cours-de-reference',scope:'Change USD/MAD'},
  EIA:{url:'https://www.eia.gov/petroleum/',scope:'Pétrole, diesel et stocks américains'},
  CME:{url:'https://www.cmegroup.com/markets/agriculture/oilseeds.html',scope:'CBOT BO, ZS, SM et NYMEX HO'},
  Bursa:{url:'https://www.bursamalaysia.com/trade/our_products_services/derivatives/commodity_derivatives/crude_palm_oil_futures',scope:'Futures FCPO'},
  ICE:{url:'https://www.ice.com/products/219/Low-Sulphur-Gasoil-Futures',scope:'Futures ICE Gasoil'},
  Dalian:{url:'http://www.dce.com.cn/',scope:'Futures chinois soja, huile et tourteau'},
};
export const wb = month => archive+'/related/CMO-Pink-Sheet-'+month+'-2026.pdf';
export const OCT='https://esmis.nal.usda.gov/sites/default/release-files/796099/wasde1026.pdf';
export const SEP='https://esmis.nal.usda.gov/sites/default/release-files/796054/wasde0926.pdf';
const MPOB='https://bepi.mpob.gov.my/stat/web_report1.php?val=202675&val1=09';
const MPOB_OCT='https://bepi.mpob.gov.my/stat/web_report1.php?val=202684';
const FAS='https://apps.fas.usda.gov/psdonline/circulars/oilseeds.pdf';
const CBR='https://www.gov.br/conab/pt-br/assuntos/noticias/primeiro-levantamento-da-safra-de-graos-2026-27-estima-producao-acima-de-367-milhoes-de-toneladas';
const marketPrice=(id,title,product,origin,category,date,period,source,url,summary,number,variation,impact,intensity,horizon,status,transmission,caveat,time='')=>({id,title,product,origin,category,date,period,source,url,summary,number,variation,impact,intensity,horizon,status,transmission,caveat,time});
export const seedEvents = [
  marketPrice('nass-88','Récolte américaine de soja à 88 %','soy','us','supply','2026-11-02','Semaine au 1ᵉʳ nov.','USDA NASS','https://esmis.nal.usda.gov/sites/default/release-files/796135/prog4426.pdf','La récolte de soja a atteint 88 %, après 79 % la semaine précédente.','88 %','+9 pts sur une semaine · +4 pts vs moy. 5 ans','negative',1,'short','confirmed','Le flux de graines vers les usines peut accélérer la trituration et augmenter l’offre d’huile.','Une forte demande de trituration ou des ventes différées des producteurs peuvent absorber ce flux.','16:00 New York'),
  marketPrice('wb-sbo-oct','Huile de soja US à 1 546 USD/t en octobre','sbo','us','trade','2026-11-03','Octobre 2026','Banque mondiale',wb('November'),'Le prix moyen FOB golfe US du soybean oil brut dégommé s’établit à 1 546 USD/t, contre 1 615 en septembre.','1 546 USD/t','−4,3 % m/m','negative',2,'short','confirmed','Un prix FOB plus bas améliore la compétitivité de l’origine US sur le papier.','Comparer les frets, les disponibilités et les spécifications à destination avant de conclure à une substitution.'),
  marketPrice('wb-palm-oct','Palme malaisienne à 1 120 USD/t en octobre','palm','mys','trade','2026-11-03','Octobre 2026','Banque mondiale',wb('November'),'Le repère physique mensuel de la Banque mondiale recule de 1 180 à 1 120 USD/t.','1 120 USD/t','−5,1 % m/m','negative',2,'short','confirmed','Un repère palme plus bas peut orienter les achats sensibles au prix vers la palme.','Les droits, le grade, le fret et les usages industriels peuvent réduire l’avantage au rendu.'),
  marketPrice('brent-oct','Le Brent progresse à 125,0 USD/baril','energy','world','energy','2026-11-03','Octobre 2026','Banque mondiale',wb('November'),'Le Brent ressort à 125,0 USD/baril, contre 116,8 en septembre.','125,0 USD/b','+7,0 % m/m','positive',2,'short','confirmed','Un pétrole plus cher peut soutenir les prix des distillats et la valeur relative des biocarburants.','Les crédits et les marges effectives des producteurs peuvent neutraliser ce soutien.'),
  marketPrice('poll-mpob','Le consensus attend 3,75 Mt de stocks de palme','palm','mys','stocks','2026-11-07','Octobre 2026','Bernama (Reuters)',sources['Bernama (Reuters)'].url,'Le sondage Reuters repris par Bernama anticipe 3,75 Mt de stocks fin octobre et 2,20 Mt de production.','3,75 Mt','+6,8 % m/m attendu','negative',2,'short','consensus','Des stocks plus élevés signaleraient une offre immédiatement disponible face à des débouchés insuffisants.','Un chiffre en dessous du consensus peut soutenir le FCPO, même en cas de hausse sur un mois.'),
  marketPrice('fcpo-jan','FCPO janvier 2027 à 4 258 MYR/t','palm','mys','trade','2026-11-07','Clôture du 6 nov. 2026','Bernama',sources.Bernama.url,'Le contrat janvier 2027 a perdu 423 MYR/t d’un vendredi à l’autre.','4 258 MYR/t','−9,0 % sur une semaine','negative',2,'short','confirmed','La baisse du contrat reflète une revalorisation des risques de disponibilité.','Le mouvement de futures ne mesure pas le prix d’un cargo. Le chiffre MPOB peut modifier la réaction du marché.'),
  marketPrice('mpob-oct','Stocks malaisiens de palme à 3,621 Mt fin octobre','palm','mys','stocks','2026-11-10','Octobre 2026','MPOB',MPOB_OCT,'Les stocks augmentent de 3,15 % m/m. La production de CPO atteint 2,154 Mt (+1,74 %) et les exportations de palme 1,709 Mt (+55,75 %).','3,621 Mt','+3,15 % m/m','mixed',3,'short','confirmed','Les stocks continuent de monter mais restent sous le consensus Reuters de 3,75 Mt, tandis que le rebond des exportations soutient la demande.','Les chiffres d’octobre sont provisoires. Les variations utilisent septembre révisé.','12:30'),
  marketPrice('mpob-sep-stock','Stocks malaisiens de palme à 3,51 Mt','palm','mys','stocks','2026-10-12','Septembre 2026','MPOB',MPOB,'Les stocks totaux de palme se chiffrent à 3 510 896 t à fin septembre.','3,51 Mt','+24,54 % m/m','negative',3,'short','confirmed','L’accumulation des stocks augmente l’offre disponible et peut peser sur les prix domestiques et export.','Un rebond des expéditions ou une baisse saisonnière de production réduirait la pression.'),
  marketPrice('mpob-sep-out','Production malaisienne de CPO en hausse','palm','mys','supply','2026-10-12','Septembre 2026','MPOB',MPOB,'Le MPOB indique 2 116 950 t de CPO produites.','2,12 Mt','+16,48 % m/m · +15,0 % a/a','negative',2,'short','confirmed','Davantage de CPO alimente les stocks si les exportations et la consommation locale progressent moins vite.','Vérifier les expéditions et le rythme de production du mois suivant.'),
  marketPrice('mpob-sep-exp','Les exports malaisiens reculent en septembre','palm','mys','trade','2026-10-12','Septembre 2026','MPOB',MPOB,'Les exportations de palme s’établissent à 1 096 946 t.','1,10 Mt','−13,99 % m/m','negative',2,'short','confirmed','Une baisse des expéditions ralentit le déstockage, surtout pendant un mois de production élevée.','Un rebond des achats après baisse des prix pourrait inverser l’effet.'),
  marketPrice('nopa-sep','Stocks NOPA à 1,053 milliard de livres','sbo','us','stocks','2026-10-15','Septembre 2026','StoneX (NOPA)',sources['StoneX (NOPA)'].url,'La reprise publique du rapport NOPA situe les stocks d’huile de soja à 1,053 milliard lb.','1,053 Md lb','Comparaison détaillée non disponible','positive',3,'short','confirmed','Un niveau de stocks faible réduit le tampon des triturateurs si la demande domestique d’huile reste soutenue.','Le prochain crush, les importations et le rythme des usines de biocarburants peuvent atténuer le signal.'),
  marketPrice('us-wasde-soy','WASDE relève la production de soja US','soy','us','supply','2026-10-09','Campagne 2026/27','USDA WASDE',OCT,'La projection de production passe de 4 535 à 4 562 millions de boisseaux.','4 562 M bu','+27 M bu vs sept.','negative',1,'medium','projection','Un volume de graines accru peut faciliter le crush et limiter les tensions sur les matières premières des triturateurs.','Des exportations plus fortes ou des marges défavorables peuvent réduire la transmission vers l’huile.','12:00 New York'),
  marketPrice('us-wasde-oil','Stocks finaux d’huile US revus en baisse','sbo','us','stocks','2026-10-09','Campagne 2026/27','USDA WASDE',OCT,'La projection de stocks finaux d’huile passe de 1 877 à 1 797 millions lb.','1 797 M lb','−80 M lb vs sept.','positive',2,'medium','projection','Une réserve projetée plus faible rend le marché américain plus sensible aux écarts de consommation ou de production.','Une hausse des importations ou de la trituration pourrait reconstituer les stocks.','12:00 New York'),
  marketPrice('us-wasde-bio','Usage biocarburants US projeté à 17,8 Md lb','sbo','us','demand','2026-10-09','Campagne 2026/27','USDA WASDE',OCT,'L’usage d’huile de soja dans les biocarburants est projeté à 17,8 milliards lb, contre 14,8 milliards lb estimés en 2025/26.','17,8 Md lb','+3,0 Md lb vs 2025/26','positive',3,'long','projection','Une absorption domestique accrue réduit la disponibilité exportable toutes choses égales par ailleurs.','Le mix d’intrants, les marges et les importations peuvent limiter la demande effective d’huile de soja.'),
  marketPrice('arg-wasde-exp','USDA relève les exports d’huile d’Argentine','sbo','arg','trade','2026-10-09','Campagne 2026/27','USDA WASDE',OCT,'Les exportations projetées passent de 6,65 à 6,75 Mt et la production de 8,58 à 8,68 Mt.','6,75 Mt','+0,10 Mt vs sept.','negative',2,'medium','projection','Une disponibilité exportable accrue peut peser sur les primes FOB argentines.','Le crush effectif, les prix des graines et les commandes indiennes détermineront le volume réellement offert.'),
  marketPrice('arg-wasde-stock','Stocks finaux argentins projetés à 0,40 Mt','sbo','arg','stocks','2026-10-09','Campagne 2026/27','USDA WASDE',OCT,'Le stock final projeté d’huile recule de 0,50 à 0,40 Mt, malgré une hausse de production.','0,40 Mt','−0,10 Mt vs sept.','positive',2,'medium','projection','Un stock final réduit diminue la capacité à servir des demandes additionnelles.','La prévision reste sensible au profil des exportations et au taux d’utilisation des usines.'),
  marketPrice('ind-wasde','Demande indienne d’huile de soja revue en hausse','sbo','ind','demand','2026-10-09','Campagne 2026/27','USDA WASDE',OCT,'La consommation domestique est projetée à 6,75 Mt, contre 6,65 Mt dans le rapport de septembre.','6,75 Mt','+0,10 Mt vs sept.','positive',1,'medium','projection','Une consommation plus élevée peut renforcer les commandes des origines exportatrices.','Les importations sont inchangées à 5,00 Mt dans cette révision et les substitutions entre huiles restent déterminantes.'),
  marketPrice('cn-wasde','Demande chinoise d’huile de soja revue en baisse','sbo','chn','demand','2026-10-09','Campagne 2026/27','USDA WASDE',OCT,'La consommation d’huile est abaissée de 20,80 à 20,70 Mt, et les importations de 0,20 à 0,15 Mt.','20,70 Mt','−0,10 Mt vs sept.','negative',1,'medium','projection','Une moindre demande réduit la pression sur les disponibilités régionales.','Un changement des marges de crush ou des achats de graines modifierait la disponibilité intérieure.'),
  marketPrice('conab-soy','La CONAB projette 181,6 Mt de soja au Brésil','soy','bra','supply','2026-10-15','Campagne 2026/27','CONAB',CBR,'Le premier relevé estime la récolte de soja à 181,6 Mt sur 49,3 Mha.','181,6 Mt','+0,7 % vs 2025/26','negative',2,'medium','projection','Une récolte en hausse accroît le potentiel d’exportation de graines et la matière disponible pour le crush.','La météo et le calendrier de semis peuvent réviser l’offre effective.','09:00 Brasilia'),
  marketPrice('fas-sun','Le tournesol doit contribuer à la croissance des échanges','sfo','world','trade','2026-09-11','Campagne 2026/27','USDA FAS',FAS,'Le rapport de septembre projette 141 Mt d’exportations mondiales d’huiles et de graines en équivalent huile. Le tournesol et le colza contribuent à la hausse.','141 Mt (ensemble)','+2 % vs 2025/26 (ensemble)','negative',1,'medium','projection','La progression des flux d’huile et de graines peut élargir les alternatives pour les importateurs.','Les contraintes de trituration et d’expédition en mer Noire peuvent freiner la disponibilité immédiate.'),
  marketPrice('fas-rape','Le colza figure parmi les moteurs du commerce 2026/27','rso','world','trade','2026-09-11','Campagne 2026/27','USDA FAS',FAS,'Le USDA met en avant les flux d’huile et de graines de colza dans la progression des exportations mondiales en équivalent huile.','141 Mt (ensemble)','+2 % vs 2025/26 (ensemble)','negative',1,'medium','projection','Davantage de volumes négociables peut accroître la concurrence entre huiles, notamment en Europe.','L’effet dépend de la qualité, de la réglementation et du prix rendu des huiles concurrentes.'),
  marketPrice('epa-rfs','EPA fixe les volumes 2026 et 2027 de diesel biosourcé','bio','us','policy','2026-03-27','Années civiles 2026 et 2027','EPA',sources.EPA.url,'Le total applicable au biomass-based diesel atteint 9,07 milliards de RIN en 2026 et 9,20 en 2027.','9,07 Md RIN en 2026','+0,13 Md RIN en 2027','positive',2,'long','confirmed','Un volume réglementaire plus élevé peut soutenir la demande d’intrants, dont l’huile de soja.','Les RIN sont des crédits. La demande d’huile dépend des intrants concurrents, des rendements et des marges.'),
];
const nopaCalendar='https://www.nopa.org/wp-content/uploads/2026/02/NOPA-ONLY-Crush-Reporting-Release-Dates-2026-FINAL.pdf';
export const seedCalendar = [
  {id:'cal-mpob',date:'2026-11-10',time:'12:30',zone:'Kuala Lumpur (UTC+8)',title:'MPOB · Bilan d’octobre publié',short:'MPOB',source:'MPOB',url:MPOB_OCT,product:'palm',origin:'mys',importance:3,expected:'Stocks 3,621 Mt · CPO 2,154 Mt · exports 1,709 Mt · imports 0,026 Mt',previous:'Stocks septembre 3,51 Mt · production CPO 2,12 Mt',consensus:'Stocks 3,75 Mt · production 2,20 Mt (Reuters via Bernama)',impact:'Stocks sous le consensus → soutien potentiel. Excédent supérieur aux attentes → pression sur les prix.'},
  {id:'cal-wasde',date:'2026-11-10',time:'12:00',zone:'New York (ET)',title:'USDA WASDE · Novembre',short:'WASDE',source:'USDA WASDE',url:sources['USDA WASDE'].url,product:'sbo',origin:'us',importance:3,expected:'Production, crush, usages, commerce et stocks',previous:'Stocks finaux d’huile US 1 797 M lb projetés, 2026/27',consensus:'Non disponible',impact:'Une révision des stocks ou de l’usage en biocarburants peut modifier l’équilibre de l’huile.'},
  {id:'cal-nopa',date:'2026-11-16',time:'12:00',zone:'New York (ET)',title:'NOPA · Crush et stocks d’octobre',short:'NOPA',source:'NOPA',url:nopaCalendar,product:'sbo',origin:'us',importance:3,expected:'Crush et stocks des membres NOPA',previous:'Stocks septembre 1,053 Md lb (StoneX / NOPA)',consensus:'Non disponible',impact:'Stocks inférieurs aux attentes → soutien à l’huile. Crush plus fort → offre additionnelle si la demande ralentit.'},
  {id:'cal-fed',date:'2026-12-09',time:'',zone:'New York (ET)',title:'Fed · Réunion FOMC (8–9 déc.)',short:'FOMC',source:'Fed',url:sources.Fed.url,product:'fx',origin:'us',importance:2,expected:'Décision de taux et projections',previous:'Voir le calendrier FOMC',consensus:'Non disponible',impact:'Une surprise sur les taux peut modifier le dollar et la compétitivité des prix export.'},
  {id:'cal-wasde-dec',date:'2026-12-10',time:'12:00',zone:'New York (ET)',title:'USDA WASDE · Décembre',short:'WASDE',source:'USDA WASDE',url:sources['USDA WASDE'].url,product:'sbo',origin:'us',importance:3,expected:'Mise à jour des bilans de campagne',previous:'Publication de novembre programmée',consensus:'Non disponible',impact:'Surveiller les révisions de récolte et de demande.'},
  ...[['conab','Bilan des cultures','CONAB','soy','bra'],['sea','Importations indiennes','SEA India','palm','ind'],['exports','Ventes export américaines','USDA Export Sales','soy','us'],['epa','Décisions réglementaires','EPA','bio','us'],['gapki','Bilan indonésien et mandats','GAPKI','palm','idn'],['anec','Estimations d’expédition','ANEC','soy','bra']].map(([id,title,source,product,origin])=>({id:'watch-'+id,title,source,product,origin,url:sources[source].url,date:'',time:'',zone:'',importance:2,expected:'Consulter la source',previous:'Non disponible',consensus:'Non disponible',impact:'À analyser lors de la prochaine publication confirmée.'})),
];
export const metrics={opening:'Stocks initiaux',production:'Production',imports:'Importations',domestic:'Consommation intérieure',crush:'Trituration',exports:'Exportations',ending:'Stocks finaux',ratio:'Stocks / utilisation',biofuel:'Usage biocarburants'};
export const periodTypes={month:'Mois civil',campaign:'Campagne commerciale',year:'Année civile',week:'Semaine'};
const balance=(origin,product,period,date,values,unit='Mt',periodType='campaign',status='projection',source='USDA WASDE',url=OCT,variant='official')=>Object.entries(values).map(([metric,value])=>({id:[origin,product,metric,period,date,source,variant].join('-'),origin,product,period,date,metric,value,unit:metric==='ratio'?'%':unit,periodType,status,source,url,variant}));
const oilData={
  us:[[.75,14.94,.32,15.02,.18,.82],[.83,14.94,.27,15.02,.18,.85],[.79,13.93,.24,13.77,.44,.75]],
  arg:[[.32,8.68,.14,1.99,6.75,.40],[.42,8.58,.14,1.99,6.65,.50],[.32,8.58,.15,1.98,6.75,.32]],
  bra:[[.19,13.27,.10,11.40,1.70,.46],[.20,13.26,.10,11.40,1.70,.46],[.21,12.76,.08,10.90,1.95,.19]],
  ind:[[1.64,1.80,5,6.75,.02,1.68],[1.55,1.80,5,6.65,.02,1.69],[1.58,1.80,5.50,7.20,.04,1.64]],
  chn:[[.80,21.56,.15,20.70,1,.80],[.80,21.56,.20,20.80,1,.75],[.75,21.80,.15,20.80,1.10,.80]],
  eu:[[.57,2.82,.65,2.63,.80,.61],[.57,2.82,.60,2.61,.80,.59],null],
  world:[[6.42,75.24,13.63,73.48,14.95,6.85],[6.51,75.12,13.43,73.38,14.75,6.92],null],
};
const oilKeys=['opening','production','imports','domestic','exports','ending'];
export const seedBalances = [
  ...Object.entries(oilData).flatMap(([origin,rows])=>rows.flatMap((v,i)=>v?balance(origin,'sbo',i===2?'2025/26':'2026/27',i===1?'2026-09-11':'2026-10-09',Object.fromEntries(oilKeys.map((k,j)=>[k,v[j]])),'Mt','campaign',i===2?'estimate':'projection','USDA WASDE',i===1?SEP:OCT):[])),
  ...balance('us','soy','2026/27','2026-10-09',{opening:315,production:4562,imports:25,crush:2780,exports:1695,ending:315},'M bu'),
  ...balance('us','soy','2026/27','2026-09-11',{opening:325,production:4535,imports:25,crush:2780,exports:1685,ending:310},'M bu','campaign','projection','USDA WASDE',SEP),
  ...balance('us','soy','2025/26','2026-10-09',{opening:325,production:4261,imports:22,crush:2646,exports:1515,ending:315},'M bu','campaign','estimate'),
  ...balance('us','sbo','2026/27','2026-10-09',{biofuel:17800},'M lb'),
  ...balance('us','sbo','2025/26','2026-10-09',{biofuel:14800},'M lb','campaign','estimate'),
  ...balance('bra','soy','2026/27','2026-10-15',{production:181.6},'Mt','campaign','projection','CONAB',CBR),
  ...balance('mys','palm','2026-09','2026-10-12',{production:2.116950,exports:1.096946,imports:.058064,ending:3.510896},'Mt','month','confirmed','MPOB',MPOB),
  ...balance('mys','palm','2026-09','2026-11-10',{production:2.116950,exports:1.097074,imports:.058064,ending:3.510555},'Mt','month','confirmed','MPOB',MPOB_OCT),
  ...balance('mys','palm','2026-10','2026-11-10',{production:2.153701,exports:1.708670,imports:.026207,ending:3.621164},'Mt','month','confirmed','MPOB',MPOB_OCT),
  ...balance('mys','palm','2026-10','2026-11-07',{production:2.20,ending:3.75},'Mt','month','consensus','Bernama (Reuters)',sources['Bernama (Reuters)'].url,'consensus'),
  ...balance('us','sbo','2026-09','2026-10-15',{ending:1053},'M lb','month','confirmed','StoneX (NOPA)',sources['StoneX (NOPA)'].url),
];
export const cards=[
  {key:'us-sbo',code:'SBO / US',title:'Soja US',group:'soy',product:'sbo',related:['soy','sbo'],origins:['us'],summary:'Stocks d’huile et demande biocarburants',drivers:['Stocks NOPA','WASDE & crush','Demande biodiesel']},
  {key:'arg-sbo',code:'SBO / ARG',title:'Soja Argentine',group:'soy',product:'sbo',related:['sbo','soy'],origins:['arg'],summary:'Exports projetés en hausse et stocks révisés',drivers:['Disponibilité FOB','Crush argentin','Demande indienne']},
  {key:'black-sfo',code:'SFO / MER NOIRE',title:'Tournesol mer Noire',group:'sun',product:'sfo',related:['sfo','sun'],origins:['sea','ukr','rus'],summary:'Flux régionaux à documenter',drivers:['Offre de graines','Crush et stocks','Logistique portuaire']},
  {key:'cpo-myi',code:'CPO / MY–ID',title:'Palme Asie',group:'palm',product:'palm',related:['palm','rbd','olein','pko'],origins:['mys','idn'],summary:'Stocks MPOB et arbitrages à l’import',drivers:['Stocks MPOB','Exportations','Mandats indonésiens']},
  {key:'eu-rso',code:'RSO / UE',title:'Colza Europe',group:'rape',product:'rso',related:['rso','rape','canola'],origins:['eu'],summary:'Bilan régional à documenter',drivers:['Récolte européenne','Biodiesel','Concurrence des huiles']},
];
export const scoreWeights={supply:25,demand:25,stocks:20,trade:10,energy:10,geo:10};
export const scoreCategories={weather:'supply',logistics:'geo',policy:'geo',fx:'energy'};


const frames=['2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'];
const wbData=(name,product,origin,unit,values,definition)=>({
  name,product,origin,unit,grain:'month',source:'Banque mondiale',url:wb('November'),definition,
  values:Object.fromEntries(frames.map((m,i)=>[m,values[i]])),
  pointSources:Object.fromEntries(frames.map((m,i)=>[m,wb(i<3?'June':i<5?'August':'November')])),
});
const watchPrice=(name,product,origin,unit,source,definition='Flux ou série historique à renseigner.')=>({name,product,origin,unit,source,url:sources[source]?.url,definition,grain:'day',values:{}});
export const seedPrices={
  'wb-sbo':wbData('Soja US · FOB golfe','sbo','us','USD/t',[1493,1643,1775,1740,1660,1639,1615,1546],'Huile brute dégommée, FOB golfe des États-Unis.'),
  'wb-palm':wbData('Palme · Malaisie','palm','mys','USD/t',[1109,1146,1140,1104,1101,1132,1180,1120],'Repère physique Malaisie, définition Pink Sheet.'),
  'wb-pko':wbData('Palmiste · CIF Rotterdam','pko','mys','USD/t',[2574,2606,2416,2166,2441,2264,2355,2287],'Huile brute de palmiste Malaisie/Indonésie, CIF Rotterdam.'),
  'wb-soy':wbData('Graines de soja · US','soy','us','USD/t',[473,463,474,464,459,482,524,515],'Graines de soja, FOB golfe des États-Unis.'),
  'wb-sm':wbData('Tourteau de soja · US','sm','us','USD/t',[404,416,421,419,398,406,447,453],'Tourteau américain à 48 % de protéines, FOB Rotterdam.'),
  brent:wbData('Brent','energy','world','USD/b',[103.7,120.4,107.5,85.4,83.4,90.9,116.8,125],'Moyenne mensuelle spot de référence.'),
  wti:wbData('WTI','energy','world','USD/b',[91.2,98.6,99.1,81.9,79.4,82.7,96.9,97.7],'Moyenne mensuelle spot de référence.'),
  'fcpo-jan27':{...watchPrice('FCPO janv. 2027','palm','mys','MYR/t','Bernama','Clôtures hebdomadaires du même contrat janvier 2027, reprises par Bernama.'),grain:'week',values:{'2026-10-30':4681,'2026-11-06':4258}},
  'fx-eur':watchPrice('EUR/USD · Réf. BCE','fx','eu','USD/EUR','BCE','Cours de référence BCE. Synchronisation manuelle dans le registre.'),
  'fx-brl':watchPrice('USD/BRL · Réf. BCE','fx','bra','BRL/USD','BCE','Taux croisé à partir des références BCE BRL/EUR et USD/EUR.'),
  'fx-cny':watchPrice('USD/CNY · Réf. BCE','fx','chn','CNY/USD','BCE','Taux croisé à partir des références BCE CNY/EUR et USD/EUR.'),
  'fx-mad':watchPrice('USD/MAD','fx','mar','MAD/USD','Bank Al-Maghrib'),
  'fx-ars':watchPrice('USD/ARS','fx','arg','ARS/USD','LSEG'),
  bo:watchPrice('CBOT BO','sbo','us','¢/lb','CME','Le contrat et la date de clôture doivent être renseignés pour toute cotation.'),
  zs:watchPrice('CBOT ZS','soy','us','¢/bu','CME'),
  sm:watchPrice('CBOT SM','sm','us','USD/short ton','CME'),
  go:watchPrice('ICE Gasoil','energy','world','USD/t','ICE'),
  ho:watchPrice('NYMEX Heating Oil','energy','us','USD/gal','CME'),
  dce:watchPrice('Dalian · Huile de soja','sbo','chn','CNY/t','Dalian'),
  'sbo-arg':{...watchPrice('Soja Argentine · FOB','sbo','arg','USD/t','LSEG'),grain:'month'},
  sfo:{...watchPrice('Tournesol · FOB mer Noire','sfo','sea','USD/t','LSEG'),grain:'month'},
  rso:{...watchPrice('Colza · Europe','rso','eu','USD/t','LSEG'),grain:'month'},
};
export const pairs=[
  ['wb-sbo','wb-palm','La substitution dépend du grade, du prix rendu et de l’usage. Les deux cotations ont des bases géographiques différentes.'],
  ['wb-sbo','sfo','Un tournesol plus cher au rendu peut orienter la demande alimentaire vers le soja.'],
  ['sfo','wb-palm','Le remplacement du tournesol par la palme dépend des applications, des droits et des spécifications.'],
  ['rso','wb-sbo','Les débouchés alimentaires et le biodiesel européen déterminent l’arbitrage entre colza et soja.'],
  ['wb-sbo','go','Les prix des distillats influencent les marges des biocarburants. Les fréquences doivent être alignées.'],
  ['wb-sbo','brent','Le pétrole et l’huile de soja peuvent réagir à l’énergie et au dollar. Les unités distinctes imposent une comparaison indexée.'],
  ['wb-soy','wb-sm','La valeur du tourteau contribue à la marge de trituration et peut modifier l’offre simultanée d’huile.'],
  ['wb-soy','wb-sbo','Les prix des graines et de l’huile répondent à des marchés distincts. Le crush relie l’offre des deux produits.'],
  ['sbo-arg','wb-sbo','L’écart FOB renseigne sur la compétitivité à l’origine. Comparer aussi le fret et la qualité.'],
];
export const scenarios={
  sbo:{up:'Stocks US resserrés, demande biocarburants robuste ou ralentissement du crush argentin.',base:'Comparer le rythme de trituration, les stocks US et les commandes indiennes à chaque publication.',down:'Rebond du crush, hausse de l’offre argentine et substitution vers la palme.',trigger:'NOPA, WASDE, exportations argentines et arbitrage indien.'},
  sfo:{up:'Contraintes portuaires ou baisse des chargements en mer Noire, demande indienne soutenue.',base:'La disponibilité à l’export dépend du rythme de trituration et des chargements.',down:'Reprise des chargements, rendement meilleur et achats reportés vers soja ou palme.',trigger:'Expéditions mer Noire, prix FOB, rendements et stocks.'},
  palm:{up:'Déstockage malaisien inattendu, exportations solides ou consommation biodiesel indonésienne accrue.',base:'Surveiller le pic saisonnier de stocks et la réaction des importateurs aux écarts de prix.',down:'Production supérieure aux attentes, hausse des stocks et exportations faibles.',trigger:'MPOB, inspections export, GAPKI et SEA India.'},
  rso:{up:'Disponibilité de graines contrainte et consommation de biodiesel européenne plus forte.',base:'Suivre le crush européen, les importations de graines et la concurrence du soja.',down:'Récolte plus abondante et arbitrage vers d’autres huiles.',trigger:'Bilans UE/Canada, importations, consommation biodiesel.'},
};
export const shockFields=[['production','Production',-0.35],['stocks','Stocks',-0.25],['biodiesel','Consommation biodiesel',0.20],['exports','Demande à l’export',0.20],['oil','Pétrole',0.10],['fx','USD / devise importatrice',-0.10]];
export const horizonNotes={short:'1 à 4 semaines · déclencheurs immédiats et stocks disponibles',medium:'1 à 3 mois · flux commerciaux, crush et saisonnalité',long:'3 à 12 mois · campagnes, capacités et mandats'};


const fasCompare=[
  ['ukr','sun',[10.7,.033,null,.040,.198],[13,.030,null,.100,.353]],
  ['rus','sun',[17.5,.090,17.22,.300,.767],[21,.050,19.605,.600,1.612]],
  ['eu','sun',[8.629,1.350,null,1.150,.404],[9.725,1.200,null,.550,.564]],
  ['ukr','sfo',[4.515,0,null,4.036,.265],[5.418,0,null,5,.213]],
  ['rus','sfo',[6.897,.001,2.575,4.2,.318],[7.806,.001,2.7,5.1,.325]],
  ['eu','sfo',[3.256,2.4,null,.7,.386],[3.846,2.7,null,.85,.494]],
  ['world','sfo',[21.076,11.651,19.359,13.510,2.405],[23.894,14.453,21.873,15.968,2.911]],
  ['eu','rso',[10.836,.615,10.550,.650,.549],[10.668,.550,10.650,.600,.517]],
  ['can','rso',[5.480,.018,1.975,3.346,.907],[5.868,.020,1.990,4,.805]],
];
for(const [origin,product,previous,current] of fasCompare){
  const dates=['2025/26','2026/27'];
  for(const [i,values] of [previous,current].entries()){
    if(!dates[i])continue;
    const keys=['production','imports','domestic','exports','ending'];
    seedBalances.push(...balance(origin,product,dates[i],'2026-09-11',Object.fromEntries(keys.flatMap((k,j)=>values[j]===null?[]:[[k,values[j]]])),'Mt','campaign',dates[i]==='2026/27'?'projection':'estimate','USDA FAS',FAS));
  }
}
for(const [origin,product,oldValue,newValue,variation,title,transmission,caveat] of [
  ['ukr','sfo','4,036 Mt','5,00 Mt','+23,9 % vs 2025/26','Ukraine · exportations de tournesol projetées à 5,00 Mt','La hausse projetée des volumes exportables élargit l’offre aux importateurs.','Vérifier la cadence des chargements et la capacité de trituration.'],
  ['rus','sfo','4,20 Mt','5,10 Mt','+21,4 % vs 2025/26','Russie · exportations de tournesol projetées à 5,10 Mt','L’offre russe peut peser sur les primes régionales si les chargements suivent.','Les prélèvements, le coût logistique et le financement peuvent limiter la transmission.'],
  ['eu','sfo','3,256 Mt','3,846 Mt','+18,1 % vs 2025/26','UE · production d’huile de tournesol projetée à 3,846 Mt','La production européenne additionnelle peut atténuer le recours aux importations à demande inchangée.','Les importations projetées augmentent aussi. Vérifier la demande et la trituration effective.'],
  ['eu','rso','20,657 Mt','20,150 Mt','−2,5 % vs 2025/26','UE · récolte de colza projetée à 20,15 Mt','Une récolte moindre peut soutenir le coût des graines et les prix de l’huile si les importations compensent peu.','La baisse de la consommation projetée de graines peut amortir le signal.'],
  ['can','rso','22,227 Mt','22,500 Mt','+1,2 % vs 2025/26','Canada · canola projeté à 22,50 Mt','Une récolte accrue peut faciliter le crush et renforcer l’offre d’huile et de tourteau.','Le mix export graines / trituration dépend des marges et des débouchés.'],
  ['eu','rso','0,478 Mt','0,456 Mt','−4,6 % vs 2025/26','UE · stocks finaux d’huile de colza à 456 kt','Des stocks finaux plus faibles réduisent le tampon en cas de surprise sur la demande.','Le chiffre reste une projection du rapport de septembre.'],
]){
  seedEvents.push(marketPrice('fas-'+origin+'-'+product+'-'+newValue,title,product,origin,variation.startsWith('−')?'stocks':'supply','2026-09-11','Campagne 2026/27','USDA FAS',FAS,'Projection de septembre '+newValue+', contre '+oldValue+' en 2025/26.',newValue,variation,variation.startsWith('−')?'positive':'negative',1,'medium','projection',transmission,caveat));
}
const walsh='https://kqlx-radio.websol.barchart.com/?0=news&module=futureDetail&popup=1&region=&selected=news&storyID=8708672&symbol=ZLZ26';
sources['Walsh Trading / Barchart']={url:walsh,scope:'Clôtures de contrats CBOT et analyse du crush'};
for(const [id,name,n,previous] of [['bo','CBOT BO déc. 2026',62.26,62.24],['zs','CBOT ZS janv. 2027',1193.75,1188.25],['sm','CBOT SM déc. 2026',319.20,317.20]]){
  Object.assign(seedPrices[id],{name,source:'Walsh Trading / Barchart',url:walsh,definition:'Clôtures du contrat indiqué, reprise datée Walsh Trading.',values:{'2026-11-05':previous,'2026-11-06':n}});
}
seedEvents.push(marketPrice('cbot-20261106','CBOT BO décembre clôture à 62,26 ¢/lb','sbo','us','trade','2026-11-06','Séance du 6 nov. 2026','Walsh Trading / Barchart',walsh,'Le contrat décembre gagne 0,02 ¢/lb. Le soja janvier gagne 5,5 ¢/bu et le tourteau décembre 2 USD/short ton.','62,26 ¢/lb','+0,02 ¢/lb vs 5 nov.','neutral',1,'short','confirmed','La clôture quasi stable de l’huile et la progression des graines peuvent réduire la marge de crush, selon les autres composantes.','Les valeurs physiques, le tourteau et les coûts de trituration déterminent la marge effective.','16:01 Chicago'));


const cashReference='https://commodityscope.com/prices/grain-futures';
sources.CommodityScope={url:cashReference,scope:'Séries futures proches en USD par tonne, observation datée'};
Object.assign(seedPrices.dce,{name:'Dalian · Huile de soja (proche)',unit:'USD/t',source:'CommodityScope',url:cashReference,definition:'Série de référence du contrat proche, convertie en USD/t par la source.',values:{'2026-11-05':1318.33,'2026-11-06':1309.14}});
seedPrices['rape-eu-fut']={...watchPrice('Euronext · Colza (proche)','rape','eu','USD/t','CommodityScope','Contrat proche, coté en USD/t par la source. Série de graines.'),values:{'2026-11-05':590.38,'2026-11-06':583.65}};
seedEvents.push(marketPrice('rape-nov6','Colza Euronext à 583,65 USD/t','rape','eu','trade','2026-11-06','Séance du 6 nov. 2026','CommodityScope',cashReference,'Le repère du contrat proche de graines de colza est en baisse de 6,73 USD/t.','583,65 USD/t','−6,73 USD/t vs séance précédente','negative',1,'short','confirmed','Un coût de graines en baisse peut améliorer les marges de crush ou réduire le prix de revient de l’huile.','La conversion en USD incorpore le change. Vérifier les cotations en EUR et les bases physiques.'));


seedBalances.push(...balance('mys','palm','2026-08','2026-10-12',{production:1.817499,exports:1.275349,imports:.049524,ending:2.819061},'Mt','month','confirmed','MPOB',MPOB));
seedBalances.push(...balance('mys','palm','2025-09','2026-10-12',{production:1.840983},'Mt','month','confirmed','MPOB','https://bepi.mpob.gov.my/stat/web_report1.php?val=202644'));
const heatingRef='https://www.commoditypriceapi.com/tools/ho-fut-dec26/prices';
sources.CommodityPriceAPI={url:heatingRef,scope:'Règlements de futures publiés avec délai'};
Object.assign(seedPrices.ho,{name:'Heating Oil déc. 2026',source:'CommodityPriceAPI',url:heatingRef,definition:'Règlement du contrat décembre 2026, repris avec délai.',values:{'2026-11-06':4.33}});


/* Relevé de marché du 11 novembre 2026. Les échéances ci-dessous sont des repères datés. */
const marketNov11={
  "wasde": "https://www.usda.gov/oce/commodity/wasde/wasde1126.pdf",
  "nass": "https://esmis.nal.usda.gov/sites/default/release-files/796141/prog4526.pdf",
  "fcpo10": "https://bernamabiz.com/news.php?id=2632532",
  "fcpo11": "https://web26.bernama.com/en/news.php?id=2632996",
  "palm": "https://www.brecorder.com/news/amp/40448427",
  "china": "https://www.brecorder.com/news/40448240",
  "india": "https://economictimes.indiatimes.com/articleshow/135522525.cms",
  "anec": "https://www.cnnbrasil.com.br/agro/anec-eleva-previsao-de-4/",
  "ukr": "https://open4business.com.ua/en/in-ukraine-sunflower-harvest-increased-by-22-8-to-10-71-million-metric-tons/",
  "zl": "https://kqlx-radio.websol.barchart.com/?0=news&1_selected=futureQuote&module=futureDetail&popup=1&region=&symbol=ZLZ26",
  "zm": "https://tateandlyle.websol.barchart.com/?1_selected=futureQuote&module=futureDetail&region=&symbol=ZMZ26",
  "zs": "https://www.agriculture.com/grains-recover-from-early-losses-as-wheat-and-soybeans-close-higher-or-wednesday-nov-11-2026-12249371",
  "oil": "https://www.reuters.com/business/energy/oil-rises-two-month-low-hormuz-shipping-attacks-offset-iran-truce-hopes-2026-11-11/",
  "oil10": "https://wealthinsights.metrobank.com.ph/news/update-8-oil-prices-ease-to-two-month-lows-as-us-downplays-further-iran-strikes",
  "euronext": "https://www.graindecision.com/fr/analyses/cours-colza",
  "fx": "https://data-api.ecb.europa.eu/service/data/EXR/D.USD+BRL+CNY+MYR+IDR.EUR.SP00.A?startPeriod=2026-11-09&endPeriod=2026-11-11&format=csvdata",
  "mad": "https://www.lebrief.ma/services/convertisseur-devises/",
  "arg": "https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php?Fecha=10%2F11%2F2026"
};
const NOV=marketNov11.wasde;
const novWASDE='2026-11-10';
const novSession='2026-11-11';

Object.assign(sources,{
  'Barchart':{url:marketNov11.zl,scope:'Cours datés des échéances CBOT'},
  'Successful Farming':{url:marketNov11.zs,scope:'Clôture des graines de soja CBOT'},
  'Douanes chinoises via Reuters':{url:marketNov11.china,scope:'Importations chinoises mensuelles de soja'},
  'ANEC via Reuters':{url:marketNov11.anec,scope:'Estimations d’embarquement de soja et de tourteaux'},
  'Ministère ukrainien via Open4Business':{url:marketNov11.ukr,scope:'Avancement de la récolte du tournesol'},
  'GrainDecision':{url:marketNov11.euronext,scope:'Cours datés du colza Euronext'},
  'Bank Al-Maghrib via LeBrief':{url:marketNov11.mad,scope:'Cours de référence du dirham repris par LeBrief'},
  'Secretaría de Agricultura':{url:marketNov11.arg,scope:'Références FOB officielles argentines'},
});

const addMarketQuotes=(id,points)=>{
  const series=seedPrices[id];
  const urls=series.pointSources??={};
  const names=series.pointSourceNames??={};
  for(const [date,value,source,url] of points){
    series.values[date]=value;
    urls[date]=url;
    names[date]=source;
  }
};

Object.assign(seedPrices['fcpo-jan27'],{grain:'day',definition:'Clôtures datées du contrat janvier 2027, reprises par Bernama.'});
addMarketQuotes('fcpo-jan27',[
  ['2026-10-30',4681,'Bernama','https://web26.bernama.com/en/market/news.php?id=2628072'],
  ['2026-11-05',4377,'Bernama','https://web26.bernama.com/en/market/news.php?id=2630655'],
  ['2026-11-06',4258,'Bernama','https://bernama.com/en/market/news.php?id=2631133'],
  ['2026-11-10',4256,'Bernama',marketNov11.fcpo10],
  ['2026-11-11',4410,'Bernama',marketNov11.fcpo11],
]);
seedPrices['cpo-south-cash']=watchPrice('CPO physique · Sud Malaisie','palm','mys','MYR/t','Bernama','Prix physique CPO pour novembre, référence Sud de la Malaisie.');
addMarketQuotes('cpo-south-cash',[
  ['2026-11-10',4080,'Bernama',marketNov11.fcpo10],
  ['2026-11-11',4170,'Bernama',marketNov11.fcpo11],
]);
for(const [id,previous,current,source,url] of [
  ['bo',62.77,63.88,'Barchart',marketNov11.zl],
  ['zs',1228,1230.75,'Successful Farming',marketNov11.zs],
  ['sm',326.5,327.5,'Barchart',marketNov11.zm],
]){
  seedPrices[id].definition='Clôtures datées du contrat indiqué. La source est précisée pour chaque observation.';
  addMarketQuotes(id,[['2026-11-10',previous,source,url],['2026-11-11',current,source,url]]);
}

for(const [id,name,previous,current] of [
  ['brent-daily','Brent · règlement',91.49,92.76],
  ['wti-daily','WTI · règlement',86.04,86.53],
]){
  seedPrices[id]=watchPrice(name,'energy','world','USD/b','Reuters','Règlement quotidien du future de référence relayé par Reuters.');
  addMarketQuotes(id,[['2026-11-10',previous,'Reuters',marketNov11.oil10],['2026-11-11',current,'Reuters',marketNov11.oil]]);
}
seedPrices['rape-feb27']=watchPrice('Euronext · Colza fév. 2027','rape','eu','EUR/t','GrainDecision','Clôtures datées du contrat Euronext février 2027 (XRG27).');
addMarketQuotes('rape-feb27',[
  ['2026-11-10',527.50,'GrainDecision',marketNov11.euronext],
  ['2026-11-11',531.25,'GrainDecision',marketNov11.euronext],
]);

seedPrices['fx-eur'].definition='Fixing indicatif publié par la BCE.';
for(const [date,usd,brl,cny] of [
  ['2026-11-09',1.1193,6.1748,7.4689],
  ['2026-11-10',1.1214,6.2257,7.4801],
  ['2026-11-11',1.1127,6.1827,7.4225],
]){
  addMarketQuotes('fx-eur',[[date,usd,'BCE',marketNov11.fx]]);
  addMarketQuotes('fx-brl',[[date,brl/usd,'BCE',marketNov11.fx]]);
  addMarketQuotes('fx-cny',[[date,cny/usd,'BCE',marketNov11.fx]]);
}
seedPrices['fx-mad'].definition='Fixing indicatif de Bank Al-Maghrib repris par LeBrief.';
addMarketQuotes('fx-mad',[[novSession,9.7961,'Bank Al-Maghrib via LeBrief',marketNov11.mad]]);

seedPrices['sbo-arg-official']=watchPrice('Huile de soja Argentine · FOB officiel','sbo','arg','USD/t','Secretaría de Agricultura','Huile de soja brute en vrac. Position 15071000100Q, livraison couvrant le mois de cotation.');
addMarketQuotes('sbo-arg-official',[
  ['2026-11-06',1185,'Secretaría de Agricultura',marketNov11.arg.replace('10%2F11','06%2F11')],
  ['2026-11-10',1188,'Secretaría de Agricultura',marketNov11.arg],
]);

const novOilBalances={
  us:[.66,14.94,.32,14.97,.18,.77],
  arg:[.25,8.68,.14,1.99,6.75,.33],
  bra:[.20,13.27,.10,11.40,1.90,.26],
  ind:[1.67,1.82,5,6.80,.02,1.67],
  chn:[.80,21.56,.15,20.70,1,.81],
  eu:[.57,2.82,.65,2.63,.80,.61],
  world:[6.24,75.29,13.71,73.60,15.10,6.53],
};
for(const [origin,values] of Object.entries(novOilBalances)){
  seedBalances.push(...balance(origin,'sbo','2026/27',novWASDE,Object.fromEntries(oilKeys.map((key,index)=>[key,values[index]])),'Mt','campaign','projection','USDA WASDE',NOV));
}
seedBalances.push(
  ...balance('us','soy','2026/27',novWASDE,{opening:315,production:4574,imports:25,domestic:2894,crush:2780,exports:1720,ending:300},'M bu','campaign','projection','USDA WASDE',NOV),
  ...balance('us','sbo','2026/27',novWASDE,{biofuel:17800},'M lb','campaign','projection','USDA WASDE',NOV),
  ...balance('us','sbo','2025/26',novWASDE,{opening:.79,production:13.87,imports:.24,domestic:13.79,exports:.45,ending:.66},'Mt','campaign','estimate','USDA WASDE',NOV),
  ...balance('us','sbo','2025/26',novWASDE,{biofuel:14900},'M lb','campaign','estimate','USDA WASDE',NOV),
  ...balance('arg','soy','2026/27',novWASDE,{opening:23.64,production:50,imports:6.50,domestic:49.65,crush:43.50,exports:6.75,ending:23.74},'Mt','campaign','projection','USDA WASDE',NOV),
  ...balance('bra','soy','2026/27',novWASDE,{opening:37.88,production:186,imports:1,domestic:69.60,crush:65,exports:118,ending:37.28},'Mt','campaign','projection','USDA WASDE',NOV),
  ...balance('chn','soy','2026/27',novWASDE,{opening:44.36,production:21,imports:115,domestic:136,crush:111,exports:.10,ending:44.26},'Mt','campaign','projection','USDA WASDE',NOV),
  ...balance('world','soy','2026/27',novWASDE,{opening:124.98,production:442.50,imports:191.38,domestic:442.80,crush:386.24,exports:192.55,ending:123.50},'Mt','campaign','projection','USDA WASDE',NOV),
  ...balance('chn','soy','2026-10',novWASDE,{imports:7.35},'Mt','month','confirmed','Douanes chinoises via Reuters',marketNov11.china),
  ...balance('rus','sfo','2026/27',novWASDE,{exports:4.85},'Mt','campaign','projection','USDA FAS',FAS),
  ...balance('eu','rape','2026/27',novWASDE,{imports:7.05},'Mt','campaign','projection','USDA FAS',FAS),
  ...balance('aus','rape','2026/27',novWASDE,{exports:6.50},'Mt','campaign','projection','USDA FAS',FAS),
);

seedEvents.push(
  marketPrice('market-1111-cbot-bo','Huile de soja CBOT décembre à 63,88 ¢/lb','sbo','us','trade',novSession,'Clôture du 11 novembre','Barchart',marketNov11.zl,
    'Le contrat décembre gagne 1,11 ¢/lb. Le soja janvier termine à 1 230,75 ¢/bu et le tourteau décembre à 327,50 USD/short ton.','63,88 ¢/lb','+1,77 % sur la séance','positive',2,'short','confirmed',
    'Le rebond du CBOT renchérit la composante futures des achats d’huile de soja indexés.','Le basis FOB et le fret peuvent évoluer indépendamment du CBOT.'),
  marketPrice('market-1111-fcpo','FCPO janvier à 4 410 MYR/t après le rebond de Bursa','palm','mys','trade',novSession,'Clôture du 11 novembre','Bernama',marketNov11.fcpo11,
    'Bernama relève une hausse de 154 MYR/t sur janvier 2027. Le CPO physique de novembre (Sud) remonte à 4 170 MYR/t, contre 4 080 la veille. Bernama cite le rebond de l’huile de soja et du pétrole ainsi qu’une production plus faible début novembre.','4 410 MYR/t','+3,62 % sur la séance','positive',3,'short','confirmed',
    'Le rebond du FCPO peut relever les offres de palme et modifier l’arbitrage avec l’huile de soja.','Les stocks d’octobre restent élevés. Les indications de production début novembre sont partielles.'),
  marketPrice('market-1111-exports-mys','Expéditions malaisiennes de palme en léger repli début novembre','palm','mys','trade',novSession,'1–10 novembre 2026','Reuters',marketNov11.palm,
    'Selon les estimations des inspecteurs reprises par Reuters, les exportations de produits de palme reculent de 1,9 % à 2,3 % sur les dix premiers jours du mois.','−1,9 % à −2,3 %','vs 1–10 octobre','negative',1,'short','estimate',
    'Un ralentissement des expéditions réduit le déstockage si la production se maintient.','Le point de dix jours ne couvre qu’une partie du mois.'),
  marketPrice('market-1111-energy','Brent et WTI rebondissent après les plus bas de deux mois','energy','world','energy',novSession,'Règlements du 11 novembre','Reuters',marketNov11.oil,
    'Le Brent clôture à 92,76 USD/b et le WTI à 86,53 USD/b. Reuters relie le rebond à la réduction des attentes de désescalade entre les États-Unis et l’Iran.','Brent 92,76 USD/b · WTI 86,53 USD/b','Brent +1,39 % · WTI +0,57 %','positive',2,'short','confirmed',
    'La remontée du pétrole peut soutenir la valeur relative des huiles destinées aux biocarburants.','Les marges dépendent aussi des distillats, des crédits et du coût des huiles.'),
  marketPrice('market-1111-ecb','EUR/USD revient à 1,1127 au fixing BCE','fx','eu','fx',novSession,'Fixing du 11 novembre','BCE',marketNov11.fx,
    'Le fixing EUR/USD recule de 1,1214 à 1,1127. Les taux croisés USD/BRL et USD/CNY sont recalculés à partir du même fixing.','1,1127 USD/EUR','−0,78 % vs 10 novembre','mixed',1,'short','confirmed',
    'Une variation du dollar modifie le prix converti des achats et la compétitivité des origines.','Ces fixings sont indicatifs. Le coût au Maroc dépend du taux USD/MAD et de la couverture.'),
  marketPrice('market-1111-colza','Colza Euronext février à 531,25 EUR/t','rape','eu','trade',novSession,'Clôture du 11 novembre','GrainDecision',marketNov11.euronext,
    'Le contrat février 2027 progresse de 3,75 EUR/t par rapport à la clôture du 10 novembre.','531,25 EUR/t','+0,71 % sur la séance','positive',1,'short','confirmed',
    'La hausse du prix de la graine peut renchérir la matière première des triturateurs européens.','Le prix de l’huile dépend aussi de la valorisation du tourteau et des disponibilités physiques.'),
  marketPrice('market-1111-ukraine','Récolte ukrainienne de tournesol à 10,71 Mt','sun','ukr','supply',novSession,'Avancement au 10 novembre','Ministère ukrainien via Open4Business',marketNov11.ukr,
    'La récolte atteint 10,71 Mt sur 4,80 millions d’hectares, soit 91,6 % des surfaces prévues, d’après le ministère ukrainien.','10,71 Mt','+22,8 % a/a à date comparable','negative',2,'short','confirmed',
    'Une récolte plus avancée augmente les volumes de graines mobilisables pour la trituration.','Les volumes d’huile exportables dépendent du fonctionnement des usines et des ports.'),
  marketPrice('market-1111-anec','ANEC relève les embarquements de soja brésilien de novembre','soy','bra','trade',novWASDE,'Novembre 2026','ANEC via Reuters',marketNov11.anec,
    'La prévision de soja passe de 3,33 à 4,37 Mt. Celle du tourteau est relevée de 2,23 à 2,57 Mt.','4,37 Mt de soja','+1,04 Mt vs estimation précédente','mixed',2,'short','estimate',
    'La programmation indique davantage de graines brésiliennes disponibles à l’export que prévu la semaine précédente.','Il s’agit d’estimations de chargements portuaires.'),
  marketPrice('market-1110-china','La Chine importe 7,35 Mt de soja en octobre','soy','chn','demand',novWASDE,'Octobre 2026','Douanes chinoises via Reuters',marketNov11.china,
    'Les arrivages reculent de 38 % sur un mois et de 22,5 % sur un an. Le cumul janvier–octobre atteint 93,48 Mt, en baisse de 2,3 %.','7,35 Mt','−38 % m/m · −22,5 % a/a','negative',3,'short','confirmed',
    'La baisse des arrivages coïncide avec des stocks de graines élevés et des marges de trituration faibles, selon les analystes cités.','Les importations enregistrées à l’arrivée et les achats à terme reflètent des périodes différentes.'),
  marketPrice('market-1110-wasde-us-soy','WASDE novembre · Stocks finaux de soja US ramenés à 300 M bu','soy','us','stocks',novWASDE,'Campagne 2026/27','USDA WASDE',NOV,
    'L’USDA relève la production à 4 574 M bu et les exportations à 1 720 M bu. Le crush reste à 2 780 M bu. Les stocks finaux passent de 315 à 300 M bu.','300 M bu · 8,16 Mt converties','−15 M bu vs octobre','positive',3,'medium','projection',
    'La hausse des exportations et des autres usages absorbe plus que le supplément de production, ce qui réduit le coussin de stocks.','Les stocks finaux et le commerce restent des projections de campagne.','12:00 New York'),
  marketPrice('market-1110-wasde-us-oil','WASDE novembre · Stocks finaux d’huile US ramenés à 1 698 M lb','sbo','us','stocks',novWASDE,'Campagne 2026/27','USDA WASDE',NOV,
    'Les stocks finaux passent de 1 797 à 1 698 M lb. L’usage biocarburants reste à 17 800 M lb. Les stocks initiaux sont ramenés de 1 657 à 1 458 M lb.','1 698 M lb · 0,770 Mt','−99 M lb vs octobre','positive',3,'medium','projection',
    'Le recul des stocks réduit la marge de sécurité si la demande d’huile se renforce.','L’usage biocarburants est inchangé dans cette édition.','12:00 New York'),
  marketPrice('market-1110-wasde-arg','USDA relève les exports de graines de soja argentines à 6,75 Mt','soy','arg','trade',novWASDE,'Campagne 2026/27','USDA WASDE',NOV,
    'Les exportations de graines passent de 6,45 à 6,75 Mt. Pour l’huile de soja, les exports restent à 6,75 Mt et les stocks finaux sont abaissés à 0,33 Mt.','6,75 Mt de graines','+0,30 Mt vs octobre','mixed',2,'medium','projection',
    'Une hausse des sorties de graines peut modifier la disponibilité locale pour le crush.','Les révisions du USDA et le bilan de campagne saisi dans le simulateur ont chacun leur source.'),
  marketPrice('market-1110-wasde-brazil-oil','USDA relève les exports d’huile de soja brésilienne à 1,90 Mt','sbo','bra','trade',novWASDE,'Campagne 2026/27','USDA WASDE',NOV,
    'Les exports passent de 1,70 à 1,90 Mt et les stocks finaux reculent de 0,46 à 0,26 Mt.','1,90 Mt','+0,20 Mt vs octobre','mixed',2,'medium','projection',
    'Une offre exportable plus élevée peut renforcer la concurrence entre origines, tandis que les stocks projetés se resserrent.','La demande brésilienne de biodiesel et la cadence du crush restent déterminantes.'),
  marketPrice('market-1110-fas-sun','USDA réduit les exportations d’huile de tournesol russe','sfo','rus','trade',novWASDE,'Campagne 2026/27','USDA FAS',FAS,
    'Le FAS ramène la projection russe de 5,10 à 4,85 Mt, en raison d’une récolte de graines revue en baisse.','4,85 Mt','−0,25 Mt vs octobre','positive',2,'medium','projection',
    'Des disponibilités russes plus faibles peuvent soutenir les primes de la mer Noire.','La production effective, le fret et les délais portuaires influencent les livraisons.'),
  marketPrice('market-1110-fas-rape','USDA relève les importations de colza de l’UE à 7,05 Mt','rape','eu','trade',novWASDE,'Campagne 2026/27','USDA FAS',FAS,
    'Le FAS relève les importations de l’UE de 6,55 à 7,05 Mt et les exportations australiennes de 6,00 à 6,50 Mt.','7,05 Mt','+0,50 Mt vs octobre','mixed',2,'medium','projection',
    'Une offre australienne accrue peut compenser une partie du besoin européen en graines.','Les échéances de récolte, le fret et les spécifications déterminent l’accès effectif à cette offre.'),
  marketPrice('market-1110-arg-fob','Huile de soja brute argentine à 1 188 USD/t FOB','sbo','arg','trade',novWASDE,'Livraison novembre 2026','Secretaría de Agricultura',marketNov11.arg,
    'Le bulletin officiel du 10 novembre cote l’huile brute en vrac à 1 188 USD/t pour novembre.','1 188 USD/t','+3 USD/t vs 6 novembre','neutral',1,'short','confirmed',
    'La référence sert à comparer l’origine argentine et à suivre le prix de l’huile brute.','La base de prix est FOB et la référence officielle peut différer d’une offre négociable.'),
  marketPrice('market-1109-nass','Récolte américaine de soja à 92 % au 8 novembre','soy','us','supply','2026-11-09','Semaine au 8 novembre','USDA NASS',marketNov11.nass,
    'Le Crop Progress situe la récolte à 92 %, après 88 % la semaine précédente et contre 91 % en moyenne sur cinq ans.','92 %','+4 pts s/s · +1 pt vs moyenne 5 ans','negative',1,'short','confirmed',
    'La progression de la récolte augmente les volumes accessibles aux triturateurs et exportateurs.','La vitesse de commercialisation peut différer de l’avancement au champ.','16:00 New York'),
);
for(const [product,title,volume,variation] of [
  ['palm','Inde · Importations de palme estimées à 866 kt',866,'+6 % m/m'],
  ['sbo','Inde · Importations d’huile de soja estimées à 653 kt',653,'+6 % m/m'],
  ['sfo','Inde · Importations de tournesol estimées à 223 kt',223,'Environ deux fois septembre'],
]){
  seedEvents.push(marketPrice('market-1104-ind-'+product,title,product,'ind','demand','2026-11-04','Octobre 2026','Reuters',marketNov11.india,
    'Estimation moyenne des négociants interrogés par Reuters. Les achats d’huiles alimentaires auraient atteint 1,74 Mt au total.',volume+' kt',variation,'positive',2,'short','estimate',
    'La reprise des achats indiens peut soutenir les débouchés des origines exportatrices.','À rapprocher des chiffres définitifs du bulletin SEA d’octobre.'));
}

const novemberCalendar=seedCalendar.find(item=>item.id==='cal-wasde');
Object.assign(novemberCalendar,{
  title:'USDA WASDE · Novembre publié',url:NOV,
  expected:'Soja US 300 M bu de stocks finaux · Huile de soja US 1 698 M lb · Usage biocarburants 17 800 M lb',
});
seedCalendar.find(item=>item.id==='cal-wasde-dec').previous='WASDE novembre · stocks finaux US : soja 300 M bu, huile 1 698 M lb';
