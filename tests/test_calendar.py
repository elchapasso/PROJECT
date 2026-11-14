"""Tests du calendrier des publications : python3 -m unittest discover -s tests -p 'test_*.py'"""
import importlib.util
import json
import sys
import unittest
from datetime import date
from pathlib import Path
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import calendar_lib as lib  # noqa: E402

FIXTURES = ROOT / "tests" / "fixtures" / "calendar"
spec = importlib.util.spec_from_file_location("update_calendar", ROOT / "scripts" / "update-calendar.py")
update_calendar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(update_calendar)


def fixture(name, binary=False):
    path = FIXTURES / name
    return path.read_bytes() if binary else path.read_text(encoding="utf-8")


class Parsers(unittest.TestCase):
    def test_wasde_dates_for_two_years(self):
        dates = lib.wasde_dates(fixture("wasde.html"))
        self.assertEqual(len(dates), 24)
        self.assertIn(date(2026, 12, 10), dates)
        self.assertIn(date(2027, 7, 9), dates)
        self.assertEqual(dates[-1], date(2027, 12, 10))

    def test_wasde_requires_a_full_year(self):
        with self.assertRaises(ValueError):
            lib.wasde_dates("<p>In 2027 the WASDE report will be released on Jan. 12.</p>")

    def test_nass_keeps_only_followed_reports(self):
        rows = lib.nass_month(fixture("nass-2026-11.html"), date(2026, 11, 1))
        kinds = {r["kind"] for r in rows}
        self.assertTrue(kinds <= set(lib.NASS_REPORTS.values()))
        progress = [r for r in rows if r["kind"] == "nass-progress"]
        self.assertTrue(progress)
        self.assertEqual(progress[0]["at"][11:], "16:00:00-05:00")
        self.assertTrue(all(r["url"].startswith("https://www.nass.usda.gov/data-and-statistics/calendar/release/") for r in rows))
        fats = [r for r in rows if r["kind"] == "nass-fats-oils"]
        self.assertEqual(fats[0]["date"], "2026-11-02")

    def test_nass_rejects_a_missing_month(self):
        with self.assertRaises(ValueError):
            lib.nass_month(fixture("nass-2026-11.html"), date(2026, 12, 1))

    def test_nopa_release_dates(self):
        dates = lib.nopa_dates(fixture("nopa-2026.txt"))
        self.assertEqual(len(dates), 12)
        self.assertIn(date(2026, 11, 16), dates)
        self.assertIn(date(2026, 12, 15), dates)

    def test_nopa_pdf_link(self):
        html = '<p>dates listed <a href="https://www.nopa.org/wp-content/uploads/2026/02/NOPA-ONLY-Crush-Reporting-Release-Dates-2026-FINAL.pdf">HERE</a></p>'
        self.assertTrue(lib.nopa_pdf_url(html).endswith("Release-Dates-2026-FINAL.pdf"))

    def test_mpob_next_release(self):
        release, period = lib.mpob_next(fixture("mpob.html"))
        self.assertEqual((release, period), (date(2026, 12, 10), date(2026, 11, 1)))

    def test_conab_grain_survey_dates(self):
        rows = lib.conab_grain_dates(fixture("conab-2026.txt"))
        self.assertIn((date(2026, 12, 15), "3e relevé · récolte 2026/27"), rows)
        self.assertIn((date(2027, 1, 14), "4e relevé · récolte 2026/27"), rows)
        self.assertNotIn(date(2026, 11, 18), [d for d, _ in rows])  # date Prohort exclue
        self.assertEqual(len(rows), 13)

    def test_anec_latest_weekly_release(self):
        row = lib.anec_latest(fixture("anec.html"))
        self.assertEqual(row["date"], "2026-11-05")
        self.assertEqual(row["url"], "https://anec.com.br/article/anec-exportacoes-acumuladas-432026")
        self.assertEqual(row["period"], "Semaine 43/2026")

    def test_forex_week_with_event_links(self):
        start, end, events = lib.forex_week(fixture("ff-week.json"), fixture("ff-week.xml", binary=True), date(2026, 11, 13))
        self.assertEqual((start, end), ("2026-11-08", "2026-11-14"))
        self.assertTrue(events)
        self.assertTrue(all(e["country"] in lib.FOREX_COUNTRIES and e["impact"] in lib.FOREX_IMPACTS for e in events))
        cpi = next(e for e in events if e["title"] == "CPI m/m" and e["country"] == "USD")
        self.assertTrue(cpi["url"].startswith("https://www.forexfactory.com/calendar/"))


