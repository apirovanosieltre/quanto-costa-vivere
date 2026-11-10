/** Normalized public-source records. No invented local rates. */
export interface LocalTaxRecord {
  municipalityCode: string;
  municipality: string;
  region: string;
  taxYear: number;
  regionalAdditionalRate: number | null;
  municipalAdditionalRate: number | null;
  exemptionThreshold: number | null;
  complexRules: boolean;
  sourceUrl: string;
  retrievedAt: string;
}
export interface DataEnvelope<T> {
  data: T;
  source: string;
  referencePeriod: string;
  updatedAt: string;
  methodology: string;
}
/** Only flat-rate records may be calculated by multiplication. */
export function calculateLocalAdditionalTax(record: LocalTaxRecord, taxableIncome: number): { amount: number | null; reason?: string } {
  if (!Number.isFinite(taxableIncome) || taxableIncome < 0) return { amount: null, reason: 'Reddito non valido' };
  if (record.complexRules || record.regionalAdditionalRate === null || record.municipalAdditionalRate === null) return { amount: null, reason: 'Regole locali non disponibili o a scaglioni: consultare la fonte' };
  if (record.exemptionThreshold !== null && taxableIncome <= record.exemptionThreshold) {
    // Regional exemption is not necessarily identical to municipal exemption: do not assume.
    return { amount: null, reason: 'Esenzione da verificare separatamente per ciascuna addizionale' };
  }
  return { amount: Math.round(taxableIncome * (record.regionalAdditionalRate + record.municipalAdditionalRate) * 100) / 100 };
}
