"""Costruisce i JSON letti dal sito (public/data/*.json).

    python pipeline/build.py            # scarica dati freschi (Oil Bulletin UE, MASE, Eurostat)
    python pipeline/build.py --cached   # riusa i file in pipeline/cache

Metodo (come il tracker UE e quello USA di Brown):
    costo extra = Σ giorni (prezzo effettivo − prezzo senza guerra) × litri consumati quel giorno

Il rincaro al litro è nazionale (Oil Bulletin, settimanale, interpolato al giorno); i litri sono regionali
(MASE, media 2021–2025 per mese). Gruppi:
    automobilisti   benzina + gasolio venduto in rete (ordinaria e autostrade), prezzo alla pompa con tasse
    autotrasporto   gasolio extra rete (depositi di flotte e imprese); IVA recuperata e accisa netta fissa
                    a 0,40322 €/L grazie al rimborso trimestrale → pesa solo il rincaro del prezzo industriale
    agricoltura     gasolio agricolo; IVA recuperata, accisa al 22% dell'ordinaria → rincaro industriale
                    più il 22% delle variazioni d'accisa
    Stato           tagli d'accisa: quanto avrebbero pagato in più automobilisti e agricoltori ad accise
                    invariate; extra gettito IVA sul rincaro industriale pagato dagli automobilisti
"""
import calendar
import datetime as dt
import json
import sys

import fetch_mase
import fetch_prices
from burden import burden
from common import (AGRI_EXCISE_SHARE, EUROSTAT_API, LITRES_PER_TONNE, NAMES, REGION_CODES, SEASONAL_YEARS,
                    SERIES_START, VAT, WAR_START, daterange, http_get, interpolate_daily, step_daily, write_json)
from counterfactual import seasonal_weekly_change, weekly_path

GROUPS = ("automobilisti", "autotrasporto", "agricoltura")


def r(x, n=4):
    return round(x, n)


def households() -> dict:
    """Famiglie per regione (Eurostat lfst_r_lfsd2hh, NUTS 2, ultimo anno); Trentino = Bolzano + Trento."""
    geos = [c for c in REGION_CODES if c != "ITH12"] + ["ITH1", "ITH2", "IT"]
    qs = "&".join([f"geo={g}" for g in geos] + ["deg_urb=TOTAL", "unit=THS_HH", "lastTimePeriod=1"])
    d = json.loads(http_get(f"{EUROSTAT_API}/lfst_r_lfsd2hh?{qs}"))
    idx = d["dimension"]["geo"]["category"]["index"]
    year = int(next(iter(d["dimension"]["time"]["category"]["index"])))
    val = {g: d["value"][str(i)] * 1000 for g, i in idx.items() if str(i) in d["value"]}
    val["ITH12"] = val.pop("ITH1") + val.pop("ITH2")
    return {"year": year, "values": {k: round(v) for k, v in val.items()}}


def litres_per_day(mase: dict) -> dict:
    """{region: {stream: {'MM': litres/day}}}: 2021–2025 average for each calendar month."""
    out = {}
    for reg in REGION_CODES:
        out[reg] = {}
        for stream in ("benzina", "gasolio_rete", "gasolio_extrarete", "agricolo"):
            lpt = LITRES_PER_TONNE["benzina" if stream == "benzina" else "gasolio"]
            months = {}
            for m in range(1, 13):
                obs = [mase[f"{y}-{m:02d}"][reg][stream] * lpt / calendar.monthrange(y, m)[1]
                       for y in SEASONAL_YEARS if f"{y}-{m:02d}" in mase]
                months[f"{m:02d}"] = sum(obs) / len(obs)
            out[reg][stream] = months
    return out


