import {describe,expect,it} from 'vitest';
import {parseMunicipalRentData,benchmarkForMunicipality,rentalRangeForArea, REVIEWED_MILAN_RENT_SHA256, type MunicipalRentDataset} from './municipal-rents';
const sample:MunicipalRentDataset={
  schemaVersion:1,generatedAt:'2026-11-10T12:00:00Z',methodology:'Median of OMI zone bounds',
  cities:[{schemaVersion:1,municipalCode:'F205',city:'Milano',
    geography:'city_unweighted_zone_aggregate',basePeriod:'2025/2',createdAt:'2026-11-10T12:00:00Z',
    sourcePublisher:'Comune di Milano, fonte originaria Agenzia delle Entrate - OMI',
    sourceUrl:'https://dati.comune.milano.it/dataset/ds3024-quotazioni-immobiliari-omi-locazione-semestre-2025-2',
    sourceCsvUrl:'https://dati.comune.milano.it/dataset/x.csv',sourceLicense:'CC BY 4.0',
    sourceSha256:REVIEWED_MILAN_RENT_SHA256,type:'Abitazioni civili',maintenance:'NORMALE',areaType:'L',
    unit:'EUR/m²/month',zonesCount:40,lowerMedian:11.75,upperMedian:15.6,
    caveat:'unweighted zones',rawQuoteRowsPublished:false}]
};
describe('municipal rental benchmarks',()=>{
  it('accepts only audited Milan derived statistics',()=>{
    const d=parseMunicipalRentData(sample);
    expect(benchmarkForMunicipality(d,'F205')?.zonesCount).toBe(40);
    expect(benchmarkForMunicipality(d,'A390')).toBeNull();
    expect(benchmarkForMunicipality(d,'D612')).toBeNull();
  });
  it('calculates a range for an explicitly provided gross floor area',()=>{
    const d=parseMunicipalRentData(sample);
    expect(rentalRangeForArea(d.cities[0],70)).toEqual({min:822.5,max:1092});
    expect(rentalRangeForArea(d.cities[0],-4)).toBeNull();
    expect(rentalRangeForArea(d.cities[0],501)).toBeNull();
  });
  it('blocks changes to publisher license, period, geography and source shape',()=>{
    expect(()=>parseMunicipalRentData({...sample,cities:[{...sample.cities[0],sourceSha256:'a'.repeat(64)}]})).toThrow();
    expect(()=>parseMunicipalRentData({...sample,cities:[{...sample.cities[0],sourceLicense:'other' as 'CC BY 4.0'}]})).toThrow();
    expect(()=>parseMunicipalRentData({...sample,cities:[{...sample.cities[0],basePeriod:'2026/1'}]})).toThrow();
    expect(()=>parseMunicipalRentData({...sample,cities:[{...sample.cities[0],areaType:'N' as 'L'}]})).toThrow();
    expect(()=>parseMunicipalRentData({...sample,cities:[{...sample.cities[0],rawQuoteRowsPublished:true as false}]})).toThrow();
  });
});
