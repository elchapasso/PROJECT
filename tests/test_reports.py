"""Tests des dernières publications (Rapports & publications) : python3 -m unittest discover -s tests -p 'test_*.py'"""
import importlib.util
import io
import json
import sys
import unittest
import zipfile
from datetime import date
from pathlib import Path
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import reports_lib as rep  # noqa: E402

FIXTURES = ROOT / "tests" / "fixtures" / "reports"
spec = importlib.util.spec_from_file_location("update_calendar_reports", ROOT / "scripts" / "update-calendar.py")
update_calendar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(update_calendar)


def fixture(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


def conab_xlsx():
    """Tableur minimal au format de la CONAB (feuille Produção_Brasil)."""
    strings = ["PRODUTO", "out/2026           (b)", "nov/2026           (c)", "SOJA", "GIRASSOL"]
    sheet = ('<worksheet><sheetData>'
             '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>1</v></c><c r="C1" t="s"><v>1</v></c><c r="D1" t="s"><v>2</v></c></row>'
             '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>180406.6</v></c><c r="C2"><v>181000</v></c><c r="D2"><v>181616.6</v></c></row>'
             '<row r="3"><c r="A3" t="s"><v>4</v></c><c r="B3"><v>97.5</v></c><c r="C3"><v>96.5</v></c><c r="D3"><v>96.5</v></c></row>'
             '</sheetData></worksheet>')
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as book:
        book.writestr("xl/workbook.xml", '<workbook><sheets><sheet name="Principal" sheetId="1" r:id="rId1"/><sheet name="Produção_Brasil" sheetId="2" r:id="rId2"/></sheets></workbook>')
        book.writestr("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>')
        book.writestr("xl/sharedStrings.xml", "<sst>" + "".join(f"<si><t>{s}</t></si>" for s in strings) + "</sst>")
        book.writestr("xl/worksheets/sheet1.xml", "<worksheet><sheetData/></worksheet>")
        book.writestr("xl/worksheets/sheet2.xml", sheet)
    return out.getvalue()


class Readers(unittest.TestCase):
    def test_esmis_latest_release_files(self):
        releases = rep.esmis_releases(fixture("esmis-fats-oils.html"))
        self.assertEqual(releases[0]["date"], "2026-11-02")
        self.assertTrue(releases[0]["files"]["txt"].endswith("/796132/cafo1126.txt"))
        self.assertEqual([d["label"] for d in rep.documents(releases[0]["files"])], ["PDF", "Texte", "Tableaux (zip)"])

    def test_wasde_us_soy_complex(self):
        season, figures = rep.wasde_figures(fixture("wasde-soybeans.txt"))
        self.assertEqual(season, "2026/27")
        values = {f["label"]: (f["value"], f.get("previous")) for f in figures}
        self.assertEqual(values["Soja US · stocks finaux 2026/27"], (300, 315))
        self.assertEqual(values["Huile de soja US · stocks finaux 2026/27"], (1698, 1797))
        self.assertEqual(values["Huile de soja US · biocarburants 2026/27"], (17800, 17800))
        self.assertEqual(figures[0]["previousLabel"], "WASDE Oct")

    def test_crop_progress_latest_stage(self):
        text = fixture("crop-progress.txt")
        self.assertEqual(rep.released_on(text), "2026-11-09")
        self.assertEqual(rep.crop_progress_figures(text), [rep.figure("Soja récolté", 92, "%", 88, "semaine précédente", "moyenne 5 ans 91 %")])

    def test_nass_highlights(self):
        crush = rep.fats_oils_figures(fixture("cafo.txt"))
        self.assertEqual((crush[0]["label"], crush[0]["value"], crush[0]["previous"]), ("Soja trituré · septembre 2026", 5.96, 6.29))
        production = rep.crop_production_figures(fixture("crop.txt"))
        self.assertEqual([f["value"] for f in production], [4570, 53.3])
        self.assertEqual(rep.grain_stocks_figures(fixture("grst.txt"))[0]["value"], 315)
        self.assertEqual(rep.acreage_figures(fixture("acrg.txt"))[0]["label"], "Soja US · surfaces semées 2026")
        self.assertEqual(rep.crop_production_figures("Corn production is forecast at 15 billion bushels."), [])

    def test_inspections(self):
        row = rep.inspections(fixture("inspections.txt"))
        self.assertEqual(row["date"], "2026-11-09")
        self.assertEqual(row["figures"][0]["value"], 1896.151)
        self.assertEqual(row["figures"][0]["previous"], 2511.973)

    def test_export_sales_latest_week(self):
        dates = json.loads(fixture("esr-dates.json"))
        soy = json.loads(fixture("esr-soybeans.json"))
        self.assertEqual(rep.esr_market_year(dates, 801), 2027)
        row = rep.esr_latest(dates, {801: soy, 901: soy, 902: soy})
        self.assertEqual(row["date"], "2026-11-13")
        self.assertEqual(row["title"], "Semaine close le 05/11")
        self.assertEqual(len(row["figures"]), 3)

    def test_conab_latest_survey_and_soy(self):
        page = rep.conab_latest(fixture("conab-bulletins.html"))
        self.assertEqual(page["title"], "2e relevé · récolte 2026/27")
        self.assertTrue(page["xlsx"].endswith(".xlsx"))
        figures = rep.conab_figures(conab_xlsx())
        self.assertEqual(len(figures), 1)
        self.assertEqual((figures[0]["value"], figures[0]["previous"]), (181.6166, 181.0))
        self.assertEqual(figures[0]["previousLabel"], "relevé de octobre 2026")

    def test_sea_latest_circular(self):
        row = rep.sea_latest(fixture("sea-feed.xml"), fixture("sea-post.html"))
        self.assertEqual(row["date"], "2026-10-15")
        self.assertTrue(row["documents"][0]["url"].endswith(".pdf"))

    def test_cot_latest_positions(self):
        dataset = {"fields": ["oi", "mmL", "mmS"], "markets": {
            "soybean-oil": {"rows": [["2026-10-27", 1, 100, 40], ["2026-11-03", 1, 90, 20]]},
            "soybeans": {"rows": [["2026-10-27", 1, 50, 60], ["2026-11-03", 1, 70, 60]]}}}
        row = rep.cot_latest(dataset)
        self.assertEqual(row["asOf"], "2026-11-03")
        self.assertEqual([(f["value"], f["previous"]) for f in row["figures"]], [(70, 60), (10, -10)])
        self.assertEqual(update_calendar.cot_release(date(2026, 11, 3)), date(2026, 11, 6))
        self.assertEqual(update_calendar.cot_release(date(2026, 11, 10)), date(2026, 11, 16))  # Veterans Day


class Latest(unittest.TestCase):
    def test_failed_sources_keep_previous_reading(self):
        known = {"sea": {"date": "2026-10-15", "title": "x", "url": "https://seaofindia.com/", "documents": [], "figures": []}}

        def fetch(url, binary=False):
            raise HTTPError(url, 503, "indisponible", None, None)

        latest, errors = update_calendar.update_latest(known, date(2026, 11, 14), fetch, [])
        self.assertEqual(latest, known)
        self.assertTrue(errors and all(e.startswith("Rapports · ") for e in errors))


if __name__ == "__main__":
    unittest.main()
