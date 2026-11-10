import { describe, it, expect } from 'vitest';
import { calculateLocalAdditionalTax, type LocalTaxRecord } from './territorial-data';
const base: LocalTaxRecord = { municipalityCode: '000000', municipality: 'Esempio', region: 'Esempio', taxYear: 2026, regionalAdditionalRate: .012, municipalAdditionalRate: .008, exemptionThreshold: null, complexRules: false, sourceUrl: 'https://www.finanze.gov.it/', retrievedAt: '2026-11-09' };
describe('addizionali locali', () => {
 it('calcola solo aliquote semplici esplicite', () => expect(calculateLocalAdditionalTax(base, 30000).amount).toBe(600));
 it('non inventa calcoli per scaglioni', () => expect(calculateLocalAdditionalTax({...base, complexRules: true},30000).amount).toBeNull());
 it('non applica esenzioni senza regole distinte', () => expect(calculateLocalAdditionalTax({...base, exemptionThreshold: 15000},10000).amount).toBeNull());
});
