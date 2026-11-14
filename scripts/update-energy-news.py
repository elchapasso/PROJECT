"""Collect public headline metadata and EIA spot prices for Oléa Terminal."""

import csv
import html
import io
import json
import math
import os
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen


TOPICS = {
    'biofuels': r'biofuels?|biodiesel|renewable (?:diesel|fuels?)|renewable volume obligation|sustainable aviation fuel|rin credits?|b40|b50|ethanol|biocarburants?',
    'shipping': r'hormuz|red sea|suez|bab el mandeb|panama canal|tanker|tankers|black sea|constanta|odesa|odessa|novorossiysk|freight rates?|shipping routes?|shipping costs?|maritime security|port (?:closures?|strikes?|disruptions?)|mer noire|mer rouge',
    'oils': r'soybean oil|soy oil|soyoil|sunflower oil|sunseed|sunflower seed|palm oil|rapeseed oil|canola oil|vegetable oils?|oilseeds?|huile[s]? de (?:soja|palme|tournesol|colza)',
    'energy': r'opec\+?|brent|wti|crude(?: oil)?|oil (?:price[s]?|futures|supply|production|market|output|inventor(?:y|ies)|stocks|exports)|petroleum|gasoil|diesel|refiner(?:y|ies)|fuel prices?|oil and gas|energy information administration',
    'policy': r'sanctions?|export (?:ban|tax|dut(?:y|ies)|restrictions?)|import (?:tax|dut(?:y|ies)|restrictions?)|embargo|(?:iran|russia|ukraine|houthis?|middle east).{0,45}(?:blockade|ceasefire|strikes?|peace talks)|(?:blockade|ceasefire).{0,45}(?:iran|russia|ukraine|middle east)',
    'fx': r'u\.s\. dollar|us dollar|usd/mad|moroccan dirham|eur/usd|dollar index|dollar (?:rises?|falls?|gains?|weakens?|strengthens?|slips?|stead(?:y|ies))|federal reserve|fed (?:rate|holds|cuts|hikes)|interest rate decision|ecb (?:rate|holds|cuts|hikes)|banque centrale europeenne',
}
PATTERNS = {key: re.compile(r'\b(?:' + pattern + r')\b', re.I) for key, pattern in TOPICS.items()}
GOOGLE_TERMS = '(Brent OR WTI OR OPEC OR Hormuz OR "Red Sea" OR "Black Sea" OR biodiesel OR "renewable diesel" OR "palm oil" OR "soybean oil" OR "sunflower oil" OR "US dollar" OR "export duties" OR sanctions)'
FRED = {'brent': 'DCOILBRENTEU', 'wti': 'DCOILWTICO'}
NEWS_WINDOW = timedelta(days=30)
NOW = datetime.now(timezone.utc)


def read_url(url):
    request = Request(url, headers={
        'User-Agent': 'OleaTerminal/1.0 (+https://elchapasso.github.io/PROJECT/)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, application/json, text/csv, */*',
    })
    with urlopen(request, timeout=14) as response:
        body = response.read(3_000_001)
    if len(body) > 3_000_000:
        raise ValueError('response too large')
    return body


def clean(value):
    value = re.sub(r'<[^>]+>', ' ', html.unescape(str(value or '')))
    return ' '.join(value.split())


def normal(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold()) if not unicodedata.combining(c))


def timestamp(value):
    value = str(value or '').strip()
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        try:
            result = parsedate_to_datetime(value)
        except (ValueError, TypeError, OverflowError):
            return None
    return result.replace(tzinfo=result.tzinfo or timezone.utc).astimezone(timezone.utc)


def iso(value):
    return value.isoformat(timespec='seconds').replace('+00:00', 'Z')


def host_matches(url, domain):
    host = urlsplit(url).hostname or ''
    return host == domain or host.endswith('.' + domain)


def public_link(url):
    try:
        parts = urlsplit(url.strip())
        if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password:
            return ''
        # Some feeds expose a direct publisher URL, others only a Google News redirect.
        query = parse_qs(parts.query, keep_blank_values=True)
        if host_matches(url, 'news.google.com'):
            return urlunsplit(parts._replace(fragment=''))
        for key in list(query):
            if key.startswith('utm_') or key in {'cmpid', 'smid', 'ocid', 'fbclid', 'outputType', 'srnd'}:
                del query[key]
        return urlunsplit(parts._replace(query=urlencode(query, doseq=True), fragment=''))
    except ValueError:
        return ''


