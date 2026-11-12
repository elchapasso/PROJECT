"""Sources de prix publiques d’Oléa Terminal : lecture, normalisation et contrôles.

Chaque lecteur renvoie {série: [[date ISO, valeur native], ...]} et n’utilise que la bibliothèque standard,
sauf ANP (classeur .xls, module xlrd). Les règles reprennent SPREADS.md :
- MAGyP : bulletin du jour exact, position couvrant le mois de cotation, prix unique ;
- MPOB : seuls les prix définitifs (NT, PH, « - » et les prix de 8 h 30 marqués ** sont exclus) ;
- IPOSS : cotations FOB du tableau public, par port ;
- ANP : B100, colonne Brasil, datée du dimanche de clôture de la semaine.
"""
from __future__ import annotations

import csv
import io
import json
import math
import re
from datetime import date, datetime, timedelta
from html import unescape
from urllib.parse import urlencode
from urllib.request import Request, urlopen

START = date(2025, 1, 1)
USER_AGENT = "Mozilla/5.0 (compatible; OleaTerminal-PriceData/1.0; +https://github.com/elchapasso/PROJECT)"
MAGYP = "https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php"
ECB = "https://data-api.ecb.europa.eu/service/data/EXR/D."
FRED = "https://fred.stlouisfed.org/graph/fredgraph.csv"
MPOB = "https://bepi.mpob.gov.my/admin2/price_local_daily_view_cpo_msia.php?more=Y&jenis=1Y&tahun="
IPOSS = "https://data.iposs.co.id/en/data/fob-price-cpo-cpko"
ANP = "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/ppidp/precos-medios-ponderados-semanais-2013.xls"

# série : (identifiant FRED, première observation conservée, décimales)
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
ECB_SERIES = {"eurUsd": "USD", "eurMyr": "MYR", "eurIdr": "IDR"}
IPOSS_PORTS = {"port belawan": "idPalmFob", "port klang": "myPalmFob"}

# Bornes de vraisemblance (unité native) et variation maximale admise entre deux observations consécutives.
LIMITS = {
    "arSoyOil": (400, 3000, .12), "arSunOil": (400, 3500, .12), "arSoyMeal": (120, 900, .12),
    "arSoySeed": (180, 1000, .12), "arSunMeal": (60, 700, .15), "arSunSeed": (200, 1400, .12),
    "idPalmFob": (350, 2600, .10), "myPalmFob": (350, 2600, .10), "mpobCpo": (1500, 9000, .10),
    "eurUsd": (.8, 1.7, .04), "eurMyr": (2.5, 7.5, .05), "eurIdr": (10000, 30000, .05),
    "ulsdNy": (.8, 9, .15), "ulsdNyMonth": (.8, 9, .25), "imfSoyOil": (300, 3500, .25),
    "imfPalmOil": (250, 3000, .25), "b100": (1.5, 15, .15),
}
# Séries mises à jour par la tâche automatique, avec leur source.
AUTO_SERIES = {
    **{k: "magyp" for k in NCM}, **{k: "ecb" for k in ECB_SERIES}, **{k: "fred" for k in FRED_SERIES},
    "mpobCpo": "mpob", "idPalmFob": "iposs", "myPalmFob": "iposs", "b100": "anp",
}
# Délai au-delà duquel une série est signalée en retard (jours calendaires depuis la dernière observation).
STALE_DAYS = {
    "magyp": 6, "ecb": 5, "mpob": 6, "iposs": 6, "anp": 14,
    "ulsdNy": 14, "ulsdNyMonth": 70, "imfSoyOil": 100, "imfPalmOil": 100,
}


class SourceError(ValueError):
    """La source ne répond pas, ou sa réponse n’a pas le format attendu."""


def get(url, timeout=40, binary=False):
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read()
    except Exception as error:  # réseau, HTTP, délai
        raise SourceError(f"{url} : {error}") from error
    return body if binary else body.decode("utf-8-sig", "replace")


def clean_number(value):
    value = float(value)
    return int(value) if value.is_integer() else value


