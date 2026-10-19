# Caro carburante in Italia: quanto ci costa la guerra in Iran

Quanto hanno speso in più **automobilisti, autotrasporto e agricoltura** italiani per benzina e gasolio dall'inizio della guerra in Iran (28 febbraio 2026), **regione per regione**.

Un progetto di [Popular Economics](https://populareconomics.substack.com/). Metodo adattato dall'[Iran War Energy Cost Tracker](https://iranwarcost.watson.brown.edu/) della Brown University; versione europea: [eu-iran-war-fuel-cost](https://github.com/PietroValetto/eu-iran-war-fuel-cost).

## Metodo

`costo extra = Σ giorni (prezzo effettivo − prezzo senza guerra) × litri consumati`

| Dato | Fonte |
|---|---|
| Prezzi medi nazionali con e senza tasse, accise, IVA (settimanali) | EU Weekly Oil Bulletin (Commissione europea) |
| Prezzo senza guerra | prezzo dell'ultimo bollettino pre-guerra mosso solo dalla stagionalità media 2021–2025 del prezzo industriale UE; accisa pre-guerra, IVA 22% |
| Vendite mensili per regione: benzina, gasolio in rete, gasolio extra rete, gasolio agricolo | MASE, Bollettino petrolifero, tab. 10 (media 2021–2025 per mese) |
| Famiglie per regione | Eurostat `lfst_r_lfsd2hh` |

Gruppi: **automobilisti** (prezzo alla pompa, tasse incluse); **autotrasporto** (gasolio extra rete: IVA recuperata, accisa netta fissa a 0,40322 €/l grazie al rimborso → solo rincaro industriale); **agricoltura** (accisa al 22% dell'ordinaria, IVA recuperata); **Stato** (tagli d'accisa e IVA extra).

## Uso

```bash
python3 -m venv .venv && .venv/bin/pip install -r pipeline/requirements.txt
.venv/bin/python pipeline/build.py      # scrive public/data/*.json
npm install && npm run dev
```

Confini regionali: © EuroGeographics (Eurostat GISCO NUTS 2021).
