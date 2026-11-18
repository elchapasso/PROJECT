# Veille quotidienne · Marché & actualités

La page **Marché & actualités** (`#overview`) réunit toutes les nouvelles qui peuvent faire bouger les prix du soja, du tournesol et de la palme. Elle lit `docs/terminal/news-feed.json`, rédigé chaque matin et publié sur la branche `news-live`. Les événements intégrés au site (`seedEvents` dans `data.js`) et ceux saisis dans le navigateur s’y ajoutent.

## Périmètre suivi

| Complexe | Produits (`product`) | Origines (`origin`) |
|---|---|---|
| Soja & huile de soja | `soy` graines, `sbo` huile, `sm` tourteau | `us` États-Unis, `arg` Argentine, `bra` Brésil |
| Tournesol | `sun` graines, `sfo` huile, `sfm` tourteau | `rus` Russie, `ukr` Ukraine, `eu` Union européenne, `bgr` Bulgarie, `rou` Roumanie, `arg` Argentine |
| Huile de palme | `palm` CPO, `rbd`, `olein`, `pko` | `idn` Indonésie, `mys` Malaisie, `tha` Thaïlande, `col` Colombie, `latam` Amérique latine (autres pays) |
| Transversal | `energy`, `bio`, `fx`, `freight` | toute origine |

La demande (Inde `ind`, Chine `chn`) se classe sous le produit concerné : elle apparaît dans la ligne « Demande & autres origines » de la carte des impacts.

## Format d’une fiche

```json
{
  "id": "2026-11-13-mys-fcpo-elnino",
  "date": "2026-11-13",
  "time": "Clôture Kuala Lumpur",
  "product": "palm",
  "origin": "mys",
  "category": "trade",
  "title": "FCPO janvier remonte à 4 462 MYR/t sur la crainte d’El Niño",
  "summary": "Ce qui s’est passé, en deux ou trois phrases, avec les chiffres.",
  "number": "4 462 MYR/t",
  "variation": "+22 MYR/t sur la séance",
  "period": "Séance du 13 nov. 2026",
  "impact": "positive",
  "intensity": 1,
  "horizon": "short",
  "status": "confirmed",
  "transmission": "Pourquoi c’est haussier, baissier ou mixte pour les prix.",
  "caveat": "Ce qui pourrait inverser la lecture.",
  "morocco": "Pour les achats vers Casablanca : ce que ça change concrètement.",
  "source": "Bernama",
  "url": "https://www.bernama.com/…"
}
```

| Champ | Règle |
|---|---|
| `id` | `AAAA-MM-JJ-origine-sujet`, unique. Réutiliser l’id pour corriger une fiche. |
| `date` | Date de publication de la source (heure de Casablanca). Jamais dans le futur. |
| `time` | Heure et fuseau si connus (« 12:00 New York », « Clôture Chicago »), sinon `""`. |
| `category` | `supply`, `demand`, `stocks`, `trade` (prix, flux), `policy`, `weather`, `logistics`, `energy`, `geo`, `fx`. |
| `impact` | `positive` (haussier), `negative` (baissier) ou `mixed` (mixte), du point de vue du prix mondial du produit. |
| `intensity` | 1 faible, 2 modérée, 3 forte. |
| `horizon` | `short` (1-4 semaines), `medium` (1-3 mois), `long` (3-12 mois). |
| `status` | `confirmed` (publié), `estimate`, `projection`, `consensus`, `rumor`, `pending`. |
| `transmission` | Une ou deux phrases : le mécanisme qui justifie l’impact. |
| `caveat` | Une phrase : ce qui inverserait la lecture. |
| `morocco` | Une phrase « Pour nos achats » : l’effet concret pour un importateur d’huile en vrac vers Casablanca (origine plus ou moins compétitive, disponibilité, coût rendu, fret, USD/MAD, moment d’achat ou de couverture). Ne pas répéter `transmission`. Obligatoire pour toute nouvelle fiche ; le script signale celles qui en manquent. |
| `source`, `url` | Nom de la source et lien `https://` vers l’article ou le communiqué original. |

Limites : titre ≤ 140 caractères, résumé ≤ 700, transmission ≤ 500, condition d’inversion ≤ 400, `morocco` ≤ 320.

### Calibrer l’intensité

| `intensity` | Quand |
|---|---|
| 3 forte | Change le bilan ou la politique d’un grand exportateur, ou fait bouger la référence d’au moins 2 % en séance ou le coût rendu Casablanca d’au moins 20 USD/t : changement de taxe ou de droit à l’export, surprise WASDE ou MPOB, fermeture de ports, mandat biodiesel modifié. |
| 2 modérée | Rapport ou événement qui compte pour la semaine : publication NOPA, SEA, GAPKI, exportations des inspecteurs, séance à plus de 1 %, avancée nette des récoltes, attaque sur la route maritime. |
| 1 faible | Donnée de suivi ou signal isolé : séance calme, prévision d’un courtier, avancement des semis conforme. |

## Synthèse du jour (`brief`)

Chaque édition se termine par une synthèse, placée à la racine du fichier à côté de `items`. Elle s’affiche en tête de la page et dans le brief copié ou imprimé.

