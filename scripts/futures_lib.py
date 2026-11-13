"""Contrôle des contrats à terme relevés sur TradingView pour Oléa Terminal.

Le relevé (voir scripts/futures-runbook.md) contient, pour une fenêtre [from, to] de dates de séance AAAAMMJJ :
- les clôtures quotidiennes copiées depuis les scripts Pine olea_cbot et olea_close ;
- pour chaque symbole, la somme de contrôle calculée par TradingView avec olea_check : nombre de séances,
  somme des clôtures, somme des clôtures × jour du mois, somme des clôtures × mois.
Une série n’est publiée que si la copie reproduit exactement cette somme de contrôle.
"""
from __future__ import annotations

import math
from datetime import date, timedelta

import prices_lib as lib

# clé du site : (bloc du relevé, tableau des clôtures, symbole TradingView)
SERIES = {
    "zl": ("cbot", "zl", "CBOT:ZL1!"), "zs": ("cbot", "zs", "CBOT:ZS1!"), "zm": ("cbot", "zm", "CBOT:ZM1!"),
    "ho": ("ho", "c", "NYMEX:HO1!"), "gasoil": ("gasoil", "c", "ICEEUR:ULS1!"), "fcpo": ("fcpo", "c", "MYX:FCPO1!"),
}
# bornes de vraisemblance et variation maximale d’une séance à la suivante avant mise en attente
LIMITS = {
    "zl": (15, 150, .15), "zs": (500, 2500, .12), "zm": (150, 700, .12),
    "ho": (.8, 9, .25), "gasoil": (250, 3000, .30), "fcpo": (1500, 9000, .12),
}
lib.LIMITS.update(LIMITS)
REVISION_DAYS = 5   # une clôture déjà publiée ne peut changer que si elle date de moins de cinq jours
STALE_DAYS = 5
MAX_WINDOW_DAYS = 800


class ReportError(ValueError):
    """Relevé inutilisable dans son ensemble."""


def to_date(value):
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"date invalide {value!r}")
    return date(value // 10000, value // 100 % 100, value % 100)


def checksum(rows):
    """(nombre, somme, somme × jour du mois, somme × mois) pour des lignes [date ISO, clôture]."""
    days = [date.fromisoformat(d) for d, _ in rows]
    return (len(rows), math.fsum(v for _, v in rows), math.fsum(v * d.day for d, (_, v) in zip(days, rows)),
            math.fsum(v * d.month for d, (_, v) in zip(days, rows)))


def _same(a, b):
    return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-6)


def window(report, today):
    try:
        start, end = to_date(report["from"]), to_date(report["to"])
    except (KeyError, TypeError, ValueError) as error:
        raise ReportError(f"fenêtre illisible : {error}") from error
    if start > end:
        raise ReportError("fenêtre inversée")
    if end >= today:
        raise ReportError(f"la fenêtre se termine le {end}, séance non terminée au {today} : arrêter le relevé à la veille")
    if (end - start).days > MAX_WINDOW_DAYS:
        raise ReportError("fenêtre trop longue")
    return start, end


def read_series(report, key, start, end):
    """Lignes [date ISO, clôture] de la fenêtre, après contrôle de structure et de somme de contrôle."""
    block, column, symbol = SERIES[key]
    data = report.get(block)
    if not isinstance(data, dict) or not isinstance(data.get("d"), list) or not isinstance(data.get(column), list):
        raise ValueError(f"{symbol} : bloc « {block} » absent ou incomplet")
    days, values = data["d"], data[column]
    if len(days) != len(values):
        raise ValueError(f"{symbol} : {len(days)} dates pour {len(values)} clôtures")
    rows, previous = [], None
    for raw, value in zip(days, values):
        day = to_date(raw)
        if previous and day <= previous:
            raise ValueError(f"{symbol} : dates non triées ou en double ({raw})")
        previous = day
        if day.weekday() >= 5:
            raise ValueError(f"{symbol} : séance datée d’un week-end ({raw})")
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"{symbol} : clôture invalide {value!r} le {raw}")
        if start <= day <= end:
            rows.append([day.isoformat(), value])
    expected = report.get("checks", {}).get(key)
    if not isinstance(expected, list) or len(expected) != 4 or any(isinstance(x, bool) or not isinstance(x, (int, float)) for x in expected):
        raise ValueError(f"{symbol} : somme de contrôle absente")
    found = checksum(rows)
    if found[0] != expected[0] or not all(_same(a, b) for a, b in zip(found[1:], expected[1:])):
        raise ValueError(f"{symbol} : la copie ne reproduit pas la somme de contrôle TradingView "
                         f"(copie {found[0]} séances, somme {found[1]:.6f} ; TradingView {expected[0]} séances, somme {expected[1]:.6f})")
    if not rows:
        raise ValueError(f"{symbol} : aucune séance dans la fenêtre")
    return rows


def reconcile(key, published, fetched, start, end):
    """Compare le relevé à l’historique publié. Renvoie (série fusionnée, ajouts, révisions)."""
    if published:
        if start.isoformat() > published[-1][0]:
            raise ValueError(f"{key} : trou entre l’historique (jusqu’au {published[-1][0]}) et le relevé (à partir du {start}) : élargir la fenêtre")
        fetched_dates = {d for d, _ in fetched}
        missing = [d for d, _ in published if start.isoformat() <= d <= end.isoformat() and d not in fetched_dates]
        if missing:
            raise ValueError(f"{key} : séances publiées absentes du relevé ({', '.join(missing[:3])})")
    merged, added, revised, _ = lib.merge_series(published, fetched, key)
    oldest = (end - timedelta(days=REVISION_DAYS)).isoformat()
    stale = [r for r in revised if r[0] < oldest]
    if stale:
        d, old, new = stale[0]
        raise ValueError(f"{key} : clôture ancienne modifiée par la source ({d} : {old} → {new}), {len(stale)} cas : vérifier le contrat continu")
    return merged, added, revised


def evaluate(report, published, held, today):
    """Applique un relevé. Renvoie (séries finales, état par série, valeurs retenues, problèmes)."""
    start, end = window(report, today)
    final, series_status, new_held, problems = {}, {}, [], []
    for key in SERIES:
        current = [list(r[:2]) for r in published.get(key, [])]
        entry = {"source": "tradingview", "symbol": SERIES[key][2]}
        try:
            fetched = read_series(report, key, start, end)
            merged, added, revised = reconcile(key, current, fetched, start, end)
            errors = lib.check_series(key, merged)
            if errors:
                raise ValueError("; ".join(errors[:2]))
            candidates = {r[0] for r in added} | {r[0] for r in revised}
            out, waiting, confirmed = lib.screen_new_points(key, merged, candidates, held, today)
            final[key] = out
            new_held += waiting
            shown = {r[0] for r in out}
            entry.update(status="held" if waiting else "ok", added=[r for r in added if r[0] in shown][-12:],
                         addedCount=sum(r[0] in shown for r in added), revised=[r for r in revised if r[0] in shown][-12:], confirmed=confirmed)
        except ValueError as error:
            final[key] = current
            new_held += [h for h in held if h.get("series") == key]
            entry.update(status="error", message=str(error)[:400])
            problems.append(str(error))
        last = final[key][-1] if final[key] else None
        entry.update(count=len(final[key]), last=last[0] if last else None, lastValue=last[1] if last else None)
        if last and entry["status"] == "ok" and (today - date.fromisoformat(last[0])).days > STALE_DAYS:
            entry["status"] = "stale"
        series_status[key] = entry
    return final, series_status, new_held, problems
