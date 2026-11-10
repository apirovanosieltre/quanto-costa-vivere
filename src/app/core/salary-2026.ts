import { calculateGrossIrpef2026 } from './irpef';
/** Caso standard: lavoratore dipendente privato, 365 giorni, senza altri redditi e familiari a carico.
 * Il risultato è PRIMA delle addizionali locali e delle agevolazioni non modellate.
 * Fonti: art. 13 TUIR, L. 207/2024 art.1 cc.4-6, L.199/2025, INPS circolare 6/2026.
 */
export interface SalaryParameters {
  grossYearlySalary: number;
  installments: 12 | 13 | 14;
  employeeSocialSecurityRatePct: number;
}
export interface SalaryResult {
  ral: number;
  socialSecurity: number;
  taxableIncome: number;
  grossIrpef: number;
  employeeDeduction: number;
  additionalDeduction: number;
  nonTaxableSupplement: number;
  nationalIrpefAfterDeductions: number;
  yearlyBeforeLocalTaxes: number;
  monthlyBeforeLocalTaxes: number;
  supported: boolean;
  reason?: string;
}
function money(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
export function calculateEmployeeDeduction2026(income: number): number {
  if (income <= 0) return 0;
  let deduction = 0;
  if (income <= 15_000) deduction = 1955;
  else if (income <= 28_000) deduction = 1910 + 1190 * (28_000 - income) / 13_000;
  else if (income <= 50_000) deduction = 1910 * (50_000 - income) / 22_000;
  if (income > 25_000 && income <= 35_000) deduction += 65;
  return money(deduction);
}
export function calculateWageCredit2026(income: number): { deduction: number; nonTaxable: number } {
  if (income <= 0) return { deduction:0, nonTaxable:0 };
  if (income <= 20_000) {
    const rate = income <= 8_500 ? 0.071 : income <= 15_000 ? 0.053 : 0.048;
    return { deduction:0, nonTaxable:money(income * rate) };
  }
  if (income <= 32_000) return { deduction:1000, nonTaxable:0 };
  if (income <= 40_000) return { deduction:money(1000*(40_000-income)/8000), nonTaxable:0 };
  return { deduction:0, nonTaxable:0 };
}
export function estimateSalary2026(input: SalaryParameters): SalaryResult {
  const ral = Number.isFinite(input.grossYearlySalary) ? Math.max(0, input.grossYearlySalary) : 0;
  const rate = Number.isFinite(input.employeeSocialSecurityRatePct) ? input.employeeSocialSecurityRatePct : 9.19;
  const supported = ral >= 1 && ral <= 56_224 && rate >= 0 && rate <= 20 && [12,13,14].includes(input.installments);
  const socialSecurity = money(ral * rate / 100);
  const taxableIncome = money(ral - socialSecurity);
  const grossIrpef = money(calculateGrossIrpef2026(taxableIncome).totalTax);
  const employeeDeduction = calculateEmployeeDeduction2026(taxableIncome);
  const credit = calculateWageCredit2026(taxableIncome);
  const taxNet = money(Math.max(0, grossIrpef - employeeDeduction - credit.deduction));
  const yearlyBeforeLocalTaxes = money(ral - socialSecurity - taxNet + credit.nonTaxable);
  return { ral,socialSecurity,taxableIncome,grossIrpef,employeeDeduction,
    additionalDeduction:credit.deduction,nonTaxableSupplement:credit.nonTaxable,
    nationalIrpefAfterDeductions:taxNet, yearlyBeforeLocalTaxes,
    monthlyBeforeLocalTaxes:money(yearlyBeforeLocalTaxes / input.installments), supported,
    ...(!supported ? {reason:'Per questa prima versione sono supportate RAL fino a 56.224 €, 12-14 mensilità e aliquote contributive tra 0% e 20%.'} : {})
  };
}
