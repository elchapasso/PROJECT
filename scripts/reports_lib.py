"""Dernières publications des rapports suivis par Oléa Terminal : documents et chiffres clés.

Chaque lecteur renvoie un dictionnaire {date, title, url, documents, figures} :
- date : jour de publication (ISO) ;
- documents : [{label, url}] vers les fichiers officiels (PDF, texte, tableur) ;
- figures : [{label, value, unit, previous?, previousLabel?, note?}] ; valeurs dans l’unité de la source.
Les rapports USDA sont lus sur ESMIS (bibliothèque nationale d’agriculture), les ventes à l’exportation sur l’API
ouverte de la FAS, les inspections sur USDA Market News, la CONAB sur son tableur de résultats, SEA et ANEC sur leurs sites.
"""
from __future__ import annotations

import io
import json
import re
import zipfile
from datetime import date, datetime
from html import unescape
from urllib.parse import urljoin

ESMIS = "https://esmis.nal.usda.gov"
ESMIS_PAGES = {
    "wasde": ESMIS + "/publication/world-agricultural-supply-and-demand-estimates",
    "nass-progress": ESMIS + "/publication/crop-progress",
    "nass-fats-oils": ESMIS + "/publication/fats-and-oils-oilseed-crushings-production-consumption-and-stocks",
    "nass-production": ESMIS + "/publication/crop-production",
    "nass-stocks": ESMIS + "/publication/grain-stocks",
    "nass-acreage": ESMIS + "/publication/acreage",
    "nass-plantings": ESMIS + "/publication/prospective-plantings",
}
AMS_INSPECTIONS_TXT = "https://www.ams.usda.gov/mnreports/wa_gr101.txt"
FAS_API = "https://api.fas.usda.gov/api/esr/"
ESR_COMMODITIES = {801: "Graines de soja", 901: "Tourteau de soja", 902: "Huile de soja"}
CONAB_BULLETINS = "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/safra-de-graos/boletim-da-safra-de-graos"
SEA_FEED = "https://seaofindia.com/category/statistical-update/import-of-vegetable-oil/feed/"
COT_LIVE = "https://raw.githubusercontent.com/elchapasso/PROJECT/cot-live/docs/terminal/cot/disaggregated-futures.json"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def number(text: str) -> float:
    return float(text.replace(",", ""))


def figure(label: str, value: float, unit: str, previous: float | None = None, previous_label: str = "", note: str = "") -> dict:
    out = {"label": label, "value": round(value, 4), "unit": unit}
    if previous is not None:
        out |= {"previous": round(previous, 4), "previousLabel": previous_label}
    if note:
        out["note"] = note
    return out


MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def fr_month(text: str) -> str:
    """« September 2026 » → « septembre 2026 »."""
    month, year = text.split()
    return f"{MOIS[MONTHS.index(month)]} {year}"


# ---------- ESMIS : liste des publications d’un rapport ----------
def esmis_releases(html: str) -> list[dict]:
    """Publications listées sur une page ESMIS, de la plus récente à la plus ancienne."""
    rows = re.findall(
        r'<td headers="view-release-date-table-column"[^>]*><time datetime="(\d{4}-\d{2}-\d{2})T[^"]*">.*?</td>\s*'
        r'<td headers="view-release-files-table-column"[^>]*>(.*?)</td>', html, flags=re.S)
    out = []
    for day, cell in rows:
        files = {}
        for href in re.findall(r'href="([^"]+)"', cell):
            extension = href.rsplit(".", 1)[-1].lower()
            files.setdefault(extension, urljoin(ESMIS, href))
        out.append({"date": day, "files": files})
    if not out:
        raise ValueError("ESMIS : aucune publication listée")
    return sorted(out, key=lambda r: r["date"], reverse=True)


def documents(files: dict) -> list[dict]:
    labels = {"pdf": "PDF", "txt": "Texte", "xls": "Excel", "xlsx": "Excel", "xml": "XML", "zip": "Tableaux (zip)"}
    return [{"label": labels[k], "url": files[k]} for k in ("pdf", "txt", "xls", "xlsx", "xml", "zip") if k in files]


