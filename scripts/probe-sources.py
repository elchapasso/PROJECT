"""Temporary probe 2: MPOB cell markup, ANP workbook layout, EPA chart source."""
import re, json
from urllib.request import Request, urlopen

UA = {"User-Agent": "Mozilla/5.0 (compatible; OleaTerminal-PriceData/1.0; +https://github.com/elchapasso/PROJECT)"}
def get(url):
    with urlopen(Request(url, headers=UA), timeout=60) as r:
        return r.read()

t = get("https://bepi.mpob.gov.my/admin2/price_local_daily_view_cpo_msia.php?more=Y&jenis=1Y&tahun=2026").decode("utf-8", "replace")
print("== MPOB")
for m in re.finditer(r"\*\*", t):
    print("STAR", re.sub(r"\s+", " ", t[max(0, m.start()-220):m.end()+80]))
rows = re.findall(r"<tr[^>]*>(.*?)</tr>", t, re.S | re.I)
for r in rows:
    cells = [re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", r, re.S | re.I)]
    if cells and (cells[0] in ("01", "02", "11", "12", "31") or cells[0].lower().startswith(("date", "average", "purata"))):
        print(len(cells), cells)
print("headers", [re.sub(r"<[^>]+>", "", h).strip() for h in re.findall(r"<th[^>]*>(.*?)</th>", t, re.S | re.I)][:20])
t25 = get("https://bepi.mpob.gov.my/admin2/price_local_daily_view_cpo_msia.php?more=Y&jenis=1Y&tahun=2025").decode("utf-8", "replace")
rows = re.findall(r"<tr[^>]*>(.*?)</tr>", t25, re.S | re.I)
for r in rows:
    cells = [re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", r, re.S | re.I)]
    if cells and cells[0] in ("02", "03"):
        print("2025", len(cells), cells)

print("== ANP")
import subprocess, sys
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "xlrd==2.0.1"], check=True)
import xlrd
book = xlrd.open_workbook(file_contents=get("https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/ppidp/precos-medios-ponderados-semanais-2013.xls"))
for s in book.sheets():
    print("SHEET", repr(s.name), s.nrows, s.ncols)
    for i in range(min(s.nrows, 14)):
        print("  ", i, [str(v)[:28] for v in s.row_values(i)[:14]])
    hits = [(i, j) for i in range(s.nrows) for j in range(min(s.ncols, 40)) if "B-100" in str(s.cell_value(i, j)) or "B100" in str(s.cell_value(i, j))]
    print("  B100 cells", hits[:10])
    if s.nrows > 20:
        for i in range(max(0, s.nrows - 4), s.nrows):
            print("  last", i, [str(v)[:22] for v in s.row_values(i)[:14]])

print("== EPA")
t = get("https://www.epa.gov/fuels-registration-reporting-and-compliance-help/rin-trades-and-price-information").decode("utf-8", "replace")
for pat in [r'<iframe[^>]+src="([^"]+)"', r'data-src="([^"]+)"', r'(https?://[^"\s]*(?:tableau|powerbi|arcgis|highcharts|\.csv|\.xlsx?|/files/)[^"\s]*)', r'href="(/system/files/[^"]+)"']:
    print(pat, sorted(set(re.findall(pat, t)))[:20])
for w in ["Weekly D3", "Weekly", "chart", "Download"]:
    for m in list(re.finditer(w, t))[:3]:
        print("CTX", w, re.sub(r"\s+", " ", t[max(0, m.start()-200):m.end()+300]))
