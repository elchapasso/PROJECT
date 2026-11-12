"""Tests des lecteurs de prix et des contrôles : python3 -m unittest discover -s tests -p 'test_*.py'"""
import sys
import unittest
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import prices_lib as lib  # noqa: E402

MONTHS = "".join(f"<th>{m}</th>" for m in ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])
MPOB_HTML = (
    '<table><tr bgcolor="#99CC99"><td><div align="center">Date</div></td>'
    + "".join(f'<td><div align="center">{m}</div></td>' for m in ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])
    + "</tr>"
    + '<tr><td><div align="center">10</div></td><td>NT</td><td>4,082.00</td><td>4,332.50</td><td>4,570.50</td><td>4,519.50</td><td>4,493.00</td>'
      '<td>NT</td><td>4,539.00</td><td>4,594.00</td><td><font color="#FF0000">PH</font></td><td>3,985.00</td><td>-</td></tr>'
    + '<tr><td><div align="center">11</div></td><td>PH</td><td>4,062.50</td><td>4,336.50</td><td>NT</td><td>4,519.50</td><td>4,493.00</td>'
      '<td>NT</td><td>4,539.00</td><td>4,594.00</td><td>PH</td><td>4,096.00<font color=red>**</font></td><td>-</td></tr>'
    + '<tr><td><div align="center">31</div></td><td>NT</td><td></td><td>4,700.00</td><td></td><td>PH</td><td></td><td>NT</td><td>PH</td><td></td><td>NT</td><td></td><td>-</td></tr>'
    + '<tr><td>Average</td><td>4,018.50</td>' + "<td></td>" * 11 + "</tr></table>"
)
IPOSS_HTML = (
    '<table class="hd-tabel"><thead><tr><th style="text-align:left">Date</th><th style="text-align:right">Location</th>'
    '<th style="text-align:right">Price (USD/ton)</th></tr></thead><tbody>'
    '<tr><td>12 November 2026</td><td>Port Belawan</td><td>1,112</td></tr>'
    '<tr><td>11 November 2026</td><td>Port Belawan</td><td>1,102</td></tr>'
    '<tr><td>11 November 2026</td><td>Port Klang</td><td>1,024</td></tr>'
    '<tr><td>10 November 2026</td><td>Port Klang</td><td>982</td></tr>'
    '<tr><td>10 November 2026</td><td>Port Belawan</td><td>1,090</td></tr></tbody></table>'
)
MAGYP = {"posts": [
    {"fecha": "2026-11-11 00:00:00.000", "circular": "2098", "posicion": "15071000100Q", "precio": 1195, "mesDesde": 11, "añoDesde": 2026, "mesHasta": 11, "añoHasta": 2026},
    {"fecha": "2026-11-11 00:00:00.000", "circular": "2098", "posicion": "15071000100Q", "precio": 1192, "mesDesde": 12, "añoDesde": 2026, "mesHasta": 12, "añoHasta": 2026},
    {"fecha": "2026-11-11 00:00:00.000", "circular": "2098", "posicion": "15121110310E", "precio": 1316, "mesDesde": 11, "añoDesde": 2026, "mesHasta": 12, "añoHasta": 2026},
    {"fecha": "2026-11-11 00:00:00.000", "circular": "2098", "posicion": "23040010100B", "precio": 380, "mesDesde": 11, "añoDesde": 2026, "mesHasta": 11, "añoHasta": 2026},
    {"fecha": "2026-11-11 00:00:00.000", "circular": "2098", "posicion": "23040010100B", "precio": 381, "mesDesde": 10, "añoDesde": 2026, "mesHasta": 11, "añoHasta": 2026},
    {"fecha": "2026-11-10 00:00:00.000", "circular": "2097", "posicion": "12019000190C", "precio": 470, "mesDesde": 11, "añoDesde": 2026, "mesHasta": 11, "añoHasta": 2026},
]}


