const eur0 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: number, d: number) => v.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });

export const euro = (v: number) => eur0.format(v);
export const euro2 = (v: number) => eur2.format(v);
export const perLitre = (v: number) => `${num(v, 3)} €/l`;
export const signedLitre = (v: number) => `${v >= 0 ? "+" : "−"}${num(Math.abs(v), 2)} €/l`;
export const pct = (v: number) => `${v >= 0 ? "+" : "−"}${num(Math.abs(v), 1)}%`;

/** 8,42 mld € / 578 mln € / 4.210 € */
export function euroShort(v: number): string {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e9) return `${s}${num(a / 1e9, 2)} mld €`;
  if (a >= 1e6) return `${s}${num(a / 1e6, a >= 1e8 ? 0 : 1)} mln €`;
  return eur0.format(v);
}
export const litresM = (v: number) => `${num(v / 1e6, 1)} mln di litri al giorno`;

export const longDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const shortDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
export const monthName = (ym: string) =>
  new Date(ym + "-15T12:00:00Z").toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