# ---------- MAGyP · prix FOB officiels argentins ----------
def arg_rows(raw, day):
    """Prix du bulletin `day` pour chaque position suivie, si la position couvre le mois et que le prix est unique."""
    if raw == [] or raw is None:
        return {}
    if not isinstance(raw, dict) or not isinstance(raw.get("posts"), list):
        raise SourceError("MAGyP : réponse sans liste « posts »")
    values = {}
    month = (day.year, day.month)
    for key, code in NCM.items():
        matches = {r["precio"] for r in raw["posts"] if r.get("posicion") == code
                   and str(r.get("fecha", ""))[:10] == day.isoformat()
                   and (r.get("añoDesde"), r.get("mesDesde")) <= month <= (r.get("añoHasta"), r.get("mesHasta"))
                   and isinstance(r.get("precio"), (int, float)) and r["precio"] > 0}
        if len(matches) == 1:
            values[key] = [day.isoformat(), clean_number(matches.pop())]
    return values


def magyp_day(day):
    text = get(f"{MAGYP}?{urlencode({'Fecha': day.strftime('%d/%m/%Y')})}", timeout=30)
    try:
        raw = json.loads(text)
    except ValueError as error:
        raise SourceError(f"MAGyP {day} : réponse non JSON") from error
    return arg_rows(raw, day)


# ---------- BCE ----------
def ecb_rows(raw, start, end):
    rows = []
    reader = csv.DictReader(io.StringIO(raw))
    if not reader.fieldnames or "TIME_PERIOD" not in reader.fieldnames or "OBS_VALUE" not in reader.fieldnames:
        raise SourceError("BCE : colonnes TIME_PERIOD / OBS_VALUE absentes")
    for row in reader:
        try:
            observation = date.fromisoformat(row["TIME_PERIOD"])
            value = float(row["OBS_VALUE"])
        except (TypeError, ValueError):
            continue
        if start <= observation <= end and math.isfinite(value) and value > 0:
            rows.append([observation.isoformat(), value])
    return rows


def fetch_ecb(start, end):
    params = urlencode({"startPeriod": start.isoformat(), "endPeriod": end.isoformat(), "format": "csvdata"})
    out = {}
    for key, code in ECB_SERIES.items():
        rows = ecb_rows(get(f"{ECB}{code}.EUR.SP00.A?{params}"), start, end)
        if not rows:
            raise SourceError(f"BCE {code} : aucune observation")
        out[key] = rows
    return out


# ---------- FRED (EIA, FMI) ----------
def fred_rows(raw, start, digits):
    lines = list(csv.reader(io.StringIO(raw)))
    if not lines or len(lines[0]) < 2 or "date" not in lines[0][0].lower():
        raise SourceError("FRED : en-tête CSV inattendu")
    rows = []
    for line in lines[1:]:
        try:
            observation, value = date.fromisoformat(line[0]), float(line[1])
        except (IndexError, ValueError):
            continue  # jour sans cotation (« . »)
        if observation >= start and math.isfinite(value) and value > 0:
            rows.append([observation.isoformat(), clean_number(round(value, digits))])
    return rows


def fetch_fred(end):
    out = {}
    for key, (series, first, digits) in FRED_SERIES.items():
        query = urlencode({"id": series, "cosd": first.isoformat(), "coed": end.isoformat()})
        rows = fred_rows(get(f"{FRED}?{query}"), first, digits)
        if not rows:
            raise SourceError(f"FRED {series} : aucune observation")
        out[key] = rows
    return out


# ---------- MPOB ----------
MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
FINAL_PRICE = re.compile(r"^\d{1,3}(?:,\d{3})*\.\d{2}$")


def _cells(row_html):
    return [re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", "", c))).strip()
            for c in re.findall(r"<td[^>]*>(.*?)</td>", row_html, re.S | re.I)]


