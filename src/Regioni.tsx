import { useEffect, useMemo, useState } from "react";
import { geoConicConformal, geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";
import type { FeatureCollection, Geometry } from "geojson";
import { Data, Region } from "./data";
import { euro, euroShort } from "./format";

type Metric = "perHousehold" | "total" | "automobilisti" | "autotrasporto" | "agricoltura";
const METRICS: { key: Metric; label: string; fmt: (v: number) => string }[] = [
  { key: "perHousehold", label: "Per famiglia", fmt: euro },
  { key: "total", label: "Totale", fmt: euroShort },
  { key: "automobilisti", label: "Automobilisti", fmt: euroShort },
  { key: "autotrasporto", label: "Autotrasporto", fmt: euroShort },
  { key: "agricoltura", label: "Agricoltura", fmt: euroShort },
];
const value = (r: Region, m: Metric) => (m === "perHousehold" ? r.perHousehold : m === "total" ? r.total : r.groups[m]);
// Il Trentino-Alto Adige è una regione unica qui, ma sulla mappa NUTS 2 sono due province autonome.
const toCode = (id: string) => (id === "ITH1" || id === "ITH2" ? "ITH12" : id);

type Geo = FeatureCollection<Geometry, { id: string; name: string }>;
const W = 520, H = 600;

export function Regioni({ data, onSelect }: { data: Data; onSelect: (c: string) => void }) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [metric, setMetric] = useState<Metric>("perHousehold");
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}geo/it-regions.geo.json`).then((r) => r.json()).then(setGeo); }, []);

  const path = useMemo(() => (geo ? geoPath(geoConicConformal().rotate([-12.5, 0]).fitExtent([[6, 6], [W - 6, H - 6]], geo)) : null), [geo]);
  const m = METRICS.find((x) => x.key === metric)!;
  const vals = Object.values(data.regions).map((r) => value(r, metric));
  const [lo, hi] = [Math.min(...vals), Math.max(...vals)];
  const color = scaleLinear<string>().domain([lo, (lo + hi) / 2, hi]).range(["#F5EFE3", "#1F8A5B", "#12563A"]);
  const ranked = Object.entries(data.regions).sort((a, b) => value(b[1], metric) - value(a[1], metric));

  return (
    <section className="section" id="regioni">
      <p className="kicker">Regione per regione</p>
      <h2>Quanto è costata la guerra a ogni regione</h2>
      <p className="lede">Il rincaro al litro è quasi uguale in tutta Italia; cambia quanto carburante si consuma, e chi lo consuma.</p>
      <div className="metric-tabs" role="tablist" aria-label="Indicatore">
        {METRICS.map((x) => (
          <button key={x.key} role="tab" aria-selected={metric === x.key} className={metric === x.key ? "is-active" : ""} onClick={() => setMetric(x.key)}>{x.label}</button>
        ))}
      </div>
      <p className="hint">Clicca una regione per il dettaglio.</p>

      <div className="map-layout">
        <div className="map-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="map" role="group" aria-label={`Mappa: ${m.label} per regione`}>
            {geo && path && geo.features.map((f) => {
              const code = toCode(f.properties.id);
              const reg = data.regions[code];
              if (!reg) return null;
              return (
                <path key={f.properties.id} d={path(f) ?? ""} fill={color(value(reg, metric))}
                  className={`map-country ${hover === code ? "is-hover" : ""}`} tabIndex={0} role="button"
                  aria-label={`${reg.name}: ${m.fmt(value(reg, metric))}`}
                  onMouseEnter={() => setHover(code)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(code)} onBlur={() => setHover(null)}
                  onClick={() => onSelect(code)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(code))} />
              );
            })}
          </svg>
          <div className="map-readout" aria-live="polite">
            {hover ? <><strong>{data.regions[hover].name}</strong> <span data-tabular>{m.fmt(value(data.regions[hover], metric))}</span></> : <span className="muted">Passa sopra una regione</span>}
          </div>
          <div className="scale"><span data-tabular>{m.fmt(lo)}</span><span className="scale-bar" /><span data-tabular>{m.fmt(hi)}</span></div>
        </div>
        <div className="rank">
          <table>
            <thead><tr><th>#</th><th>Regione</th><th className="num">{m.label}</th></tr></thead>
            <tbody>
              {ranked.map(([c, r], i) => (
                <tr key={c} className={hover === c ? "is-hover" : ""} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
                  <td className="muted" data-tabular>{i + 1}</td>
                  <td><button className="link" onClick={() => onSelect(c)}>{r.name}</button></td>
                  <td className="num" data-tabular>{m.fmt(value(r, metric))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-note">
            "Per famiglia" divide il costo totale della regione (famiglie e imprese) per il numero di famiglie: misura quanto pesa il rincaro
            sull'economia locale, non lo scontrino di ogni famiglia. Famiglie: Eurostat {data.householdsYear}.
          </p>
        </div>
      </div>
    </section>
  );
}
