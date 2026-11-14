# Oléa Terminal

Terminal en français pour suivre les marchés mondiaux des huiles végétales et des oléagineux. Il réunit les fondamentaux, les prix datés, les facteurs de marché, les spreads, les rapports officiels, le calendrier et le brief COMEX.

[Ouvrir le terminal](https://elchapasso.github.io/PROJECT/)

## Développement

Le dossier `docs/` contient l’application statique. Elle fonctionne sans installation de dépendances.

- `docs/index.html` charge la page et ses ressources.
- `docs/terminal/app.js` gère les vues, les filtres, les formulaires et les exports.
- `docs/terminal/model.js` contient les calculs et la validation des données.
- `docs/terminal/data.js` contient les observations initiales, les sources et le calendrier.
- `docs/terminal/style.css` contient les thèmes et les styles d’impression.
- `docs/terminal/cbot-arg-model.mjs` et `cbot-arg-view.mjs` contiennent le simulateur CBOT – ARG. Vérifier ses calculs avec `node --test tests/cbot-arg-model.test.mjs`.

Pour lancer un aperçu à partir de la racine du dépôt, exécuter `python -m http.server 8000 --directory docs`, puis ouvrir `http://localhost:8000/`. Pour vérifier la syntaxe, utiliser `node --check docs/terminal/app.js`, puis la même commande pour `model.js` et `data.js`.

## Publication

GitHub Pages publie le dossier `/docs` de la branche `main`. Une modification fusionnée dans cette branche est déployée automatiquement. Vérifier le dernier déploiement dans l’onglet **Actions** et ouvrir le site après chaque version.

## Simulateur CBOT – ARG

La vue [Simulateur CBOT – ARG](https://elchapasso.github.io/PROJECT/#cbot-arg) convertit le cours CBOT de l’huile de soja en prix argentin fret inclus. Elle applique `((CBOT − base) × 22,04622) + fret` et calcule le CBOT requis pour un objectif de prix. Les paramètres et les scénarios sont enregistrés dans le navigateur. Le bouton « Copier le lien » produit une adresse qui transmet les paramètres à un autre poste.

## Actualisation automatique des prix

Les prix des spreads et des marges (FOB argentins, CPO MPOB, FOB Belawan et Port Klang, fixings BCE, ULSD et références FMI, B100 brésilien) sont relus trois fois par jour par le workflow `.github/workflows/update-prices.yml` et publiés sur la branche `prices-live` après contrôle. Le site les charge à l’ouverture et revient à la copie intégrée si la branche est inaccessible. Les sources, les règles de lecture et les contrôles sont décrits dans [SPREADS.md](SPREADS.md#actualisation-automatique). Le D4 de l’EPA et le HIP indonésien restent saisis à la main.

## Rapport COT · CFTC

La vue [Rapport COT · CFTC](https://elchapasso.github.io/PROJECT/#cot), dans la rubrique **Analyse**, suit le positionnement des opérateurs sur l’huile de soja (`007601`, ZL) et les graines de soja (`005602`, ZS) du CBOT, d’après le rapport hebdomadaire Commitments of Traders de la CFTC. Elle couvre les formats désagrégé et Legacy, futures seuls ou futures + options, depuis janvier 2010 : positions nettes par catégorie, longs et shorts, intérêt ouvert, mouvements de la semaine, indice COT sur 26 semaines à 5 ans, saisonnalité, comparaison huile / graines, détail du rapport avec concentration, historique et exports CSV.

Mise à jour automatique :

1. La CFTC arrête les positions le mardi et publie le vendredi à 15 h 30 ET. Un jour férié fédéral reporte la publication au lundi.
2. Le workflow `.github/workflows/update-cot.yml` exécute `scripts/update-cot.mjs` le vendredi soir, le lundi soir et le mardi et le samedi matin. Le script interroge l’[API publique de la CFTC](https://publicreporting.cftc.gov/), contrôle les données (colonnes, dates, identité longs + spreads + non déclarants = intérêt ouvert) et écrit `docs/terminal/cot/*.json` sur la branche `cot-live`. Un fichier n’est réécrit que si la CFTC a publié ou révisé des données.
3. La page lit la branche `cot-live`, puis la copie intégrée à `docs/terminal/cot/` si elle est plus récente. Si un rapport publié manque encore, elle interroge directement l’API de la CFTC. Une page restée ouverte vérifie chaque minute si un rapport est attendu et s’actualise, au plus toutes les 10 minutes.

Pour lancer la mise à jour à la main : onglet **Actions** › **Actualiser le rapport COT** › **Run workflow**, ou `node scripts/update-cot.mjs` en local (Node 18 ou plus récent). Vérifier les calculs et le calendrier avec `node --test tests/cot-model.test.mjs`. Le calendrier officiel des publications 2026 est repris dans `cot-model.mjs` (`officialDelays`) ; au-delà, les reports fériés sont estimés. GitHub suspend les workflows planifiés d’un dépôt public après 60 jours sans activité : la page se complète alors depuis l’API de la CFTC, et le workflow se réactive depuis l’onglet **Actions**.

## Rapports & publications

La vue [Rapports & publications](https://elchapasso.github.io/PROJECT/#publications), dans la rubrique **Terminal**, donne une fiche par rapport suivi au calendrier : dernière publication (date et fichiers officiels), chiffres clés quand la source les publie en accès libre, prochaine date (heure de Casablanca, niveau de certitude) et les deux suivantes, liens vers la page officielle et les archives.

Le même workflow que le calendrier (`update-calendar.yml`, toutes les deux heures) lit les dernières publications avec `scripts/reports_lib.py` et les écrit dans `calendar-feed.json` (clé `latest`) :

- USDA : WASDE et rapports NASS sur [ESMIS](https://esmis.nal.usda.gov/) (fichier texte de la dernière publication) ; ventes à l’exportation sur l’API ouverte de la FAS (`api.fas.usda.gov`, clé `DEMO_KEY` ou secret `FAS_API_KEY` du dépôt, clé gratuite sur api.data.gov) ; inspections sur USDA Market News ;
- CONAB : tableur du dernier relevé (production de soja) ; SEA India : dernière circulaire des importations ; ANEC : dernier relevé hebdomadaire ; CFTC : positions des fonds lues sur la branche `cot-live`.

NOPA (données payantes), MPOB et la Bolsa de Cereales ne publient pas de chiffres exploitables en accès libre : leur fiche donne la date et le lien de la publication. Un fichier déjà lu n’est pas relu ; une source en panne garde sa dernière lecture. La page se relit toutes les 30 minutes tant qu’elle reste ouverte. Tests : `python3 -m unittest tests.test_reports` et `node --test tests/publications-model.test.mjs`.

## Calendrier des publications

La vue [Calendrier](https://elchapasso.github.io/PROJECT/#calendar), dans la rubrique **Terminal**, réunit les annonces macroéconomiques de Forex Factory et les rapports agricoles du domaine. Chaque publication ouvre sa page officielle ; « Détails » donne la lecture de marché. Les heures sont affichées à Casablanca, avec l’heure de la source.

Le workflow `.github/workflows/update-calendar.yml` exécute `scripts/update-calendar.py` toutes les deux heures et publie `docs/terminal/calendar-feed.json` sur la branche `calendar-live`. Chaque date porte un niveau de certitude :

| Publication | Source lue | Niveau |
|---|---|---|
| WASDE (12 h ET) | calendrier annuel du [WAOB](https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report) | officiel |
| NASS : Crop Progress, Crop Production, Fats & Oils, Grain Stocks, Acreage, Prospective Plantings | [calendrier NASS](https://www.nass.usda.gov/Publications/Calendar/), quatre mois glissants | officiel |
| NOPA (midi ET) | calendrier PDF de l’année, sinon le 15 ou le jour ouvré suivant | officiel ou règle |
| MPOB (12 h 30, Kuala Lumpur) | date annoncée sur [bepi.mpob.gov.my](https://bepi.mpob.gov.my/), sinon le 10 | officiel ou règle |
| CONAB : relevé des grains | calendrier PDF annuel | officiel |
| CONAB : progrès des récoltes | chaque lundi à 19 h (Brasília), selon le même calendrier | règle |
| FAS Weekly Export Sales | chaque jeudi 8 h 30 ET, vendredi après un jour férié fédéral | règle |
| FAS Oilseeds: World Markets and Trade | jour du WASDE, 12 h 15 ET | règle |
| ANEC | dernier relevé publié, puis une semaine plus tard | officiel puis habituel |
| SEA India, Bolsa de Cereales (jeudi), inspections USDA (lundi 11 h ET) | jour habituel, sans calendrier officiel | habituel |
| Forex Factory | flux de la semaine en cours : USD, EUR et CNY à impact fort ou moyen, jours fériés américains | officiel |

Le COT de la CFTC est calculé par la page (voir ci-dessus). Une source indisponible garde ses dates connues et signale l’échec dans l’onglet **Actions**. Les PDF sont lus avec `pypdf`. Tests : `python3 -m unittest tests.test_calendar` et `node --test tests/calendar-model.test.mjs`.

## Données

Les observations initiales sont datées. Conserver la période de référence, l’unité, la date de publication, le statut et le lien de provenance pour chaque ajout au jeu initial. Les données saisies dans le terminal et les rapports archivés sont propres au navigateur. La sauvegarde et l’import JSON se trouvent dans **Sources & données**.

La trituration américaine du soja et les stocks américains d’huile de soja utilisent les chiffres mensuels des membres de [NOPA](https://www.nopa.org/resources/nopa-monthly-crush-report/). Les tableaux indiquent la publication qui relaie chaque observation disponible.