def rss_records(data):
    root = ET.fromstring(data)
    if root.tag.rsplit('}', 1)[-1].lower() not in {'rss', 'feed', 'rdf'}:
        raise ValueError('not an RSS or Atom feed')
    for item in root.iter():
        if item.tag.rsplit('}', 1)[-1] not in {'item', 'entry'}:
            continue
        fields = {}
        for child in item:
            key = child.tag.rsplit('}', 1)[-1].lower()
            if key == 'link' and child.get('rel', 'alternate') != 'alternate':
                continue
            fields.setdefault(key, child.get('href') or ''.join(child.itertext()))
            if key == 'source':
                fields['source_url'] = child.get('url', '')
        yield {
            'title': fields.get('title', ''), 'url': fields.get('link', ''),
            'date': fields.get('pubdate') or fields.get('published') or fields.get('date') or fields.get('updated'),
            'attribution': fields.get('source', ''), 'publisher': fields.get('source_url', ''),
        }


def google_feed(domain, terms=GOOGLE_TERMS):
    query = urlencode({'q': f'site:{domain} {terms} when:30d', 'hl': 'en-US', 'gl': 'US', 'ceid': 'US:en'})
    return 'https://news.google.com/rss/search?' + query


def article(record, source, domain, mode, default_topic=None):
    title = clean(record.get('title'))
    url = public_link(record.get('url') or '')
    date = timestamp(record.get('date'))
    if not title or not url or date is None or not NOW - NEWS_WINDOW <= date <= NOW + timedelta(hours=2):
        return None
    if mode == 'google':
        if not (host_matches(url, 'news.google.com') and host_matches(record.get('publisher') or '', domain)):
            return None
        suffix = ' - ' + clean(record.get('attribution'))
        if suffix != ' - ' and title.casefold().endswith(suffix.casefold()):
            title = title[:-len(suffix)]
    elif not host_matches(url, domain):
        return None
    topics = [key for key, pattern in PATTERNS.items() if pattern.search(normal(title))]
    if default_topic and default_topic not in topics:
        topics.append(default_topic)
    if not topics:
        return None
    return {'title': title[:300], 'url': url, 'publishedAt': iso(date), 'source': source, 'topics': topics, 'via': mode}


def federal_register():
    params = urlencode({
        'per_page': 40, 'order': 'newest', 'conditions[term]': 'renewable fuel standard',
        'conditions[agencies][]': 'environmental-protection-agency',
        'conditions[publication_date][gte]': (NOW - NEWS_WINDOW).date().isoformat(),
    })
    data = json.loads(read_url('https://www.federalregister.gov/api/v1/documents.json?' + params))
    return [{'title': row['title'], 'url': row['html_url'], 'date': row['publication_date']} for row in data['results']]


def trading_economics(key):
    data = json.loads(read_url('https://api.tradingeconomics.com/news?' + urlencode({'c': key})))
    if not isinstance(data, list):
        raise ValueError('invalid Trading Economics response')
    return [dict(row, url=urljoin('https://tradingeconomics.com/', row.get('url') or '/news/news')) for row in data]


def provider_jobs():
    jobs = [
        ('Reuters', 'reuters.com', (), None),
        ('Bloomberg', 'bloomberg.com', ('https://feeds.bloomberg.com/markets/news.rss',), None),
        ('The New York Times', 'nytimes.com', ('https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'), None),
        ('UkrAgroConsult', 'ukragroconsult.com', ('https://ukragroconsult.com/en/feed/',), None),
        ('Trading Economics', 'tradingeconomics.com', (), None),
        ('EIA', 'eia.gov', ('https://www.eia.gov/rss/todayinenergy.xml',), 'energy'),
        ('AIE', 'iea.org', (), 'energy'),
        ('gCaptain', 'gcaptain.com', ('https://gcaptain.com/feed/',), None),
        ('UKMTO', 'ukmto.org', (), 'shipping'),
        ('Fed', 'federalreserve.gov', ('https://www.federalreserve.gov/feeds/press_monetary.xml',), 'fx'),
        ('Federal Register · EPA', 'federalregister.gov', (), 'biofuels'),
    ]
    return jobs