def mpob_rows(html, year):
    """Prix définitifs du tableau annuel MPOB : lignes = jours, colonnes = mois."""
    rows = [_cells(r) for r in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I)]
    headers = [r for r in rows if r and r[0].lower() == "date"]
    if not headers or [c.lower() for c in headers[0][1:13]] != MONTHS:
        raise SourceError("MPOB : en-tête Date / janvier…décembre introuvable")
    values = {}
    for cells in rows:
        if len(cells) != 13 or not re.fullmatch(r"\d{2}", cells[0]):
            continue
        day = int(cells[0])
        for month, text in enumerate(cells[1:], start=1):
            if not FINAL_PRICE.match(text):
                continue  # NT, PH, « - », vide, ou prix provisoire de 8 h 30 (**)
            try:
                observation = date(year, month, day)
            except ValueError:
                raise SourceError(f"MPOB : prix sur une date inexistante ({year}-{month}-{day})")
            value = clean_number(text.replace(",", ""))
            iso = observation.isoformat()
            if iso in values and values[iso] != value:
                raise SourceError(f"MPOB : deux prix différents pour le {iso}")
            values[iso] = value
    if not values:
        raise SourceError(f"MPOB {year} : aucun prix définitif")
    return {"mpobCpo": sorted([d, v] for d, v in values.items())}


def fetch_mpob(today, deep=False):
    years = [today.year - 1, today.year] if today.month == 1 or deep else [today.year]
    rows = []
    for year in years:
        rows += mpob_rows(get(MPOB + str(year)), year)["mpobCpo"]
    return {"mpobCpo": [r for r in rows if r[0] >= START.isoformat()]}


