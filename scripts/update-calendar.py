"""Actualise le calendrier des publications (Forex Factory et rapports agricoles) sans modifier les fichiers du site.

Usage : python3 scripts/update-calendar.py chemin/vers/calendar-feed.json
Chaque source est lue séparément : une source indisponible garde ses dates déjà connues et fait échouer le passage
pour alerte, sans bloquer les autres. Les dates tirées d’une règle de publication sont recalculées à chaque passage.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from urllib.error import HTTPError
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import calendar_lib as lib  # noqa: E402

PAST_DAYS = 45
AHEAD_DAYS = 150
KEEP_DAYS = 100


def months(today):
    first = today.replace(day=1)
    previous = (first - timedelta(days=1)).replace(day=1)
    following = (first + timedelta(days=32)).replace(day=1)
    return [previous, first, following, (following + timedelta(days=32)).replace(day=1)]


def official_sources(today, fetch):
    """Sources à calendrier officiel : nom → (types de publication couverts, lecteur)."""
    def wasde():
        return [lib.event("wasde", d, lib.WASDE_URL, "official", lib.at_time(d, 12, 0, lib.EASTERN), lib.month_label(d))
                for d in lib.wasde_dates(fetch(lib.WASDE_URL))]

    def nass():
        return [row for month in months(today) for row in lib.nass_month(fetch(lib.nass_url(month)), month)]

    def nopa():
        dates = lib.nopa_dates(lib.pdf_text(fetch(lib.nopa_pdf_url(fetch(lib.NOPA_URL)), binary=True)))
        return [lib.event("nopa", d, lib.NOPA_URL, "official", lib.at_time(d, 12, 0, lib.EASTERN), lib.month_label(lib.previous_month(d)))
                for d in dates]

    def conab():
        out = []
        for year in (today.year, today.year + 1):
            try:
                text = lib.pdf_text(fetch(lib.CONAB_PDF.format(year=year), binary=True))
            except HTTPError as error:
                if year > today.year and error.code == 404:
                    continue  # calendrier de l’année suivante pas encore publié
                raise
            out += [lib.event("conab", d, lib.CONAB_GRAINS_URL, "official", None, label) for d, label in lib.conab_grain_dates(text)]
        return out

    def anec():
        return [lib.anec_latest(fetch(lib.ANEC_URL))]

    def mpob():
        release, period = lib.mpob_next(fetch(lib.MPOB_URL))
        return [lib.event("mpob", release, lib.MPOB_URL, "official", lib.at_time(release, 12, 30, lib.KUALA_LUMPUR), lib.month_label(period))]

    nass_kinds = sorted(set(lib.NASS_REPORTS.values()))
    return {"WASDE": (["wasde"], wasde), "NASS": (nass_kinds, nass), "NOPA": (["nopa"], nopa),
            "CONAB": (["conab"], conab), "ANEC": (["anec"], anec), "MPOB": (["mpob"], mpob)}


def update(current, today, now, fetch=lib.get):
    result = dict(current)
    errors = []
    cutoff = (today - timedelta(days=KEEP_DAYS)).isoformat()
    previous = [r for r in current.get("reports", []) if r["date"] >= cutoff and r["status"] == "official"]
    sources = official_sources(today, fetch)
    with ThreadPoolExecutor(max_workers=6) as executor:
        jobs = {name: executor.submit(reader) for name, (_, reader) in sources.items()}
        forex_job = executor.submit(lambda: lib.forex_week(fetch(lib.FOREX_JSON), fetch(lib.FOREX_XML, binary=True), today))
        fresh = {}
        for name, job in jobs.items():
            try:
                fresh[name] = job.result()
            except Exception as error:  # une source en panne ne bloque pas les autres
                errors.append(f"{name}: {error}")
        forex = [row for row in current.get("forex", []) if row["date"][:10] >= cutoff]
        try:
            start, end, events = forex_job.result()
            forex = [row for row in forex if not start <= row["date"][:10] <= end] + events
            result.update(forexWeekStart=start, forexWeekEnd=end, forexCheckedAt=now)
        except Exception as error:
            errors.append(f"Forex Factory: {error}")

    reports = {}
    for name, (kinds, _) in sources.items():
        if name in fresh:
            # Source lue : l’historique passé est conservé, les dates à venir sont remplacées.
            kept = [r for r in previous if r["kind"] in kinds and r["date"] < today.isoformat()]
            rows = kept + fresh[name]
        else:
            rows = [r for r in previous if r["kind"] in kinds]
        for row in rows:
            reports[row["id"]] = row
    official = list(reports.values())
    wasde = [date.fromisoformat(r["date"]) for r in official if r["kind"] == "wasde"]
    nopa = [date.fromisoformat(r["date"]) for r in official if r["kind"] == "nopa"]
    mpob_rows = [r for r in official if r["kind"] == "mpob" and r["date"] >= today.isoformat()]
    mpob = (date.fromisoformat(mpob_rows[0]["date"]), None) if mpob_rows else None
    start, end = today - timedelta(days=PAST_DAYS), today + timedelta(days=AHEAD_DAYS)
    for row in lib.rule_events(start, end, wasde, nopa, mpob):
        reports.setdefault(row["id"], row)
    anec = [r for r in official if r["kind"] == "anec"]
    if anec:
        for row in lib.anec_next(max(anec, key=lambda r: r["date"]), today):
            reports.setdefault(row["id"], row)
    # Une même publication ne garde qu’une date par mois (MPOB, NOPA) : la date officielle l’emporte sur la règle.
    monthly = {}
    for row in sorted(reports.values(), key=lambda r: r["status"] != "official"):
        if row["kind"] in {"mpob", "nopa"}:
            key = (row["kind"], row["period"])
            if key in monthly:
                continue
            monthly[key] = row
        else:
            monthly[row["id"]] = row
    rows = [r for r in monthly.values() if r["date"] >= cutoff]
    result["reports"] = sorted(rows, key=lambda r: (r["date"], r["at"], r["kind"]))
    result["reportsCheckedAt"] = now
    result["forex"] = sorted({(r["date"], r["country"], r["title"]): r for r in forex}.values(), key=lambda r: r["date"])
    # Ancien format conservé pour les pages déjà ouvertes : Crop Progress seul.
    result["nass"] = [{"date": r["at"], "url": r["url"]} for r in result["reports"] if r["kind"] == "nass-progress"]
    return result, errors


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("snapshot", type=Path)
    args = cli.parse_args()
    previous = json.loads(args.snapshot.read_text()) if args.snapshot.exists() else {}
    now = datetime.now(timezone.utc)
    result, errors = update(previous, now.astimezone(lib.EASTERN).date(), now.isoformat(timespec="seconds"))
    for error in errors:
        print(error)
    if not result.get("forexWeekStart") or not any(r["status"] == "official" for r in result["reports"]):
        raise SystemExit("Les sources du calendrier n’ont produit aucune donnée exploitable")
    args.snapshot.write_text(json.dumps(result, indent=1, ensure_ascii=False) + "\n")
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
