"""MASE Bollettino petrolifero, Tab. 10: vendite mensili provinciali di benzina e gasolio.

Ogni file mensile (vendite_prov_benzina_gasolio_oliocomb_AAAA_MM_m.xls) ha una riga di subtotale per
regione. Le colonne (in tonnellate) usate qui:
    2  Benzina totale
    7  Gasolio motori, rete ordinaria      8  Gasolio motori, autostrade      9  Gasolio motori, extra rete
    12 Gasolio uso agricolo
"""
import json
import re
import urllib.parse

import xlrd

from common import CACHE, MASE_API, MASE_TO_CODE, http_get, norm

COLS = {"benzina": [2], "gasolio_rete": [7, 8], "gasolio_extrarete": [9], "agricolo": [12]}
FILE_RE = re.compile(r"vendite_prov_benzina_gasolio_oliocomb_(\d{4})_(\d{2})_m\.xls$")


def list_files(year: int) -> dict[str, str]:
    """{'YYYY-MM': document id} for one year's monthly provincial files."""
    folder = urllib.parse.quote(f"/sg_dgsaie/bollettino/{year}/", safe="")
    docs = json.loads(http_get(f"{MASE_API}?folder={folder}"))
    out = {}
    for d in docs:
        m = FILE_RE.match(d["fileName"])
        if m:
            out[f"{m[1]}-{m[2]}"] = d["id"]
    return out


def parse(path) -> dict[str, dict[str, float]]:
    """{region code: {stream: tonnes}} from one monthly file (sheet 'Mensile')."""
    sh = xlrd.open_workbook(path).sheet_by_name("Mensile")
    header = " ".join(str(c) for c in sh.row_values(11))
    if "agrico" not in header.lower():
        raise ValueError(f"{path}: unexpected layout (no agricultural diesel column)")
    out = {}
    for i in range(14, sh.nrows):
        r = sh.row_values(i)
        code = MASE_TO_CODE.get(norm(r[1]))
        if str(r[0]).strip() or not code:
            continue  # province rows have a code; we keep only the regional subtotal rows
        out[code] = {k: sum(float(r[c] or 0) for c in cols) for k, cols in COLS.items()}
    return out


def load(years: range, refresh_from: str | None = None) -> dict[str, dict]:
    """{'YYYY-MM': {region: {stream: tonnes}}}. Cached files are reused except months >= refresh_from."""
    CACHE.mkdir(parents=True, exist_ok=True)
    out = {}
    for y in years:
        for month, doc in sorted(list_files(y).items()):
            path = CACHE / f"mase_{month}.xls"
            if not path.exists() or (refresh_from and month >= refresh_from):
                path.write_bytes(http_get(f"{MASE_API}/{doc}"))
            out[month] = parse(path)
    return out


if __name__ == "__main__":
    data = load(range(2021, 2027), refresh_from=None)
    months = sorted(data)
    print(len(months), "months", months[0], "→", months[-1])
    bad = [m for m in months if len(data[m]) != 20]
    print("months without 20 regions:", bad)
    last = data[months[-1]]
    tot = {k: round(sum(r[k] for r in last.values())) for k in ("benzina", "gasolio_rete", "gasolio_extrarete", "agricolo")}
    print(months[-1], "Italy tonnes:", tot)
