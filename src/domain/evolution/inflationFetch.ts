import { CONFIG } from '../config';

const INFLATION_API_TIMEOUT_MS = 5000;

export interface InflationSeriesResult {
  values: Record<string, number>;
  source: string;
  period: string;
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function recordFromYearNumberMap(series: Record<number, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(series).map(([y, v]) => [String(y), v]));
}

function fallbackResult(): InflationSeriesResult {
  return {
    values: recordFromYearNumberMap(CONFIG.INFLATION_FALLBACK_SERIES),
    source: 'INSEE (données intégrées)',
    period: CONFIG.INFLATION_FALLBACK_PERIOD,
  };
}

/**
 * Parse la réponse JSON Eurostat `prc_hicp_aind` avec `unit=RCH_A_AVG` (taux annuel %, pas l’indice).
 * @see parseEurostatHicpInflation
 */
export function parseEurostatHicpInflation(json: unknown): Record<string, number> | null {
  try {
    const j = json as {
      dimension?: { time?: { category?: { index?: Record<string, number> } } };
      value?: Record<string, number>;
    };
    const timeIdx = j.dimension?.time?.category?.index;
    const values = j.value;
    if (!timeIdx || !values || typeof values !== 'object') return null;
    const inflation: Record<string, number> = {};
    for (const [year, pos] of Object.entries(timeIdx)) {
      const v = values[String(pos)];
      if (v != null && Number.isFinite(Number(v))) {
        inflation[year] = Math.round(Number(v) * 100) / 100;
      }
    }
    return Object.keys(inflation).length >= 5 ? inflation : null;
  } catch {
    return null;
  }
}

/** @internal Réponse brute indicateur Banque mondiale (tableau [méta, lignes]). */
export function parseWorldBankInflationResponse(data: unknown): Record<string, number> | null {
  try {
    const arr = data as [
      { per_page?: number } | null,
      Array<{ date: string; value: number | null }>?,
    ];
    const rows = arr?.[1];
    if (!rows || rows.length === 0) return null;
    const inflation: Record<string, number> = {};
    for (const item of rows) {
      if (item.value !== null && item.value !== undefined && Number.isFinite(Number(item.value))) {
        inflation[item.date] = Number.parseFloat(Number(item.value).toFixed(2));
      }
    }
    return Object.keys(inflation).length >= 5 ? inflation : null;
  } catch {
    return null;
  }
}

function sortedYearSpan(values: Record<string, number>): string {
  const years = Object.keys(values)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (years.length === 0) return '';
  return `${years[0]}-${years[years.length - 1]}`;
}

/**
 * Cascade Eurostat (taux RCH_A_AVG) → Banque mondiale (IPC) → série de secours CONFIG.
 * Ne lève pas : renvoie toujours au minimum le jeu de secours CONFIG.
 */
export async function fetchInflationSeries(): Promise<InflationSeriesResult> {
  try {
    const yearEnd = new Date().getFullYear();
    const n = CONFIG.INFLATION_AVG_WINDOW_YEARS;

    const eurostatUrl =
      'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_aind' +
      `?format=JSON&lang=fr&geo=FR&coicop=CP00&unit=RCH_A_AVG&lastTimePeriod=${n}`;

    try {
      const resEu = await fetchWithTimeout(eurostatUrl, INFLATION_API_TIMEOUT_MS);
      if (resEu.ok) {
        const jsonEu = (await resEu.json()) as unknown;
        const fromEu = parseEurostatHicpInflation(jsonEu);
        if (fromEu) {
          return {
            values: fromEu,
            source: 'Eurostat (IPCH France, taux annuel moyen)',
            period: sortedYearSpan(fromEu),
          };
        }
      }
    } catch {
      /* cascade */
    }

    const wbFrom = Math.max(1995, yearEnd - 34);
    const wbUrl = `https://api.worldbank.org/v2/country/FR/indicator/FP.CPI.TOTL.ZG?format=json&date=${wbFrom}:${yearEnd}&per_page=50`;

    try {
      const resWb = await fetchWithTimeout(wbUrl, INFLATION_API_TIMEOUT_MS);
      if (resWb.ok) {
        const data = (await resWb.json()) as unknown;
        const fromWb = parseWorldBankInflationResponse(data);
        if (fromWb) {
          return {
            values: fromWb,
            source: 'Banque mondiale (IPC, % annuel)',
            period: sortedYearSpan(fromWb),
          };
        }
      }
    } catch {
      /* fallback */
    }

    return fallbackResult();
  } catch {
    return fallbackResult();
  }
}