class Parsers(unittest.TestCase):
    def test_magyp_keeps_the_unique_position_covering_the_month(self):
        rows = lib.arg_rows(MAGYP, date(2026, 11, 11))
        self.assertEqual(rows["arSoyOil"], ["2026-11-11", 1195])
        self.assertEqual(rows["arSunOil"], ["2026-11-11", 1316])
        self.assertNotIn("arSoyMeal", rows)  # deux prix couvrent novembre : ambigu, écarté
        self.assertNotIn("arSoySeed", rows)  # bulletin d’une autre date
        self.assertEqual(lib.arg_rows([], date(2026, 11, 12)), {})
        with self.assertRaises(lib.SourceError):
            lib.arg_rows({"error": "x"}, date(2026, 11, 12))

    def test_mpob_keeps_final_prices_only(self):
        rows = dict(lib.mpob_rows(MPOB_HTML, 2026)["mpobCpo"])
        self.assertEqual(rows["2026-11-10"], 3985)
        self.assertEqual(rows["2026-02-10"], 4082)
        self.assertEqual(rows["2026-03-10"], 4332.5)
        self.assertNotIn("2026-11-11", rows)  # prix de 8 h 30 marqué **
        self.assertNotIn("2026-01-10", rows)  # NT
        self.assertNotIn("2026-10-10", rows)  # PH
        self.assertEqual(rows["2026-03-31"], 4700)
        self.assertNotIn("2026-01-31", [d for d in rows if d.startswith("2026-01-3")])
        with self.assertRaises(lib.SourceError):
            lib.mpob_rows("<table><tr><td>Date</td></tr></table>", 2026)

    def test_mpob_rejects_a_price_on_an_impossible_date(self):
        broken = MPOB_HTML.replace("<td></td><td>4,700.00</td>", "<td>4,000.00</td><td>4,700.00</td>", 1)
        with self.assertRaises(lib.SourceError):
            lib.mpob_rows(broken, 2026)

    def test_iposs_splits_ports(self):
        rows = lib.iposs_rows(IPOSS_HTML)
        self.assertEqual(rows["idPalmFob"], [["2026-11-10", 1090], ["2026-11-11", 1102], ["2026-11-12", 1112]])
        self.assertEqual(rows["myPalmFob"], [["2026-11-10", 982], ["2026-11-11", 1024]])
        with self.assertRaises(lib.SourceError):
            lib.iposs_rows(IPOSS_HTML.replace("Price (USD/ton)", "Price (IDR/kg)"))

    def test_ecb_and_fred(self):
        ecb = "KEY,FREQ,TIME_PERIOD,OBS_VALUE\nEXR.D.USD,D,2026-11-06,1.1165\nEXR.D.USD,D,2026-11-09,1.1193\n"
        self.assertEqual(lib.ecb_rows(ecb, date(2026, 11, 7), date(2026, 11, 30)), [["2026-11-09", 1.1193]])
        fred = "observation_date,PSOILUSDM\n2026-08-01,1577.0855844947939\n2026-09-01,1596.4914126535659\n2026-10-01,.\n"
        self.assertEqual(lib.fred_rows(fred, date(2015, 1, 1), 2), [["2026-08-01", 1577.09], ["2026-09-01", 1596.49]])
        with self.assertRaises(lib.SourceError):
            lib.fred_rows("<html>error</html>", date(2015, 1, 1), 2)

    def test_anp_reads_the_brasil_column_and_week_end(self):
        rows = [["Produto", "Período", "", "Região", "", "", "", "", "Brasil", ""],
                ["", "(A partir de 2013)", "", "Norte", "Nordeste", "Centro-Oeste", "Sul", "Sudeste", "", ""],
                ["Asfalto", 46000, 46006, 1.2, 1.2, "***", 1.2, 1.2, 1.29, ""],
                ["Biodiesel B-100 (R$/litro)", 46321, 46327, 5.6, 5.5, 5.4, 5.45, 5.5, 5.494161, ""],
                ["Biodiesel B-100 (R$/litro)", 46328, 46334, "***", "***", "***", "***", "***", "***", ""]]
        from datetime import timedelta
        to_date = lambda v: date(1899, 12, 30) + timedelta(days=int(v))
        self.assertEqual(lib.anp_rows(rows, to_date), {"b100": [["2026-11-01", 5.49416]]})


