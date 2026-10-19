import { useRef } from "react";
import { Data, GROUPS, GROUP_LABEL, GROUP_SUB } from "./data";
import { euro, euroShort, litresM, longDate, monthName } from "./format";
import { useLive } from "./useLive";
import { useModal } from "./useModal";

export function RegionPanel({ data, code, onClose }: { data: Data; code: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { close, onBackdrop } = useModal(ref, onClose);
  const r = data.regions[code];
  const t = data.it.measuredThrough;
  const live = {
    automobilisti: useLive(r.groups.automobilisti, r.dailyRate.automobilisti, t),
    autotrasporto: useLive(r.groups.autotrasporto, r.dailyRate.autotrasporto, t),
    agricoltura: useLive(r.groups.agricoltura, r.dailyRate.agricoltura, t),
  };
  const total = GROUPS.reduce((s, g) => s + live[g], 0);
  const litres = { automobilisti: r.litresPerDay.benzina + r.litresPerDay.gasolio_rete, autotrasporto: r.litresPerDay.gasolio_extrarete, agricoltura: r.litresPerDay.agricolo };
  const share = (v: number, nat: number) => `${((v / nat) * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}% del totale nazionale`;

  return (
    <dialog ref={ref} className="panel" onClick={onBackdrop} aria-labelledby="r-title">
      <div className="panel-inner">
        <button className="close" onClick={close} aria-label="Chiudi">✕</button>
        <p className="kicker">Dettaglio regionale</p>
        <h2 id="r-title">{r.name}</h2>
        <div className="panel-total">
          <span className="stat-label">Costo extra del carburante dal 28 febbraio</span>
          <span className="stat-value stat-value-xl" data-tabular>{euro(total)}</span>
          <span className="stat-note" data-tabular>
            <strong>{euro(total / r.households)}</strong> per famiglia (famiglie e imprese) · {r.rank.perHousehold}ª regione su 20 ·
            solo automobilisti: {euro(r.automobilistiPerHousehold)} per famiglia
          </span>
        </div>
        <div className="stat-grid stat-grid-tight">
          {GROUPS.map((g) => (
            <div key={g} className="stat">
              <span className="stat-label">{GROUP_LABEL[g]}</span>
              <span className="stat-value" data-tabular>{euroShort(live[g])}</span>
              <span className="stat-note">{GROUP_SUB[g]} · {litresM(litres[g])} · {share(r.groups[g], data.it.groups[g])}</span>
            </div>
          ))}
          <div className="stat">
            <span className="stat-label">Tagli d'accisa</span>
            <span className="stat-value" data-tabular>{euroShort(r.stato.tagliAccise)}</span>
            <span className="stat-note">risparmiati da automobilisti e agricoltori della regione</span>
          </div>
        </div>
        <p className="chart-sub">
          Il rincaro al litro è la media nazionale; i litri sono le vendite della regione (MASE), in media 2021–2025 per ogni mese.
          Dati misurati fino al {longDate(data.it.endDate)}.
        </p>
      </div>
    </dialog>
  );
}

export function Metodo({ data, onClose }: { data: Data; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { close, onBackdrop } = useModal(ref, onClose);
  const it = data.it;
  return (
    <dialog ref={ref} className="panel" onClick={onBackdrop} aria-labelledby="m-title">
      <div className="panel-inner prose">
        <button className="close" onClick={close} aria-label="Chiudi">✕</button>
        <p className="kicker">Come è calcolato</p>
        <h2 id="m-title">Metodologia</h2>

        <h3>L'idea</h3>
        <p>Il tracker stima quanto hanno speso in più famiglie e imprese italiane per benzina e gasolio da quando è iniziata la guerra in Iran, il 28 febbraio 2026. Confronta i prezzi effettivi con una stima di quelli che ci sarebbero stati senza guerra. Il metodo è lo stesso del <a href="https://iranwarcost.watson.brown.edu/" target="_blank" rel="noreferrer">tracker della Brown University</a> per gli Stati Uniti e del nostro <a href="https://pietrovaletto.github.io/eu-iran-war-fuel-cost/" target="_blank" rel="noreferrer">tracker europeo</a>.</p>
        <p className="formula">Costo extra = Σ<sub>giorni</sub> (prezzo effettivo − prezzo senza guerra) × litri consumati</p>

        <h3>Prezzi</h3>
        <p>Prezzi medi nazionali di benzina e gasolio, con e senza tasse, dall'Oil Bulletin settimanale della Commissione europea (rilevati il lunedì, ultimo bollettino: {longDate(it.endDate)}), interpolati al giorno. Dopo l'ultimo bollettino il contatore prosegue in tempo reale al ritmo dell'ultima settimana. Le accise e l'IVA vengono dalle tabelle fiscali dello stesso bollettino.</p>

        <h3>Prezzo senza guerra</h3>
        <p>Si parte dal prezzo dell'ultimo bollettino prima della guerra ({longDate(it.lastPrewarBulletin)}) e lo si fa muovere solo con l'andamento stagionale normale: la variazione media settimanale del prezzo industriale europeo (al netto delle tasse) nel 2021–2025, come nel tracker USA. L'accisa resta al livello di prima della guerra, l'IVA al 22%. Il 2022 comprende lo shock dopo l'invasione dell'Ucraina e gonfia il rialzo "normale" di primavera; escludendolo il totale salirebbe a circa {euroShort(it.sensitivityEx2022)}.</p>

        <h3>Litri e regioni</h3>
        <p>I consumi vengono dal Bollettino petrolifero del Ministero dell'ambiente e della sicurezza energetica (MASE, tabella 10: vendite provinciali mensili, in tonnellate), sommati per regione e mediati sul 2021–2025 per ogni mese (ultimo mese pubblicato: {monthName(it.maseLatestMonth)}). Conversione: 1.342 litri per tonnellata di benzina, 1.195 di gasolio. Il rincaro al litro è quello medio nazionale: le differenze di prezzo tra regioni sono di pochi centesimi, mentre i consumi cambiano molto. Le famiglie per regione vengono da Eurostat ({it.householdsYear}).</p>

        <h3>I tre gruppi</h3>
        <p><strong>Automobilisti</strong>: tutta la benzina e il gasolio venduto in rete (stazioni ordinarie e autostradali), al prezzo alla pompa con le tasse. Include anche furgoni e camion che fanno il pieno al distributore. <strong>Autotrasporto</strong>: il gasolio "extra rete", consegnato ai depositi di flotte e imprese. Le imprese recuperano l'IVA e, per i mezzi da 7,5 tonnellate in su, ricevono ogni trimestre il rimborso dell'accisa oltre 403,22 € per mille litri. Il loro costo extra è quindi il rincaro del prezzo industriale; i tagli d'accisa non le riguardano. L'extra rete comprende anche altri utilizzatori (cantieri, trasporto pubblico, industria). <strong>Agricoltura</strong>: il gasolio agricolo, con accisa al 22% dell'ordinaria e IVA recuperabile. Il suo costo extra è il rincaro industriale più il 22% delle variazioni d'accisa. Per autotrasporto e agricoltura si assume che il prezzo industriale segua quello del gasolio per autotrazione.</p>

        <h3>Lo Stato</h3>
        <p>I tagli d'accisa sono la differenza tra quanto avrebbero pagato automobilisti e agricoltori con le accise di prima della guerra e quanto hanno pagato davvero. L'IVA extra è il 22% del rincaro industriale pagato alla pompa: è un'approssimazione, perché anche una parte delle vendite in rete va a imprese che recuperano l'IVA.</p>

        <h3>Limiti</h3>
        <p>I prezzi sono settimanali e nazionali; i consumi sono medie storiche e non riflettono eventuali cali dei consumi nel 2026; "per famiglia" include il costo delle imprese. Il codice e i dati sono pubblici.</p>
      </div>
    </dialog>
  );
}
