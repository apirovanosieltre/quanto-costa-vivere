import {describe,it,expect} from 'vitest';
import {
  TUSCANY_CAPITAL_RENTS_2024,TUSCANY_RENT_2024_SOURCE,
  tuscanCapitalRentRecord,tuscanCapitalMonthlyRent2024,comparableTuscanRentPair
} from './tuscany-capital-rents-2024';

describe('Regione Toscana 2024: capital-city rents from 2025 report, Tabella 2.2',()=>{
  it('has exactly ten source rows, unique municipal codes and matching provincial capitals',()=>{
    expect(TUSCANY_CAPITAL_RENTS_2024).toHaveLength(10);
    expect(new Set(TUSCANY_CAPITAL_RENTS_2024.map(x=>x.code)).size).toBe(10);
    expect(TUSCANY_RENT_2024_SOURCE.referenceYear).toBe(2024);
    expect(TUSCANY_RENT_2024_SOURCE.unit).toBe('EUR/m²/anno');
    expect(tuscanCapitalRentRecord('A390')?.city).toBe('Arezzo');
    expect(tuscanCapitalRentRecord('F023')?.city).toBe('Massa');
    expect(tuscanCapitalRentRecord('D612')?.city).toBe('Firenze');
    expect(tuscanCapitalRentRecord('B832')).toBeNull(); // Carrara NON e' capitale della riga Massa Carrara
  });
  it('reproduces all documented contract averages from regional source',()=>{
    const rows=[
      ['A390',69,66,76],['D612',99,160,244],['E202',83,69,116],
      ['E625',69,87,105],['E715',76,82,123],['F023',79,74,168],
      ['G702',88,105,136],['G713',75,63,88],['G999',78,101,107],
      ['I726',92,98,102]
    ] as const;
    for(const [code,agreed,long,temporary] of rows) {
      expect(tuscanCapitalRentRecord(code)?.yearlyEURPerSqm).toEqual({agreed,long,temporary});
    }
  });
  it('applies year-to-month conversion and shared floor area consistently',()=>{
    expect(tuscanCapitalMonthlyRent2024('D612',55,'long')).toBe(733.33);
    expect(tuscanCapitalMonthlyRent2024('A390',55,'long')).toBe(302.5);
    expect(tuscanCapitalMonthlyRent2024('G702',55,'long')).toBe(481.25);
    expect(tuscanCapitalMonthlyRent2024('I726',55,'agreed')).toBe(421.67);
    expect(tuscanCapitalMonthlyRent2024('D612',70,'temporary')).toBe(1423.33);
  });
  it('does not infer rates for nearby municipalities or invalid values',()=>{
    expect(tuscanCapitalMonthlyRent2024('F205',55,'long')).toBeNull();
    expect(tuscanCapitalMonthlyRent2024('B832',55,'long')).toBeNull();
    expect(tuscanCapitalMonthlyRent2024('A390',0,'long')).toBeNull();
    expect(tuscanCapitalMonthlyRent2024('A390',NaN,'long')).toBeNull();
    expect(tuscanCapitalMonthlyRent2024('A390',600,'long')).toBeNull();
    expect(tuscanCapitalMonthlyRent2024('A390',55,'unknown' as 'long')).toBeNull();
  });
  it('only marks same-report Tuscany pairs as directly comparable for rent component',()=>{
    expect(comparableTuscanRentPair('A390','D612')).toBe(true);
    expect(comparableTuscanRentPair('D612','G702')).toBe(true);
    expect(comparableTuscanRentPair('D612','D612')).toBe(false);
    expect(comparableTuscanRentPair('D612','F205')).toBe(false);
    expect(comparableTuscanRentPair('G702','F839')).toBe(false);
  });
});
