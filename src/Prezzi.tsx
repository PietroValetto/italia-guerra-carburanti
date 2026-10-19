import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Data, Fuel } from "./data";
import { longDate, pct, perLitre, shortDate } from "./format";

interface Row { date: string; price: number; noWar?: number; gap?: [number, number] }

export function Prezzi({ data }: { data: Data }) {
  const [fuel, setFuel] = useState<Fuel>("gasolio");
  const rows = useMemo<Row[]>(
    () => data.prezzi[fuel].map((p) => (p.noWar === null ? { date: p.date, price: p.price } : { date: p.date, price: p.price, noWar: p.noWar, gap: [p.noWar, p.price] })),
    [data, fuel],
  );
  const ticks = rows.filter((r) => r.date.endsWith("-01")).map((r) => r.date);
  const pr = data.it.prices[fuel];
  const cuts = data.it.exciseTimeline.filter((t) => t.fuel === fuel);

  return (
    <section className="section" id="prezzi">
      <p className="kicker">Prezzi</p>
      <h2>{fuel === "gasolio" ? "Gasolio" : "Benzina"}: {perLitre(pr.warStart)} → {perLitre(pr.now)} <span className="up">{pct(pr.pctChange)}</span></h2>
      <div className="metric-tabs" role="tablist" aria-label="Carburante">
        {(["gasolio", "benzina"] as Fuel[]).map((f) => (
          <button key={f} role="tab" aria-selected={fuel === f} className={fuel === f ? "is-active" : ""} onClick={() => setFuel(f)}>
            {f === "gasolio" ? "Gasolio" : "Benzina"}
          </button>
        ))}
      </div>
      <p className="chart-sub">
        Prezzo medio nazionale alla pompa (€/l, tasse incluse), Oil Bulletin della Commissione europea, interpolato al giorno.
        L'area è il costo in più rispetto a un anno senza guerra.
      </p>
      <div className="chart" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid-line)" />
            <XAxis dataKey="date" ticks={ticks} tickFormatter={(d) => shortDate(d).split(" ")[1]} tickLine={false}
              axisLine={{ stroke: "var(--axis-line)" }} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
            <YAxis domain={["auto", "auto"]} tickFormatter={(v) => `${v.toFixed(2).replace(".", ",")} €`} width={56} tickLine={false} axisLine={false}
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
            <ReferenceLine x={data.it.warStartDate} stroke="var(--pe-rule-strong)" strokeDasharray="3 3"
              label={{ value: "Inizio guerra", position: "insideTopLeft", fill: "var(--text-secondary)", fontSize: 11 }} />
            {cuts.map((c) => (
              <ReferenceLine key={c.date} x={c.date} stroke="var(--pe-green)" strokeOpacity={0.35} />
            ))}
            <Area dataKey="gap" stroke="none" fill="var(--pe-amber-tint)" fillOpacity={1} isAnimationActive={false} activeDot={false} />
            <Line dataKey="noWar" stroke="var(--series-base)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line dataKey="price" stroke="var(--series-story)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as Row;
              return (
                <div className="tip">
                  <div className="tip-date">{shortDate(String(label))}</div>
                  <div><i className="sw sw-story" /> Effettivo {perLitre(r.price)}</div>
                  {r.noWar !== undefined && <div><i className="sw sw-base" /> Senza guerra {perLitre(r.noWar)}</div>}
                </div>
              );
            }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="legend">
        <span><i className="sw sw-story" /> Prezzo effettivo</span>
        <span><i className="sw sw-base sw-dash" /> Stima senza guerra</span>
        <span><i className="sw sw-gap" /> Costo in più al litro</span>
        <span><i className="sw sw-cut" /> Cambio d'accisa</span>
      </p>

      <h3 className="chart-title">Le accise sul {fuel} dall'inizio della guerra</h3>
      <ul className="timeline">
        {cuts.map((c) => (
          <li key={c.date}>
            <b>{longDate(c.date)}</b>: {c.to < c.from ? "taglio" : "aumento"} da {perLitre(c.from)} a {perLitre(c.to)}
          </li>
        ))}
      </ul>
      <p className="chart-sub">Aliquote ordinarie dalle tabelle fiscali dell'Oil Bulletin.</p>
    </section>
  );
}
