import {describe,expect,it} from 'vitest';
import {estimateHomeEnergy2026,ENERGY_MARKET_REFERENCE_2026} from './energy-household-2026';
describe('scenari energia 2026',()=>{
  it('stima consumi crescenti al crescere di superficie e persone',()=>{
    const a=estimateHomeEnergy2026({areaSqm:55,residents:1,heating:'gas'});
    const b=estimateHomeEnergy2026({areaSqm:100,residents:3,heating:'gas'});
    expect(a.electricityKwhYear).toBe(1411);
    expect(a.gasSmcYear).toBe(515);
    expect(b.electricityKwhYear).toBeGreaterThan(a.electricityKwhYear);
    expect(b.gasSmcYear).toBeGreaterThan(a.gasSmcYear);
    expect(ENERGY_MARKET_REFERENCE_2026.sourceUrl).toContain('facile.it');
  });
  it('non contabilizza gas con pompa di calore o nessun impianto a gas',()=>{
    const g=estimateHomeEnergy2026({areaSqm:55,residents:1,heating:'gas'});
    const e=estimateHomeEnergy2026({areaSqm:55,residents:1,heating:'electric'});
    const n=estimateHomeEnergy2026({areaSqm:55,residents:1,heating:'none'});
    expect(e.electricityKwhYear).toBeGreaterThan(g.electricityKwhYear);
    expect(e.gasMonthlyEUR).toBe(0);
    expect(n.gasMonthlyEUR).toBe(0);
    expect(g.gasMonthlyEUR).toBeGreaterThan(0);
  });
  it('consente consumi personalizzati e valida le combinazioni',()=>{
    const x=estimateHomeEnergy2026({areaSqm:80,residents:2,heating:'gas',electricityKwhYear:1894,gasSmcYear:725});
    expect(x.electricityMonthlyEUR).toBe(78.41);
    expect(x.gasMonthlyEUR).toBe(72.03);
    expect(()=>estimateHomeEnergy2026({areaSqm:0,residents:2,heating:'gas'})).toThrow();
    expect(()=>estimateHomeEnergy2026({areaSqm:80,residents:2.5,heating:'gas'})).toThrow();
    expect(()=>estimateHomeEnergy2026({areaSqm:80,residents:2,heating:'none',gasSmcYear:5})).toThrow();
  });
});