"""Actualisation automatique des prix des spreads et marges d’Oléa Terminal.

Usage : python3 scripts/update-prices.py DOSSIER [--deep] [--today AAAA-MM-JJ]

Lit le jeu intégré docs/terminal/spread-prices.mjs et, s’ils existent, DOSSIER/spread-prices.json et
DOSSIER/price-status.json (résultats précédents de la branche prices-live). Interroge chaque source,
contrôle les données et écrit dans DOSSIER :
- spread-prices.json : séries mises à jour automatiquement, historique complet ;
- price-status.json : état de chaque source et de chaque série, valeurs retenues pour vérification.
Les fichiers ne sont réécrits que si les données ou l’état changent (ou toutes les 20 heures).
Code de sortie 2 : une source échoue depuis plus de 48 heures, ou une série ne passe pas les contrôles.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import prices_lib as lib  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
BUNDLED = ROOT / "docs/terminal/spread-prices.mjs"
SCHEMA = 1
SOURCE_NAMES = {
    "magyp": "Secretaría de Agricultura · MAGyP", "ecb": "BCE · EXR", "fred": "FRED (EIA, FMI)",
    "mpob": "MPOB", "iposs": "IPOSS Data", "anp": "ANP · Brésil",
}


def load_bundled():
    text = BUNDLED.read_text()
    return json.loads(text.split("export const spreadPrices=", 1)[1].rstrip().removesuffix(";"))


def load_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def iso_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def published_state(bundled, live):
    """Séries publiées : jeu intégré complété par la branche prices-live (la plus récente l’emporte, le lien est conservé)."""
    state = {}
    for key in lib.AUTO_SERIES:
        rows = {r[0]: list(r) for r in bundled.get(key, [])}
        for r in live.get(key, []):
            old = rows.get(r[0])
            if old is None or old[1] != r[1]:
                rows[r[0]] = list(r)
        state[key] = [rows[d] for d in sorted(rows)]
    return state


def fetch_magyp(current, today, deep):
    """Bulletins des 10 derniers jours ouvrés et jours ouvrés manquants des 45 derniers jours ; tous les bulletins de 120 jours en mode approfondi."""
    known = {r[0] for r in current.get("arSoyOil", [])}
    recent = list(lib.business_days(today - timedelta(days=14), today))[-10:]
    if deep:  # revérifie tous les bulletins des 120 derniers jours
        days = list(lib.business_days(max(today - timedelta(days=120), lib.START), today))
    else:
        horizon = max(today - timedelta(days=45), lib.START)
        days = sorted(set(recent) | {d for d in lib.business_days(horizon, today) if d.isoformat() not in known})
    out, failures = {}, []
    for day in days:
        try:
            for key, row in lib.magyp_day(day).items():
                out.setdefault(key, []).append(row)
        except lib.SourceError as error:
            failures.append(f"{day} : {error}")
        time.sleep(.8)
    if failures and len(failures) == len(days):
        raise lib.SourceError("MAGyP : aucun bulletin lisible (" + failures[-1] + ")")
    return out, failures, len(days)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("out")
    parser.add_argument("--deep", action="store_true", help="vérifie 120 jours de bulletins argentins")
    parser.add_argument("--today", type=date.fromisoformat)
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    today = args.today or datetime.now(timezone.utc).date()
    now = iso_now()

    bundled = load_bundled()
    previous = load_json(out / "spread-prices.json") or {}
    prev_status = load_json(out / "price-status.json") or {}
    current = published_state(bundled, previous.get("series", {}))
    held = prev_status.get("held", [])

    sources = {}

    def run(name, fn):
        started = time.time()
        try:
            result = fn()
            if name == "magyp":
                data, failures, calls = result
                sources[name] = {"ok": True, "data": data, "calls": calls,
                                 "warning": (f"{len(failures)} bulletin(s) illisible(s) : " + "; ".join(failures[:3])) if failures else None}
            else:
                sources[name] = {"ok": True, "data": result}
        except Exception as error:  # une source en échec n’empêche pas les autres
            sources[name] = {"ok": False, "error": str(error)[:400]}
        sources[name]["seconds"] = round(time.time() - started, 1)

    run("ecb", lambda: lib.fetch_ecb(today - timedelta(days=45), today))
    run("fred", lambda: lib.fetch_fred(today))
    deep = args.deep or today.weekday() == 6
    run("mpob", lambda: lib.fetch_mpob(today, deep))
    run("iposs", lib.fetch_iposs)
    run("anp", lib.fetch_anp)
    run("magyp", lambda: fetch_magyp(current, today, deep))

    final, report, new_held, problems = {}, {}, [], []
    for key, source in lib.AUTO_SERIES.items():
        rows_now = current.get(key, [])
        result = sources[source]
        entry = {"source": source}
        if not result["ok"]:
            entry.update(status="error", message=result["error"])
            final[key] = rows_now
            new_held += [h for h in held if h.get("series") == key]
        else:
            low, high, _ = lib.LIMITS[key]
            fetched, rejected = [], []
            for r in result["data"].get(key, []):
                (fetched if low <= r[1] <= high else rejected).append(r)
            held_rows = [[h["date"], h["value"]] for h in held if h.get("series") == key and h["date"] not in {r[0] for r in rows_now}]
            base = sorted(rows_now + held_rows, key=lambda r: r[0])
            merged, added, revised, kept = lib.merge_series(base, fetched, key)
            overlap = kept + len(revised)
            if overlap >= 5 and len(revised) > overlap * .10:
                entry.update(status="error", message=f"{len(revised)} valeurs déjà publiées sur {overlap} diffèrent de la source : format à vérifier, aucune modification appliquée.")
                final[key] = rows_now
                new_held += [h for h in held if h.get("series") == key]
                problems.append(f"{key} : révisions massives ({len(revised)}/{overlap})")
            else:
                candidates = {r[0] for r in added} | {r[0] for r in revised} | {r[0] for r in held_rows}
                published, series_held, confirmed = lib.screen_new_points(key, merged, candidates, held, today)
                final[key] = published
                new_held += series_held
                published_dates = {r[0] for r in published}
                entry.update(status="ok",
                             added=[r for r in added if r[0] in published_dates][-12:],
                             addedCount=sum(r[0] in published_dates for r in added),
                             revised=[r for r in revised if r[0] in published_dates][-12:],
                             confirmed=confirmed, rejected=rejected[-5:])
                if series_held:
                    entry["status"] = "held"
                if rejected:
                    entry["status"] = "held"
                    entry["message"] = f"{len(rejected)} valeur(s) hors bornes ignorée(s) ({low}–{high})."
                if source == "magyp" and result.get("warning"):
                    entry["warning"] = result["warning"]
        errors = lib.check_series(key, final[key])
        if errors:
            problems += errors[:3]
            entry["status"] = "error"
            entry["message"] = "; ".join(errors[:3])
        last = final[key][-1] if final[key] else None
        entry.update(count=len(final[key]), last=last[0] if last else None, lastValue=last[1] if last else None)
        if last and entry["status"] == "ok" and (today - date.fromisoformat(last[0])).days > lib.stale_after(key):
            entry["status"] = "stale"
        report[key] = entry

    source_report = {}
    for name, result in sources.items():
        before = prev_status.get("sources", {}).get(name, {})
        item = {"name": SOURCE_NAMES[name], "ok": result["ok"], "seconds": result["seconds"]}
        if result["ok"]:
            item["lastSuccess"] = now
            if result.get("warning"):
                item["warning"] = result["warning"]
        else:
            item["error"] = result["error"]
            item["failingSince"] = before.get("failingSince") or now
            item["lastSuccess"] = before.get("lastSuccess")
        source_report[name] = item

    data_changed = final != {k: v for k, v in previous.get("series", {}).items() if k in final} or not previous
    signature = lambda st: json.dumps([{k: (v.get("status"), v.get("last"), v.get("message")) for k, v in st.get("series", {}).items()},
                                       st.get("held", []), {k: v.get("ok") for k, v in st.get("sources", {}).items()}], sort_keys=True)
    status = {"schema": SCHEMA, "checkedAt": now, "dataChangedAt": now if data_changed else prev_status.get("dataChangedAt", now),
              "today": today.isoformat(), "sources": source_report, "series": report, "held": new_held}
    last_check = prev_status.get("checkedAt")
    heartbeat = not last_check or datetime.fromisoformat(last_check.replace("Z", "+00:00")) < datetime.now(timezone.utc) - timedelta(hours=20)
    write = data_changed or heartbeat or signature(status) != signature(prev_status)

    for name, item in source_report.items():
        print(f"[{name}] {'OK' if item['ok'] else 'ÉCHEC'} en {item['seconds']} s" + (f" · {item.get('error')}" if not item["ok"] else "") + (f" · {item['warning']}" if item.get("warning") else ""))
    for key, entry in report.items():
        line = f"  {key:12} {entry['status']:6} {entry['count']:5} obs. · dernière {entry['last']} = {entry['lastValue']}"
        if entry.get("addedCount"):
            line += f" · +{entry['addedCount']} : " + ", ".join(f"{d}={v}" for d, v in entry["added"][-4:])
        if entry.get("revised"):
            line += " · révisions : " + ", ".join(f"{d} {a}→{b}" for d, a, b in entry["revised"][-4:])
        if entry.get("message"):
            line += " · " + entry["message"]
        print(line)
    for h in new_held:
        print(f"  RETENUE {h['series']} {h['date']} = {h['value']} (précédente {h['previousDate']} = {h['previous']}) depuis le {h['since']}")

    if write:
        if data_changed:
            body = ",\n".join(f'    "{k}": [\n' + ",\n".join("      " + json.dumps(r, separators=(",", ":")) for r in v) + "\n    ]" for k, v in sorted(final.items()))
            (out / "spread-prices.json").write_text('{\n  "schema": 1,\n  "generatedAt": "' + now + '",\n  "series": {\n' + body + "\n  }\n}\n")
        (out / "price-status.json").write_text(json.dumps(status, ensure_ascii=False, indent=1) + "\n")
        print("Données " + ("mises à jour." if data_changed else "inchangées, état actualisé."))
    else:
        print("Aucun changement.")

    alert = [f"{SOURCE_NAMES[n]} en échec depuis {i['failingSince']} : {i['error']}" for n, i in source_report.items()
             if not i["ok"] and datetime.fromisoformat(i["failingSince"].replace("Z", "+00:00")) < datetime.now(timezone.utc) - timedelta(hours=48)]
    alert += problems
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            summary.write("## Prix d’Oléa Terminal\n\n| Série | État | Dernière observation | Ajouts |\n|---|---|---|---|\n")
            for key, entry in report.items():
                summary.write(f"| {key} | {entry['status']} | {entry['last']} = {entry['lastValue']} | {entry.get('addedCount', 0)} |\n")
            for line in alert:
                summary.write(f"\n- ⚠️ {line}")
    if alert:
        print("ALERTE :\n- " + "\n- ".join(alert))
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
