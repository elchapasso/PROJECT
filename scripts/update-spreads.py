"""Refresh open Oléa spread legs without installing dependencies."""
from argparse import ArgumentParser
from datetime import date, timedelta
import json
from pathlib import Path
import sys
from time import sleep
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prices_lib import (  # noqa: E402  lecteurs partagés avec la mise à jour automatique (update-prices.py)
    ECB, FRED, FRED_SERIES, MAGYP, START, arg_rows, ecb_rows as shared_ecb_rows, fred_rows as shared_fred_rows, get)

TARGET = Path(__file__).resolve().parents[1] / "docs/terminal/spread-prices.mjs"
HEADER = """// Raw observations, in source units. See SPREADS.md for provenance.
// Dates are quote dates (or source reference periods for weekly and monthly legs).
export const spreadPrices="""


def ecb_rows(raw, start, end):
    rows = shared_ecb_rows(raw, start, end)
    if not rows:
        raise ValueError("No ECB observations in the requested interval")
    return rows


def fred_rows(raw, start, digits):
    rows = shared_fred_rows(raw, start, digits)
    if not rows:
        raise ValueError("No FRED observations in the requested interval")
    return rows


def load():
    return json.loads(TARGET.read_text().split("export const spreadPrices=", 1)[1].rstrip().removesuffix(";")) if TARGET.exists() else {}


def write(data):
    parts = []
    for key, rows in sorted(data.items()):
        if len({row[0] for row in rows}) != len(rows):
            raise ValueError(f"Duplicate observation date: {key}")
        encoded = ",\n".join("    " + json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in sorted(rows))
        parts.append("  " + json.dumps(key) + ": [\n" + encoded + "\n  ]")
    temporary = TARGET.with_suffix(".tmp")
    temporary.write_text(HEADER + "{\n" + ",\n".join(parts) + "\n};\n")
    temporary.replace(TARGET)


def refresh(start, end, fred=False):
    data = load()

    def put(key, rows):
        merged = {r[0]: r for r in data.get(key, [])}
        merged.update((r[0], r) for r in rows)
        data[key] = list(merged.values())

    fx_start = START - timedelta(days=2)
    params = urlencode({"startPeriod": fx_start.isoformat(), "endPeriod": end.isoformat(), "format": "csvdata"})
    for code in ("USD", "MYR", "IDR"):
        raw = get(f"{ECB}{code}.EUR.SP00.A?{params}")
        put("eur" + code.title(), ecb_rows(raw, fx_start, end))
    if fred:
        for key, (series, first, digits) in FRED_SERIES.items():
            query = urlencode({"id": series, "cosd": first.isoformat(), "coed": end.isoformat()})
            put(key, fred_rows(get(f"{FRED}?{query}"), first, digits))
    while start <= end:
        if start.weekday() < 5:
            query = urlencode({"Fecha": start.strftime("%d/%m/%Y")})
            try:
                rows = arg_rows(json.loads(get(f"{MAGYP}?{query}")), start)
            except (ValueError, OSError) as error:
                write(data)
                raise SystemExit(f"FOB import paused on {start}: {error}. Resume from that day.") from error
            for key, row in rows.items():
                put(key, [row])
            sleep(1)
        start += timedelta(days=1)
    write(data)


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--from", dest="start", required=True, type=date.fromisoformat)
    parser.add_argument("--through", type=date.fromisoformat, default=date.today())
    parser.add_argument("--fred", action="store_true", help="also refresh the EIA and IMF series published on FRED")
    args = parser.parse_args()
    if args.start < START or args.start > args.through:
        parser.error("Use a valid interval starting on or after 2025-01-01")
    refresh(args.start, args.through, args.fred)
