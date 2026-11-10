import { describe,expect,it } from 'vitest';
import {
  estimateFlorenceSolo,waterMonthly2026,foodProxySolo2025,
  DEFAULT_FLORENCE_SOLO,FLORENCE_RENT_REFERENCE,AUTOLINEE_TOSCANE_REFERENCE,
  type FlorenceSoloProfile
} from './automatic-cost-florence';

const profile=(changes:Partial<FlorenceSoloProfile>={}):FlorenceSoloProfile=>
  ({...DEFAULT_FLORENCE_SOLO,...changes});

describe('Firenze: modello automatico, trasparenza dei dati e scenari',()=>{
  it('usa SOLO prezzi realmente osservati e tariffari nelle rispettive categorie',()=>{
    const r=estimateFlorenceSolo(profile());
    expect(r.lines).toHaveLength(8);
    const rent=r.lines.find(x=>x.key==='housing')!;
    expect(rent.kind).toBe('observed');
    expect(rent.amountEUR).toBe(733.33);
    expect(rent.referencePeriod).toContain('2024');
    expect(rent.sourceUrl).toBe(FLORENCE_RENT_REFERENCE.url);
    const bus=r.lines.find(x=>x.key==='transit')!;
    expect(bus.amountEUR).toBe(AUTOLINEE_TOSCANE_REFERENCE.monthlyPassEUR);
    expect(bus.confidence).toBe('alta');
    const water=r.lines.find(x=>x.key==='water')!;
    expect(water.kind).toBe('tariff');
    expect(water.amountEUR).toBe(13.63);
  });
  it('il totale non è presentato come costo medio osservato; separa le ipotesi',()=>{
    const r=estimateFlorenceSolo(profile());
    expect(foodProxySolo2025()).toBe(410.73);
    expect(r.observedAndTariffBasedEUR).toBe(789.16);
    expect(r.statisticalProxyEUR).toBe(410.73);
    expect(r.editorialAssumptionsEUR).toBe(335);
    expect(r.monthlyScenarioTotalEUR).toBe(1534.89);
    expect(r.assumptionCount).toBe(5);
    expect(r.disclaimer).toContain('NON costo medio');
    expect(r.monthlyBalanceEUR).toBeNull();
  });
  it('il saldo appare solo se il netto è stato fornito',()=>{
    expect(estimateFlorenceSolo(profile({monthlyNetIncomeEUR:1900})).monthlyBalanceEUR).toBe(365.11);
    expect(estimateFlorenceSolo(profile({monthlyNetIncomeEUR:null})).monthlyBalanceEUR).toBeNull();
  });
  it('le dimensioni e il contratto cambiano la stima senza inventare prezzi 2026',()=>{
    expect(estimateFlorenceSolo(profile({areaSqm:60,contract:'long'})).lines[0].amountEUR).toBe(800);
    expect(estimateFlorenceSolo(profile({areaSqm:60,contract:'agreed'})).lines[0].amountEUR).toBe(495);
    expect(estimateFlorenceSolo(profile({areaSqm:60,contract:'temporary'})).lines[0].amountEUR).toBe(1220);
  });
  it('l’acqua applica gli scaglioni e non un solo prezzo medio',()=>{
    expect(waterMonthly2026(0)).toBe(4.6);
    expect(waterMonthly2026(19)).toBe(7.76);
    expect(waterMonthly2026(45)).toBe(13.63);
    expect(waterMonthly2026(80)).toBeGreaterThan(waterMonthly2026(67)!);
    expect(waterMonthly2026(-1)).toBeNull();
    expect(waterMonthly2026(Number.POSITIVE_INFINITY)).toBeNull();
  });
  it('rifiuta valori non validi, negativi e input non previsti',()=>{
    expect(()=>estimateFlorenceSolo(profile({areaSqm:0}))).toThrow();
    expect(()=>estimateFlorenceSolo(profile({electricityEUR:-1}))).toThrow();
    expect(()=>estimateFlorenceSolo(profile({waterCubicMetersPerYear:600}))).toThrow();
    expect(()=>estimateFlorenceSolo(profile({contract:'none' as 'long'}))).toThrow();
    expect(()=>estimateFlorenceSolo(profile({monthlyNetIncomeEUR:Infinity}))).toThrow();
  });
  it('un utente senza abbonamento vede 0 come scelta, non trasporto gratuito',()=>{
    const r=estimateFlorenceSolo(profile({transit:'no-pass'}));
    const transit=r.lines.find(x=>x.key==='transit')!;
    expect(transit.amountEUR).toBe(0);
    expect(transit.method).toContain('non significa');
  });
});
