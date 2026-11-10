import {describe,expect,it} from 'vitest';
import {
  suggestSinglePersonCosts,cityDataCoverage,compareMethodWarning,
  DEFAULT_SINGLE_PERSON_OPTIONS, MILAN_ATM_2026
} from './automatic-city-compare';
import {type MunicipalRentDataset,REVIEWED_MILAN_RENT_SHA256} from './municipal-rents';
import {summarizeCity} from './city-compare';

const rentalData:MunicipalRentDataset={
  schemaVersion:1,generatedAt:'2026-11-10T12:00:00Z',methodology:'Derived median boundaries',
  cities:[{schemaVersion:1,municipalCode:'F205',city:'Milano',
    geography:'city_unweighted_zone_aggregate',basePeriod:'2025/2',createdAt:'2026-11-10T12:00:00Z',
    sourcePublisher:'Comune di Milano, fonte originaria Agenzia delle Entrate - OMI',
    sourceUrl:'https://dati.comune.milano.it/dataset/ds3024-quotazioni-immobiliari-omi-locazione-semestre-2025-2',
    sourceCsvUrl:'https://dati.comune.milano.it/dataset/x.csv',sourceLicense:'CC BY 4.0',
    sourceSha256:REVIEWED_MILAN_RENT_SHA256,type:'Abitazioni civili',maintenance:'NORMALE',
    areaType:'L',unit:'EUR/m²/month',zonesCount:40,
    lowerMedian:11.75,upperMedian:15.6,caveat:'Not average rent',
    rawQuoteRowsPublished:false}]
};
const byKey=(code:string,withRents:MunicipalRentDataset|null=rentalData)=>
  Object.fromEntries(suggestSinglePersonCosts(code,withRents).map(s=>[s.key,s]));

describe('Assisted Italian city comparison: honest coverage and reproducible samples',()=>{
  it('Florence auto-fills a sourced 2024 rent, water tariff, 2025 national proxy and editorial other costs',()=>{
    const results=byKey('D612');
    expect(results['housing'].amount).toBe(733.33);
    expect(results['housing'].date).toContain('2024');
    expect(results['utilities'].amount).toBe(123.63);
    expect(results['utilities'].kind).toBe('mixed');
    expect(results['groceries'].amount).toBe(410.73);
    expect(results['groceries'].kind).toBe('proxy');
    expect(results['transport'].amount).toBe(42.2);
    expect(results['transport'].kind).toBe('tariff');
    expect(results['other'].amount).toBe(225);
    expect(results['other'].kind).toBe('scenario');
    const data=suggestSinglePersonCosts('D612',rentalData);
    const summary=summarizeCity({netIncome:null,expenses:{
      housing:results['housing'].amount,
      utilities:results['utilities'].amount,groceries:results['groceries'].amount,
      transport:results['transport'].amount,other:results['other'].amount
    }});
    expect(summary.monthlyTotal).toBe(1534.89);
    expect(cityDataCoverage(data).available).toBe(5);
    expect(cityDataCoverage(data).supported).toBe(2);
  });
  it('Milan rent is derived from OMI bounds only if benchmark is available, and ATM uses the official monthly price',()=>{
    const results=byKey('F205');
    expect(results['housing'].amount).toBe(752.13);
    expect(results['housing'].kind).toBe('derived');
    expect(results['housing'].confidence).toBe('bassa');
    expect(results['housing'].explanation).toContain('NON il canone mediano');
    expect(results['transport'].amount).toBe(MILAN_ATM_2026.price);
    expect(results['utilities'].amount).toBe(125);
    expect(results['utilities'].kind).toBe('scenario');
    expect(byKey('F205',null)['housing'].amount).toBeNull();
  });
  it('does not hallucinate a house rent in Arezzo, Napoli or Florence without valid options',()=>{
    for(const code of ['A390','F839','H501']){
      const items=suggestSinglePersonCosts(code,rentalData);
      expect(items.find(x=>x.key==='housing')?.amount).toBeNull();
      expect(items.find(x=>x.key==='groceries')?.geography).toContain('Italia');
      expect(cityDataCoverage(items).incomplete).toBe(true);
      expect(cityDataCoverage(items).available).toBe(4);
    }
    expect(()=>suggestSinglePersonCosts('D612',rentalData,{...DEFAULT_SINGLE_PERSON_OPTIONS,areaSqm:0})).toThrow();
    expect(()=>suggestSinglePersonCosts('D612',rentalData,{...DEFAULT_SINGLE_PERSON_OPTIONS,florenceContract:'wrong' as 'long'})).toThrow();
  });
  it('updates rent according to shared surface and Florence contract',()=>{
    const options={...DEFAULT_SINGLE_PERSON_OPTIONS,areaSqm:70,florenceContract:'agreed' as const};
    const flo=suggestSinglePersonCosts('D612',rentalData,options);
    const mil=suggestSinglePersonCosts('F205',rentalData,options);
    expect(flo[0].amount).toBe(577.5);
    expect(mil[0].amount).toBe(957.25);
  });
  it('warns when mixing two different types of rent source',()=>{
    expect(compareMethodWarning('D612','F205')).toContain('NON è un confronto');
    expect(compareMethodWarning('D612','F839')).toContain('voci senza dati');
  });
});
