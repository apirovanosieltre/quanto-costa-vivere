import {describe,expect,it} from 'vitest';
import {
  VERIFIED_TARI_SINGLE_2026,tariSingle2026Record,
  tariSingle2026BaseAnnual,tariNotAvailableReason,luccaTaric2026Annual,LUCCA_TARIC_2026
} from './tuscany-tari-2026';
describe('TARI: quote comunali base 2026 per 1 residente, soltanto da tavole ufficiali',()=>{
  it('copre quattro capoluoghi con link ai documenti originali, senza duplicati',()=>{
    expect(VERIFIED_TARI_SINGLE_2026.map(x=>x.city).sort()).toEqual(
      ['Arezzo','Livorno','Pisa','Pistoia','Siena']);
    expect(new Set(VERIFIED_TARI_SINGLE_2026.map(x=>x.code)).size).toBe(5);
    expect(tariSingle2026Record('E625')?.sourceUrl).toContain('municipiumapp.it');
    expect(tariSingle2026Record('G702')?.sourceUrl).toContain('sepi-pisa.it');
    expect(tariSingle2026Record('G713')?.sourceUrl).toContain('comune.pistoia.it');
  });
  it('calcola esattamente 55m² × quota fissa + variabile annuale',()=>{
    expect(tariSingle2026BaseAnnual('A390',55)).toBe(200.44);
    expect(tariSingle2026BaseAnnual('E625',55)).toBe(158.47);
    expect(tariSingle2026BaseAnnual('G702',55)).toBe(215.85);
    expect(tariSingle2026BaseAnnual('G713',55)).toBe(171.05);
    expect(tariSingle2026BaseAnnual('I726',55)).toBe(113.71);
    expect(tariSingle2026BaseAnnual('G702',70)).toBe(234.30);
  });
  it('non inventa una TARI per capoluoghi senza allegati verificati',()=>{
    for(const code of ['D612','E202','E715','F023','G999','F839']){
      expect(tariSingle2026Record(code)).toBeNull();
      expect(tariSingle2026BaseAnnual(code,55)).toBeNull();
    }
    expect(tariNotAvailableReason('E715')).toContain('TARIC');
    expect(tariNotAvailableReason('D612')).toContain('non e ancora verificata');
  });
  it('Lucca applies official separate TARIC formula (55 m² and 6–52 waste emptyings)',()=>{
    expect(LUCCA_TARIC_2026.sourceUrl).toContain('comune.lucca.it');
    expect(luccaTaric2026Annual(55)).toBe(121.82);
    expect(luccaTaric2026Annual(55,12)).toBe(121.82);
    expect(luccaTaric2026Annual(55,6)).toBe(113.07);
    expect(luccaTaric2026Annual(55,13)).toBe(122.27);
    expect(luccaTaric2026Annual(55,52)).toBe(140.10);
    expect(luccaTaric2026Annual(55,5)).toBeNull();
    expect(luccaTaric2026Annual(55,53)).toBeNull();
    expect(luccaTaric2026Annual(55,8.5)).toBeNull();
    expect(luccaTaric2026Annual(301,12)).toBeNull();
    expect(luccaTaric2026Annual(NaN,12)).toBeNull();
    // Existing ordinary TARI implementation is intentionally separate.
    expect(tariSingle2026BaseAnnual('E715',55)).toBeNull();
  });
  it('rifiuta metrature incoerenti e non converte il dato mancante in 0',()=>{
    expect(tariSingle2026BaseAnnual('A390',0)).toBeNull();
    expect(tariSingle2026BaseAnnual('A390',301)).toBeNull();
    expect(tariSingle2026BaseAnnual('A390',NaN)).toBeNull();
    expect(tariSingle2026BaseAnnual('F839',55)).toBeNull();
  });
  it('disclose exclusions and Pistoia potential 12% reduction without applying it silently',()=>{
    expect(tariSingle2026Record('G713')?.methodologyNote).toContain('12%');
    expect(tariSingle2026BaseAnnual('G713',55)).toBe(171.05);
    expect(tariSingle2026Record('E625')?.methodologyNote).toContain('resident');
    expect(tariSingle2026Record('G702')?.methodologyNote).toContain('80,49');
  });
});
