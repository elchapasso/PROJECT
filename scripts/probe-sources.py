"""Temporary probe: inspect public price sources from GitHub's runners."""
import re, json, ssl
from urllib.request import Request, urlopen
from urllib.parse import urljoin

UA = {"User-Agent": "Mozilla/5.0 (compatible; OleaTerminal-PriceData/1.0; +https://github.com/elchapasso/PROJECT)"}

def get(url, limit=None):
    try:
        with urlopen(Request(url, headers=UA), timeout=40) as r:
            body = r.read() if limit is None else r.read(limit)
            return r.status, r.headers.get("content-type"), body
    except Exception as e:
        return "ERR", str(e)[:300], b""

def show(title, url, fn=None, limit=None):
    status, ctype, body = get(url, limit)
    print(f"\n===== {title}\n{url}\nstatus={status} type={ctype} bytes={len(body)}")
    if fn and body:
        try:
            fn(body)
        except Exception as e:
            print("parse error", e)

def ctx(text, word, width=400, n=4):
    for m in list(re.finditer(re.escape(word), text, re.I))[:n]:
        print("...", re.sub(r"\s+", " ", text[max(0, m.start()-width):m.end()+width]), "...")

def magyp(b):
    d = json.loads(b.decode("utf-8-sig"))
    posts = d.get("posts", d) if isinstance(d, dict) else d
    print("keys", list(d.keys()) if isinstance(d, dict) else type(d), "posts", len(posts))
    for r in posts:
        if r.get("posicion") in ("15071000100Q", "15121110310E"):
            print(json.dumps(r, ensure_ascii=False))

show("MAGyP FOB 11/11/2026", "https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php?Fecha=11%2F11%2F2026", magyp)
show("MAGyP FOB 12/11/2026", "https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php?Fecha=12%2F11%2F2026", magyp)

def mpob(b):
    t = b.decode("utf-8", "replace")
    i = t.find("Date")
    print(re.sub(r"\s+", " ", t[i-200:i+2500]))
    ctx(t, ">10<", 300, 2)
show("MPOB CPO 2026", "https://bepi.mpob.gov.my/admin2/price_local_daily_view_cpo_msia.php?more=Y&jenis=1Y&tahun=2026", mpob)

def iposs(b):
    t = b.decode("utf-8", "replace")
    print("title", re.findall(r"<title>(.*?)</title>", t, re.S)[:1])
    ctx(t, "Belawan", 500, 3)
    print("scripts", re.findall(r'<script[^>]+src="([^"]+)"', t)[:20])
    print("urls", sorted(set(re.findall(r'(https?://[^"\'\s<>]*(?:api|json|ajax|data)[^"\'\s<>]*)', t)))[:30])
    print("tables", len(re.findall(r"<table", t)))
    i = t.find("<table")
    if i >= 0:
        print(re.sub(r"\s+", " ", t[i:i+3000]))
show("IPOSS FOB", "https://data.iposs.co.id/en/data/fob-price-cpo-cpko", iposs)

def links(words):
    def f(b):
        t = b.decode("utf-8", "replace")
        hrefs = re.findall(r'href="([^"]+)"', t)
        for h in hrefs:
            if any(w in h.lower() for w in words):
                print("link", h)
        ctx(t, "D4", 250, 3)
    return f
show("EPA RIN trades", "https://www.epa.gov/fuels-registration-reporting-and-compliance-help/rin-trades-and-price-information", links(["csv", "xls", "data", "price", "rin"]))
show("ANP precos produtores", "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-de-produtores-e-importadores-de-derivados-de-petroleo-e-biodiesel", links(["xls", "semana", "biodiesel", "ppidp"]))
show("ANP semanal file", "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/ppidp/precos-medios-ponderados-semanais-2013.xls", lambda b: print("head", b[:16]))
show("FRED DDFUELNYH", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DDFUELNYH&cosd=2026-10-20", lambda b: print(b.decode()[:600]))
show("FRED PSOILUSDM", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=PSOILUSDM&cosd=2026-06-01", lambda b: print(b.decode()[:400]))
show("ECB USD", "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=2026-11-06&format=csvdata", lambda b: print(b.decode()[:900]))
