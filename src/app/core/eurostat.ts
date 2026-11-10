/** Parser JSON-stat 2.0 usato dall'API pubblica Eurostat. Non interpola dati mancanti. */
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

export const INFLATION_SOURCE_URL = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=IT&coicop18=TOTAL&unit=RCH_A&freq=M&lastTimePeriod=12&lang=EN';

function entries(dataset: EurostatDataset, dimension: string): [string, number][] {
  const values = dataset.dimension[dimension]?.category?.index;
  if (Array.isArray(values)) return values.map((key, index) => [key, index]);
  if (values && typeof values === 'object') return Object.entries(values);
  throw new Error(`Dimensione Eurostat non disponibile: ${dimension}`);
}

/** Calcola l'indice lineare JSON-stat a partire dalle posizioni di ogni dimensione. */
export function parseLatestItalianInflation(raw: unknown, retrievedAt: string): InflationObservation {
  if (!raw || typeof raw !== 'object') throw new Error('Risposta Eurostat non valida');
  const dataset = raw as EurostatDataset;
  if (!Array.isArray(dataset.id) || !Array.isArray(dataset.size) || !dataset.dimension || !dataset.value || dataset.id.length !== dataset.size.length) {
    throw new Error('Schema JSON-stat incompleto');
  }
  const required: Record<string, string> = { freq: 'M', unit: 'RCH_A', geo: 'IT', coicop18: 'TOTAL' };
  const positions: number[] = dataset.id.map((key, index) => {
    if (!Number.isInteger(dataset.size[index]) || dataset.size[index] < 1) throw new Error('Dimensioni Eurostat incoerenti');
    if (key === 'time' || key === 'time_period') return 0;
    if (!(key in required)) throw new Error(`Dimensione Eurostat inattesa: ${key}`);
    const found = entries(dataset, key).find(([name]) => name === required[key]);
    if (!found) throw new Error(`Filtro Eurostat mancante: ${key}=${required[key]}`);
    return found[1];
  });
  const timeKey = dataset.id.includes('time') ? 'time' : 'time_period';
  const timeIndex = dataset.id.indexOf(timeKey);
  if (timeIndex < 0) throw new Error('Serie temporale Eurostat assente');
  const timeValues = entries(dataset, timeKey).sort((a, b) => b[0].localeCompare(a[0]));
  for (const [period, timePosition] of timeValues) {
    if (!/^\d{4}-\d{2}$/.test(period)) continue;
    positions[timeIndex] = timePosition;
    const flatIndex = positions.reduce((sum, part, i) => sum * dataset.size[i] + part, 0);
    const value = Array.isArray(dataset.value) ? dataset.value[flatIndex] : dataset.value[String(flatIndex)];
    if (typeof value === 'number' && Number.isFinite(value) && value > -100 && value < 1000) {
      return { period, annualRate: value, geography: 'IT', category: 'TOTAL', dataset: 'prc_hicp_minr',
        source: 'Eurostat', sourceUrl: INFLATION_SOURCE_URL, sourceUpdatedAt: dataset.updated ?? null, retrievedAt };
    }
  }
  throw new Error('Nessun dato di inflazione disponibile nella risposta');
}
