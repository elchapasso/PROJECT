# Oléa Terminal

Terminal en français pour suivre les marchés mondiaux des huiles végétales et des oléagineux. Il réunit les fondamentaux, les prix datés, les facteurs de marché, les spreads, les scénarios et le brief COMEX.

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

## Rapport COT · CFTC

La vue [Rapport COT · CFTC](https://elchapasso.github.io/PROJECT/#cot), dans la rubrique **Analyse**, suit le positionnement des opérateurs sur l’huile de soja (`007601`, ZL) et les graines de soja (`005602`, ZS) du CBOT, d’après le rapport hebdomadaire Commitments of Traders de la CFTC. Elle couvre les formats désagrégé et Legacy, futures seuls ou futures + options, depuis janvier 2010 : positions nettes par catégorie, longs et shorts, intérêt ouvert, mouvements de la semaine, indice COT sur 26 semaines à 5 ans, saisonnalité, comparaison huile / graines, détail du rapport avec concentration, historique et exports CSV.

Mise à jour automatique :

1. La CFTC arrête les positions le mardi et publie le vendredi à 15 h 30 ET. Un jour férié fédéral reporte la publication au lundi.
2. Le workflow `.github/workflows/update-cot.yml` exécute `scripts/update-cot.mjs` le vendredi soir, le lundi soir et le mardi et le samedi matin. Le script interroge l’[API publique de la CFTC](https://publicreporting.cftc.gov/), contrôle les données (colonnes, dates, identité longs + spreads + non déclarants = intérêt ouvert) et écrit `docs/terminal/cot/*.json` sur la branche `cot-live`. Un fichier n’est réécrit que si la CFTC a publié ou révisé des données.
3. La page lit la branche `cot-live`, puis la copie intégrée à `docs/terminal/cot/` si elle est plus récente. Si un rapport publié manque encore, elle interroge directement l’API de la CFTC. Une page restée ouverte vérifie chaque minute si un rapport est attendu et s’actualise, au plus toutes les 10 minutes.

Pour lancer la mise à jour à la main : onglet **Actions** › **Actualiser le rapport COT** › **Run workflow**, ou `node scripts/update-cot.mjs` en local (Node 18 ou plus récent). Vérifier les calculs et le calendrier avec `node --test tests/cot-model.test.mjs`. Le calendrier officiel des publications 2026 est repris dans `cot-model.mjs` (`officialDelays`) ; au-delà, les reports fériés sont estimés. GitHub suspend les workflows planifiés d’un dépôt public après 60 jours sans activité : la page se complète alors depuis l’API de la CFTC, et le workflow se réactive depuis l’onglet **Actions**.

## Données

Les observations initiales sont datées. Conserver la période de référence, l’unité, la date de publication, le statut et le lien de provenance pour chaque ajout au jeu initial. Les données saisies dans le terminal et les rapports archivés sont propres au navigateur. La sauvegarde et l’import JSON se trouvent dans **Sources & données**.

La trituration américaine du soja et les stocks américains d’huile de soja utilisent les chiffres mensuels des membres de [NOPA](https://www.nopa.org/resources/nopa-monthly-crush-report/). Les tableaux indiquent la publication qui relaie chaque observation disponible.
