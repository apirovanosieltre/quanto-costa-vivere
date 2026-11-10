import { describe, it, expect } from 'vitest';
import { calculateEmployeeDeduction2026, calculateWageCredit2026, estimateSalary2026 } from './salary-2026';
describe('stima dipendente privato 2026 prima delle addizionali',()=>{
  it('calcola 30k RAL e 13 mensilità per caso base nazionale',()=>{
    const r=estimateSalary2026({grossYearlySalary:30000, installments:13,employeeSocialSecurityRatePct:9.19});
    expect(r.socialSecurity).toBe(2757); expect(r.taxableIncome).toBe(27243);
    expect(r.grossIrpef).toBeCloseTo(6265.89); expect(r.employeeDeduction).toBeCloseTo(2044.29);
    expect(r.additionalDeduction).toBe(1000); expect(r.yearlyBeforeLocalTaxes).toBeCloseTo(24021.4);
  });
  it('non confonde bonus esente con detrazione IRPEF',()=>{
    expect(calculateWageCredit2026(18000)).toEqual({deduction:0,nonTaxable:864});
    expect(calculateWageCredit2026(34000).deduction).toBe(750);
  });
  it('interrompe la pubblicazione del risultato fuori campo',()=>{
    expect(estimateSalary2026({grossYearlySalary:80000,installments:13,employeeSocialSecurityRatePct:9.19}).supported).toBe(false);
  });
  it('detrazione senza salti sopra 50k',()=>expect(calculateEmployeeDeduction2026(51000)).toBe(0));
});