def main(cached: bool = False) -> None:
    now = dt.datetime.now(dt.timezone.utc)
    p = fetch_prices.load(force=not cached)
    mase = fetch_mase.load(range(SEASONAL_YEARS[0], WAR_START.year + 1),
                           refresh_from=None if cached else f"{WAR_START.year}-01")
    hh = households()
    lpd = litres_per_day(mase)

    bulletins = sorted(d for d in p["retail"]["gasolio"] if d >= SERIES_START)
    end = bulletins[-1]
    last_prewar = [d for d in bulletins if d < WAR_START][-1]
    feb = [d for d in bulletins if d < WAR_START and d.month == 2]

    # Daily national prices, no-war prices and tax rates.
    daily, cf, cf_pre, excise = {}, {}, {}, {}
    sensitivity = {}
    for fuel in ("benzina", "gasolio"):
        retail = {d: v for d, v in p["retail"][fuel].items() if d >= SERIES_START}
        pretax = {d: v for d, v in p["pretax"][fuel].items() if d >= SERIES_START}
        daily[fuel] = {"retail": interpolate_daily(retail, SERIES_START, end),
                       "pretax": interpolate_daily(pretax, SERIES_START, end)}
        excise[fuel] = step_daily(p["excise"][fuel], SERIES_START, end)
        a_retail, a_pretax = retail[last_prewar], pretax[last_prewar]
        for key, years in (("main", SEASONAL_YEARS), ("ex2022", [y for y in SEASONAL_YEARS if y != 2022])):
            season = seasonal_weekly_change(p["eu_pretax"][fuel], years)
            path = interpolate_daily(weekly_path(last_prewar, a_retail, a_pretax, VAT, bulletins, season), WAR_START, end)
            if key == "main":
                cf[fuel] = path
                cf_pre[fuel] = {d: a_pretax + (path[d] - a_retail) / (1 + VAT) for d in path}
                anchor = {"retail": a_retail, "pretax": a_pretax, "excise": excise[fuel][last_prewar]}
                daily[fuel]["anchor"] = anchor
            else:
                sensitivity[fuel] = path

    # Extra cost per litre, per group and day.
    g = daily["gasolio"]
    t0 = {f: daily[f]["anchor"]["retail"] / (1 + VAT) - daily[f]["anchor"]["pretax"] for f in daily}
    per_litre = {
        "benzina_pompa": {d: daily["benzina"]["retail"][d] - cf["benzina"][d] for d in cf["benzina"]},
        "gasolio_pompa": {d: g["retail"][d] - cf["gasolio"][d] for d in cf["gasolio"]},
        "industriale": {d: g["pretax"][d] - cf_pre["gasolio"][d] for d in cf_pre["gasolio"]},
        "agricolo": {d: g["pretax"][d] - cf_pre["gasolio"][d] + AGRI_EXCISE_SHARE * (excise["gasolio"][d] - g["anchor"]["excise"])
                     for d in cf_pre["gasolio"]},
        # Tax relief at the pump: what consumers would have paid at pre-war taxes minus what they paid.
        "taglio_benzina": {d: (daily["benzina"]["pretax"][d] + t0["benzina"]) * (1 + VAT) - daily["benzina"]["retail"][d] for d in cf["benzina"]},
        "taglio_gasolio": {d: (g["pretax"][d] + t0["gasolio"]) * (1 + VAT) - g["retail"][d] for d in cf["gasolio"]},
        "taglio_agricolo": {d: AGRI_EXCISE_SHARE * (g["anchor"]["excise"] - excise["gasolio"][d]) for d in cf["gasolio"]},
        "iva_benzina": {d: (daily["benzina"]["pretax"][d] - cf_pre["benzina"][d]) * VAT for d in cf["benzina"]},
        "iva_gasolio": {d: (g["pretax"][d] - cf_pre["gasolio"][d]) * VAT for d in cf["gasolio"]},
    }
    cf_ex22 = {f: {d: daily[f]["retail"][d] - sensitivity[f][d] for d in sensitivity[f]} for f in sensitivity}

    def total(series: dict, region: str, stream: str) -> float:
        m = lpd[region][stream]
        return burden({d: v for d, v in series.items()}, {d: 0.0 for d in series}, lambda d: m[f"{d.month:02d}"], WAR_START, end)

    def rate(series: dict, region: str, stream: str) -> float:
        return series[end] * lpd[region][stream][f"{end.month:02d}"]

    regions = {}
    for reg in REGION_CODES:
        groups = {
            "automobilisti": total(per_litre["benzina_pompa"], reg, "benzina") + total(per_litre["gasolio_pompa"], reg, "gasolio_rete"),
            "autotrasporto": total(per_litre["industriale"], reg, "gasolio_extrarete"),
            "agricoltura": total(per_litre["agricolo"], reg, "agricolo"),
        }
        rates = {
            "automobilisti": rate(per_litre["benzina_pompa"], reg, "benzina") + rate(per_litre["gasolio_pompa"], reg, "gasolio_rete"),
            "autotrasporto": rate(per_litre["industriale"], reg, "gasolio_extrarete"),
            "agricoltura": rate(per_litre["agricolo"], reg, "agricolo"),
        }
        stato = {
            "tagliAccise": total(per_litre["taglio_benzina"], reg, "benzina") + total(per_litre["taglio_gasolio"], reg, "gasolio_rete")
                           + total(per_litre["taglio_agricolo"], reg, "agricolo"),
            "ivaExtra": total(per_litre["iva_benzina"], reg, "benzina") + total(per_litre["iva_gasolio"], reg, "gasolio_rete"),
        }
        ex22 = total(cf_ex22["benzina"], reg, "benzina") + total(cf_ex22["gasolio"], reg, "gasolio_rete") \
            + total({d: g["pretax"][d] - (g["anchor"]["pretax"] + (sensitivity["gasolio"][d] - g["anchor"]["retail"]) / (1 + VAT)) for d in sensitivity["gasolio"]}, reg, "gasolio_extrarete")
        fam = hh["values"][reg]
        tot = sum(groups.values())
        regions[reg] = {
            "name": NAMES[reg], "households": fam,
            "groups": {k: round(v) for k, v in groups.items()}, "dailyRate": {k: round(v) for k, v in rates.items()},
            "total": round(tot), "perHousehold": round(tot / fam, 2),
            "automobilistiPerHousehold": round(groups["automobilisti"] / fam, 2),
            "stato": {k: round(v) for k, v in stato.items()},
            "litresPerDay": {s: round(sum(v.values()) / 12) for s, v in lpd[reg].items()},
            "totalEx2022Partial": round(ex22),
        }

    nat_groups = {k: sum(x["groups"][k] for x in regions.values()) for k in GROUPS}
    nat_rates = {k: sum(x["dailyRate"][k] for x in regions.values()) for k in GROUPS}
    nat_stato = {k: sum(x["stato"][k] for x in regions.values()) for k in ("tagliAccise", "ivaExtra")}
    fam_it = sum(x["households"] for x in regions.values())
    nat_total = sum(nat_groups.values())
    for metric in ("total", "perHousehold"):
        for i, reg in enumerate(sorted(regions, key=lambda k: -regions[k][metric]), 1):
            regions[reg].setdefault("rank", {})[metric] = i

    def series(fuel: str) -> list:
        return [{"date": d.isoformat(), "price": r(daily[fuel]["retail"][d]),
                 "noWar": r(cf[fuel][d]) if d in cf[fuel] else None} for d in sorted(daily[fuel]["retail"])]

    timeline = []
    for fuel in ("benzina", "gasolio"):
        prev = None
        for d, v in sorted(p["excise"][fuel].items()):
            if prev is not None and d >= WAR_START - dt.timedelta(days=30) and abs(v - prev) > 1e-6:
                timeline.append({"date": d.isoformat(), "fuel": fuel, "from": r(prev), "to": r(v)})
            prev = v

    write_json("prezzi.json", {"benzina": series("benzina"), "gasolio": series("gasolio"),
                               "bulletins": [d.isoformat() for d in bulletins]})
    write_json("regioni.json", {"householdsYear": hh["year"], "regions": regions})
    write_json("italia.json", {
        "warStartDate": WAR_START.isoformat(), "lastPrewarBulletin": last_prewar.isoformat(), "endDate": end.isoformat(),
        "measuredThrough": (end + dt.timedelta(days=1)).isoformat() + "T00:00:00+02:00",
        "daysSinceWar": (end - WAR_START).days + 1,
        "groups": nat_groups, "dailyRate": nat_rates, "total": nat_total,
        "households": fam_it, "householdsYear": hh["year"], "perHousehold": round(nat_total / fam_it, 2),
        "stato": nat_stato,
        "perLitreNow": {k: r(per_litre[k][end]) for k in ("benzina_pompa", "gasolio_pompa", "industriale", "agricolo")},
        "prices": {f: {"warStart": r(daily[f]["anchor"]["retail"]), "now": r(daily[f]["retail"][end]),
                       "pctChange": r((daily[f]["retail"][end] / daily[f]["anchor"]["retail"] - 1) * 100, 2),
                       "pretaxWarStart": r(daily[f]["anchor"]["pretax"]), "pretaxNow": r(daily[f]["pretax"][end]),
                       "noWarNow": r(cf[f][end])} for f in daily},
        "litresPerDay": {s: round(sum(sum(lpd[reg][s].values()) / 12 for reg in REGION_CODES)) for s in lpd[REGION_CODES[0]]},
        "exciseTimeline": timeline,
        "sensitivityEx2022": sum(x["totalEx2022Partial"] for x in regions.values()) + nat_groups["agricoltura"],
        "builtAt": now.isoformat(), "maseLatestMonth": max(mase),
    })

    print(f"Italia, al {end}: totale €{nat_total / 1e9:.2f} mld = €{nat_total / fam_it:.0f} a famiglia")
    for k in GROUPS:
        print(f"  {k}: €{nat_groups[k] / 1e9:.2f} mld")
    print(f"  Stato: tagli accise €{nat_stato['tagliAccise'] / 1e9:.2f} mld, IVA extra €{nat_stato['ivaExtra'] / 1e9:.2f} mld")


if __name__ == "__main__":
    main(cached="--cached" in sys.argv)
