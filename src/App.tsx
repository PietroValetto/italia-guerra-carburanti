import { useEffect, useState } from "react";
import { ChiPaga } from "./ChiPaga";
import { Data, loadAll } from "./data";
import { Metodo, RegionPanel } from "./Dialogs";
import { Headline } from "./Headline";
import { Prezzi } from "./Prezzi";
import { Regioni } from "./Regioni";
import { longDate, monthName, perLitre } from "./format";

const REPO_URL = "https://github.com/PietroValetto/italia-guerra-carburanti";
const EU_URL = "https://pietrovaletto.github.io/eu-iran-war-fuel-cost/";
const BROWN_URL = "https://iranwarcost.watson.brown.edu/";

export default function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [showMethod, setShowMethod] = useState(false);

  useEffect(() => { loadAll().then(setData).catch((e) => setError(String(e))); }, []);

  // Le pagine regionali si possono condividere: /#ITF6 apre la Calabria.
  useEffect(() => {
    if (!data) return;
    const sync = () => {
      const h = window.location.hash.replace("#", "").toUpperCase();
      setRegion(data.regions[h] ? h : null);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [data]);
  const openRegion = (c: string) => { window.location.hash = c; };
  const closeRegion = () => { history.replaceState(null, "", window.location.pathname + window.location.search); setRegion(null); };

  if (error) return <main className="page"><p className="lede">Impossibile caricare i dati: {error}</p></main>;
  if (!data) return <main className="page"><p className="lede">Caricamento dei dati…</p></main>;
  const it = data.it;

  return (
    <main className="page">
      <header className="masthead">
        <a className="brand" href="https://populareconomics.substack.com/" target="_blank" rel="noreferrer">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span>Popular Economics</span>
        </a>
        <a className="chip" href={EU_URL} target="_blank" rel="noreferrer">Tracker UE →</a>
      </header>

      <div className="title-row">
        <h1>Quanto ci costa la guerra in Iran: il carburante in Italia</h1>
        <button className="chip" onClick={() => setShowMethod(true)}>Metodologia</button>
      </div>
      <span className="amber-rule" aria-hidden="true" />
      <p className="intro">
        Dal 28 febbraio 2026 il gasolio è passato da {perLitre(it.prices.gasolio.warStart)} a {perLitre(it.prices.gasolio.now)} e la benzina
        da {perLitre(it.prices.benzina.warStart)} a {perLitre(it.prices.benzina.now)}. Dopo la fine dello sconto fisso sulle accise del gasolio,
        il 6 ottobre, autotrasportatori e agricoltori protestano in Sicilia, Calabria, Puglia, Basilicata, Campania e Molise
        (<a href="https://www.ilpost.it/2026/10/16/proteste-autotrasportatori-sud-italia/" target="_blank" rel="noreferrer">Il Post</a>,{" "}
        <a href="https://www.ansa.it/sito/notizie/topnews/2026/10/19/ancora-proteste-autotrasportatori-rischio-rincari-sugli-scaffali_01bf540f-d7f7-4ed6-b227-d9e96b5f78ce.html" target="_blank" rel="noreferrer">ANSA</a>).
        Questo tracker misura quanto hanno pagato in più famiglie, autotrasporto e agricoltura, regione per regione, con dati ufficiali
        e lo stesso metodo del <a href={BROWN_URL} target="_blank" rel="noreferrer">tracker della Brown University</a> per gli Stati Uniti.
      </p>

      <Headline data={data} />
      <ChiPaga data={data} />
      <Regioni data={data} onSelect={openRegion} />
      <Prezzi data={data} />

      <footer className="status">
        <p>✓ Prezzi: EU Weekly Oil Bulletin, ultimo bollettino del {longDate(it.endDate)}</p>
        <p>✓ Consumi: MASE, Bollettino petrolifero, vendite provinciali fino a {monthName(it.maseLatestMonth)}</p>
        <p>✓ Famiglie: Eurostat, {it.householdsYear}</p>
        <p>Dati aggiornati il {new Date(it.builtAt).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}</p>
        <p className="credit">
          Un progetto di <a href="https://populareconomics.substack.com/" target="_blank" rel="noreferrer">Popular Economics</a>. Metodo adattato dall'
          <a href={BROWN_URL} target="_blank" rel="noreferrer">Iran War Energy Cost Tracker</a> della Brown University (Climate Solutions Lab).
          Vedi anche il <a href={EU_URL} target="_blank" rel="noreferrer">tracker europeo</a>. Codice e dati su <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>.
        </p>
      </footer>

      {region && <RegionPanel key={region} data={data} code={region} onClose={closeRegion} />}
      {showMethod && <Metodo data={data} onClose={() => setShowMethod(false)} />}
    </main>
  );
}