# ---------- IPOSS · FOB Belawan et Port Klang ----------
def iposs_rows(html):
    table = re.search(r"<table[^>]*>(.*?)</table>", html, re.S | re.I)
    if not table:
        raise SourceError("IPOSS : tableau absent")
    headers = [re.sub(r"<[^>]+>", "", h).strip().lower() for h in re.findall(r"<th[^>]*>(.*?)</th>", table.group(1), re.S | re.I)]
    if headers[:3] != ["date", "location", "price (usd/ton)"]:
        raise SourceError(f"IPOSS : colonnes inattendues {headers}")
    out = {}
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", table.group(1), re.S | re.I):
        cells = _cells(row)
        if len(cells) < 3:
            continue
        key = IPOSS_PORTS.get(cells[1].lower())
        if not key:
            continue
        try:
            observation = datetime.strptime(cells[0], "%d %B %Y").date().isoformat()
        except ValueError as error:
            raise SourceError(f"IPOSS : date illisible « {cells[0]} »") from error
        if not re.fullmatch(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?", cells[2]):
            raise SourceError(f"IPOSS : prix illisible « {cells[2]} »")
        value = clean_number(cells[2].replace(",", ""))
        series = out.setdefault(key, {})
        if observation in series and series[observation] != value:
            raise SourceError(f"IPOSS : deux prix pour {cells[1]} le {observation}")
        series[observation] = value
    if "idPalmFob" not in out:
        raise SourceError("IPOSS : aucune cotation Port Belawan")
    return {k: sorted([d, v] for d, v in s.items()) for k, s in out.items()}


def fetch_iposs():
    return iposs_rows(get(IPOSS))


# ---------- ANP · B100 ----------
def anp_rows(rows, to_date):
    """`rows` : lignes du classeur ; `to_date` : convertit une date Excel en date."""
    header = next((i for i, r in enumerate(rows[:40]) if any(str(c).strip() == "Brasil" for c in r)), None)
    if header is None:
        raise SourceError("ANP : colonne Brasil introuvable")
    brasil = [str(c).strip() for c in rows[header]].index("Brasil")
    out = {}
    for r in rows[header + 1:]:
        product = str(r[0]).strip().lower()
        if "biodiesel" not in product or not re.search(r"b-?100", product):
            continue
        try:
            end, value = to_date(r[2]), float(r[brasil])
        except (TypeError, ValueError, IndexError):
            continue  # ligne sans prix publié (« *** »)
        if end >= START and math.isfinite(value) and value > 0:
            out[end.isoformat()] = clean_number(round(value, 5))
    if not out:
        raise SourceError("ANP : aucune ligne Biodiesel B-100")
    return {"b100": sorted([d, v] for d, v in out.items())}


def fetch_anp():
    try:
        import xlrd
    except ImportError as error:
        raise SourceError("ANP : module xlrd absent") from error
    book = xlrd.open_workbook(file_contents=get(ANP, timeout=90, binary=True))
    sheet = book.sheet_by_index(0)
    rows = [sheet.row_values(i) for i in range(sheet.nrows)]
    return anp_rows(rows, lambda v: xlrd.xldate.xldate_as_datetime(float(v), book.datemode).date())


# ---------- Fusion et contrôles ----------
def merge_series(current, fetched, key):
    """Fusionne des observations dans une série. Renvoie (série, ajouts, révisions, conservées)."""
    rows = {r[0]: list(r) for r in current}
    added, revised, kept = [], [], 0
    for observation, value in fetched:
        old = rows.get(observation)
        if old is None:
            rows[observation] = [observation, value]
            added.append([observation, value])
        elif not math.isclose(old[1], value, rel_tol=1e-9, abs_tol=1e-12):
            revised.append([observation, old[1], value])
            rows[observation] = [observation, value]
        else:
            kept += 1
    return [rows[d] for d in sorted(rows)], added, revised, kept


def check_series(key, rows):
    """Contrôles de structure et de vraisemblance d’une série complète. Renvoie la liste des erreurs."""
    errors = []
    low, high, _ = LIMITS.get(key, (0, math.inf, 1))
    previous = ""
    for r in rows:
        try:
            date.fromisoformat(r[0])
        except (TypeError, ValueError):
            errors.append(f"{key} : date invalide {r[0]!r}")
            continue
        if r[0] <= previous:
            errors.append(f"{key} : dates non triées ou en double ({r[0]})")
        previous = r[0]
        if not isinstance(r[1], (int, float)) or not math.isfinite(r[1]) or not low <= r[1] <= high:
            errors.append(f"{key} : valeur hors bornes {r[1]} le {r[0]} (attendu {low}–{high})")
    return errors


def screen_new_points(key, rows, candidates, held, today):
    """Écarte provisoirement les observations nouvelles ou révisées trop éloignées de la précédente.

    `rows` : série complète triée (valeurs déjà publiées + candidates) ; `candidates` : dates nouvelles ou révisées.
    Une valeur retenue est publiée dès qu’une observation suivante confirme le niveau. Une valeur déjà publiée
    n’est jamais retirée. Renvoie (série publiée, valeurs retenues, dates confirmées).
    """
    limit = LIMITS.get(key, (0, math.inf, 1))[2]
    since = {h["date"]: h.get("since") for h in held if h.get("series") == key}
    published, waiting, confirmed = [], [], []
    for r in rows:
        if waiting and _close(waiting[-1][1], r[1], limit * 1.5):
            confirmed += [w[0] for w in waiting]
            published += waiting
            waiting = []
            published.append(r)
            continue
        anchor = max(published, key=lambda x: x[0]) if published else None
        if anchor is None or r[0] not in candidates:
            published.append(r)
            continue
        gap = (date.fromisoformat(r[0]) - date.fromisoformat(anchor[0])).days
        if _close(anchor[1], r[1], limit * (1.5 if gap > 10 else 1)):
            published.append(r)
        else:
            waiting.append(r)
    out = []
    for w in waiting:
        reference = max((p for p in published if p[0] < w[0]), key=lambda x: x[0], default=None)
        out.append({"series": key, "date": w[0], "value": w[1],
                    "previous": reference[1] if reference else None, "previousDate": reference[0] if reference else None,
                    "since": since.get(w[0]) or today.isoformat()})
    return sorted(published, key=lambda x: x[0]), out, confirmed


def _close(a, b, limit):
    return abs(b - a) <= limit * abs(a)


def stale_after(key):
    return STALE_DAYS.get(key) or STALE_DAYS.get(AUTO_SERIES.get(key, ""), 7)


def business_days(start, end):
    day = start
    while day <= end:
        if day.weekday() < 5:
            yield day
        day += timedelta(days=1)
