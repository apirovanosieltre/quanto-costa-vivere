import { describe,expect,it } from 'vitest';
import {
  estimateEssentialCosts2026,tariBaseMonthly2026ForCity,waterMonthly2026ForCity,
  electricityReference2026,tuscanyTransit2026,gasCommodityOnlyReference,
  DEFAULT_ESSENTIAL_PROFILE,TUSCANY_ESSENTIAL_SOURCES,budgetWithOptionalTari
} from './tuscany-essential-2026';
import { TUSCANY_CAPITAL_RENTS_2024 } from './tuscany-capital-rents-2024';

describe('2026: costi essenziali 1 persona nei 10 capoluoghi toscani',()=>{
  it('pubblica tariffa urbana mensile e annuale per TUTTI e SOLI i 10 capoluoghi coperti',()=>{
    expect(TUSCANY_CAPITAL_RENTS_2024).toHaveLength(10);
    for(const {code} of TUSCANY_CAPITAL_RENTS_2024){
      const monthly=tuscanyTransit2026(code,'monthly');
      const yearly=tuscanyTransit2026(code,'annual');
      expect(monthly.monthlyEUR).toBe(42.20);
      expect(monthly.annualEUR).toBe(506.4);
      expect(monthly.sourceUrl).toBe(TUSCANY_ESSENTIAL_SOURCES.busMonthly);
      expect(yearly.monthlyEUR).toBe(28.57);
      expect(yearly.annualEUR).toBe(342.80);
      expect(yearly.sourceUrl).toBe(TUSCANY_ESSENTIAL_SOURCES.busAnnual);
      expect(tuscanyTransit2026(code,'none').monthlyEUR).toBe(0);
      expect(tuscanyTransit2026(code,'none').classification).toBe('assumption');
    }
    expect(tuscanyTransit2026('F205','monthly').monthlyEUR).toBeNull();
    expect(tuscanyTransit2026('F839','annual').monthlyEUR).toBeNull();
  });
  it('calcola la TARI BASE Arezzo 2026 per 1 occupante e non la copia ad altri comuni',()=>{
    const r=tariBaseMonthly2026ForCity('A390',55);
    expect(r.annualEUR).toBe(200.44);
    expect(r.monthlyEUR).toBe(16.70);
    expect(r.classification).toBe('local-tariff');
    expect(r.note).toMatch(/NON include TEFA/);
    expect(r.sourceUrl).toBe(TUSCANY_ESSENTIAL_SOURCES.arezzoTari);
    for(const {code} of TUSCANY_CAPITAL_RENTS_2024){
      if(code!=='A390'){
        expect(tariBaseMonthly2026ForCity(code,55).monthlyEUR).toBeNull();
      }
    }
    expect(()=>tariBaseMonthly2026ForCity('A390',0)).toThrow();
    expect(()=>tariBaseMonthly2026ForCity('A390',301)).toThrow();
  });
  it('calcola acqua residenziale 2026 per tutti i 10 capoluoghi con tariffario del gestore corretto',()=>{
    const expected=[
      ['A390',15.19,'nuoveacque.it'],
      ['D612',13.63,'publiacqua.it'],
      ['E202',16.23,'fiora.it'], // Grosseto, AdF
      ['E625',16.77,'asaspa.it'], // Livorno: tariffa in vigore dal 01/03/2026
      ['E715',13.15,'geal-lucca.it'], // Lucca: tariffa 2025 mantenuta nel 2026
      ['F023',16.72,'gaia-spa.it'], // Massa, bacino Piana
      ['G702',18.40,'acque.net'], // Pisa
      ['G713',13.63,'publiacqua.it'],
      ['G999',13.63,'publiacqua.it'],
      ['I726',16.23,'fiora.it'] // Siena, AdF
    ] as const;
    expect(expected).toHaveLength(10);
    for(const [code,amount,domain] of expected){
      const r=waterMonthly2026ForCity(code,45);
      expect(r.monthlyEUR).toBe(amount);
      expect(r.classification).toBe('local-tariff');
      expect(r.sourceUrl).toContain(domain);
      expect(r.note).toContain('non è una bolletta finale');
    }
    for(const code of ['F839','H501','B832']){
      const unknown=waterMonthly2026ForCity(code,45);
      expect(unknown.monthlyEUR).toBeNull();
      expect(unknown.classification).toBe('unavailable');
    }
  });
  it('calcola correttamente le fasce idriche con quota fissa e blocca consumi non validi',()=>{
    const a=waterMonthly2026ForCity('A390',0),b=waterMonthly2026ForCity('A390',19),
      c=waterMonthly2026ForCity('A390',67),d=waterMonthly2026ForCity('A390',68);
    expect(a.annualEUR).toBe(54.15);
    expect(b.annualEUR).toBeGreaterThan(a.annualEUR!);
    expect(c.annualEUR).toBeGreaterThan(b.annualEUR!);
    expect(d.annualEUR).toBeGreaterThan(c.annualEUR!);
    expect(()=>waterMonthly2026ForCity('D612',-1)).toThrow();
    expect(()=>waterMonthly2026ForCity('D612',Infinity)).toThrow();
  });
  it('riferimento ARERA 2026 non è tariffa luce per tutti; gas è solo componente materia prima',()=>{
    const elec=electricityReference2026();
    expect(elec.annualEUR).toBe(665.38);
    expect(elec.monthlyEUR).toBe(55.45);
    expect(elec.classification).toBe('national-reference');
    expect(elec.note).toContain('vulnerabile');
    expect(gasCommodityOnlyReference(200)).toBe(15.76);
  });
  it('separa bollette di scenario, costo comunale opzionale e riferimenti verificati',()=>{
    const a=estimateEssentialCosts2026('A390',DEFAULT_ESSENTIAL_PROFILE);
    const f=estimateEssentialCosts2026('D612',DEFAULT_ESSENTIAL_PROFILE);
    const p=estimateEssentialCosts2026('G702',DEFAULT_ESSENTIAL_PROFILE);
    expect(a.coveredCapital).toBe(true);
    expect(a.utilitiesScenarioMonthly).toBe(120.64);
    expect(a.tariIncludedByDefault).toBe(false);
    expect(f.utilitiesScenarioMonthly).toBe(119.08);
    expect(f.tari.monthlyEUR).toBeNull();
    expect(p.utilitiesScenarioMonthly).toBe(123.85);
    expect(p.utilitiesAssumptions).not.toContain('IPOTETICA');
    expect(p.water.monthlyEUR).toBe(18.40);
  });
  it('aggiunge TARI al totale derivato una sola volta, senza modificare i campi originari',()=>{
    const original={
      netIncome:1800,
      expenses:{housing:550,utilities:120,groceries:300,transport:42.2,other:225}
    };
    const applied=budgetWithOptionalTari(original,16.70,true);
    expect(applied.expenses.other).toBe(241.7);
    expect(original.expenses.other).toBe(225);
    expect(budgetWithOptionalTari(original,16.70,true).expenses.other).toBe(241.7);
    expect(budgetWithOptionalTari(original,16.70,false)).toBe(original);
    expect(budgetWithOptionalTari(original,null,true)).toBe(original);
    expect(budgetWithOptionalTari({...original,expenses:{...original.expenses,other:null}},16.70,true)
      .expenses.other).toBeNull();
    expect(()=>budgetWithOptionalTari(original,-1,true)).toThrow();
  });
  it('ricalcola scenari e non accetta dati che possono produrre costi sbagliati',()=>{
    const p=estimateEssentialCosts2026('A390',{...DEFAULT_ESSENTIAL_PROFILE,
      tariAreaSqm:70,waterM3Year:60,gasMonthlyScenarioEUR:0,transitPass:'annual'});
    expect(p.tari.annualEUR).toBe(217.25);
    expect(p.water.monthlyEUR).toBeGreaterThan(15.19);
    expect(p.transit.monthlyEUR).toBe(28.57);
    expect(p.gas.monthlyEUR).toBe(0);
    expect(()=>estimateEssentialCosts2026('A390',{...DEFAULT_ESSENTIAL_PROFILE,waterM3Year:1000})).toThrow();
    expect(()=>estimateEssentialCosts2026('A390',{...DEFAULT_ESSENTIAL_PROFILE,gasMonthlyScenarioEUR:-1})).toThrow();
    expect(()=>estimateEssentialCosts2026('A390',{...DEFAULT_ESSENTIAL_PROFILE,transitPass:'x' as 'monthly'})).toThrow();
  });
});
