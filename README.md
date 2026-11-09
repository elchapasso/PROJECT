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

Pour lancer un aperçu à partir de la racine du dépôt, exécuter `python -m http.server 8000 --directory docs`, puis ouvrir `http://localhost:8000/`. Pour vérifier la syntaxe, utiliser `node --check docs/terminal/app.js`, puis la même commande pour `model.js` et `data.js`.

## Publication

GitHub Pages publie le dossier `/docs` de la branche `main`. Une modification fusionnée dans cette branche est déployée automatiquement. Vérifier le dernier déploiement dans l’onglet **Actions** et ouvrir le site après chaque version.

## Données

Les observations initiales sont datées. Conserver la période de référence, l’unité, la date de publication, le statut et le lien de provenance pour chaque ajout au jeu initial. Les données saisies dans le terminal et les rapports archivés sont propres au navigateur. La sauvegarde et l’import JSON se trouvent dans **Sources & données**.

La trituration américaine du soja et les stocks américains d’huile de soja utilisent les chiffres mensuels des membres de [NOPA](https://www.nopa.org/resources/nopa-monthly-crush-report/). Les tableaux indiquent la publication qui relaie chaque observation disponible.
