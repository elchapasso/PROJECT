"""Actualisation des contrats à terme d’Oléa Terminal à partir d’un relevé TradingView.

Usage : python3 scripts/update-futures.py DOSSIER --input RELEVE.json [--today AAAA-MM-JJ]
        python3 scripts/update-futures.py DOSSIER --unavailable "motif" [--today AAAA-MM-JJ]

DOSSIER est le dossier docs/terminal/live de la branche futures-live. Le script lit le jeu intégré
docs/terminal/spread-prices.mjs et, s’ils existent, DOSSIER/futures-prices.json et DOSSIER/futures-status.json.
Il contrôle le relevé (scripts/futures_lib.py) et écrit dans DOSSIER :
- futures-prices.json : historique complet des six contrats ;
- futures-status.json : état de chaque contrat, lu par le panneau « Actualisation automatique des prix ».
Code de sortie 2 : au moins un contrat est rejeté ou la source est indisponible. Les autres contrats sont publiés.
La marche à suivre complète figure dans scripts/futures-runbook.md.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import futures_lib as futures  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
BUNDLED = ROOT / "docs/terminal/spread-prices.mjs"


def load_bundled():
    text = BUNDLED.read_text()
    return json.loads(text.split("export const spreadPrices=", 1)[1].rstrip().removesuffix(";"))


def load_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def published_state(bundled, live):
    """Historique publié : jeu intégré complété par la branche futures-live, qui l’emporte."""
    state = {}
    for key in futures.SERIES:
        rows = {r[0]: [r[0], r[1]] for r in bundled.get(key, [])}
        rows.update({r[0]: [r[0], r[1]] for r in live.get(key, [])})
        state[key] = [rows[d] for d in sorted(rows)]
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("out")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--input", type=Path, help="relevé TradingView au format décrit dans scripts/futures-runbook.md")
    group.add_argument("--unavailable", help="TradingView indisponible : enregistre l’échec sans modifier les prix")
    parser.add_argument("--today", type=date.fromisoformat)
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    today = args.today or datetime.now(timezone.utc).date()
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    previous = load_json(out / "futures-prices.json") or {}
    before = load_json(out / "futures-status.json") or {}
    published = published_state(load_bundled(), previous.get("series", {}))
    held = before.get("held", [])

    failure = args.unavailable
    report = None
    if not failure:
        report = load_json(args.input)
        if not isinstance(report, dict):
            failure = f"relevé illisible : {args.input}"
    if not failure:
        try:
            final, series, new_held, problems = futures.evaluate(report, published, held, today)
        except futures.ReportError as error:
            failure = str(error)
    if failure:
        final, new_held, problems = published, held, [failure]
        series = {}
        for key, rows in published.items():
            old = dict(before.get("series", {}).get(key, {}))
            old.update(source="tradingview", symbol=futures.SERIES[key][2], count=len(rows),
                       last=rows[-1][0] if rows else None, lastValue=rows[-1][1] if rows else None)
            old.setdefault("status", "ok")
            series[key] = old

    old_source = before.get("sources", {}).get("tradingview", {})
    source = {"name": "TradingView", "ok": not failure}
    if failure:
        source.update(error=failure[:400], failingSince=old_source.get("failingSince") or now, lastSuccess=old_source.get("lastSuccess"))
    else:
        source["lastSuccess"] = now
    data_changed = final != previous.get("series") or not previous
    status = {"schema": 1, "checkedAt": now, "dataChangedAt": now if data_changed else before.get("dataChangedAt", now),
              "today": today.isoformat(), "window": [report.get("from"), report.get("to")] if report else None,
              "sources": {"tradingview": source}, "series": series, "held": new_held}

    if data_changed:
        body = ",\n".join(f'    "{k}": [\n' + ",\n".join("      " + json.dumps(r, separators=(",", ":")) for r in v) + "\n    ]" for k, v in sorted(final.items()))
        (out / "futures-prices.json").write_text('{\n  "schema": 1,\n  "generatedAt": "' + now + '",\n  "source": "TradingView",\n  "series": {\n' + body + "\n  }\n}\n")
    (out / "futures-status.json").write_text(json.dumps(status, ensure_ascii=False, indent=1) + "\n")

    for key, entry in series.items():
        line = f"  {key:7} {entry['status']:6} {entry['count']:5} séances · dernière {entry['last']} = {entry['lastValue']}"
        if entry.get("addedCount"):
            line += f" · +{entry['addedCount']} : " + ", ".join(f"{d}={v}" for d, v in entry["added"][-4:])
        if entry.get("revised"):
            line += " · révisions : " + ", ".join(f"{d} {a}→{b}" for d, a, b in entry["revised"][-4:])
        if entry.get("message"):
            line += " · " + entry["message"]
        print(line)
    for h in new_held:
        print(f"  RETENUE {h['series']} {h['date']} = {h['value']} (précédente {h['previousDate']} = {h['previous']})")
    print("Données mises à jour." if data_changed else "Données inchangées, état actualisé.")
    if problems:
        print("À CORRIGER :\n- " + "\n- ".join(problems))
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
