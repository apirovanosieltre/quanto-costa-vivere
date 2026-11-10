import { calculateMunicipalAdditional, type MunicipalDataset, type MunicipalRecord } from './municipal-data';
import type { RegionalMefDataset, RegionalMefRecord } from './mef-regional';

export type TaxCalculationStatus = 'calculated' | 'excluded' | 'unavailable';
export interface TaxLine {
  status: TaxCalculationStatus;
  amount: number | null;
  note: string;
}
export interface LocalTaxResult {
  municipal: TaxLine;
  regional: TaxLine;
  localTotal: number | null;
  complete: boolean;
  yearlyNetAfterLocal: number | null;
  monthlyAverageAfterLocal: number | null;
}
const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const unsupported = (note: string): TaxLine => ({ status: 'unavailable', amount: null, note });

/** Con IRPEF nazionale netta nulla, le addizionali ordinarie non sono dovute. */
export function estimateMunicipal2026(
  record: MunicipalRecord | null,
  dataset: MunicipalDataset | null,
  taxableIncome: number,
  nationalIrpefDue: number
): TaxLine {
  if (!Number.isFinite(taxableIncome) || taxableIncome < 0 || !Number.isFinite(nationalIrpefDue)) {
    return unsupported('Imponibile o IRPEF nazionale non valido.');
  }
  if (nationalIrpefDue <= 0) return { status:'excluded', amount:0,
    note:'Addizionale non dovuta in assenza di IRPEF nazionale netta.' };
  if (!record || !dataset?.published || dataset.taxYear !== 2026 || !dataset.review) {
    return unsupported('Dati comunali 2026 non pubblicati o senza revisione.');
  }
  const result = calculateMunicipalAdditional(record, taxableIncome);
  if (result === null) return unsupported('Aliquota comunale non calcolabile: delibera pendente o regola speciale.');
  return { status:'calculated', amount:result, note: record.exemptionThreshold === null
    ? 'Aliquota unica comunale del dataset MEF revisionato.'
    : 'Esenzione generale applicata fino alla soglia; oltre, aliquota sull’intero imponibile.' };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[’`]/g,"'").replace(/\s+/g,' ').trim();
}
/** Profilo ristretto revisionabile: le condizioni sono riconosciute dalla disposizione ufficiale.
 * Gli altri territori devono essere implementati con regole esplicite, non estrapolate dalle fasce.
 */
export function estimateRegional2026(
  region: string, dataset: RegionalMefDataset | null,
  taxableIncome: number, nationalIrpefDue: number
): TaxLine {
  if (!Number.isFinite(taxableIncome) || taxableIncome < 0 || !Number.isFinite(nationalIrpefDue)) {
    return unsupported('Imponibile o IRPEF nazionale non valido.');
  }
  if (nationalIrpefDue <= 0) return { status:'excluded', amount:0,
    note:'Addizionale non dovuta in assenza di IRPEF nazionale netta.' };
  if (!dataset || dataset.year !== 2026 || !Array.isArray(dataset.records)) {
    return unsupported('Dati MEF regionali 2026 non disponibili.');
  }
  const chosen=dataset.records.filter(r=>r.region === region);
  if (chosen.length !== 1) {
    return unsupported('La regione prevede più fasce o regole non ancora validate per il calcolo automatico.');
  }
  const row: RegionalMefRecord=chosen[0];
  const disposition=normalize(row.disposition);
  const name=normalize(row.region);
  const band=normalize(row.bandLabel);
  const valle = name === "regione valle d'aosta" && band === 'aliquota unica'
    && row.ratePct === 1.23
    && disposition.includes('fino a 15.000 euro')
    && disposition.includes('oltre 15.000 euro')
    && disposition.includes("sull'intero imponibile");
  if (!valle) return unsupported('Regola regionale non verificata per un calcolo automatico.');
  if (taxableIncome <= 15_000) return {status:'calculated',amount:0,
    note:'Esenzione generale Valle d’Aosta fino a 15.000 € (disposizione MEF 2026).'};
  return {status:'calculated', amount:round(taxableIncome * row.ratePct / 100),
    note:'Valle d’Aosta: aliquota unica 1,23% sull’intero imponibile oltre 15.000 €.'};
}

export function estimateLocalTaxes2026(input:{
  municipal: MunicipalRecord | null;
  municipalDataset: MunicipalDataset | null;
  regionalDataset: RegionalMefDataset | null;
  region: string;
  taxableIncome: number;
  nationalIrpefDue: number;
  yearlyBeforeLocal: number;
  installments: 12 | 13 | 14;
}):LocalTaxResult {
  const municipal=estimateMunicipal2026(input.municipal,input.municipalDataset,input.taxableIncome,input.nationalIrpefDue);
  const regional=estimateRegional2026(input.region,input.regionalDataset,input.taxableIncome,input.nationalIrpefDue);
  const complete=municipal.amount!==null && regional.amount!==null
    && Number.isFinite(input.yearlyBeforeLocal) && Number.isFinite(input.installments);
  const localTotal=complete ? round(municipal.amount!+regional.amount!) : null;
  const yearlyNetAfterLocal=localTotal===null ? null : round(input.yearlyBeforeLocal-localTotal);
  return {
    municipal, regional, complete, localTotal,
    yearlyNetAfterLocal,
    monthlyAverageAfterLocal:yearlyNetAfterLocal===null?null:round(yearlyNetAfterLocal/input.installments)
  };
}
