# Relevé quotidien des contrats à terme sur TradingView

Cette marche à suivre met à jour la branche `futures-live`, que le site lit au chargement. Elle est exécutée chaque jour par une tâche planifiée Claude disposant du connecteur TradingView. Le principe et les contrôles sont décrits dans `SPREADS.md`, section « Contrats à terme ».

## Règles

- Publier uniquement sur la branche `futures-live`, et uniquement `docs/terminal/live/futures-prices.json` et `docs/terminal/live/futures-status.json`. Ne jamais pousser sur `main` ni modifier le code.
- Copier les tableaux de l’outil tels quels. Ne jamais corriger, arrondir, compléter ou inventer une valeur pour faire passer un contrôle.
- Ne jamais inclure la séance en cours : la fenêtre s’arrête à la veille (UTC).
- Si un contrôle échoue après une nouvelle copie, publier l’état d’échec produit par le script et le signaler dans le compte rendu.

## 1. Préparer

Depuis un clone du dépôt sur `main` :

```bash
git fetch --no-tags --depth=1 origin refs/heads/futures-live
git worktree add --detach "$TMPDIR/futures-live" FETCH_HEAD
python3 -c "from datetime import datetime,timedelta,timezone as z; t=datetime.now(z.utc).date()-timedelta(days=1); print('from',(t-timedelta(days=21)).strftime('%Y%m%d'),'to',t.strftime('%Y%m%d'))"
```

La dernière commande donne la fenêtre `from` et `to` (dates de séance AAAAMMJJ) à utiliser dans toute la suite.

## 2. Interroger TradingView

Outil `run_pine_indicator` du connecteur TradingView, avec `timeframe: "1D"` et `format: "columns"`. Deux appels simultanés au plus. Le champ `code` reçoit le contenu exact du fichier indiqué.

| Appel | `symbol` | `code` | `return_bars` | `calc_bars_count` | `inputs` |
| --- | --- | --- | --- | --- | --- |
| A | `CBOT:ZL1!` | `scripts/pine/olea_cbot.pine` | 25 | 80 | — |
| B | `NYMEX:HO1!` | `scripts/pine/olea_close.pine` | 25 | 80 | — |
| C | `ICEEUR:ULS1!` | `scripts/pine/olea_close.pine` | 25 | 80 | — |
| D | `MYX:FCPO1!` | `scripts/pine/olea_close.pine` | 25 | 80 | — |
| E à J | `CBOT:ZL1!`, `CBOT:ZS1!`, `CBOT:ZM1!`, `NYMEX:HO1!`, `ICEEUR:ULS1!`, `MYX:FCPO1!` | `scripts/pine/olea_check.pine` | 1 | 80 | `{"in_0": from, "in_1": to}` |

Dans les réponses A à D, `values.plots.plot_0` contient les dates de séance. Pour A, `plot_1`, `plot_2` et `plot_3` contiennent les clôtures de ZL, ZS et ZM. Pour B, C et D, `plot_1` contient les clôtures. Ignorer le tableau `t`.

Dans les réponses E à J, la somme de contrôle est `[plot_0[0], plot_1[0], plot_2[0], plot_3[0]]` de `values.plots` : nombre de séances, somme, somme × jour du mois, somme × mois.

## 3. Écrire le relevé

Créer `releve.json` hors du dépôt, en copiant chaque tableau en entier et dans l’ordre :

```json
{
  "from": 20261023, "to": 20261113,
  "cbot":   {"d": [], "zl": [], "zs": [], "zm": []},
  "ho":     {"d": [], "c": []},
  "gasoil": {"d": [], "c": []},
  "fcpo":   {"d": [], "c": []},
  "checks": {"zl": [], "zs": [], "zm": [], "ho": [], "gasoil": [], "fcpo": []}
}
```

`ho` reçoit la réponse B, `gasoil` la réponse C et `fcpo` la réponse D. Les dates hors fenêtre et la séance en cours peuvent rester dans les tableaux : le script ne retient que les séances de `from` à `to`.

## 4. Contrôler

```bash
python3 scripts/update-futures.py "$TMPDIR/futures-live/docs/terminal/live" --input releve.json
```

| Résultat | Action |
| --- | --- |
| Code 0 | Tout est contrôlé. Publier. |
| « la copie ne reproduit pas la somme de contrôle » | Erreur de copie. Recopier ce bloc et sa somme de contrôle depuis les réponses de l’outil, relancer une seule fois. |
| « trou entre l’historique et le relevé » | Le dernier relevé est trop ancien. Reculer `from` avant la dernière séance publiée, augmenter `return_bars` et `calc_bars_count` en conséquence (1 000 barres au plus), refaire tous les appels. |
| « séance non terminée » | `to` n’est pas la veille. Recalculer la fenêtre. |
| « clôture ancienne modifiée », « séances publiées absentes », valeur hors bornes | Ne rien corriger. Publier l’état d’échec et le signaler. |
| TradingView ne répond pas | `python3 scripts/update-futures.py "$TMPDIR/futures-live/docs/terminal/live" --unavailable "motif"`, puis publier. |

Un contrat rejeté n’empêche pas la publication des autres.

## 5. Publier

```bash
cd "$TMPDIR/futures-live"
git add docs/terminal/live/futures-prices.json docs/terminal/live/futures-status.json
git diff --cached --quiet || git commit -m "Refresh daily futures closes"
git push origin HEAD:refs/heads/futures-live
```

Si le push est refusé parce que la branche a avancé, refaire l’étape 1 puis l’étape 4 avec le même `releve.json`.

## 6. Compte rendu

Indiquer pour chaque contrat la dernière séance publiée et sa clôture, les séances ajoutées, les révisions, et tout contrat rejeté ou retenu avec le message du script.
