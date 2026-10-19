export type Group = "automobilisti" | "autotrasporto" | "agricoltura";
export const GROUPS: Group[] = ["automobilisti", "autotrasporto", "agricoltura"];
export type Fuel = "benzina" | "gasolio";

export interface Italia {
  warStartDate: string;
  lastPrewarBulletin: string;
  endDate: string;
  measuredThrough: string;
  daysSinceWar: number;
  groups: Record<Group, number>;
  dailyRate: Record<Group, number>;
  total: number;
  households: number;
  householdsYear: number;
  perHousehold: number;
  stato: { tagliAccise: number; ivaExtra: number };
  perLitreNow: { benzina_pompa: number; gasolio_pompa: number; industriale: number; agricolo: number };
  prices: Record<Fuel, { warStart: number; now: number; pctChange: number; pretaxWarStart: number; pretaxNow: number; noWarNow: number }>;
  litresPerDay: { benzina: number; gasolio_rete: number; gasolio_extrarete: number; agricolo: number };
  exciseTimeline: { date: string; fuel: Fuel; from: number; to: number }[];
  sensitivityEx2022: number;
  builtAt: string;
  maseLatestMonth: string;
}

export interface Region {
  name: string;
  households: number;
  groups: Record<Group, number>;
  dailyRate: Record<Group, number>;
  total: number;
  perHousehold: number;
  automobilistiPerHousehold: number;
  stato: { tagliAccise: number; ivaExtra: number };
  litresPerDay: Italia["litresPerDay"];
  rank: { total: number; perHousehold: number };
}

export interface Point { date: string; price: number; noWar: number | null }
export interface Prezzi { benzina: Point[]; gasolio: Point[]; bulletins: string[] }

export interface Data { it: Italia; regions: Record<string, Region>; householdsYear: number; prezzi: Prezzi }

const get = <T,>(name: string): Promise<T> =>
  fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((r) => {
    if (!r.ok) throw new Error(`${name}: ${r.status}`);
    return r.json() as Promise<T>;
  });

export async function loadAll(): Promise<Data> {
  const [it, reg, prezzi] = await Promise.all([
    get<Italia>("italia"), get<{ householdsYear: number; regions: Record<string, Region> }>("regioni"), get<Prezzi>("prezzi"),
  ]);
  return { it, regions: reg.regions, householdsYear: reg.householdsYear, prezzi };
}

export const GROUP_LABEL: Record<Group, string> = {
  automobilisti: "Automobilisti",
  autotrasporto: "Autotrasporto",
  agricoltura: "Agricoltura",
};
export const GROUP_SUB: Record<Group, string> = {
  automobilisti: "benzina e gasolio alla pompa",
  autotrasporto: "gasolio extra rete: flotte e depositi",
  agricoltura: "gasolio agricolo",
};