# ---------- WASDE : bilan américain du soja et de ses produits ----------
def wasde_figures(text: str) -> tuple[str, list[dict]]:
    start = text.find("U.S. Soybeans and Products Supply and Use")
    if start < 0:
        raise ValueError("WASDE : tableau du soja américain introuvable")
    end = text.find("WASDE -", start + 50)
    section = text[start:end if end > 0 else None].splitlines()
    seasons = next((re.findall(r"\d{4}/\d{2}", line) for line in section if re.search(r"\d{4}/\d{2}.*Proj", line)), [])
    months = next((re.findall(r"\b([A-Z][a-z]{2})\b", line) for line in section if line.startswith("Item")), [])
    if not seasons:
        raise ValueError("WASDE : campagnes introuvables")
    block, values = "", {}
    for line in section:
        if line.strip() in {"SOYBEANS", "SOYBEAN OIL", "SOYBEAN MEAL"}:
            block = line.strip()
            continue
        match = re.match(r"^\s*([A-Za-z][A-Za-z .,&()$/]*?(?:\s\d/)?)\s{2,}((?:-?[\d.,]+\s*){2,})$", line)
        if block and match:
            values[(block, re.sub(r"\s+\d/$", "", match[1].strip()).lower())] = [number(v) for v in match[2].split()]
    season = seasons[-1]
    compare = months[-2] if len(months) >= 2 else ""

    def pick(block_name, label, title, unit):
        row = values.get((block_name, label))
        if not row:
            raise ValueError(f"WASDE : ligne {label} introuvable")
        return figure(title, row[-1], unit, row[-2] if compare else None, compare and f"WASDE {compare}")

    figures = [
        pick("SOYBEANS", "production", f"Soja US · production {season}", "M bu"),
        pick("SOYBEANS", "ending stocks", f"Soja US · stocks finaux {season}", "M bu"),
        pick("SOYBEAN OIL", "biofuel", f"Huile de soja US · biocarburants {season}", "M lb"),
        pick("SOYBEAN OIL", "ending stocks", f"Huile de soja US · stocks finaux {season}", "M lb"),
        pick("SOYBEAN OIL", "avg. price (c/lb)", f"Huile de soja US · prix moyen {season}", "¢/lb"),
    ]
    return season, figures


# ---------- NASS ----------
def released_on(text: str) -> str:
    match = re.search(r"Released ([A-Z][a-z]+ \d{1,2}, \d{4})", text)
    if not match:
        raise ValueError("NASS : date de publication introuvable")
    return datetime.strptime(match[1], "%B %d, %Y").date().isoformat()


STAGES = [("Harvested", "Soja récolté"), ("Dropping Leaves", "Soja en défoliation"), ("Setting Pods", "Soja en formation des gousses"),
          ("Blooming", "Soja en floraison"), ("Emerged", "Soja levé"), ("Planted", "Soja semé")]


def crop_progress_figures(text: str) -> list[dict]:
    """Stade le plus avancé du soja publié cette semaine, puis l’état des cultures s’il est publié."""
    out = []
    for stage, label in STAGES:
        start = text.find(f"Soybeans {stage} - Selected States")
        if start < 0:
            continue
        match = re.search(r"^\s*\d+ States \.*:\s*(.+)$", text[start:start + 4000], flags=re.M)
        if not match:
            continue
        cells = match[1].split()
        if len(cells) < 4:
            continue
        current, previous, average = cells[2], cells[1], cells[3]
        if not current.isdigit():
            continue
        out.append(figure(label, float(current), "%", float(previous) if previous.isdigit() else None, "semaine précédente",
                          f"moyenne 5 ans {average} %" if average.isdigit() else ""))
        break
    start = text.find("Soybean Condition - Selected States")
    if start >= 0:
        block = text[start:start + 4000]
        rows = {name: re.search(rf"^\s*{name} \.*:\s*(.+)$", block, flags=re.M) for name in (r"\d+ States", "Previous week")}
        try:
            now = [float(v) for v in rows[r"\d+ States"][1].split()[-5:]]
            before = [float(v) for v in rows["Previous week"][1].split()[-5:]] if rows["Previous week"] else None
            out.append(figure("Soja · état bon à excellent", now[3] + now[4], "%", before[3] + before[4] if before else None, "semaine précédente"))
        except (TypeError, ValueError, IndexError):
            pass
    return out


