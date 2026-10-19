"""Costanti e funzioni condivise dalla pipeline italiana."""
import datetime as dt
import json
import pathlib
import unicodedata
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "pipeline" / "cache"
OUT = ROOT / "public" / "data"

WAR_START = dt.date(2026, 2, 28)
SEASONAL_YEARS = range(2021, 2026)   # come il tracker USA di Brown e il tracker UE
SERIES_START = dt.date(2026, 1, 5)

LITRES_PER_TONNE = {"benzina": 1342.0, "gasolio": 1195.0}   # ~0,745 e ~0,837 kg/L
VAT = 0.22
AGRI_EXCISE_SHARE = 0.22          # gasolio agricolo: accisa al 22% dell'aliquota ordinaria
HAULIER_NET_EXCISE = 0.40322      # €/L: aliquota netta per l'autotrasporto (>= 7,5 t) dopo il rimborso trimestrale

# Regioni: codice (NUTS 2; Trentino-Alto Adige = ITH1 + ITH2), nome, nome nelle tabelle MASE.
REGIONS = [
    ("ITC1", "Piemonte", "PIEMONTE"), ("ITC2", "Valle d'Aosta", "VALLE D'AOSTA"), ("ITC3", "Liguria", "LIGURIA"),
    ("ITC4", "Lombardia", "LOMBARDIA"), ("ITH12", "Trentino-Alto Adige", "TRENTINO-ALTO ADIGE"),
    ("ITH3", "Veneto", "VENETO"), ("ITH4", "Friuli-Venezia Giulia", "FRIULI-VENEZIA GIULIA"),
    ("ITH5", "Emilia-Romagna", "EMILIA-ROMAGNA"), ("ITI1", "Toscana", "TOSCANA"), ("ITI2", "Umbria", "UMBRIA"),
    ("ITI3", "Marche", "MARCHE"), ("ITI4", "Lazio", "LAZIO"), ("ITF1", "Abruzzo", "ABRUZZO"), ("ITF2", "Molise", "MOLISE"),
    ("ITF3", "Campania", "CAMPANIA"), ("ITF4", "Puglia", "PUGLIA"), ("ITF5", "Basilicata", "BASILICATA"),
    ("ITF6", "Calabria", "CALABRIA"), ("ITG1", "Sicilia", "SICILIA"), ("ITG2", "Sardegna", "SARDEGNA"),
]
REGION_CODES = [c for c, _, _ in REGIONS]
NAMES = {c: n for c, n, _ in REGIONS} | {"IT": "Italia"}


def norm(s: str) -> str:
    """Normalise a region name as written in MASE tables (accents, apostrophes, spaces, hyphens)."""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().upper()
    return "".join(ch for ch in s if ch.isalpha())


MASE_TO_CODE = {norm(m): c for c, _, m in REGIONS}

WOB_URL = ("https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en"
           "?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx")
MASE_API = "https://sisen.mase.gov.it/dgsaie/api/v1/cmis/documents"
EUROSTAT_API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"


def http_get(url: str, timeout: int = 180) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (italia-guerra-carburanti)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def daterange(start: dt.date, end: dt.date):
    d = start
    while d <= end:
        yield d
        d += dt.timedelta(days=1)


def interpolate_daily(points: dict, start: dt.date, end: dt.date) -> dict:
    """Linear interpolation of weekly points onto every day; carries the edge values outwards."""
    keys = sorted(points)
    out, j = {}, 0
    for d in daterange(start, end):
        while j + 1 < len(keys) and keys[j + 1] <= d:
            j += 1
        if d <= keys[0]:
            out[d] = points[keys[0]]
        elif j + 1 >= len(keys):
            out[d] = points[keys[-1]]
        else:
            a, b = keys[j], keys[j + 1]
            out[d] = points[a] + (points[b] - points[a]) * (d - a).days / (b - a).days
    return out


def step_daily(changes: dict, start: dt.date, end: dt.date) -> dict:
    """A rate that holds from each change date until the next one (tax rates)."""
    keys = sorted(changes)
    out = {}
    for d in daterange(start, end):
        valid = [k for k in keys if k <= d]
        out[d] = changes[valid[-1]] if valid else changes[keys[0]]
    return out


def write_json(name: str, obj) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(obj, indent=1, ensure_ascii=False))
