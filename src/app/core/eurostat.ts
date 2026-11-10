/** Parser JSON-stat 2.0 per l'API ufficiale Eurostat. Non interpola dati mancanti. */
export interface EurostatDataset {
  id: string[];
  size: number[];
  dimension: Record<string, { category?: { index?: Record<string, number> | string[] } }>;
  value: Record<string, number | null> | Array<number | null>;
  updated?: string;
}
export interface InflationObservation {
  period: string;
  annualRate: number;
  geography: 'IT';
  category: 'TOTAL';
  source: 'Eurostat';
  sourceUrl: string;
  dataset: 'prc_hicp_minr';
  sourceUpdatedAt: string | null;
  retrievedAt: string;
}
export interface InflationHistoryPoint { period: string; annualRate: number; }
export interface InflationSeriesResponse extends InflationObservation {
  history: InflationHistoryPoint[];
}
export const INFLATION_SOURCE_URL = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=IT&coicop18=TOTAL&unit=RCH_A&freq=M&lastTimePeriod=12&lang=EN';

function entries(dataset: EurostatDataset, dimension: string): [string, number][] {
  const values = dataset.dimension[dimension]?.category?.index;
  if (Array.isArray(values)) return values.map((key, index) => [key, index]);
  if (values && typeof values === 'object') return Object.entries(values);
  throw new Error('Dimensione Eurostat non disponibile: ' + dimension);
}

/**
 * Valida le dimensioni JSON-stat e restituisce i mesi con osservazioni reali
 * ordinati cronologicamente. Nessun riempimento per i mesi mancanti.
 */
export function parseItalianInflationSeries(raw: unknown, retrievedAt: string): InflationSeriesResponse {
  if (!raw || typeof raw !== 'object') throw new Error('Risposta Eurostat non valida');
  const d = raw as EurostatDataset;
  if (!Array.isArray(d.id) || !Array.isArray(d.size) || !d.dimension || !d.value ||
      d.id.length !== d.size.length || new Set(d.id).size !== d.id.length) {
    throw new Error('Schema JSON-stat incompleto');
  }
  const required: Record<string, string> = { freq: 'M', unit: 'RCH_A', geo: 'IT', coicop18: 'TOTAL' };
  const timeKey = d.id.includes('time') ? 'time' : 'time_period';
  const timeIndex = d.id.indexOf(timeKey);
  if (timeIndex < 0 || d.id.length !== 5) throw new Error('Dimensioni Eurostat inattese');
  const positions = d.id.map((key, index) => {
    const size = d.size[index];
    if (!Number.isInteger(size) || size < 1) throw new Error('Dimensioni Eurostat incoerenti');
    if (key === timeKey) return 0;
    if (!(key in required)) throw new Error('Dimensione Eurostat inattesa: ' + key);
    const option = entries(d, key).find(([name]) => name === required[key]);
    if (!option || !Number.isInteger(option[1]) || option[1] < 0 || option[1] >= size) {
      throw new Error('Filtro Eurostat mancante: ' + key);
    }
    return option[1];
  });
  const history: InflationHistoryPoint[] = [];
  for (const [period, index] of entries(d, timeKey).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Number.isInteger(index) ||
        index < 0 || index >= d.size[timeIndex]) continue;
    positions[timeIndex] = index;
    const flatIndex = positions.reduce((acc, part, i) => acc * d.size[i] + part, 0);
    const value = Array.isArray(d.value) ? d.value[flatIndex] : d.value[String(flatIndex)];
    if (typeof value === 'number' && Number.isFinite(value) && value > -100 && value < 1000) {
      history.push({ period, annualRate: value });
    }
  }
  if (!history.length) throw new Error('Nessun dato ufficiale disponibile');
  const recent = history.slice(-12);
  const latest = recent[recent.length - 1];
  return {
    period: latest.period, annualRate: latest.annualRate, history: recent,
    geography: 'IT', category: 'TOTAL', source: 'Eurostat', dataset: 'prc_hicp_minr',
    sourceUrl: INFLATION_SOURCE_URL, sourceUpdatedAt: d.updated ?? null, retrievedAt
  };
}

/** Compatibilita' con i calcolatori che necessitano soltanto del mese piu' recente. */
export function parseLatestItalianInflation(raw: unknown, retrievedAt: string): InflationObservation {
  const { history: _history, ...latest } = parseItalianInflationSeries(raw, retrievedAt);
  return latest;
}