class Rules(unittest.TestCase):
    def test_us_holidays(self):
        days = lib.us_holidays(2026)
        self.assertIn(date(2026, 11, 26), days)  # Thanksgiving
        self.assertIn(date(2026, 11, 11), days)  # Veterans Day
        self.assertIn(date(2026, 7, 3), days)  # 4 juillet observé un vendredi
        self.assertEqual(lib.us_business_day(date(2026, 11, 15)), date(2026, 11, 16))

    def test_export_sales_shift_after_holiday(self):
        rows = [r for r in lib.rule_events(date(2026, 11, 1), date(2027, 1, 31), [], [], None) if r["kind"] == "fas-export-sales"]
        days = [r["date"] for r in rows]
        self.assertIn("2026-11-13", days)  # Veterans Day le mercredi → vendredi
        self.assertIn("2026-11-27", days)  # Thanksgiving → vendredi
        self.assertIn("2026-12-03", days)
        self.assertIn("2027-01-22", days)  # Martin Luther King le lundi → vendredi
        self.assertTrue(all(r["at"].endswith("08:30:00-05:00") for r in rows))

    def test_mpob_rule_and_official_date(self):
        rows = [r for r in lib.rule_events(date(2026, 11, 1), date(2027, 2, 28), [], [], (date(2026, 12, 10), None)) if r["kind"] == "mpob"]
        self.assertEqual([(r["date"], r["status"]) for r in rows],
                         [("2026-11-10", "rule"), ("2026-12-10", "official"), ("2027-01-11", "rule"), ("2027-02-10", "rule")])

    def test_nopa_rule_only_without_official_calendar(self):
        rows = [r for r in lib.rule_events(date(2026, 11, 1), date(2027, 2, 28), [], [date(2026, 11, 16), date(2026, 12, 15)], None) if r["kind"] == "nopa"]
        self.assertEqual([r["date"] for r in rows], ["2027-01-15", "2027-02-16"])  # 15 février 2027 : Presidents Day


class Update(unittest.TestCase):
    def fetcher(self):
        files = {
            lib.FOREX_JSON: "ff-week.json", lib.FOREX_XML: "ff-week.xml", lib.WASDE_URL: "wasde.html", lib.MPOB_URL: "mpob.html",
            lib.ANEC_URL: "anec.html", lib.nass_url(date(2026, 11, 1)): "nass-2026-11.html",
        }

        def fetch(url, binary=False):
            if url not in files:
                raise HTTPError(url, 404, "absent", None, None)
            return fixture(files[url], binary)
        return fetch

    def test_update_keeps_sources_independent(self):
        result, errors = update_calendar.update({}, date(2026, 11, 13), "2026-11-13T12:00:00+00:00", self.fetcher())
        self.assertTrue(any(e.startswith("NASS") for e in errors))  # mois voisins absents des données de test
        self.assertTrue(any(e.startswith("NOPA") for e in errors))
        kinds = {r["kind"] for r in result["reports"]}
        self.assertTrue({"wasde", "mpob", "anec", "fas-export-sales", "nopa", "sea", "conab-progress"} <= kinds)
        ids = [r["id"] for r in result["reports"]]
        self.assertEqual(len(ids), len(set(ids)))
        mpob = [r for r in result["reports"] if r["kind"] == "mpob" and r["period"] == "2026-11"]
        self.assertEqual([(r["date"], r["status"]) for r in mpob], [("2026-12-10", "official")])
        self.assertEqual(result["forexWeekStart"], "2026-11-08")
        json.dumps(result)

    def test_failed_source_keeps_known_dates(self):
        known = {"reports": [{"id": "conab-2026-12-15", "kind": "conab", "date": "2026-12-15", "at": "", "url": lib.CONAB_GRAINS_URL,
                              "status": "official", "period": "3e relevé · récolte 2026/27"}]}
        result, errors = update_calendar.update(known, date(2026, 11, 13), "2026-11-13T12:00:00+00:00", self.fetcher())
        self.assertTrue(any(e.startswith("CONAB") for e in errors))
        self.assertIn("conab-2026-12-15", [r["id"] for r in result["reports"]])


if __name__ == "__main__":
    unittest.main()