class Checks(unittest.TestCase):
    def test_merge_reports_additions_and_revisions(self):
        merged, added, revised, kept = lib.merge_series([["2026-11-10", 1090, "https://x"], ["2026-11-11", 1100]],
                                                        [["2026-11-10", 1090], ["2026-11-11", 1102], ["2026-11-12", 1112]], "idPalmFob")
        self.assertEqual(merged, [["2026-11-10", 1090, "https://x"], ["2026-11-11", 1102], ["2026-11-12", 1112]])
        self.assertEqual((added, revised, kept), ([["2026-11-12", 1112]], [["2026-11-11", 1100, 1102]], 1))

    def test_bounds_and_order(self):
        self.assertEqual(lib.check_series("eurUsd", [["2026-11-10", 1.12], ["2026-11-11", 1.11]]), [])
        self.assertTrue(lib.check_series("eurUsd", [["2026-11-11", 1.12], ["2026-11-10", 1.11]]))
        self.assertTrue(lib.check_series("eurUsd", [["2026-11-11", 11.2]]))

    def test_an_isolated_jump_is_held_then_published_once_confirmed(self):
        today = date(2026, 11, 13)
        base = [["2026-11-10", 1090], ["2026-11-11", 1102]]
        rows = base + [["2026-11-12", 1400]]
        published, held, confirmed = lib.screen_new_points("idPalmFob", rows, {"2026-11-12"}, [], today)
        self.assertEqual(published, base)
        self.assertEqual(held[0]["date"], "2026-11-12")
        self.assertEqual(held[0]["previous"], 1102)
        # Le lendemain, la source confirme le nouveau niveau.
        rows = base + [["2026-11-12", 1400], ["2026-11-13", 1410]]
        published, held2, confirmed = lib.screen_new_points("idPalmFob", rows, {"2026-11-12", "2026-11-13"}, held, today)
        self.assertEqual(published[-2:], [["2026-11-12", 1400], ["2026-11-13", 1410]])
        self.assertEqual((held2, confirmed), ([], ["2026-11-12"]))

    def test_an_outlier_stays_held_when_the_next_price_returns_to_the_trend(self):
        rows = [["2026-11-10", 1090], ["2026-11-11", 1102], ["2026-11-12", 11120], ["2026-11-13", 1110]]
        published, held, _ = lib.screen_new_points("idPalmFob", rows, {"2026-11-12", "2026-11-13"}, [], date(2026, 11, 13))
        self.assertEqual([r[0] for r in published], ["2026-11-10", "2026-11-11", "2026-11-13"])
        self.assertEqual([h["date"] for h in held], ["2026-11-12"])

    def test_normal_moves_and_existing_values_are_never_held(self):
        rows = [["2026-11-06", 1.1165], ["2026-11-09", 1.1193], ["2026-11-10", 1.1214]]
        published, held, _ = lib.screen_new_points("eurUsd", rows, {"2026-11-10"}, [], date(2026, 11, 10))
        self.assertEqual((len(published), held), (3, []))
        rows = [["2026-11-06", 1.1], ["2026-11-09", 1.5]]
        published, held, _ = lib.screen_new_points("eurUsd", rows, set(), [], date(2026, 11, 10))
        self.assertEqual(len(published), 2)

    def test_business_days(self):
        self.assertEqual([d.isoformat() for d in lib.business_days(date(2026, 11, 13), date(2026, 11, 16))], ["2026-11-13", "2026-11-16"])


if __name__ == "__main__":
    unittest.main()