def fats_oils_figures(text: str) -> list[dict]:
    flat = re.sub(r"\s+", " ", text)
    crush = re.search(r"Soybeans crushed for crude oil was ([\d.]+) million tons \(([\d.]+) million bushels\) in ([A-Z][a-z]+ \d{4}), "
                      r"compared with ([\d.]+) million tons \(([\d.]+) million bushels\) in ([A-Z][a-z]+ \d{4})", flat)
    if not crush:
        raise ValueError("Fats & Oils : trituration du soja introuvable")
    out = [figure(f"Soja trituré · {fr_month(crush[3])}", number(crush[1]), "M short tons", number(crush[4]), fr_month(crush[6]), f"{crush[2]} M bu")]
    oil = re.search(r"Crude oil produced was ([\d.]+) billion pounds", flat[crush.end():crush.end() + 400])
    if oil:
        out.append(figure(f"Huile de soja brute produite · {fr_month(crush[3])}", number(oil[1]), "Md lb"))
    return out


def crop_production_figures(text: str) -> list[dict]:
    flat = re.sub(r"\s+", " ", text)
    production = re.search(r"Soybean production for beans (?:in \d{4} )?(?:is forecast at|totaled|was) (?:a record(?: high)? )?([\d.]+) (billion|million) bushels", flat)
    if not production:
        return []  # hors saison du soja
    value = number(production[1]) * (1000 if production[2] == "billion" else 1)
    out = [figure("Soja US · production", value, "M bu")]
    yield_ = re.search(r"[Yy]ields? (?:are|is) (?:expected|forecast) to average (?:a record(?: high)? )?([\d.]+) bushels per acre|"
                       r"[Yy]ield (?:is estimated at|averaged) (?:a record(?: high)? )?([\d.]+) bushels per acre", flat[production.end():production.end() + 600])
    if yield_:
        out.append(figure("Soja US · rendement", number(yield_[1] or yield_[2]), "bu/acre"))
    return out


def grain_stocks_figures(text: str) -> list[dict]:
    flat = re.sub(r"\s+", " ", text)
    match = re.search(r"[Ss]oybean(?:s stored| stocks) in all positions on ([A-Z][a-z]+ \d{1,2}, \d{4}),? totaled ([\d.]+) (billion|million) bushels, (up|down) ([\d.]+) percent", flat)
    if not match:
        raise ValueError("Grain Stocks : stocks de soja introuvables")
    value = number(match[2]) * (1000 if match[3] == "billion" else 1)
    when = datetime.strptime(match[1], "%B %d, %Y").strftime("%d/%m/%Y")
    return [figure(f"Stocks de soja US au {when}", value, "M bu", note=f"{'+' if match[4] == 'up' else '−'}{match[5]} % sur un an")]


def acreage_figures(text: str) -> list[dict]:
    flat = re.sub(r"\s+", " ", text)
    match = re.search(r"Soybean planted area for (\d{4}) is estimated at ([\d.]+) million acres, (up|down) ([\d.]+) percent", flat)
    if not match:
        raise ValueError("Surfaces de soja introuvables")
    return [figure(f"Soja US · surfaces semées {match[1]}", number(match[2]), "M acres", note=f"{'+' if match[3] == 'up' else '−'}{match[4]} % sur un an")]


NASS_FIGURES = {
    "nass-progress": crop_progress_figures, "nass-fats-oils": fats_oils_figures, "nass-production": crop_production_figures,
    "nass-stocks": grain_stocks_figures, "nass-acreage": acreage_figures, "nass-plantings": acreage_figures,
}


# ---------- Inspections à l’exportation (USDA Market News) ----------
def inspections(text: str) -> dict:
    released = re.search(r"Washington, DC\s+\w{3}\s+([A-Z][a-z]{2}) (\d{1,2}), (\d{4})", text)
    week = re.search(r"REPORTED IN WEEK ENDING ([A-Z]{3}) (\d{2}), (\d{4})", text)
    if not released or not week:
        raise ValueError("Inspections : dates introuvables")
    day = datetime.strptime(" ".join(released.groups()), "%b %d %Y").date().isoformat()
    week_end = datetime.strptime(" ".join(week.groups()).title(), "%b %d %Y").strftime("%d/%m")
    out = []
    for name, label in (("SOYBEANS", "Soja inspecté"), ("SUNFLOWER", "Tournesol inspecté")):
        row = re.search(rf"^{name}\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*$", text, flags=re.M)
        if row and (name == "SOYBEANS" or number(row[1]) > 0):
            out.append(figure(f"{label} · semaine au {week_end}", number(row[1]) / 1000, "kt", number(row[2]) / 1000, "semaine précédente",
                              f"campagne : {number(row[4]) / 1e6:.2f} Mt".replace(".", ",")))
    if not out:
        raise ValueError("Inspections : ligne du soja introuvable")
    return {"date": day, "title": f"Semaine close le {week_end}", "url": AMS_INSPECTIONS_TXT,
            "documents": [{"label": "Texte", "url": AMS_INSPECTIONS_TXT}], "figures": out}


