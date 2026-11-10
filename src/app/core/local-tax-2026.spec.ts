import { describe, expect, it } from 'vitest';
import { estimateMunicipal2026, estimateRegional2026, estimateLocalTaxes2026 } from './local-tax-2026';
import type { MunicipalDataset, MunicipalRecord } from './municipal-data';
import type { RegionalMefDataset } from './mef-regional';

const municipal:MunicipalRecord={code:'A008',municipality:'ABBATEGGIO',province:'PE',
  status:'simple',ratePct:0.5,exemptionThreshold:null,reason:''};
const municipalExempt:MunicipalRecord={...municipal,code:'A006',exemptionThreshold:12000,ratePct:0.6};
const dataset:MunicipalDataset={
  schemaVersion:1,taxYear:2026,sourceUrl:'https://www1.finanze.gov.it/source',
  retrievedAt:'2026-11-10T10:00:00Z',published:true,records:[municipal,municipalExempt],
  report:{rows:2,simple:2,needsReview:0,pending:0},
  review:{status:'approved',sourceSha256:'a'.repeat(64),reviewedAt:'2026-11-10',
    method:'conservative-csv-schema-and-sample-audit',sampleCodes:['A008','A006','A008','A006']}
};
const regional:RegionalMefDataset={
  year:2026,source:'MEF - Dipartimento delle Finanze',
  sourceUrl:'https://www1.finanze.gov.it/regioni',
  retrievedAt:'2026-11-10',calculable:false,
  records:[{
    region:"REGIONE VALLE D'AOSTA",ratePct:1.23,bandLabel:'Aliquota Unica',
    disposition:"Per il periodo di imposta 2026, i soggetti con reddito complessivo fino a 15.000 euro sono esentati. Ai soggetti con reddito complessivo oltre 15.000 euro si applica l'aliquota ordinaria sull'intero imponibile.",
    regulation:'LR 2025',publicationDate:'19-GEN-26',notes:''
  }]
};
describe('calcolo addizionali 2026 in casi strettamente verificati',()=>{
  it('applica aliquota unica e si ferma senza dataset revisionato',()=>{
    expect(estimateMunicipal2026(municipal,dataset,30000,5000).amount).toBe(150);
    expect(estimateMunicipal2026(municipal,{...dataset,review:undefined},30000,5000).amount).toBeNull();
  });
  it('rispetta esenzione generale e calcola sul reddito intero oltre la soglia',()=>{
    expect(estimateMunicipal2026(municipalExempt,dataset,12000,3000).amount).toBe(0);
    expect(estimateMunicipal2026(municipalExempt,dataset,12001,3000).amount).toBe(72.01);
  });
  it('senza IRPEF nazionale netta dovuta, nessuna addizionale',()=>{
    expect(estimateMunicipal2026(null,null,18000,0).amount).toBe(0);
    expect(estimateRegional2026('',null,18000,0).amount).toBe(0);
  });
  it('usa esclusivamente la regola esplicita verificata per Valle d’Aosta',()=>{
    expect(estimateRegional2026("REGIONE VALLE D'AOSTA",regional,15000,1000).amount).toBe(0);
    expect(estimateRegional2026("REGIONE VALLE D'AOSTA",regional,30000,1000).amount).toBe(369);
    expect(estimateRegional2026('REGIONE LOMBARDIA',regional,30000,1000).amount).toBeNull();
  });
  it('blocca qualsiasi cambio nel testo MEF prima di un ricalcolo',()=>{
    const altered={...regional,records:[{...regional.records[0],disposition:'Testo modificato'}]};
    expect(estimateRegional2026("REGIONE VALLE D'AOSTA",altered,30000,3000).amount).toBeNull();
  });
  it('mostra netto locale solo con entrambe le aliquote disponibili',()=>{
    const input={
      municipal,municipalDataset:dataset,regionalDataset:regional,
      region:"REGIONE VALLE D'AOSTA",taxableIncome:30000,nationalIrpefDue:4000,
      yearlyBeforeLocal:25000,installments:13 as const
    };
    const valid=estimateLocalTaxes2026(input);
    expect(valid.complete).toBe(true);
    expect(valid.localTotal).toBe(519);
    expect(valid.yearlyNetAfterLocal).toBe(24481);
    expect(estimateLocalTaxes2026({...input,regionalDataset:null}).complete).toBe(false);
  });
});
