export interface MunicipalRecord {
  code: string;
  municipality: string;
  province: string;
  status: 'simple'|'needs-review'|'pending';
  ratePct: number | null;
  exemptionThreshold: number | null;
  reason: string;
}
export interface MunicipalDataset {
  schemaVersion: 1;
  taxYear: 2026;
  sourceUrl: string;
  retrievedAt: string | null;
  published: boolean;
  records: MunicipalRecord[];
  report: { rows: number; simple: number; needsReview: number; pending: number };
}
/** L'esenzione comunale totale opera fino alla soglia. Oltre la soglia l'aliquota si applica all'intero imponibile. */
export function calculateMunicipalAdditional(record: MunicipalRecord, taxableIncome: number): number | null {
  if (!Number.isFinite(taxableIncome) || taxableIncome < 0 || record.status!=='simple' || record.ratePct===null) return null;
  if (record.exemptionThreshold !== null && taxableIncome <= record.exemptionThreshold) return 0;
  return Math.round(taxableIncome * record.ratePct) / 100;
}
export function validateMunicipalDataset(raw: unknown): MunicipalDataset {
  if (!raw || typeof raw!=='object') throw new Error('Dataset comunale non valido');
  const data=raw as MunicipalDataset;
  if (data.schemaVersion!==1 || data.taxYear!==2026 || !Array.isArray(data.records) || typeof data.published!=='boolean') throw new Error('Schema MEF incompatibile');
  if (data.records.some(r=> !/^[A-Z][0-9]{3}$/.test(r.code) || !['simple','needs-review','pending'].includes(r.status)
    || (r.status==='simple' && (r.ratePct===null || !Number.isFinite(r.ratePct) || r.ratePct<0 || r.ratePct>1.5)))) throw new Error('Valori MEF invalidi');
  return data;
}
