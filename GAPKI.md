# Bilans GAPKI (Indonésie) · mise à jour

La page [Palme](https://elchapasso.github.io/PROJECT/#palm) lit au chargement `docs/terminal/live/gapki-feed.json` sur la branche `gapki-live`. Si ce fichier manque ou ne passe pas les contrôles, elle affiche la copie intégrée au site (`docs/terminal/gapki-data.mjs`) avec le badge « Copie intégrée ». Une tâche planifiée Claude vérifie deux fois par semaine si GAPKI a publié un nouveau bilan, met le flux à jour et le publie sur `gapki-live` en suivant cette page.

Les contrôles sont dans `docs/terminal/gapki-model.mjs` et s’exécutent avec `scripts/update-gapki.mjs`.

## Format du flux

Toutes les quantités sont en **milliers de tonnes (kt)**, entières, comme les « ribu ton » de GAPKI. `null` = chiffre non publié.

```json
{
  "updatedAt": "2026-11-17T22:30:00Z",
  "checkedAt": "2026-11-17T22:30:00Z",
  "unit": "kt",
  "release": {"period": "2026-08", "published": "2026-10-09", "url": "https://gapki.id/news/…"},
  "months": [
    {"month": "2026-08", "cpo": 4880, "pko": 464, "food": 775, "oleo": 180, "biodiesel": 1350,
     "consumption": 2304, "exports": 3588, "stock": 2214, "source": "https://gapki.id/news/…"}
  ],
  "annual": [
    {"year": 2025, "cpo": 51660, "pko": 4893, "food": 9834, "oleo": 2234, "biodiesel": 12704,
     "consumption": 24772, "exports": 32343, "stock": 2068, "source": "https://gapki.id/news/…"}
  ],
  "outlook": [
    {"year": 2027, "kind": "projection", "event": "IPOC 2026", "published": "2026-11-13", "production": 59870,
     "consumption": 30200, "biodiesel": 17400, "food": 10430, "oleo": 2370, "exports": 29730, "stock": null,
     "source": "https://gapki.id/en/news/…"}
  ]
}
```

| Champ | Communiqué indonésien | Communiqué anglais |
| --- | --- | --- |
| `cpo` | produksi CPO | CPO production |
| `pko` | produksi PKO | PKO production |
| `food` | konsumsi pangan | food consumption |
| `oleo` | oleokimia | oleochemicals |
| `biodiesel` | biodiesel | biodiesel |
| `consumption` | konsumsi dalam negeri (total) | domestic consumption (total) |
| `exports` | total ekspor (CPO, olahan, PKO, oleokimia, biodiesel) | total exports |
| `stock` | stok akhir | ending stock |

- `release` : le dernier mois publié (`period`), la date du communiqué (`published`, celle de la conférence ou de la mise en ligne) et son lien.
- `months` : un mois par ligne, sans trou, de janvier 2024 au dernier mois publié. `source` = communiqué qui présente ce mois ; pour un mois connu seulement par le communiqué suivant (janvier 2026, juillet 2026), le lien de ce communiqué suivant.
- `annual` : bilans annuels réalisés (communiqué annuel de février-mars). Le stock de décembre doit égaler le stock annuel.
- `outlook` : estimations de l’année en cours (`estimate`) et projections (`projection`) annoncées par GAPKI, par exemple à l’IPOC en novembre. `production` = CPO + PKO. Une perspective disparaît quand le bilan annuel réalisé de la même année est publié.
- `updatedAt` change quand les données changent ; `checkedAt` à chaque vérification. Le script les gère.

## Règles

- Publier uniquement sur la branche `gapki-live`, et uniquement `docs/terminal/live/gapki-feed.json`. Ne jamais pousser sur `main`, ne jamais ouvrir ni fusionner de pull request, ne jamais modifier le code.
- Chaque chiffre vient du communiqué GAPKI cité. Ne jamais estimer, arrondir, compléter un `null` par calcul ni recopier un chiffre de presse qui ne cite pas GAPKI.
- Lecture des nombres : en indonésien, le point sépare les milliers (« 4.880 ribu ton » = 4880 kt) et la virgule les décimales (« 2,21 juta ton » = 2210 kt). Toujours préférer la valeur en ribu ton ou en tonnes exactes à une valeur arrondie en millions.
- Révisions : le communiqué du mois M donne aussi les chiffres du mois M−1, parfois révisés. Remplacer ceux de M−1 par ces chiffres. Le stock d’ouverture (stok awal) du mois M est le stock de fin du mois M−1 : s’il manquait (`null`), le renseigner.
- Mois non publié : GAPKI saute parfois un mois (novembre et décembre 2025). Garder la ligne avec des `null` pour ce mois ; la page affiche le cumul tiré du bilan annuel.
- Si un contrôle échoue, relire le communiqué (versions indonésienne et anglaise) et corriger la recopie. Ne jamais modifier une valeur juste pour faire passer un contrôle. Si les chiffres publiés par GAPKI ne bouclent pas eux-mêmes, ne pas publier ce mois : remettre le fichier dans son état précédent, lancer le script, publier la seule vérification et signaler le problème dans le compte rendu.

## Où chercher

- Communiqués en anglais : https://gapki.id/en/news/category/press-release/
- Communiqués en indonésien : https://gapki.id/news/ (recherche « stok akhir » : https://gapki.id/?s=stok+akhir)
- Rythme : environ deux mois après la fin du mois (le bilan d’août 2026 a été présenté le 9 octobre 2026). Le titre ne nomme pas toujours le mois : ouvrir le communiqué pour l’identifier.
- Bilan annuel : février-mars de l’année suivante. Perspectives : conférence IPOC (novembre) et conférences de presse de début d’année.
- La presse (Reuters, Kontan, Bisnis, CNBC Indonesia, InfoSawit) aide à repérer une publication, mais les chiffres se recopient depuis gapki.id.

## Marche à suivre

Depuis un clone du dépôt sur `main` :

```bash
git fetch --no-tags --depth=1 origin refs/heads/gapki-live
git worktree add --detach "$TMPDIR/gapki-live" FETCH_HEAD
FEED="$TMPDIR/gapki-live/docs/terminal/live/gapki-feed.json"
node scripts/update-gapki.mjs "$FEED" --check
```

1. Lire `release.period` : le prochain bilan attendu est celui du mois suivant. Chercher s’il a été publié, ainsi qu’un bilan annuel ou de nouvelles perspectives plus récents que ceux du flux.
2. Nouveau bilan mensuel : ajouter la ligne du mois, mettre à jour le mois précédent avec les chiffres révisés et le stock d’ouverture, puis `release`.
3. Nouveau bilan annuel : ajouter l’entrée `annual`, retirer la perspective de la même année, renseigner le stock de décembre s’il manque.
4. Nouvelles perspectives : remplacer les entrées `outlook` concernées (année, type, nom de la publication, date, lien).
5. Contrôler et horodater : `node scripts/update-gapki.mjs "$FEED"`. Le script refuse un flux incohérent et n’écrit rien ; sinon il met `checkedAt` (et `updatedAt` si les données ont changé) et affiche un résumé.
6. Publier, même sans nouveauté, pour que la page montre la date de vérification :

```bash
cd "$TMPDIR/gapki-live"
git add docs/terminal/live/gapki-feed.json
git commit -m "GAPKI : bilan de septembre 2026"   # ou « GAPKI : vérification du 20 novembre 2026, rien de nouveau »
git push origin HEAD:refs/heads/gapki-live
```

7. Compte rendu en français : dernier mois publié avec ses chiffres, révisions du mois précédent, ajouts annuels ou perspectives, ou « rien de nouveau » avec le prochain bilan attendu.

## Copie intégrée

`docs/terminal/gapki-data.mjs` peut être remis au niveau de `gapki-live` lors d’une évolution du code. Après modification : `node scripts/update-gapki.mjs --check-bundled`. La première création de la branche se fait avec `node scripts/update-gapki.mjs docs/terminal/live/gapki-feed.json --init` dans un clone de `main`.
