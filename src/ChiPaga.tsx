import { Data, GROUP_LABEL, GROUP_SUB, Group } from "./data";
import { euroShort, litresM, signedLitre } from "./format";
import { useLive } from "./useLive";

const WHY: Record<Group, string> = {
  automobilisti:
    "Pagano il prezzo alla pompa, tasse comprese. Il taglio delle accise in primavera ha attutito il colpo; dal 6 ottobre lo sconto fisso è finito.",
  autotrasporto:
    "Le imprese recuperano l'IVA e, per i mezzi sopra le 7,5 tonnellate, l'accisa oltre 0,403 €/l viene rimborsata ogni trimestre. Per questo i tagli d'accisa non le hanno aiutate: pesa tutto il rincaro del prezzo industriale, e il rimborso arriva con mesi di ritardo.",
  agricoltura:
    "Il gasolio agricolo paga solo il 22% dell'accisa ordinaria e l'IVA si recupera: quasi tutto il rincaro arriva dal prezzo industriale, e dei tagli d'accisa resta poco.",
};

function GroupCard({ data, g, perLitre, litres }: { data: Data; g: Group; perLitre: number; litres: number }) {
  const v = useLive(data.it.groups[g], data.it.dailyRate[g], data.it.measuredThrough);
  return (
    <div className={`who-card who-${g}`}>
      <span className="stat-label">{GROUP_LABEL[g]}</span>
      <span className="who-sub">{GROUP_SUB[g]}</span>
      <span className="stat-value stat-value-xl" data-tabular>{euroShort(v)}</span>
      <span className="stat-note" data-tabular>{signedLitre(perLitre)} rispetto a un anno senza guerra · {litresM(litres)}</span>
      <p className="who-why">{WHY[g]}</p>
    </div>
  );
}

export function ChiPaga({ data }: { data: Data }) {
  const it = data.it;
  return (
    <section className="section" id="chi-paga">
      <p className="kicker">Chi paga</p>
      <h2>Il rincaro non pesa su tutti allo stesso modo</h2>
      <p className="lede">Lo stesso aumento del petrolio arriva in modo diverso ad automobilisti, autotrasportatori e agricoltori, per come sono tassati.</p>

      <div className="who-grid">
        <GroupCard data={data} g="automobilisti" perLitre={it.perLitreNow.gasolio_pompa} litres={it.litresPerDay.benzina + it.litresPerDay.gasolio_rete} />
        <GroupCard data={data} g="autotrasporto" perLitre={it.perLitreNow.industriale} litres={it.litresPerDay.gasolio_extrarete} />
        <GroupCard data={data} g="agricoltura" perLitre={it.perLitreNow.agricolo} litres={it.litresPerDay.agricolo} />
        <div className="who-card who-stato">
          <span className="stat-label">Lo Stato</span>
          <span className="who-sub">tagli d'accisa e IVA extra</span>
          <span className="stat-value stat-value-xl" data-tabular>{euroShort(it.stato.tagliAccise)}</span>
          <span className="stat-note">rinunciati con i tagli d'accisa, a favore di automobilisti e agricoltori</span>
          <p className="who-why">
            Nello stesso periodo l'IVA sui prezzi più alti ha portato circa <strong>{euroShort(it.stato.ivaExtra)}</strong> di gettito in più,
            che compensa buona parte dei tagli.
          </p>
        </div>
      </div>
      <p className="chart-sub">
        Rincaro al litro di oggi: per gli automobilisti è quello del gasolio alla pompa (benzina: {signedLitre(it.perLitreNow.benzina_pompa)}); per autotrasporto
        e agricoltura è il rincaro che resta a carico dell'impresa dopo IVA e rimborsi. Litri: media 2021–2025 del periodo, dati MASE.
      </p>
    </section>
  );
}
