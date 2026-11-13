"""Tests du contrôle des relevés TradingView : python3 -m unittest discover -s tests -p 'test_*.py'"""
import copy
import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import futures_lib as futures  # noqa: E402

TODAY = date(2026, 11, 13)
DAYS = [20261106, 20261109, 20261110, 20261111, 20261112]
CLOSES = {
    "zl": [62.26, 62.03, 62.77, 63.88, 63.42], "zs": [1188.25, 1228, 1230.75, 1219, 1235], "zm": [319.2, 320.7, 326.5, 329.7, 325.4],
    "ho": [4.3317, 4.2148, 4.1309, 4.2113, 4.1888], "gasoil": [1364.5, 1333.5, 1280.75, 1341.25, 1249.75],
}
FCPO_DAYS, FCPO = [20261106, 20261110, 20261111, 20261112], [4258, 4256, 4410, 4440]


def iso(day):
    return f"{day // 10000}-{day // 100 % 100:02d}-{day % 100:02d}"


def check(days, values):
    return list(futures.checksum([[iso(d), v] for d, v in zip(days, values)]))


def report():
    return {
        "from": 20261106, "to": 20261112,
        "cbot": {"d": DAYS, "zl": CLOSES["zl"], "zs": CLOSES["zs"], "zm": CLOSES["zm"]},
        "ho": {"d": DAYS, "c": CLOSES["ho"]}, "gasoil": {"d": DAYS, "c": CLOSES["gasoil"]}, "fcpo": {"d": FCPO_DAYS, "c": FCPO},
        "checks": {**{k: check(DAYS, v) for k, v in CLOSES.items()}, "fcpo": check(FCPO_DAYS, FCPO)},
    }


def published(until=3):
    state = {k: [[iso(d), v] for d, v in zip(DAYS[:until], values[:until])] for k, values in CLOSES.items()}
    state["fcpo"] = [[iso(d), v] for d, v in zip(FCPO_DAYS[:2], FCPO[:2])]
    return state


class FuturesTest(unittest.TestCase):
    def test_checksum_weights_each_close_by_its_date(self):
        self.assertEqual(futures.checksum([["2026-11-06", 10], ["2026-11-09", 20]]), (2, 30, 10 * 6 + 20 * 9, 30 * 11))

    def test_a_verified_reading_extends_the_history(self):
        final, status, held, problems = futures.evaluate(report(), published(), [], TODAY)
        self.assertEqual(problems, [])
        self.assertEqual(held, [])
        self.assertEqual(final["zl"][-1], ["2026-11-12", 63.42])
        self.assertEqual(status["zl"]["added"], [["2026-11-11", 63.88], ["2026-11-12", 63.42]])
        self.assertEqual([status[k]["status"] for k in futures.SERIES], ["ok"] * 6)
        self.assertEqual(final["fcpo"], [[iso(d), v] for d, v in zip(FCPO_DAYS, FCPO)])

    def test_a_copy_error_is_rejected_and_other_contracts_are_published(self):
        bad = report()
        bad["cbot"]["zl"] = [62.26, 62.03, 62.77, 63.88, 63.24]  # 63.42 recopié 63.24
        final, status, _, problems = futures.evaluate(bad, published(), [], TODAY)
        self.assertEqual(status["zl"]["status"], "error")
        self.assertIn("somme de contrôle", status["zl"]["message"])
        self.assertEqual(final["zl"], published()["zl"])
        self.assertEqual(status["ho"]["status"], "ok")
        self.assertEqual(len(problems), 1)

    def test_a_close_filed_under_the_wrong_date_is_rejected(self):
        bad = report()
        bad["ho"]["d"] = [20261105, 20261109, 20261110, 20261111, 20261112]
        bad["from"] = 20261105
        for key, values in CLOSES.items():
            bad["checks"][key] = check(DAYS, values)
        _, status, _, _ = futures.evaluate(bad, {}, [], TODAY)
        self.assertEqual(status["ho"]["status"], "error")
        self.assertEqual(status["zl"]["status"], "ok")

    def test_the_session_in_progress_is_refused(self):
        late = report()
        late["to"] = 20261113
        with self.assertRaises(futures.ReportError):
            futures.evaluate(late, published(), [], TODAY)

    def test_a_gap_with_the_history_is_refused(self):
        old = {k: [["2026-10-30", v[0]]] for k, v in CLOSES.items()}
        old["fcpo"] = [["2026-10-30", 4700]]
        _, status, _, problems = futures.evaluate(report(), old, [], TODAY)
        self.assertEqual({s["status"] for s in status.values()}, {"error"})
        self.assertIn("trou", problems[0])

    def test_only_recent_closes_may_be_revised(self):
        history = published()
        history["zl"][2][1] = 62.70          # 10 nov. : révision récente acceptée
        _, status, _, _ = futures.evaluate(report(), history, [], TODAY)
        self.assertEqual(status["zl"]["revised"], [["2026-11-10", 62.70, 62.77]])
        long = copy.deepcopy(report())
        long["from"] = 20261028
        for key in ("zl", "zs", "zm"):
            long["cbot"][key] = [CLOSES[key][0]] + CLOSES[key]
        long["cbot"]["d"] = [20261028] + DAYS
        long["checks"]["zl"] = check([20261028] + DAYS, long["cbot"]["zl"])
        stale = {"zl": [["2026-10-28", 60.0]] + published()["zl"]}
        _, status, _, _ = futures.evaluate(long, stale, [], TODAY)
        self.assertEqual(status["zl"]["status"], "error")
        self.assertIn("clôture ancienne modifiée", status["zl"]["message"])

    def test_structure_errors_are_reported(self):
        for change, text in [(lambda r: r["cbot"].update(d=[20261107] + DAYS[1:]), "week-end"),
                             (lambda r: r["cbot"].update(d=DAYS[:4]), "dates pour"),
                             (lambda r: r["checks"].pop("zl"), "somme de contrôle absente"),
                             (lambda r: r["cbot"].update(zl=[62.26, None, 62.77, 63.88, 63.42]), "clôture invalide")]:
            bad = report()
            change(bad)
            _, status, _, _ = futures.evaluate(bad, published(), [], TODAY)
            self.assertIn(text, status["zl"]["message"])

    def test_an_unusual_jump_waits_for_confirmation(self):
        jump = report()
        jump["cbot"]["zl"] = [62.26, 62.03, 62.77, 63.88, 80.0]
        jump["checks"]["zl"] = check(DAYS, jump["cbot"]["zl"])
        final, status, held, _ = futures.evaluate(jump, published(4), [], TODAY)
        self.assertEqual(status["zl"]["status"], "held")
        self.assertEqual(final["zl"][-1][0], "2026-11-11")
        self.assertEqual((held[0]["series"], held[0]["date"], held[0]["value"]), ("zl", "2026-11-12", 80.0))


if __name__ == "__main__":
    unittest.main()
