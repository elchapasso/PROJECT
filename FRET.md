# Fret · vrac liquide vers Casablanca

La page **Fret** (`#fret`, rubrique Terminal) estime le coût du transport d’huiles végétales en vrac jusqu’à Casablanca, en USD par tonne, pour les lots habituels :

| Origine | Port de chargement | Produit | Lots | Navire type |
|---|---|---|---|---|
| Argentine | Rosario (Up River) | Huile de soja | 18 et 24 kt | Tanker Handy dédié |
| Ukraine | Tchornomorsk, variante via Constanța | Huile de tournesol | 6 et 8 kt | Petit tanker dédié |
| Russie | Novorossiïsk | Huile de tournesol | 6 et 8 kt | Petit tanker dédié |
| Bulgarie | Varna | Huile de tournesol | 6 et 8 kt | Petit tanker dédié |
| Colombie | Santa Marta | Huile de palme | 4 kt | Lot sur chimiquier ~18 kt |
| Indonésie | Dumai, via Suez ou le Cap | Huile de palme | 4 kt | Lot sur chimiquier ~30 kt |
| Malaisie | Port Klang, via Suez ou le Cap | Huile de palme | 4 kt | Lot sur chimiquier ~30 kt |

Les cotations de fret par route (Argus, Platts, Baltic) sont payantes. La page affiche donc une **estimation** transparente, recalculée à chaque relevé public, que l’on cale avec les offres de son courtier.

## Modèle (`docs/terminal/freight-model.mjs`)

Coût du voyage = affrètement × jours + soutes + frais de port + canal + surprime de guerre, divisé par les tonnes chargées.

- **Affrètement** du navire type = montant fixe (USD/jour) + part de l’indice Baltic le plus proche : TC6 (30 kt cross-Méditerranée) pour les petits tankers, panier MR Atlantique pour les autres.
- **Jours** = trajet chargé (distance ÷ vitesse) + retour partiel à vide + jours de port.
- **Soutes** = consommation en mer et au port × VLSFO de Gibraltar (Atlantique, mer Noire) ou de Singapour (Asie).
- **Lots de 4 kt** : part d’un chimiquier plus grand (capacité × taux de remplissage), avec une prime de lot.
- **Surprime de guerre** : % de la valeur de coque par voyage (mer Noire, mer Rouge).
- Non inclus : surestaries, commissions, acheminement intérieur et transbordement.

À chaque date, le modèle retient le dernier relevé connu de chaque entrée. Les hypothèses (fixe et part de l’indice, vitesse, consommation, jours et frais de port, retour à vide, prime de lot, surprimes de guerre) se modifient dans la page et restent enregistrées dans le navigateur.

## Données (`docs/terminal/freight-feed.json`, branche `news-live`)

```json
{
  "updatedAt": "2026-11-14T16:00:00.000Z",
  "series": {
    "vlsfo-gib": {"points": [{"date": "2026-11-13", "value": 827, "source": "ENGINE", "url": "https://…"}]},
    "vlsfo-sgp": {"points": […]},
    "tce-tc6": {"points": […]},
    "tce-mr-atl": {"points": […]}
  },
  "quotes": [
    {"id": "2026-05-11-argentine-inde", "date": "2026-05-11", "from": "Argentine", "to": "Inde", "size": "n. d.", "low": 140, "high": 145, "previous": "70-75 USD/t auparavant", "source": "Whalesbook", "url": "https://…"}
  ]
}
```

| Série | Contenu | Unité | Sources publiques |
|---|---|---|---|
| `vlsfo-gib` | VLSFO Gibraltar | USD/t | Ship & Bunker, ENGINE |
| `vlsfo-sgp` | VLSFO Singapour | USD/t | Ship & Bunker, ENGINE |
| `tce-tc6` | Baltic TC6, 30 kt cross-Méditerranée, TCE aller-retour | USD/jour | Rapport tanker hebdomadaire du Baltic Exchange (vendredi) |
| `tce-mr-atl` | Panier MR Atlantique (triangulation), TCE | USD/jour | Rapport tanker hebdomadaire du Baltic Exchange (vendredi) |

`quotes` regroupe les niveaux de fret d’huiles végétales cités dans la presse (route, lot, USD/t, niveau antérieur). Ils servent d’ordre de grandeur et de contrôle du modèle.

Contrôle : `node scripts/update-freight.mjs <fichier>` refuse une série inconnue, une date invalide ou future, une valeur hors bornes (soutes 200-2 500 USD/t, TCE 1 000-600 000 USD/jour), un lien non https ou une cotation incohérente. Il trie les relevés, garde un point par date, date le fichier et affiche les estimations par route. Tests : `node --test tests/freight-model.test.mjs`.

## Actualités du fret

- **Analyses** : fiches de `news-feed.json` avec `"product": "freight"` (catégorie `logistics`, `energy` ou `geo`). Impact `positive` (haussier) = fret plus cher pour Casablanca, `negative` = fret moins cher. Elles apparaissent aussi dans Marché & actualités (complexe Transversal).
- **Dépêches maritimes** : titres du thème « Fret & routes » collectés chaque heure par le flux Énergie & géopolitique (branche `energy-news-live`), sur 14 jours.

## Mise à jour quotidienne

La tâche planifiée de la veille quotidienne (voir [NEWS.md](NEWS.md)) met aussi à jour le fret :

1. Dans le dossier `news-live`, ouvrir `docs/terminal/freight-feed.json`.
2. Ajouter les nouveaux relevés : VLSFO Gibraltar et Singapour du jour (ou de la veille) ; le vendredi ou samedi, TC6 et panier MR Atlantique du rapport tanker de la semaine (`https://www.balticexchange.com/en/data-services/WeeklyRoundup/tanker/news/2026/tanker-report-week-NN.html`).
3. Ajouter toute cotation publique de fret d’huiles végétales trouvée (mer Noire, Argentine, Asie, Colombie).
4. Ajouter 1 à 3 fiches `freight` dans `news-feed.json` quand une nouvelle fait bouger le fret (taux tankers, soutes, mer Noire, mer Rouge et Suez, Ormuz, Paraná, ports).
5. Contrôler : `node scripts/update-freight.mjs ../news-live/docs/terminal/freight-feed.json` puis `node scripts/update-news.mjs ../news-live/docs/terminal/news-feed.json`.
6. Publier sur `news-live` uniquement.

Le site lit `news-live` à l’ouverture puis toutes les 15 minutes quand la page Fret est affichée. Si la branche est inaccessible, il utilise la copie intégrée au site.

## Cotations courtier

Le formulaire « Vos cotations courtier » enregistre des offres réelles (route, lot, USD/t, date) **dans le navigateur uniquement** : le site est public, rien n’est publié ni envoyé. Pour chaque origine, la cotation la plus récente donne un facteur (cotation ÷ estimation du modèle à la même date) appliqué à l’estimation courante, affiché « calibré ». Une cotation de plus de 60 jours est signalée.
