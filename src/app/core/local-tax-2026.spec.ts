import { describe, expect, it } from 'vitest';
import { estimateMunicipal2026, estimateRegional2026, estimateLocalTaxes2026, progressiveTax, REGIONAL_PROFILES_2026 } from './local-tax-2026';
import { taxRegionFromProvince, isValidMunicipalRegion } from './italian-territories';
import { REGIONAL_MEF_PAGE_URL, type RegionalMefDataset, type RegionalMefRecord } from './mef-regional';
import type { MunicipalDataset, MunicipalRecord } from './municipal-data';

const municipal:MunicipalRecord={code:'A008',municipality:'ABBATEGGIO',province:'PE',status:'simple',ratePct:0.5,exemptionThreshold:null,reason:''};
const municipalExempt:MunicipalRecord={...municipal,code:'A006',exemptionThreshold:12000,ratePct:0.6};
const dataset:MunicipalDataset={
  schemaVersion:1,taxYear:2026,sourceUrl:'https://www1.finanze.gov.it/source',retrievedAt:'2026-11-10T10:00:00Z',
  published:true,records:[municipal,municipalExempt],report:{rows:2,simple:2,needsReview:0,pending:0},
  review:{status:'approved',sourceSha256:'a'.repeat(64),reviewedAt:'2026-11-10',
    method:'conservative-csv-schema-and-sample-audit',sampleCodes:['A008','A006','A008','A006']}
};
const base=(records:RegionalMefRecord[]):RegionalMefDataset=>({
  year:2026,source:'MEF - Dipartimento delle Finanze',sourceUrl:REGIONAL_MEF_PAGE_URL,
  retrievedAt:'2026-11-10',calculable:false,records
});
const lombardia=base([
  {region:'REGIONE LOMBARDIA',ratePct:1.23,bandLabel:'fino a 15000.00 euro'},
  {region:'REGIONE LOMBARDIA',ratePct:1.58,bandLabel:'oltre 15000.00 e fino a 28000.00 euro'},
  {region:'REGIONE LOMBARDIA',ratePct:1.72,bandLabel:'oltre 28000.00 e fino a 50000.00 euro'},
  {region:'REGIONE LOMBARDIA',ratePct:1.73,bandLabel:'oltre 50000.00 euro'}
].map(x=>({...x,regulation:'Art. 72, comma 1, legge regionale 14 luglio 2003, n. 10.',disposition:'',notes:'',publicationDate:'2026'})));
const valle=base([{
  region:"REGIONE VALLE D'AOSTA",ratePct:1.23,bandLabel:'Aliquota Unica',
  disposition:"Per il periodo di imposta 2026, i soggetti con reddito complessivo fino a 15.000 euro sono esentati dal pagamento dell'addizionale regionale all'IRPEF. Ai soggetti con reddito complessivo oltre 15.000 euro si applica l'aliquota ordinaria sull'intero imponibile.",
  regulation:'articolo 1 della legge regionale n. 29 del 23 dicembre 2025',notes:'',publicationDate:'19-GEN-26'
}]);
const progressiveFixture=(region:string,rates:number[],limits:number[],norm:string,disposition='',notes=''):RegionalMefDataset=>{
  const labels=limits.concat(Infinity).map((high,i)=> i===0
    ? 'fino a '+high.toFixed(2)+' euro'
    : high===Infinity?'oltre '+limits[i-1].toFixed(2)+' euro'
      :'oltre '+limits[i-1].toFixed(2)+' e fino a '+high.toFixed(2)+' euro');
  return base(rates.map((ratePct,i)=>({
    region,ratePct,bandLabel:labels[i],regulation:norm,disposition,notes,publicationDate:'2026'
  })));
};
describe('addizionale regionale 2026: scaglioni progressivi',()=>{
  it('applica solo le quote nelle fasce: Lombardia 30k',()=>{
    const r=estimateRegional2026('REGIONE LOMBARDIA',lombardia,30000,5000);
    // 15k * 1,23% + 13k * 1,58% + 2k * 1,72%
    expect(r.amount).toBe(424.3);
    expect(r.bands?.map(b=>b.taxableSlice)).toEqual([15000,13000,2000,0]);
    expect(r.bands?.map(b=>b.tax)).toEqual([184.5,205.4,34.4,0]);
  });
  it('rispetta i confini di tutte le fasce',()=>{
    expect(progressiveTax(15000,[15000,28000,50000],[1.23,1.58,1.72,1.73])?.amount).toBe(184.5);
    expect(progressiveTax(28000,[15000,28000,50000],[1.23,1.58,1.72,1.73])?.amount).toBe(389.9);
    expect(progressiveTax(50000,[15000,28000,50000],[1.23,1.58,1.72,1.73])?.amount).toBe(768.3);
    expect(progressiveTax(52000,[15000,28000,50000],[1.23,1.58,1.72,1.73])?.amount).toBe(802.9);
  });
  it('legge Emilia-Romagna, Toscana, Liguria dalla tabella 2026',()=>{
    const configs=[
      ['REGIONE EMILIA-ROMAGNA',[1.33,1.93,2.78,3.33],[15000,28000,50000],
        'Articolo 2 della legge regionale 20 dicembre 2006, n. 19 coordinato con la legge regionale 25 luglio 2025, n. 9.',506],
      ['REGIONE TOSCANA',[1.42,1.43,3.32,3.33],[15000,28000,50000],
        'ARTICOLO 1 LEGGE REGIONALE 28/12/2023 N.48',465.3],
      ['REGIONE LIGURIA',[1.23,3.18,3.23],[28000,50000],
        'Legge Regionale 9 ottobre 2024 n. 17',408]
    ] as const;
    for(const [name,rates,limits,norm,tax] of configs){
      const fixture=progressiveFixture(name,[...rates],[...limits],norm);
      expect(estimateRegional2026(name,fixture,30000,5000).amount).toBe(tax);
    }
  });
  it('in Piemonte il calcolo richiede conferma di nessun figlio a carico',()=>{
    const name='REGIONE PIEMONTE';
    const description="Per il periodo di imposta 2026, sono previste detrazioni euro 100,00 per i contribuenti con piu' di due figli a carico e euro 500,00 per figli con disabilita'.";
    const piemonte=progressiveFixture(name,[1.62,2.68,3.31,3.33],[15000,28000,50000],
      'legge regionale 28 marzo 2022 n. 4. legge regionale 6 agosto 2025 n. 16.',description);
    expect(estimateRegional2026(name,piemonte,30000,4000).amount).toBeNull();
    expect(estimateRegional2026(name,piemonte,30000,4000,{noDependentChildrenConfirmed:true}).amount).toBe(657.6);
  });
  it('Valle d’Aosta, esenzione per reddito complessivo fino a 15k',()=>{
    expect(estimateRegional2026("REGIONE VALLE D'AOSTA",valle,15000,1000).amount).toBe(0);
    expect(estimateRegional2026("REGIONE VALLE D'AOSTA",valle,30000,1000).amount).toBe(369);
  });
  it('rifiuta testo, fonte, scaglioni o aliquote alterate',()=>{
    expect(estimateRegional2026('REGIONE LOMBARDIA',{...lombardia,records:lombardia.records.slice(0,3)},30000,5000).amount).toBeNull();
    expect(estimateRegional2026('REGIONE LOMBARDIA',{...lombardia,records:[...lombardia.records.slice(0,3),{...lombardia.records[3],ratePct:3.3}]},30000,5000).amount).toBeNull();
    expect(estimateRegional2026('REGIONE LOMBARDIA',{...lombardia,sourceUrl:'https://example.com'},30000,5000).amount).toBeNull();
    expect(estimateRegional2026('REGIONE LOMBARDIA',{...lombardia,records:[{...lombardia.records[0],disposition:'Nuova esenzione'},...lombardia.records.slice(1)]},30000,5000).amount).toBeNull();
    expect(progressiveTax(10000,[28000,15000],[1,2,3])).toBeNull();
  });
  it('continua a non calcolare territori speciali',()=>{
    expect(estimateRegional2026('REGIONE UMBRIA',base([]),30000,4000).amount).toBeNull();
    expect(REGIONAL_PROFILES_2026['REGIONE VENETO']).toBeUndefined();
  });
});
describe('coerenza territoriale e imposte locali',()=>{
  it('associa le province italiane alla regione corretta',()=>{
    expect(taxRegionFromProvince('MI')).toBe('REGIONE LOMBARDIA');
    expect(taxRegionFromProvince('AR')).toBe('REGIONE TOSCANA');
    expect(taxRegionFromProvince('AO')).toBe("REGIONE VALLE D'AOSTA");
    expect(taxRegionFromProvince('TN')).toBe('PROVINCIA AUTONOMA DI TRENTO');
    expect(taxRegionFromProvince('ZZ')).toBeNull();
    expect(isValidMunicipalRegion('PE','REGIONE LOMBARDIA')).toBe(false);
  });
  it('calcola comunale solo con dati revisionati e rispetta esenzione',()=>{
    expect(estimateMunicipal2026(municipal,dataset,30000,5000).amount).toBe(150);
    expect(estimateMunicipal2026(municipalExempt,dataset,12000,3000).amount).toBe(0);
    expect(estimateMunicipal2026(municipalExempt,dataset,12001,3000).amount).toBe(72.01);
    expect(estimateMunicipal2026(municipal,{...dataset,review:undefined},30000,5000).amount).toBeNull();
  });
  it('se IRPEF nazionale netta è zero, non ci sono addizionali',()=>{
    expect(estimateMunicipal2026(null,null,18000,0).amount).toBe(0);
    expect(estimateRegional2026('',null,18000,0).amount).toBe(0);
  });
  it('blocca regione errata anche quando aliquota calcolabile',()=>{
    const input={
      municipal,municipalDataset:dataset,regionalDataset:lombardia,
      region:'REGIONE LOMBARDIA',taxableIncome:30000,nationalIrpefDue:4000,
      yearlyBeforeLocal:25000,installments:13 as const
    };
    const r=estimateLocalTaxes2026(input);
    expect(r.complete).toBe(false);expect(r.regional.amount).toBeNull();
    expect(r.regional.note).toContain('non corrispondono');
  });
  it('ritorna netto totale quando comune e regione coincidono e tutte le regole sono verificate',()=>{
    const l=MUNICIPAL_LOMBARDIA();
    const input={municipal:l,municipalDataset:{...dataset,records:[l]},
      regionalDataset:lombardia,region:'REGIONE LOMBARDIA',
      taxableIncome:30000,nationalIrpefDue:4000,yearlyBeforeLocal:25000,installments:13 as const};
    const result=estimateLocalTaxes2026(input);
    expect(result.complete).toBe(true);expect(result.localTotal).toBe(574.3);
    expect(result.yearlyNetAfterLocal).toBe(24425.7);
    expect(estimateLocalTaxes2026({...input,regionalDataset:null}).complete).toBe(false);
  });
});
function MUNICIPAL_LOMBARDIA():MunicipalRecord {
  return {...municipal,province:'MI',municipality:'COMUNE DI TEST',ratePct:0.5};
}
