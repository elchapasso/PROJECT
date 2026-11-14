"""Calendrier des publications d’Oléa Terminal : lecture des calendriers officiels et règles de publication.

Trois niveaux de date, repris par le site :
- official : date publiée par la source (WASDE, NASS, NOPA, MPOB, CONAB, dernière publication ANEC) ;
- rule : date tirée de la règle annoncée par la source (FAS : chaque jeudi 8 h 30 ET, reporté au vendredi
  après un jour férié ; MPOB : le 10 ; CONAB : progrès des récoltes chaque lundi à 19 h…) ;
- usual : jour habituel d’une publication sans calendrier officiel (SEA, ANEC, Bolsa de Cereales, inspections).
Seule la bibliothèque standard est utilisée, sauf pypdf pour les calendriers PDF de NOPA et de la CONAB.
"""
from __future__ import annotations

import io
import json
import re
from datetime import date, datetime, time, timedelta
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from xml.etree import ElementTree
from zoneinfo import ZoneInfo

USER_AGENT = "Mozilla/5.0 (compatible; OleaTerminal-Calendar/2.0; +https://github.com/elchapasso/PROJECT)"
EASTERN = ZoneInfo("America/New_York")
KUALA_LUMPUR = ZoneInfo("Asia/Kuala_Lumpur")
BRASILIA = ZoneInfo("America/Sao_Paulo")
UTC = ZoneInfo("UTC")

FOREX_JSON = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
FOREX_XML = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml"
WASDE_URL = "https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report"
NASS_ROOT = "https://www.nass.usda.gov"
NOPA_URL = "https://www.nopa.org/resources/nopa-monthly-crush-report/"
MPOB_URL = "https://bepi.mpob.gov.my/"
CONAB_PDF = "https://www.gov.br/conab/pt-br/assuntos/imagens/calendario-de-safras-e-prohort-{year}.pdf"
CONAB_GRAINS_URL = "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/safra-de-graos"
CONAB_PROGRESS_URL = "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/progresso-de-safra"
ANEC_URL = "https://anec.com.br/"
SEA_URL = "https://seaofindia.com/category/statistical-update/import-of-vegetable-oil/"
EXPORT_SALES_URL = "https://www.fas.usda.gov/programs/export-sales-reporting-program"
OILSEEDS_WMT_URL = "https://www.fas.usda.gov/data/oilseeds-world-markets-and-trade"
INSPECTIONS_URL = "https://esmis.nal.usda.gov/publication/grains-inspected-export-weekly"
BCBA_URL = "https://www.bolsadecereales.com/estimaciones-informes"

# Rapports NASS retenus : titre exact du calendrier → type de publication du site.
NASS_REPORTS = {
    "Crop Progress": "nass-progress",
    "Crop Production": "nass-production",
    "Crop Production Annual": "nass-production",
    "Fats & Oils": "nass-fats-oils",
    "Grain Stocks": "nass-stocks",
    "Acreage": "nass-acreage",
    "Prospective Plantings": "nass-plantings",
}
# Devises Forex Factory suivies : dollar, euro et yuan (demande chinoise) ; jours fériés américains seulement.
FOREX_COUNTRIES = {"USD", "EUR", "CNY"}
FOREX_IMPACTS = {"High", "Medium", "Holiday"}
MONTHS_EN = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
MONTHS_PT = {m: i for i, m in enumerate(["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"], 1)}


def get(url: str, binary: bool = False):
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "en,fr;q=0.8"})
    with urlopen(request, timeout=30) as response:
        data = response.read()
    return data if binary else data.decode("utf-8", errors="replace")


def pdf_text(data: bytes) -> str:
    from pypdf import PdfReader  # installé par le workflow

    return "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(data)).pages)