```json
"brief": {
  "date": "2026-11-18",
  "headline": "Le message du jour en une phrase (≤ 180 caractères).",
  "points": [
    {"complex": "soy", "impact": "negative", "text": "Une ou deux phrases avec les faits et chiffres du jour (≤ 360).", "ids": ["2026-11-17-us-…"]},
    {"complex": "sun", "impact": "positive", "text": "…", "ids": ["…"]},
    {"complex": "palm", "impact": "mixed", "text": "…", "ids": ["…"]}
  ],
  "watch": ["Ce qu’il faut surveiller aujourd’hui ou cette semaine, avec la date (≤ 200)."]
}
```

- `date` : date de l’édition (Casablanca). Réécrire la synthèse à chaque édition.
- `points` : 2 à 6 points, un par complexe (`soy`, `sun`, `palm`) et éventuellement `macro` (énergie, fret, devises). `impact` = sens net pour le prix de l’huile du complexe, en pesant toutes les fiches récentes, pas seulement celles du jour. `ids` = fiches du flux qui l’appuient.
- `watch` : jusqu’à 4 rendez-vous ou risques à suivre (rapport, décision, séance, météo), avec leur date.
- Pas de recommandation d’achat ou de vente : des faits, leur sens pour les prix et ce qu’ils changent pour les achats.

## Points à couvrir à chaque édition

Passer cette liste dans l’ordre ; n’ajouter une fiche que s’il y a du nouveau.

1. **Séances** : clôture de l’huile de soja et des graines au CBOT, du FCPO à Bursa, et du Brent ou du gasoil s’ils ont fait bouger les huiles. Au plus une fiche de séance par complexe et par jour, qui donne le mouvement et sa raison.
2. **Prix physiques** : huile de tournesol FOB mer Noire et ports de l’UE (UkrAgroConsult, APK-Inform), FOB Argentine (MAGyP, Rosario), palme FOB Indonésie et Malaisie, prix de référence indonésien.
3. **Rapports du jour** (voir le calendrier du site) : WASDE, NOPA, ventes et inspections à l’export de l’USDA, MPOB, GAPKI, SEA India, inspecteurs de cargaisons (ITS, AmSpec), Conab, Abiove, Bolsa de Cereales, Bourse de Rosario, ministère ukrainien.
4. **Politiques** : taxes et droits à l’export (Argentine, droit hebdomadaire russe sur l’huile de tournesol, prélèvement et prix de référence indonésiens, droit malaisien), mandats biocarburants (B40/B50, EPA), droits d’importation de l’Inde et de la Chine.
5. **Météo et climat** : Argentine, Brésil, Asie du Sud-Est (El Niño, La Niña), mer Noire.
6. **Logistique et géopolitique** : mer Noire (attaques, ports, assurance), Paraná, Suez et mer Rouge, détroit d’Ormuz, et tout ce qui touche le fret vers Casablanca (voir FRET.md).
7. **Demande** : importations et stocks de l’Inde et de la Chine, achats de l’Afrique du Nord.

Une édition compte en général 8 à 15 fiches. Ne pas reprendre une nouvelle de plus de 48 heures (72 heures le lundi) sauf si elle n’a jamais été couverte et reste importante.

## Règles de rédaction

- En français, avec ses propres mots. Ne pas recopier les articles. Une citation éventuelle fait moins de 15 mots.
- Une fiche = un fait daté et chiffré. Pas de fiche sans lien vérifiable.
- Préférer la source primaire : USDA, NOPA, CFTC, Conab, Abiove, ANEC, Bolsa de Cereales, BCR, MPOB, GAPKI, ministères, Commission européenne, Fedepalma. À défaut, presse spécialisée reconnue : Reuters, Bernama, The Edge, UkrAgroConsult, S&P Global, Argus, Fastmarkets, Brownfield, etc.
- L’impact décrit le sens probable pour les prix, pas un jugement : une récolte record est baissière, une taxe à l’export plus forte chez un exportateur est haussière pour le prix mondial, mixte si les effets se compensent.
- Ne pas dupliquer un événement déjà présent dans `seedEvents` (`data.js`) ou dans le flux.

## Mise à jour quotidienne

Une tâche planifiée la lance chaque matin (lundi-samedi) :

1. Cloner le dépôt et récupérer la branche `news-live` dans un dossier séparé :
   `git fetch origin news-live && git worktree add ../news-live FETCH_HEAD`
2. Lire `../news-live/docs/terminal/news-feed.json` et rechercher les nouvelles des dernières 24-48 h, complexe par complexe et origine par origine.
3. Ajouter les nouvelles fiches en suivant les « Points à couvrir » (en général 8 à 15), avec leur lecture `morocco`, et corriger celles qui ont évolué.
4. Écrire la synthèse du jour (`brief`) une fois les fiches en place.
5. Contrôler et dater : `node scripts/update-news.mjs ../news-live/docs/terminal/news-feed.json`. Le script refuse le fichier s’il contient une fiche ou une synthèse invalide, trie, supprime les fiches de plus de 120 jours, affiche la couverture des 7 derniers jours et signale une synthèse absente ou ancienne et les fiches sans lecture `morocco`.
6. Mettre à jour le fret (`docs/terminal/freight-feed.json` et fiches `freight`) selon [FRET.md](FRET.md), puis contrôler avec `node scripts/update-freight.mjs ../news-live/docs/terminal/freight-feed.json`.
7. Publier : commit sur `news-live` puis `git push origin HEAD:news-live`. Ne jamais pousser sur `main`.

Le site lit `news-live` à l’ouverture puis toutes les 30 minutes. Si la branche est inaccessible, il utilise la copie intégrée `docs/terminal/news-feed.json`.

Tests : `node --test tests/news-feed.test.mjs`.