# ---------- Ventes à l’exportation (API ouverte de la FAS) ----------
def esr_latest(release_dates: list, exports: dict[int, list]) -> dict:
    """Dernière semaine publiée : ventes nettes et expéditions de soja, tourteau et huile, tous pays confondus."""
    stamps = {r["commodityCode"]: r for r in release_dates}
    out, day, week_end = [], "", ""
    for code, label in ESR_COMMODITIES.items():
        rows = exports.get(code) or []
        if not rows:
            raise ValueError(f"FAS : données vides pour le produit {code}")
        weeks = sorted({r["weekEndingDate"][:10] for r in rows})
        last, before = weeks[-1], weeks[-2] if len(weeks) > 1 else None
        total = lambda week, key: sum(r[key] for r in rows if r["weekEndingDate"][:10] == week)
        net, shipped = total(last, "currentMYNetSales"), total(last, "weeklyExports")
        out.append(figure(f"{label} · ventes nettes", net / 1000, "kt", total(before, "currentMYNetSales") / 1000 if before else None,
                          "semaine précédente", f"expéditions {shipped / 1000:,.0f} kt".replace(",", " ")))
        day = max(day, stamps.get(code, {}).get("releaseTimeStamp", "")[:10])
        week_end = max(week_end, last)
    if not day:
        raise ValueError("FAS : date de publication introuvable")
    label = date.fromisoformat(week_end).strftime("%d/%m")
    return {"date": day, "title": f"Semaine close le {label}", "figures": out}


def esr_market_year(release_dates: list, code: int) -> int:
    match = next((r for r in release_dates if r["commodityCode"] == code), None)
    if not match:
        raise ValueError(f"FAS : campagne inconnue pour le produit {code}")
    return int(match["marketYear"])


# ---------- CONAB : dernier relevé et tableur de résultats ----------
def conab_latest(html: str) -> dict:
    match = re.search(r'href="(' + re.escape(CONAB_BULLETINS) + r'/(\d+)o-levantamento-safra-(\d{4})-(\d{2})/)([^"/]+)"', html)
    if not match:
        raise ValueError("CONAB : dernier relevé introuvable")
    folder = match[1]
    files = sorted(set(re.findall(r'href="(' + re.escape(folder) + r'[^"]+\.(?:pdf|xlsx))"', html)))
    return {"title": f"{match[2]}e relevé · récolte {match[3]}/{match[4]}", "url": folder + match[5],
            "documents": [{"label": "Tableur" if f.endswith(".xlsx") else "Présentation" if "apresentacao" in f else "Bulletin (PDF)", "url": f} for f in files],
            "xlsx": next((f for f in files if f.endswith(".xlsx")), "")}


