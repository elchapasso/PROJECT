"""Refresh public calendar data without changing the published site files."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

FOREX_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
NASS_ROOT = "https://www.nass.usda.gov"
EASTERN = ZoneInfo("America/New_York")


def get(url):
    request = Request(url, headers={"User-Agent": "OleaTerminal-Calendar/1.0"})
    with urlopen(request, timeout=25) as response:
        return response.read().decode("utf-8")


class NASSCalendar(HTMLParser):
    def __init__(self, month):
        super().__init__()
        self.month = month
        self.days = set()
        self.events = []
        self.day = ""
        self.in_cell = False
        self.item = False
        self.release = ""
        self.in_link = False
        self.link_text = []
        self.item_text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "td":
            self.in_cell = True
            self.day = ""
        elif self.in_cell and tag == "time" and "nass-release-month-calendar__date" in attrs.get("class", "").split():
            self.day = attrs["datetime"]
            if self.day.startswith(self.month + "-"):
                self.days.add(self.day)
        elif self.in_cell and tag == "li":
            self.item = True
            self.release = ""
            self.link_text = []
            self.item_text = []
        elif self.item and tag == "a":
            self.in_link = True
            self.release = attrs.get("href", "")

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
            if self.day in self.days and "".join(self.link_text).strip() == "Crop Progress":
                match = re.search(r"(\d{1,2}:\d{2}\s+[AP]M)\s+ET\b", " ".join(self.item_text))
                if not match or not self.release.startswith("/data-and-statistics/calendar/release/"):
                    raise ValueError(f"Invalid NASS release on {self.day}")
                time = datetime.strptime(match[1], "%I:%M %p").time()
                instant = datetime.combine(date.fromisoformat(self.day), time, EASTERN)
                self.events.append({"date": instant.isoformat(), "url": urljoin(NASS_ROOT, self.release)})
        elif tag == "td":
            self.in_cell = False


def nass_month(month):
    url = f"{NASS_ROOT}/publications/calendar/reports-by-date?month={month.month}&view=l&year={month.year}"
    parser = NASSCalendar(month.strftime("%Y-%m"))
    parser.feed(get(url))
    parser.close()
    if len(parser.days) < 20:
        raise ValueError(f"NASS month missing from source: {month:%Y-%m}")
    return parser.events


def forex_week(today):
    data = json.loads(get(FOREX_URL))
    start = today - timedelta(days=(today.weekday() + 1) % 7)
    end = start + timedelta(days=6)
    if not isinstance(data, list) or not data:
        raise ValueError("Forex Factory feed empty")
    events = []
    in_week = 0
    for row in data:
        instant = datetime.fromisoformat(row["date"])
        if instant.utcoffset() is None:
            raise ValueError("Forex Factory timestamp has no offset")
        day = instant.astimezone(EASTERN).date()
        if not start <= day <= end:
            continue
        in_week += 1
        if row["impact"] == "High" and row["country"] in {"USD", "EUR"}:
            events.append({key: row[key] for key in ("title", "country", "date", "forecast", "previous")})
    if not in_week:
        raise ValueError("Forex Factory feed is outside the current week")
    return start.isoformat(), end.isoformat(), events


def update(current, today, now):
    first = today.replace(day=1)
    next_month = (first + timedelta(days=32)).replace(day=1)
    previous_month = (first - timedelta(days=1)).replace(day=1)
    cutoff = (today - timedelta(days=100)).isoformat()
    forex = [row for row in current.get("forex", []) if row["date"][:10] >= cutoff]
    nass = [row for row in current.get("nass", []) if row["date"][:10] >= cutoff]
    result = dict(current)
    errors = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        forex_job = executor.submit(forex_week, today)
        nass_jobs = {month: executor.submit(nass_month, month) for month in (previous_month, first, next_month)}
        try:
            start, end, events = forex_job.result()
            forex = [row for row in forex if not start <= row["date"][:10] <= end] + events
            result.update(forexWeekStart=start, forexWeekEnd=end, forexCheckedAt=now)
        except (OSError, ValueError, KeyError, TypeError) as error:
            errors.append(f"Forex Factory: {error}")
        for month, job in nass_jobs.items():
            key = month.strftime("%Y-%m")
            try:
                events = job.result()
                nass = [row for row in nass if row["date"][:7] != key] + events
            except (OSError, ValueError, KeyError, TypeError) as error:
                errors.append(f"NASS {key}: {error}")
    result["forex"] = sorted({(r["date"], r["country"], r["title"]): r for r in forex}.values(), key=lambda r: r["date"])
    result["nass"] = sorted({r["date"]: r for r in nass}.values(), key=lambda r: r["date"])
    return result, errors


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("snapshot", type=Path)
    args = cli.parse_args()
    previous = json.loads(args.snapshot.read_text()) if args.snapshot.exists() else {}
    now = datetime.now(timezone.utc)
    result, errors = update(previous, now.astimezone(EASTERN).date(), now.isoformat(timespec="seconds"))
    for error in errors:
        print(error)
    if not result.get("forexWeekStart") or not result["nass"] and not previous:
        raise SystemExit("Calendar sources did not produce a usable initial snapshot")
    args.snapshot.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
