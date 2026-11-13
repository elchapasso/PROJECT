# Spreads et marges d’Oléa Terminal

La vue [Comparaisons & spreads](https://elchapasso.github.io/PROJECT/#cross) présente les spreads BOPO, BOHO et POGO, les marges de trituration et la comparaison de séries. Pour vérifier le site en local, lancer `python -m http.server 8000 --directory docs` puis ouvrir [Comparaisons & spreads](http://localhost:8000/#cross). Les paramètres saisis s’appliquent à la courbe, au tableau et à l’export jusqu’au rechargement de la page.

## Spreads de référence

L’onglet « Spreads » présente BOPO, BOHO et POGO. Chaque fiche propose une ou plusieurs références, une période, une moyenne mobile et des paramètres de calcul. L’onglet « Marges » présente les marges de trituration (section suivante) et l’onglet « Comparaison de séries » l’outil de comparaison.

Ces trois spreads existent en ligne sous forme de produits sous licence : contrats POG du CME pour le POGO, évaluations sur abonnement pour le BOHO et le BOPO. Aucun historique librement téléchargeable n’a été trouvé. Oléa les calcule donc à partir de prix : contrats à terme relevés sur TradingView et prix publics.

| Spread | Référence | Calcul | Fréquence et couverture |
| --- | --- | --- | --- |
| BOPO | Indonésie · FOB Belawan | Huile de soja FOB Argentine − huile de palme FOB Belawan | Quotidien depuis le 04/11/2026, l’historique s’allonge à chaque relevé automatique |
| BOPO | Malaisie · FOB Port Klang | Huile de soja FOB Argentine − huile de palme FOB Port Klang | Quotidien depuis le 10/11/2026, l’historique s’allonge à chaque relevé automatique |
| BOPO | Malaisie · CPO MPOB | Huile de soja FOB Argentine − CPO Malaisie ÷ USD/MYR | Quotidien depuis le 02/01/2025 |
| BOPO | À terme · CBOT − Bursa | `CBOT:ZL1!` × 22,0462 − `MYX:FCPO1!` ÷ USD/MYR | Quotidien depuis le 02/01/2025, relevé TradingView |
| BOPO | Mensuel · CBOT − Bursa | Moyenne mensuelle de `CBOT:ZL1!` × 22,0462 − moyenne mensuelle de `MYX:FCPO1!` ÷ USD/MYR du jour | Mensuel depuis janvier 2015, mois en cours compris |
| BOHO | Quotidien · CBOT − NYMEX | `CBOT:ZL1!` × lb/gal ÷ 100 − `NYMEX:HO1!` | Quotidien depuis le 02/01/2025, relevé TradingView |
| BOHO | Mensuel · CBOT − NYMEX | Moyenne mensuelle de `CBOT:ZL1!` × lb/gal ÷ 100 − moyenne mensuelle de `NYMEX:HO1!` | Mensuel depuis janvier 2015, mois en cours compris |
| POGO | Quotidien · Bursa − ICE Gasoil | `MYX:FCPO1!` ÷ USD/MYR − `ICEEUR:ULS1!` | Quotidien depuis le 02/01/2025, relevé TradingView |
| POGO | Physique · CPO Malaisie − ULSD New York | CPO Malaisie ÷ USD/MYR − ULSD × gal/t | Quotidien depuis le 02/01/2025 |
| POGO | Mensuel · Bursa − ICE Gasoil | Moyenne mensuelle de `MYX:FCPO1!` ÷ USD/MYR du jour − moyenne mensuelle de `ICEEUR:ULS1!` | Mensuel depuis janvier 2015, mois en cours compris |

Paramètres modifiables : fret et frais par origine pour le BOPO, 7,5 lb d’huile par gallon et unité (USD/gal ou ¢ US/lb) pour le BOHO, densité du gazole de 0,845 kg/l pour le POGO, soit 312,6 gal/t. Le 10/11/2026, le CPO MPOB converti vaut 982,5 USD/t et le tableau IPOSS cote Port Klang à 982 USD/t. Le même jour, Belawan cote 1 090 USD/t : la référence malaisienne donne un BOPO plus élevé d’environ 100 USD/t que la référence indonésienne.

Les versions quotidiennes et mensuelles du BOHO et du POGO utilisent les contrats NYMEX Heating Oil et ICE Low Sulphur Gasoil ; la version physique du POGO utilise le prix spot ULSD à New York de l’EIA, produit livrable du contrat Heating Oil. Les versions mensuelles reprennent les mêmes contrats que les versions quotidiennes (section « Moyennes mensuelles des contrats à terme »). Les séries mensuelles PSOIL et PPOIL du FMI restent collectées et visibles dans le panneau « Actualisation automatique des prix », mais ne servent plus aux spreads : elles diffèrent en moyenne de 2,1 % (soja) et 2,6 % (palme) des moyennes des premiers contrats continus de TradingView sur janvier 2025 à septembre 2026, et sont publiées avec environ deux mois de retard.

## Sources et couverture

Les volumes ci-dessous décrivent l’import initial du 12/11/2026. Depuis, les séries publiques sont actualisées automatiquement (voir « Actualisation automatique »).

| Source | Données retenues ou résultat de la recherche | Réutilisation publique |
| --- | --- | --- |
| [Secretaría de Agricultura · API des bulletins](https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php?Fecha=10%2F11%2F2026) et [portail de données ouvertes](https://www.argentina.gob.ar/economia/agricultura/datos-abiertos) | Du 02/01/2025 au 06/11/2026 pour les jambes des marges de trituration. 229 dates communes soja et 230 dates communes tournesol. Cotations additionnelles d’huile de soja des 05/11/2026, 10/11/2026 et 11/11/2026 utilisées pour le BOPO. Les relevés sont partiels, notamment lorsque l’API a limité l’accès. | Prix officiels factuels attribués à leur auteur. Le [catalogue d’archives](https://datos.gob.ar/api/3/action/package_show?id=sspm_358) et les [contenus d’Argentina.gob.ar](https://www.argentina.gob.ar/terminos-y-condiciones) indiquent CC BY 4.0. L’API courante ne porte pas de mention de licence distincte vérifiée. |
| [EIA · Spot Prices, via FRED](https://fred.stlouisfed.org/series/DDFUELNYH) | Gazole ULSD n° 2 à New York Harbor, en USD/gal. 459 prix spot quotidiens du 02/01/2025 au 03/11/2026 (`DDFUELNYH`) et 142 moyennes mensuelles de janvier 2015 à octobre 2026 (`MDFUELNYH`). Les moyennes des prix quotidiens importés reproduisent les 22 moyennes mensuelles publiées, au millième près. | Données d’une agence fédérale américaine, domaine public, citation demandée. |
| [FMI · Primary Commodity Prices, via FRED](https://fred.stlouisfed.org/series/PSOILUSDM) | Huile de soja (`PSOILUSDM`) et huile de palme (`PPOILUSDM`), en USD/t. 141 moyennes mensuelles par série, de janvier 2015 à septembre 2026, arrondies à 0,01 USD/t. | Les [conditions du FMI](https://www.imf.org/external/terms.htm) autorisent la copie, la publication et les travaux dérivés, y compris à des fins commerciales, avec attribution. |
| [MPOB · Daily CPO prices](https://bepi.mpob.gov.my/admin2/price_local_daily_view_cpo_msia.php?more=Y&jenis=1Y) | Huile de palme brute livrée localement en Malaisie, moyenne pondérée quotidienne en MYR/t. 448 prix du 02/01/2025 au 10/11/2026. Le prix du 11/11/2026, relevé à 8 h 30 et signalé `**`, n’est pas repris. | Prix publiés par l’agence publique malaisienne, repris avec attribution. Aucune mention de licence distincte vérifiée. |
| [IPOSS Data · Daily FOB Prices for CPO, CPKO & Vegetable Oils](https://data.iposs.co.id/en/data/fob-price-cpo-cpko) | Six cotations FOB Belawan (Indonésie), du 04/11/2026 au 12/11/2026, en USD/t. Le BOPO physique utilise les dates communes avec le FOB officiel de l’huile de soja brute argentine. | Cotations ponctuelles du tableau public citées avec attribution. L’historique complet requiert un compte approuvé. |
| [BCR · FOB/FAS Argentina](https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales/fobfas-argentina/precios-fobfas-4454) | Feuille du 01/09/2026 consultée pour la méthode et les définitions. Son FAS net et les cotations de tiers sont distincts de la série de prix FOB officiels. | Autorisation de redistribution du contenu et des cotations de tiers non vérifiée. Aucun historique BCR intégré. |
| [BCE · EXR](https://data-api.ecb.europa.eu/service/data/EXR/D.USD+MYR+IDR.EUR.SP00.A?startPeriod=2024-12-30&format=csvdata) | 478 fixings EUR/USD, EUR/MYR et EUR/IDR par série du 30/12/2024 au 11/11/2026. Les deux jours de décembre servent au report initial des fixings. | [Réutilisation permise avec attribution](https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html). Les taux sources sont conservés et le calcul des cours croisés est identifié. |
| [TradingView](https://www.tradingview.com/) pour [CME / CBOT / NYMEX](https://www.cmegroup.com/market-data/licensing.html), [Bursa FCPO](https://www.bursamalaysia.com/trade/our_products_services/derivatives/commodity_derivatives/crude_palm_oil_futures) et [ICE Gasoil](https://www.ice.com/products/219/Low-Sulphur-Gasoil-Futures) | Clôtures quotidiennes de six contrats continus de première échéance depuis le 02/01/2025 : `CBOT:ZL1!`, `CBOT:ZS1!`, `CBOT:ZM1!`, `NYMEX:HO1!`, `ICEEUR:ULS1!`, `MYX:FCPO1!`. Relevé quotidien, voir « Contrats à terme ». | Les [conditions de TradingView](https://www.tradingview.com/policies/) et des bourses encadrent la republication de ces données. Le propriétaire du site a décidé de les publier le 13/11/2026. [Euronext ECO](https://live.euronext.com/en/product/commodities-futures/ECO-DPAR) reste non intégré. |
| [EPA · RIN Trades and Price Information](https://www.epa.gov/fuels-registration-reporting-and-compliance-help/rin-trades-and-price-information) | 90 valeurs D4 séparées du 06/01/2025 au 21/09/2026, par semaine de transfert, pondérées par volume. Série « Weekly D3, D4, D5 and D6 RINs Prices ». | Statistiques agrégées publiées par une agence fédérale américaine et attribuées à l’EPA. [17 USC § 105](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section105). |
| [ESDM / Ditjen EBTKE](https://ebtke.esdm.go.id/) | 23 prix de base HIP, janvier 2025 à novembre 2026. La fiche Indonésie contient le lien de chaque avis. Les lettres signées font foi pour février, mars et novembre 2026, dont les pages présentent des incohérences. | Seuls les prix de référence factuels des annonces officielles sont repris, avec attribution et lien. Les documents eux-mêmes ne sont pas redistribués. [Loi indonésienne n° 28/2014, art. 42–43](https://www.wipo.int/wipolex/en/legislation/details/15600). |
| [ANP · prix producteurs](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-de-produtores-e-importadores-de-derivados-de-petroleo-e-biodiesel) | 96 observations hebdomadaires B100 du 05/01/2025 au 01/11/2026 (fin de semaine). Moyenne pondérée, colonne Brasil du [fichier officiel](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/ppidp/precos-medios-ponderados-semanais-2013.xls), hors ICMS. | Le portail affiche CC BY-ND 3.0. Les chiffres officiels repris sont inchangés. Les conditions applicables à une redistribution du classeur adapté restent à vérifier. |
| [CEPEA / ESALQ](https://www.cepea.org.br/) | Aucun historique gratuit vérifié pour l’huile brute dégommée, São Paulo, avec 12 % d’ICMS. | Redistribution publique non vérifiée. |
| [Commission européenne · Oilseeds](https://agridata.ec.europa.eu/extensions/DashboardCereals/OilseedPrices.html) et [API](https://agridata.ec.europa.eu/extensions/API_Documentation/oilseeds.html) | Le portail documente des prix hebdomadaires. Aucun triplet quotidien de colza physique à base géographique et commerciale commune n’a été vérifié. | [Politique générale de réutilisation](https://commission.europa.eu/legal-notice_en), sous réserve des droits de tiers. Aucun historique intégré. |
| Mer Noire | Aucun triplet gratuit, vérifiable et comparable pour l’huile, les pellets et les graines. | Redistribution publique non vérifiée. |

## Marges de trituration

L’onglet « Marges » présente trois fiches, construites comme celles des spreads : référence, période, moyenne mobile, unité et paramètres modifiables, valeurs et CSV. Les prix se mettent à jour sans intervention : contrats CBOT par le relevé quotidien TradingView (branche `futures-live`), prix FOB argentins par le workflow « Actualiser les prix » (branche `prices-live`).

| Fiche | Référence | Calcul | Paramètres et options |
| --- | --- | --- | --- |
| Board crush · Soja aux États-Unis | Quotidien · première échéance | `CBOT:ZM1!` (USD/short ton) × 44 lb ÷ 2 000 + `CBOT:ZL1!` (¢ US/lb) × 11 lb ÷ 100 − `CBOT:ZS1!` (¢ US/bu) ÷ 100 − coût | Huile et tourteau par boisseau (lb), coût de trituration (USD/bu), unité USD/bu ou USD/t de graines (× 36,744 bu/t) |
| Board crush · Soja aux États-Unis | Mensuel · depuis 2015 | Même calcul sur les moyennes mensuelles des trois contrats, mois en cours compris | Idem |
| Trituration du soja · Argentine | FOB · avant droits | Rendement huile × huile FOB + rendement tourteau × tourteau FOB − graines FOB − coût, en USD/t de graines | Rendements (0,19 et 0,78 t/t par défaut), coût de trituration et frais (USD/t) |
| Trituration du soja · Argentine | Net des droits d’exportation | Chaque prix FOB multiplié par (1 − droit d’exportation) avant le même calcul | Idem, plus les droits : graines 24 %, huile et tourteau 22,5 % par défaut |
| Trituration du tournesol · Argentine | FOB · avant droits, ou net des droits | Même calcul avec l’huile et les pellets de tournesol | Rendements 0,44 et 0,39 t/t ; droits 4,5 % par défaut |

- **Prix argentins :** prix FOB officiels du Secrétariat de l’Agriculture (MAGyP), qui servent de base aux droits d’exportation. Une date est retenue si les trois produits ont un prix unique pour la position couvrant le mois de cotation.
- **Droits d’exportation :** les taux par défaut sont ceux du Décret 877/2025 (Boletín Oficial du 12/12/2025) : 24 % pour les graines de soja, 22,5 % pour l’huile et le tourteau, 4,5 % pour le tournesol. Le Décret 423/2026 (Boletín Oficial du 03/06/2026) les maintient en 2026 et les réduit chaque mois à partir de janvier 2027 (graines de soja : 21 % en décembre 2027, 15 % en décembre 2028). Les taux saisis s’appliquent à toute la période affichée. Après le 31/12/2026, la fiche invite à saisir le taux du mois ; `ARG_DUTIES_UNTIL` et les valeurs par défaut se trouvent dans `docs/terminal/margin-focus.mjs`. Le taux par défaut des pellets de tournesol (position 2306.30) reprend celui des graines et de l’huile en vrac ; il reste à confirmer selon la position tarifaire.
- **Version nette :** elle approche la marge d’un triturateur argentin, qui achète les graines sur le marché intérieur (prix FOB moins le droit sur les graines) et exporte l’huile et le tourteau (prix FOB moins le droit sur les produits). Les frais FOBbing et le coût de trituration peuvent être saisis dans « Coût de trituration et frais ».
- **Contrats CBOT :** première échéance continue, sans ajustement. En octobre et novembre, le soja de novembre est associé à l’huile et au tourteau de décembre, comme dans le board crush usuel. Les moyennes mensuelles 2015–2024 de `CBOT:ZS1!` et `CBOT:ZM1!` (`zsMonth`, `zmMonth`) ont été calculées par TradingView avec `scripts/pine/olea_monthly.pine` le 13/11/2026 et reproduisent exactement sa somme de contrôle ; sur janvier 2025 à octobre 2026, elles coïncident avec les moyennes des clôtures quotidiennes du site.
- **Tests :** `node --test tests/margin-focus.test.mjs`.

## Calcul et actualisation

- Les positions FOB sélectionnées figurent dans `scripts/prices_lib.py` et dans les fiches. Chaque position doit couvrir le mois de la cotation. Aucun prix d’une autre date ou position ne remplace un bulletin manquant.
- Les séries hebdomadaires et mensuelles encore collectées (D4 de l’EPA, B100 de l’ANP, HIP indonésien, séries du FMI) restent collectées et visibles dans le panneau « Actualisation automatique des prix » (dernière valeur et état) ; elles ne servent plus aux fiches de spreads ni de marges.
- **Composantes :** chaque fiche (spreads et marges) propose une rangée « Composantes », désactivée par défaut. Chaque bouton ajoute sous la courbe principale le prix d’une composante du calcul (huile, tourteau, graines, palme, gazole, change), dans son unité d’origine, un graphique par prix, sur les mêmes dates que le spread ou la marge. Le choix est gardé quand on change de référence, de période ou d’unité : le change reste le change et les autres prix gardent leur rang dans la formule. Le graphique principal ne change pas.
- Vérifier les résultats avec `node --test tests/*.test.mjs`. Examiner les changements de données et publier uniquement après validation de la branche.

## Contrats à terme

Six contrats continus sont relevés sur TradingView : huile de soja `CBOT:ZL1!` (¢ US/lb), graines `CBOT:ZS1!` (¢ US/bu), tourteau `CBOT:ZM1!` (USD/short ton), Heating Oil `NYMEX:HO1!` (USD/gal), Low Sulphur Gasoil `ICEEUR:ULS1!` (USD/t) et huile de palme `MYX:FCPO1!` (MYR/t). Ils alimentent les versions quotidiennes du BOPO, du BOHO et du POGO, le board crush, la part de l’huile et les marges de biodiesel des États-Unis et d’Indonésie.

- **Valeur retenue :** clôture de la barre quotidienne, datée par la séance de bourse (`time_tradingday`). Les horodatages bruts sont écartés : celui du NYMEX porte la date de la veille.
- **Contrat :** première échéance continue, sans ajustement. La série change de contrat à l’échéance et peut alors présenter un saut. Les 6, 10 et 11/11/2026, `MYX:FCPO1!` reprend les clôtures du contrat de référence de janvier 2027 rapportées par Bernama. Le 06/11 et le 11/11/2026, `CBOT:ZL1!` reprend les règlements du contrat de décembre 2026.
- **Contrôle :** chaque relevé est copié depuis la réponse de TradingView, puis comparé à une somme de contrôle calculée par TradingView sur la même fenêtre : nombre de séances, somme des clôtures, somme pondérée par le jour du mois et somme pondérée par le mois. Une série n’est publiée que si la copie reproduit exactement ces quatre valeurs. L’historique initial (469 séances CBOT et NYMEX, 482 séances ICE, 455 séances Bursa, du 02/01/2025 au 12/11/2026) a passé ce contrôle le 13/11/2026.
- **Séance en cours :** jamais publiée. La fenêtre s’arrête à la veille.
- **Révisions :** une clôture déjà publiée ne peut changer que si elle date de moins de cinq jours. Au-delà, la série est bloquée pour vérification du contrat continu.
- **Publication :** `scripts/update-futures.py` écrit `futures-prices.json` et `futures-status.json` sur la branche `futures-live`, que le site lit au chargement. La marche à suivre du relevé quotidien figure dans `scripts/futures-runbook.md`. TradingView n’est accessible que par le connecteur du compte Claude du propriétaire : le relevé est donc effectué par une tâche planifiée Claude, et non par GitHub Actions.
- **Tests :** `python3 -m unittest discover -s tests -p 'test_*.py'`.

## Moyennes mensuelles des contrats à terme

Les versions mensuelles du BOPO, du BOHO et du POGO utilisent la moyenne, sur chaque mois, des clôtures quotidiennes des contrats continus `CBOT:ZL1!`, `MYX:FCPO1!`, `NYMEX:HO1!` et `ICEEUR:ULS1!`. La palme est convertie en USD/t chaque jour avant la moyenne.

- **Janvier 2015 à décembre 2024 :** moyennes calculées par TradingView avec `scripts/pine/olea_monthly.pine` (ZL à 4 décimales, HO à 5, gazole à 3) et `scripts/pine/olea_monthly_fx.pine` (FCPO ÷ `FX_IDC:USDMYR` du jour, 3 décimales), sur un graphique mensuel (timeframe `M`). Le mois est celui de la date de séance. Les 120 valeurs de chaque contrat sont enregistrées dans `docs/terminal/spread-prices.mjs` (`zlMonth`, `fcpoUsdMonth`, `hoMonth`, `gasoilMonth`). Elles ont été copiées le 13/11/2026 et reproduisent exactement la somme de contrôle calculée par TradingView sur les 120 mois : nombre de mois, somme, somme × mois et somme × (année − 2000).
- **Depuis janvier 2025 :** moyenne calculée sur le site à partir des clôtures quotidiennes de la branche `futures-live` (palme convertie au fixing BCE du jour, comme la version quotidienne). Le mois en cours est une moyenne partielle des séances closes, signalée « en cours » avec son nombre de séances.
- **Raccord :** sur janvier 2025 à octobre 2026, les moyennes de TradingView et celles du site coïncident à 0,0002 % près pour ZL, HO et le gazole. Pour la palme en USD, l’écart moyen est de 0,06 % (0,27 % au plus, soit environ 3 USD/t), dû à la source de change.

## Actualisation automatique

Le workflow `.github/workflows/update-prices.yml` exécute `scripts/update-prices.py` trois fois par jour : 9 h 17 UTC (prix MPOB définitifs, cotations IPOSS), 15 h 47 UTC les jours ouvrés (fixings BCE) et 21 h 23 UTC (bulletin FOB argentin, séries EIA et FMI sur FRED, B100 de l’ANP). Le résultat est publié sur la branche `prices-live` (`docs/terminal/live/spread-prices.json` et `price-status.json`). Le site lit cette branche au chargement, en 3 secondes au plus, et complète la copie intégrée `docs/terminal/spread-prices.mjs`. Le panneau « Actualisation automatique des prix » de la page Comparaisons & spreads affiche l’état de chaque série.

| Série | Source | Règle appliquée |
| --- | --- | --- |
| `arSoyOil`, `arSoyMeal`, `arSoySeed`, `arSunOil`, `arSunMeal`, `arSunSeed` | MAGyP | Bulletin du jour exact, position couvrant le mois de cotation, prix unique. Dix derniers jours ouvrés relus à chaque passage, jours manquants des 45 derniers jours recherchés, 120 jours revérifiés le dimanche. |
| `eurUsd`, `eurMyr`, `eurIdr` | BCE | Fixings des 45 derniers jours. |
| `ulsdNy`, `ulsdNyMonth`, `imfSoyOil`, `imfPalmOil` | FRED | Séries complètes relues, révisions reprises. |
| `mpobCpo` | MPOB | Tableau annuel. Seuls les prix définitifs sont retenus : NT, PH, « - » et prix de 8 h 30 marqués `**` exclus. Année précédente revérifiée le dimanche et en janvier. |
| `idPalmFob`, `myPalmFob` | IPOSS | Tableau public, cotations FOB Port Belawan et Port Klang. Le tableau n’affiche que les derniers jours : l’historique s’allonge à chaque relevé. |
| `b100` | ANP | Classeur hebdomadaire, ligne Biodiesel B-100, colonne Brasil, date du dimanche de clôture. |

Contrôles :

- Format de chaque source vérifié (en-têtes, colonnes, dates). Une source illisible est signalée et ses séries restent inchangées. Les autres sources sont mises à jour normalement.
- Bornes de vraisemblance par série, en unité native. Une valeur hors bornes est ignorée et signalée.
- Une valeur nouvelle ou révisée qui s’écarte de la précédente au-delà du seuil de la série (4 à 5 % pour les changes, 10 à 15 % pour les prix quotidiens, 25 % pour les moyennes mensuelles) est retenue. Elle est publiée dès que l’observation suivante confirme le niveau. Une valeur isolée reste retenue et s’affiche comme « à vérifier ».
- Si plus de 10 % des valeurs déjà publiées d’une série diffèrent de la source, aucune modification n’est appliquée : un changement de format est probable.
- Une valeur publiée n’est jamais supprimée. Les révisions de la source remplacent l’ancienne valeur et sont listées dans `price-status.json` et dans le résumé du workflow.
- Le workflow échoue, et GitHub prévient par courriel, si une source échoue depuis plus de 48 heures ou si une série ne passe pas les contrôles.

Pour forcer une mise à jour : onglet **Actions** › **Actualiser les prix** › **Run workflow**, qui revérifie aussi 120 jours de bulletins argentins. Pour accepter une valeur retenue avant confirmation, l’ajouter à `docs/terminal/spread-prices.mjs` sur `main`. Tests : `python3 -m unittest discover -s tests -p 'test_*.py'` et `node --test tests/*.test.mjs`.

## Saisie manuelle

Le D4 de l’EPA est publié dans un tableau de bord Qlik sans fichier téléchargeable, et le HIP indonésien dans des avis mensuels signés : ces deux séries restent saisies à la main.

- Pour le D4, exporter le graphique EPA « Weekly D3, D4, D5 and D6 RINs Prices » et conserver les lignes D4 en USD/RIN, avec leur date de semaine. Pour HIP, vérifier l’avis mensuel et sa lettre signée, puis ajouter le prix hors fret, la date d’effet et le lien. Ajouter les lignes à `docs/terminal/spread-prices.mjs` sous la forme `[date ISO, valeur native, lien facultatif]`, triées et sans doublons.
- Pour rattraper une longue période de bulletins argentins sur une branche de travail : `python scripts/update-spreads.py --from AAAA-MM-JJ --through AAAA-MM-JJ` (ajouter `--fred` pour les séries EIA et FMI). Le script partage ses lecteurs avec la mise à jour automatique (`scripts/prices_lib.py`).