def collect_provider(job):
    source, domain, direct, default_topic = job
    lookups = [('rss', lambda url=url: rss_records(read_url(url))) for url in direct]
    if source == 'Federal Register · EPA':
        lookups.append(('official', federal_register))
    if source == 'Trading Economics' and (key := os.environ.get('TRADING_ECONOMICS_API_KEY')):
        lookups.append(('api', lambda: trading_economics(key)))
    if source not in {'Federal Register · EPA', 'EIA', 'Fed'}:
        terms = '(tanker OR Hormuz OR "Red Sea" OR "maritime security")' if source == 'UKMTO' else GOOGLE_TERMS
        lookups.append(('google', lambda: rss_records(read_url(google_feed(domain, terms)))))
    rows, successful = [], []
    for mode, lookup in lookups:
        try:
            fresh = [entry for record in lookup() if (entry := article(record, source, domain, mode, default_topic))]
            rows.extend(fresh)
            successful.append(mode)
        except (OSError, ValueError, ET.ParseError, KeyError, TypeError) as error:
            # Avoid including request URLs (which can contain API credentials) in logs.
            print(f'{source} [{mode}]: {type(error).__name__}', file=sys.stderr)
    return rows, {'name': source, 'available': bool(successful), 'partial': bool(successful) and len(successful) < len(lookups), 'channels': sorted(set(successful))}


def deduplicate(rows):
    mode_priority = {'editorial': 0, 'official': 1, 'rss': 1, 'api': 1, 'google': 2}
    ordered = sorted(rows, key=lambda row: row['publishedAt'], reverse=True)
    ordered.sort(key=lambda row: mode_priority.get(row['via'], 3))
    links, titles, result = set(), set(), []
    for row in ordered:
        signature = re.sub(r'\W+', ' ', normal(row['title'])).strip()
        if row['url'] in links or signature in titles:
            continue
        links.add(row['url'])
        titles.add(signature)
        result.append(row)
    return sorted(result, key=lambda row: row['publishedAt'], reverse=True)


def read_spot(key):
    symbol = FRED[key]
    start = (NOW - timedelta(days=400)).date().isoformat()
    url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?' + urlencode({'id': symbol, 'cosd': start})
    content = read_url(url).decode('utf-8-sig')
    prices = {}
    for row in csv.DictReader(io.StringIO(content)):
        day = row.get('observation_date') or row.get('DATE')
        try:
            value = float(row.get(symbol) or '')
        except ValueError:
            continue
        if day and re.fullmatch(r'\d{4}-\d{2}-\d{2}', day) and start <= day <= NOW.date().isoformat() and math.isfinite(value) and -100 < value < 500:
            prices[day] = value
    if len(prices) < 2:
        raise ValueError('missing valid spot observations')
    return sorted(prices.items())


def read_snapshot(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return {}


def refresh(output, seed):
    previous = read_snapshot(output)
    initial = read_snapshot(seed)
    jobs = provider_jobs()
    with ThreadPoolExecutor(max_workers=10) as pool:
        spot_tasks = {key: pool.submit(read_spot, key) for key in FRED}
        news = list(pool.map(collect_provider, jobs))
        spot = {}
        for key, task in spot_tasks.items():
            retained = previous.get('spot', {}).get(key) or initial.get('spot', {}).get(key) or []
            try:
                points = dict(retained)
                points.update(task.result())
                spot[key] = sorted(points.items())[-285:]
            except (OSError, ValueError) as error:
                print(f'{key} spot: {type(error).__name__}', file=sys.stderr)
                spot[key] = retained

    providers = [status for _, status in news]
    collected = [row for rows, _ in news for row in rows]
    saved = previous.get('articles', []) + initial.get('articles', [])
    articles = [row for row in deduplicate(collected + saved) if iso(NOW - NEWS_WINDOW) <= row['publishedAt']]
    # Keep a balanced result even when one publisher has many matching articles.
    counts = {}
    published = []
    for row in articles:
        source = row['source']
        counts[source] = counts.get(source, 0) + 1
        if counts[source] <= 35:
            published.append(row)
    for status in providers:
        status['articles'] = sum(row['source'] == status['name'] for row in published)
        print(f"{status['name']}: {status['articles']} articles ({', '.join(status['channels']) or 'source inaccessible'})")
    snapshot = {
        'schema': 1, 'checkedAt': iso(NOW),
        'collectedAt': iso(NOW) if collected else previous.get('collectedAt'),
        'articles': published, 'providers': providers, 'spot': spot,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix('.tmp')
    temporary.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(output)
    if not collected:
        raise SystemExit('No current headlines collected. Last available data retained.')


if __name__ == '__main__':
    refresh(Path(sys.argv[1]), Path(sys.argv[2]))
