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
| `source`, `url` | Nom de la source et lien `https://` vers l’article ou le communiqué original. |

Limites : titre ≤ 140 caractères, résumé ≤ 700, transmission ≤ 500, condition d’inversion ≤ 400.

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
3. Ajouter les nouvelles fiches (en général 5 à 15), corriger celles qui ont évolué.
4. Contrôler et dater : `node scripts/update-news.mjs ../news-live/docs/terminal/news-feed.json`. Le script refuse le fichier s’il contient une fiche invalide, trie, supprime les fiches de plus de 120 jours et affiche la couverture des 7 derniers jours.
5. Publier : commit sur `news-live` puis `git push origin HEAD:news-live`. Ne jamais pousser sur `main`.

Le site lit `news-live` à l’ouverture puis toutes les 30 minutes. Si la branche est inaccessible, il utilise la copie intégrée `docs/terminal/news-feed.json`.

Tests : `node --test tests/news-feed.test.mjs`.
