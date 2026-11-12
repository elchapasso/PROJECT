"""Refresh open Oléa spread legs without installing dependencies."""
from argparse import ArgumentParser
import csv
from datetime import date, timedelta
import io
import json
import math
from pathlib import Path
from time import sleep
from urllib.parse import urlencode
from urllib.request import Request, urlopen

START = date(2025, 1, 1)
TARGET = Path(__file__).resolve().parents[1] / "docs/terminal/spread-prices.mjs"
MAGYP = "https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php"
ECB = "https://data-api.ecb.europa.eu/service/data/EXR/D."
FRED = "https://fred.stlouisfed.org/graph/fredgraph.csv"
# key: (FRED series, first observation kept, decimals)
FRED_SERIES = {
    "ulsdNy": ("DDFUELNYH", START, 3),
    "ulsdNyMonth": ("MDFUELNYH", date(2015, 1, 1), 3),
    "imfSoyOil": ("PSOILUSDM", date(2015, 1, 1), 2),
    "imfPalmOil": ("PPOILUSDM", date(2015, 1, 1), 2),
}
NCM = {
    "arSoyOil": "15071000100Q",
    "arSoyMeal": "23040010100B",
    "arSoySeed": "12019000190C",
    "arSunOil": "15121110310E",
    "arSunMeal": "23063010310V",
    "arSunSeed": "12060090910Y",
}
HEADER = """// Raw observations, in source units. See SPREADS.md for provenance.
// Dates are quote dates (or source reference periods for weekly and monthly legs).
export const spreadPrices="""


def get(url):
    request = Request(url, headers={"User-Agent": "OleaTerminal-SpreadData/1.0"})
    with urlopen(request, timeout=25) as response:
        return response.read().decode("utf-8-sig")


def arg_rows(raw, day):
    if raw == []:
        return {}
    values = {}
    for key, code in NCM.items():
        month = (day.year, day.month)
        matches = {r["precio"] for r in raw["posts"] if r["posicion"] == code
                   and r["fecha"][:10] == day.isoformat()
                   and (r["añoDesde"], r["mesDesde"]) <= month <= (r["añoHasta"], r["mesHasta"])
                   and isinstance(r["precio"], (int, float)) and r["precio"] > 0}
        if len(matches) == 1:
            values[key] = [day.isoformat(), matches.pop()]
    return values


def ecb_rows(raw, start, end):
    rows = []
    for row in csv.DictReader(io.StringIO(raw)):
        observation = date.fromisoformat(row["TIME_PERIOD"])
        value = float(row["OBS_VALUE"])
        if start <= observation <= end and math.isfinite(value) and value > 0:
            rows.append([observation.isoformat(), value])
    if not rows:
        raise ValueError("No ECB observations in the requested interval")
    return rows


def fred_rows(raw, start, digits):
    rows = []
    for line in csv.reader(io.StringIO(raw)):
        try:
            observation, value = date.fromisoformat(line[0]), float(line[1])
        except (IndexError, ValueError):
            continue  # header line, or a day without a quotation
        if observation >= start and math.isfinite(value) and value > 0:
            rows.append([observation.isoformat(), round(value, digits)])
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