def event(kind: str, day: date, url: str, status: str, at: datetime | None = None, period: str = "") -> dict:
    if at is not None and at.tzinfo is None:
        raise ValueError(f"{kind}: heure sans fuseau")
    return {
        "id": f"{kind}-{day.isoformat()}",
        "kind": kind,
        "date": day.isoformat(),
        "at": at.isoformat() if at else "",
        "url": url,
        "status": status,
        "period": period,
    }


def at_time(day: date, hour: int, minute: int, zone: ZoneInfo) -> datetime:
    return datetime.combine(day, time(hour, minute), zone)


def month_label(day: date) -> str:
    return day.strftime("%Y-%m")


def previous_month(day: date) -> date:
    return (day.replace(day=1) - timedelta(days=1)).replace(day=1)


# ---------- Jours fériés fédéraux américains (report des publications USDA) ----------
def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date:
    first = date(year, month, 1)
    return first + timedelta(days=(weekday - first.weekday()) % 7 + 7 * (n - 1))


def _last_weekday(year: int, month: int, weekday: int) -> date:
    last = (date(year, month, 28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    return last - timedelta(days=(last.weekday() - weekday) % 7)


def _observed(day: date) -> date:
    return day - timedelta(days=1) if day.weekday() == 5 else day + timedelta(days=1) if day.weekday() == 6 else day


def us_holidays(year: int) -> set[date]:
    days = set()
    for y in (year - 1, year, year + 1):
        days |= {
            _observed(date(y, 1, 1)), _nth_weekday(y, 1, 0, 3), _nth_weekday(y, 2, 0, 3), _last_weekday(y, 5, 0),
            _observed(date(y, 6, 19)), _observed(date(y, 7, 4)), _nth_weekday(y, 9, 0, 1), _nth_weekday(y, 10, 0, 2),
            _observed(date(y, 11, 11)), _nth_weekday(y, 11, 3, 4), _observed(date(y, 12, 25)),
        }
    return {d for d in days if d.year == year}


def us_business_day(day: date) -> date:
    while day.weekday() >= 5 or day in us_holidays(day.year):
        day += timedelta(days=1)
    return day


def weekdays(start: date, end: date, weekday: int):
    day = start + timedelta(days=(weekday - start.weekday()) % 7)
    while day <= end:
        yield day
        day += timedelta(days=7)


# ---------- Calendriers officiels ----------
def wasde_dates(html: str) -> list[date]:
    """Dates annoncées par le WAOB : « In 2027 the WASDE report will be released on Jan. 12, Feb. 10, … »."""
    text = re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", html)))
    out = []
    for year, listing in re.findall(r"In (\d{4}) the WASDE report will be released on (.+?\d)\.(?:\s|$)", text):
        for month, day in re.findall(r"([A-Z][a-z]{2})[a-z]*\.?\s+(\d{1,2})", listing):
            out.append(date(int(year), MONTHS_EN[month.lower()], int(day)))
    if len(out) < 12:
        raise ValueError("WASDE : calendrier annuel introuvable")
    return sorted(set(out))


class NASSCalendar(HTMLParser):
    """Liste des publications d’un mois du calendrier NASS (vue « reports-by-date »)."""

    def __init__(self, month: str):
        super().__init__()
        self.month = month
        self.days: set[str] = set()
        self.items: list[tuple[str, str, str, str]] = []
        self.day = ""
        self.in_cell = self.item = self.in_link = False
        self.href = ""
        self.link_text: list[str] = []
        self.item_text: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "td":
            self.in_cell, self.day = True, ""
        elif self.in_cell and tag == "time" and "nass-release-month-calendar__date" in (attrs.get("class") or "").split():
            self.day = attrs.get("datetime", "")
            if self.day.startswith(self.month + "-"):
                self.days.add(self.day)
        elif self.in_cell and tag == "li":
            self.item, self.href, self.link_text, self.item_text = True, "", [], []
        elif self.item and tag == "a":
            self.in_link, self.href = True, attrs.get("href", "")

    def handle_data(self, data):
        if self.item:
            self.item_text.append(data)
            if self.in_link:
                self.link_text.append(data)

    def handle_endtag(self, tag):
        if tag == "a":
            self.in_link = False
        elif tag == "li" and self.item:
            self.item = False
            if self.day in self.days:
                self.items.append((self.day, " ".join("".join(self.link_text).split()), " ".join(self.item_text), self.href))
        elif tag == "td":
            self.in_cell = False


def nass_month(html: str, month: date) -> list[dict]:
    parser = NASSCalendar(month.strftime("%Y-%m"))
    parser.feed(html)
    parser.close()
    if len(parser.days) < 20:
        raise ValueError(f"NASS : mois {month:%Y-%m} absent de la page")
    out = []
    for day, name, text, href in parser.items:
        kind = NASS_REPORTS.get(name)
        if not kind:
            continue
        match = re.search(r"(\d{1,2}:\d{2}\s+[AP]M)\s+ET\b", text)
        if not match or not href.startswith("/data-and-statistics/calendar/release/"):
            raise ValueError(f"NASS : publication {name} du {day} illisible")
        clock = datetime.strptime(match[1], "%I:%M %p").time()
        release = date.fromisoformat(day)
        out.append(event(kind, release, urljoin(NASS_ROOT, href), "official", datetime.combine(release, clock, EASTERN),
                         "Rapport annuel" if name.endswith("Annual") else ""))
    return out


def nass_url(month: date) -> str:
    return f"{NASS_ROOT}/publications/calendar/reports-by-date?month={month.month}&view=l&year={month.year}"


def nopa_dates(text: str) -> list[date]:
    """PDF « Statistics Reporting Dates » de NOPA : « For Calendar Year 2026 … Thursday, January 15 … »."""
    year = re.search(r"Calendar Year (\d{4})", text)
    if not year:
        raise ValueError("NOPA : année du calendrier introuvable")
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    found = re.findall(r"(?:Monday|Tuesday|Wednesday|Thursday|Friday),\s+(" + "|".join(months) + r")\s+(\d{1,2})", text)
    out = sorted({date(int(year[1]), months.index(m) + 1, int(d)) for m, d in found})
    if len(out) != 12 or len({d.month for d in out}) != 12:
        raise ValueError("NOPA : douze dates mensuelles attendues")
    return out


def nopa_pdf_url(html: str) -> str:
    match = re.search(r'href="([^"]+Release-Dates[^"]+\.pdf)"', html, flags=re.I)
    if not match:
        raise ValueError("NOPA : lien du calendrier PDF introuvable")
    return urljoin(NOPA_URL, unescape(match[1]))


def mpob_next(html: str) -> tuple[date, date]:
    """Encadré « Monthly Release of Malaysian Palm Oil Industry Performance (November 2026) Release Date: 10th December 2026 »."""
    text = re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", html)))
    match = re.search(r"Industry Performance \(\s*([A-Z][a-z]+)\s+(\d{4})\s*\)\s*Release Date:\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s+([A-Z][a-z]+)\s+(\d{4})", text)
    if not match:
        raise ValueError("MPOB : date de publication introuvable")
    period = datetime.strptime(f"1 {match[1]} {match[2]}", "%d %B %Y").date()
    release = datetime.strptime(f"{match[3]} {match[4]} {match[5]}", "%d %B %Y").date()
    if not 0 < (release - period).days < 75:
        raise ValueError("MPOB : date de publication incohérente")
    return release, period


def conab_grain_dates(text: str) -> list[tuple[date, str]]:
    """Section GRÃOS du calendrier CONAB : « ANO-SAFRA 2026/27 · 2º 13/nov/2026 »."""
    start = text.find("GRÃOS")
    if start < 0:
        raise ValueError("CONAB : section des grains introuvable")
    section = text[start:]
    end = re.search(r"CLIQUE|PROHORT|CAFÉ|CANA", section[5:])
    section = section[: end.start() + 5] if end else section
    out, harvest = [], ""
    for line in section.splitlines():
        season = re.search(r"ANO-SAFRA\s+(\d{4}/\d{2})", line)
        if season:
            harvest = season[1]
        for number, day, month, year in re.findall(r"(\d{1,2})\s*º\s+(\d{1,2})/([a-zç]{3})/(\d{4})", line, flags=re.I):
            out.append((date(int(year), MONTHS_PT[month.lower()], int(day)), f"{number}e relevé · récolte {harvest}"))
    if len(out) < 8:
        raise ValueError("CONAB : calendrier des grains incomplet")
    return out


def anec_latest(html: str) -> dict:
    """Dernier relevé hebdomadaire des exportations, lu dans les données de la page d’accueil d’ANEC."""
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, flags=re.S)
    if not match:
        raise ValueError("ANEC : données de la page introuvables")
    articles = json.loads(match[1])["props"]["pageProps"]["homeData"]["articles"]
    weekly = [a for a in articles if re.search(r"Exporta[cç][oõ]es", a.get("titleBR", "")) and a.get("status") == "PUBLISHED"]
    if not weekly:
        raise ValueError("ANEC : aucun relevé d’exportations publié")
    latest = max(weekly, key=lambda a: a["createdAt"])
    instant = datetime.fromisoformat(latest["createdAt"].replace("Z", "+00:00")).astimezone(BRASILIA)
    week = re.search(r"(\d{1,2})\.(\d{4})", latest["titleBR"])
    return event("anec", instant.date(), urljoin(ANEC_URL, "article/" + latest["slugBR"]), "official", instant,
                 f"Semaine {week[1]}/{week[2]}" if week else "")


# ---------- Forex Factory ----------
def forex_week(payload: str, xml: bytes, today: date):
    data = json.loads(payload)
    start = today - timedelta(days=(today.weekday() + 1) % 7)
    end = start + timedelta(days=6)
    if not isinstance(data, list) or not data:
        raise ValueError("Forex Factory : flux vide")
    links = {}
    for item in ElementTree.fromstring(xml).iter("event"):
        field = lambda key: (item.findtext(key) or "").strip()
        try:
            instant = datetime.strptime(field("date") + " " + field("time"), "%m-%d-%Y %I:%M%p").replace(tzinfo=UTC)
        except ValueError:
            instant = None
        links[(field("country"), field("title"), instant)] = field("url")
        links.setdefault((field("country"), field("title"), field("date")), field("url"))
    events, in_week = [], 0
    for row in data:
        instant = datetime.fromisoformat(row["date"])
        if instant.utcoffset() is None:
            raise ValueError("Forex Factory : heure sans fuseau")
        if not start <= instant.astimezone(EASTERN).date() <= end:
            continue
        in_week += 1
        if row["country"] in FOREX_COUNTRIES and row["impact"] in FOREX_IMPACTS and (row["impact"] != "Holiday" or row["country"] == "USD"):
            utc = instant.astimezone(UTC)
            url = links.get((row["country"], row["title"], utc)) or links.get((row["country"], row["title"], utc.strftime("%m-%d-%Y"))) or ""
            events.append({key: row[key] for key in ("title", "country", "date", "impact", "forecast", "previous")} | {"url": url})
    if not in_week:
        raise ValueError("Forex Factory : flux hors de la semaine en cours")
    return start.isoformat(), end.isoformat(), events


# ---------- Règles de publication ----------
def rule_events(start: date, end: date, wasde: list[date], nopa: list[date], mpob: tuple[date, date] | None) -> list[dict]:
    out = []
    holidays = set().union(*(us_holidays(y) for y in range(start.year, end.year + 1)))
    # FAS : chaque jeudi à 8 h 30 ET, le vendredi quand un jour férié tombe plus tôt dans la semaine.
    for thursday in weekdays(start, end, 3):
        monday = thursday - timedelta(days=3)
        day = thursday + timedelta(days=1) if any(monday + timedelta(days=i) in holidays for i in range(4)) else thursday
        out.append(event("fas-export-sales", day, EXPORT_SALES_URL, "rule", at_time(day, 8, 30, EASTERN),
                         "Semaine close le " + (thursday - timedelta(days=7)).strftime("%d/%m")))
    # Inspections à l’exportation (AMS) : lundi 11 h ET, mardi après un lundi férié.
    for monday in weekdays(start, end, 0):
        day = monday + timedelta(days=1) if monday in holidays else monday
        out.append(event("usda-inspections", day, INSPECTIONS_URL, "usual", at_time(day, 11, 0, EASTERN),
                         "Semaine close le " + (monday - timedelta(days=4)).strftime("%d/%m")))
    # FAS Oilseeds: World Markets and Trade : publié à 12 h 15 ET le jour du WASDE.
    for day in wasde:
        if start <= day <= end:
            out.append(event("fas-oilseeds", day, OILSEEDS_WMT_URL, "rule", at_time(day, 12, 15, EASTERN), month_label(day)))
    # NOPA : le 15 (ou jour ouvré suivant) à midi ET, quand le calendrier PDF de l’année n’est pas encore lu.
    known = {d.strftime("%Y-%m") for d in nopa}
    month = start.replace(day=1)
    while month <= end:
        if month.strftime("%Y-%m") not in known:
            day = us_business_day(month.replace(day=15))
            if start <= day <= end:
                out.append(event("nopa", day, NOPA_URL, "rule", at_time(day, 12, 0, EASTERN), month_label(previous_month(day))))
        month = (month + timedelta(days=32)).replace(day=1)
    # MPOB : le 10 à 12 h 30 (heure de Kuala Lumpur), lundi si le 10 tombe un week-end ; date officielle quand elle est annoncée.
    month = start.replace(day=1)
    while month <= end:
        day = month.replace(day=10)
        day += timedelta(days=(7 - day.weekday()) % 7 if day.weekday() >= 5 else 0)
        if mpob and month_label(mpob[0]) == month_label(day):
            day, status = mpob[0], "official"
        else:
            status = "rule"
        if start <= day <= end:
            out.append(event("mpob", day, MPOB_URL, status, at_time(day, 12, 30, KUALA_LUMPUR), month_label(previous_month(day))))
        month = (month + timedelta(days=32)).replace(day=1)
    # CONAB : progrès des semis et récoltes chaque lundi à 19 h (Brasília), annoncé dans le calendrier officiel.
    for monday in weekdays(start, end, 0):
        out.append(event("conab-progress", monday, CONAB_PROGRESS_URL, "rule", at_time(monday, 19, 0, BRASILIA)))
    # SEA India : importations du mois précédent, publiées vers le milieu du mois (aucun calendrier officiel).
    month = start.replace(day=1)
    while month <= end:
        day = month.replace(day=13)
        day += timedelta(days=(7 - day.weekday()) % 7 if day.weekday() >= 5 else 0)
        if start <= day <= end:
            out.append(event("sea", day, SEA_URL, "usual", None, month_label(previous_month(day))))
        month = (month + timedelta(days=32)).replace(day=1)
    # Bolsa de Cereales de Buenos Aires : Panorama Agrícola Semanal, chaque jeudi.
    for thursday in weekdays(start, end, 3):
        out.append(event("bcba", thursday, BCBA_URL, "usual"))
    return out


def anec_next(latest: dict, today: date) -> list[dict]:
    """Relevé ANEC suivant, attendu une semaine après le dernier (publication sans calendrier)."""
    day = date.fromisoformat(latest["date"]) + timedelta(days=7)
    while day < today:
        day += timedelta(days=7)
    return [event("anec", day, ANEC_URL, "usual")]
