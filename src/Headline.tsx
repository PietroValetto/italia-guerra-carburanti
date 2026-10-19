import { Data, GROUPS, GROUP_LABEL } from "./data";
import { euro, euroShort, longDate } from "./format";
import { useLive } from "./useLive";

export function Headline({ data }: { data: Data }) {
  const it = data.it;
  const live = {
    automobilisti: useLive(it.groups.automobilisti, it.dailyRate.automobilisti, it.measuredThrough),
    autotrasporto: useLive(it.groups.autotrasporto, it.dailyRate.autotrasporto, it.measuredThrough),
    agricoltura: useLive(it.groups.agricoltura, it.dailyRate.agricoltura, it.measuredThrough),
  };
  const total = GROUPS.reduce((t, g) => t + live[g], 0);

  return (
    <section className="headline it-headline">
      <div className="headline-body">
        <p className="kicker">Costo extra del carburante dal 28 febbraio, in Italia</p>
        <p className="big-number" data-tabular>{euro(total)}</p>
        <p className="big-sub">
          Quanto hanno speso in più famiglie e imprese per benzina e gasolio da quando è iniziata la guerra in Iran. Sono{" "}
          {euroShort(total)}: misurati fino all'Oil Bulletin del {longDate(it.endDate)}, poi stimati in tempo reale al ritmo dell'ultima settimana.
        </p>
        <div className="group-strip" role="img" aria-label="Ripartizione per gruppo">
          {GROUPS.map((g) => (
            <span key={g} className={`group-seg seg-${g}`} style={{ flexGrow: live[g] }} title={`${GROUP_LABEL[g]}: ${euroShort(live[g])}`}>
              {live[g] / total > 0.12 && <><b data-tabular>{euroShort(live[g])}</b>{GROUP_LABEL[g]}</>}
            </span>
          ))}
        </div>
        <p className="per-hh" data-tabular>
          <strong>{euro(total / it.households)}</strong> in media per famiglia
        </p>
        <p className="per-hh-sub">
          incluso il costo per le imprese · {(it.households / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} milioni di famiglie
        </p>
      </div>
    </section>
  );
}
