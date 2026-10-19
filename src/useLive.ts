import { useEffect, useState } from "react";

/**
 * L'Oil Bulletin è settimanale: il costo è misurato fino all'ultimo bollettino e poi stimato in tempo reale,
 * sull'orologio di chi visita la pagina, al ritmo giornaliero dell'ultima settimana.
 */
export function useLive(measured: number, dailyRate: number, measuredThrough: string): number {
  const since = new Date(measuredThrough).getTime();
  const calc = () => measured + Math.max(0, (Date.now() - since) / 86_400_000) * dailyRate;
  const [v, setV] = useState(calc);
  useEffect(() => {
    const id = window.setInterval(() => setV(calc()), 100);
    return () => window.clearInterval(id);
  }, [measured, dailyRate, measuredThrough]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}