def xlsx_rows(data: bytes, sheet: str) -> list[list[str]]:
    """Lecture minimale d’une feuille .xlsx (bibliothèque standard)."""
    book = zipfile.ZipFile(io.BytesIO(data))
    workbook = book.read("xl/workbook.xml").decode()
    rels = book.read("xl/_rels/workbook.xml.rels").decode()
    ids = dict(re.findall(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"', workbook))
    targets = {rid: target for rid, target in re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels)}
    targets |= {rid: target for target, rid in re.findall(r'Target="([^"]+)"[^>]*Id="([^"]+)"', rels)}
    if sheet not in ids:
        raise ValueError(f"CONAB : feuille {sheet} absente")
    path = "xl/" + targets[ids[sheet]].split("xl/")[-1].lstrip("/")
    shared = []
    if "xl/sharedStrings.xml" in book.namelist():
        shared = [unescape(re.sub(r"<[^>]+>", "", s)) for s in re.findall(r"<si>(.*?)</si>", book.read("xl/sharedStrings.xml").decode(), flags=re.S)]
    out = []
    for row in re.findall(r"<row [^>]*>(.*?)</row>", book.read(path).decode(), flags=re.S):
        cells = []
        for attrs, body in re.findall(r"<c ([^>]*)>(.*?)</c>", row, flags=re.S):
            value = re.search(r"<v>(.*?)</v>", body)
            value = value[1] if value else unescape(re.sub(r"<[^>]+>", "", body))
            cells.append(shared[int(value)] if 't="s"' in attrs and value.isdigit() else value)
        out.append(cells)
    return out


def conab_figures(data: bytes) -> list[dict]:
    rows = xlsx_rows(data, "Produção_Brasil")
    header = next((r for r in rows if any(re.search(r"[a-z]{3}/\d{4}", c) for c in r)), [])
    labels = [re.search(r"[a-z]{3}/\d{4}", c)[0] for c in header if re.search(r"[a-z]{3}/\d{4}", c)]
    months_pt = dict(zip(["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"], MOIS))
    previous_label = "relevé de " + " ".join([months_pt.get(labels[0][:3], labels[0][:3]), labels[0][4:]]) if labels else "relevé précédent"
    out = []
    for name, label in (("SOJA", "Soja Brésil · production"),):
        row = next((r for r in rows if r and r[0].strip().upper() == name), None)
        if not row or len(row) < 4:
            continue
        season, previous, current = (float(v) for v in row[1:4])
        change = f"{(current / season - 1) * 100:+.1f}".replace("-", "−").replace(".", ",")
        out.append(figure(label, current / 1000, "Mt", previous / 1000, previous_label, f"{change} % sur la récolte précédente"))
    if not out:
        raise ValueError("CONAB : ligne du soja introuvable")
    return out


# ---------- SEA India : dernière circulaire des importations ----------
def sea_latest(feed: str, post: str) -> dict:
    item = re.search(r"<item>(.*?)</item>", feed, flags=re.S)
    if not item:
        raise ValueError("SEA : flux vide")
    title = unescape(re.search(r"<title>(.*?)</title>", item[1], flags=re.S)[1]).strip()
    link = re.search(r"<link>(.*?)</link>", item[1])[1].strip()
    pdf = re.search(r'href="(https://seaofindia\.com/wp-content/uploads/[^"]+?dt\.-(\d{2})\.(\d{2})\.(\d{4})[^"]*\.pdf)"', post)
    if not pdf:
        raise ValueError("SEA : circulaire PDF introuvable")
    released = date(int(pdf[4]), int(pdf[3]), int(pdf[2])).isoformat()
    return {"date": released, "title": title, "url": link, "documents": [{"label": "Circulaire (PDF)", "url": pdf[1]}], "figures": []}


# ---------- ANEC : dernier relevé hebdomadaire ----------
def anec_document(html: str) -> dict:
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, flags=re.S)
    if not match:
        raise ValueError("ANEC : données de la page introuvables")
    articles = json.loads(match[1])["props"]["pageProps"]["homeData"]["articles"]
    weekly = [a for a in articles if re.search(r"Exporta[cç][oõ]es", a.get("titleBR", "")) and a.get("status") == "PUBLISHED"]
    if not weekly:
        raise ValueError("ANEC : aucun relevé publié")
    latest = max(weekly, key=lambda a: a["createdAt"])
    pdf = next((m["mediaFile"]["url"] for m in latest.get("articleMediaFiles", []) if m.get("mediaFile", {}).get("url", "").endswith(".pdf")), "")
    week = re.search(r"(\d{1,2})\.(\d{4})", latest["titleBR"])
    return {"date": latest["createdAt"][:10], "title": f"Semaine {week[1]}/{week[2]}" if week else latest["titleBR"],
            "url": "https://anec.com.br/article/" + latest["slugBR"],
            "documents": [{"label": "Relevé (PDF)", "url": urljoin("https://anec.com.br/", pdf)}] if pdf else [], "figures": []}


# ---------- CFTC : positions des fonds (rapport désagrégé, futures seuls) ----------
def cot_latest(dataset: dict) -> dict:
    fields = dataset["fields"]
    out = []
    for key, label in (("soybean-oil", "Huile de soja (ZL)"), ("soybeans", "Graines de soja (ZS)")):
        rows = dataset["markets"][key]["rows"]
        last, before = rows[-1], rows[-2]
        net = lambda row: row[1 + fields.index("mmL")] - row[1 + fields.index("mmS")]
        out.append(figure(f"{label} · position nette des fonds", net(last), "contrats", net(before), "semaine précédente"))
    as_of = date.fromisoformat(dataset["markets"]["soybean-oil"]["rows"][-1][0])
    return {"title": "Positions au " + as_of.strftime("%d/%m/%Y"), "asOf": as_of.isoformat(), "figures": out}
