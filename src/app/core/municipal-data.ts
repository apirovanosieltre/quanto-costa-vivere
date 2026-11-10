export interface MunicipalRecord {
  code:string;
  municipality:string;
  province:string;
  status:'simple'|'needs-review'|'pending';
  ratePct:number|null;
  exemptionThreshold:number|null;
  reason:string;
}
export interface MunicipalReview {
  status:'approved';
  sourceSha256:string;
  reviewedAt:string;
  method:'conservative-csv-schema-and-sample-audit';
  sampleCodes:string[];
}
export interface MunicipalDataset {
  schemaVersion:1;
  taxYear:2026;
  sourceUrl:string;
  retrievedAt:string|null;
  published:boolean;
  records:MunicipalRecord[];
  report:{rows:number;simple:number;needsReview:number;pending:number};
  review?:MunicipalReview;
}
/** Esenzione generale: zero fino alla soglia, aliquota sull'intero imponibile oltre. */
export function calculateMunicipalAdditional(record:MunicipalRecord,taxableIncome:number):number|null {
  if(!Number.isFinite(taxableIncome)||taxableIncome<0||record.status!=='simple'||record.ratePct===null)return null;
  if(record.exemptionThreshold!==null&&taxableIncome<=record.exemptionThreshold)return 0;
  return Math.round(taxableIncome*record.ratePct)/100;
}
export function validateMunicipalDataset(raw:unknown):MunicipalDataset {
  if(!raw||typeof raw!=='object')throw new Error('Dataset comunale non valido');
  const d=raw as MunicipalDataset;
  if(d.schemaVersion!==1||d.taxYear!==2026||typeof d.sourceUrl!=='string'||
    !d.sourceUrl.startsWith('https://www1.finanze.gov.it/')||
    !Array.isArray(d.records)||!d.report||typeof d.published!=='boolean')throw new Error('Schema MEF incompatibile');
  const codes=new Set<string>();
  for(const r of d.records) {
    if(!r||typeof r!=='object'||!/^[A-Z][0-9]{3}$/.test(r.code)||
      !r.municipality||typeof r.province!=='string'||!r.province||
      !['simple','needs-review','pending'].includes(r.status)||codes.has(r.code)) {
      throw new Error('Riga MEF non valida o duplicata');
    }
    codes.add(r.code);
    if(r.status==='simple') {
      if(typeof r.ratePct!=='number'||!Number.isFinite(r.ratePct)||r.ratePct<=0||r.ratePct>1.5||
        (r.exemptionThreshold!==null&&(!Number.isFinite(r.exemptionThreshold)||r.exemptionThreshold<=0))) {
        throw new Error('Aliquota semplice MEF non valida');
      }
    } else if(r.ratePct!==null||r.exemptionThreshold!==null) {
      throw new Error('Un caso non revisionato non può riportare un calcolo fiscale');
    }
  }
  if(d.published) {
    if(!d.review||d.review.status!=='approved'||
       !/^[a-f0-9]{64}$/.test(d.review.sourceSha256)||
       d.review.method!=='conservative-csv-schema-and-sample-audit'||
       !Array.isArray(d.review.sampleCodes)||d.review.sampleCodes.length<4||
       !d.review.sampleCodes.every(code=>codes.has(code))||
       !d.review.reviewedAt||!d.retrievedAt||
       d.report.rows!==d.records.length||
       d.report.simple!==d.records.filter(r=>r.status==='simple').length||
       d.report.needsReview!==d.records.filter(r=>r.status==='needs-review').length||
       d.report.pending!==d.records.filter(r=>r.status==='pending').length) {
      throw new Error('Dataset comunale pubblicato senza revisione o conteggi coerenti');
    }
  }
  return d;
}
