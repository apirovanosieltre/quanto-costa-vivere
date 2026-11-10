import { describe, expect, it } from 'vitest';
import { calculateMunicipalAdditional, type MunicipalRecord } from './municipal-data';
const record:MunicipalRecord={code:'F205',municipality:'Milano',province:'MI',status:'simple',ratePct:0.8,exemptionThreshold:23000,reason:''};
describe('calcolo comunale con record validato',()=>{
  it('applica esenzione totale',()=>expect(calculateMunicipalAdditional(record,23000)).toBe(0));
  it('applica aliquota su tutto il reddito oltre soglia',()=>expect(calculateMunicipalAdditional(record,27243)).toBe(217.94));
  it('non calcola casi speciali',()=>expect(calculateMunicipalAdditional({...record,status:'needs-review'},27243)).toBeNull());
});
