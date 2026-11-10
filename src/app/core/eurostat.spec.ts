import { describe, expect, it } from 'vitest';
import { parseItalianInflationSeries, parseLatestItalianInflation } from './eurostat';

const sample = {
  id: ['freq','unit','coicop18','geo','time'], size:[1,1,1,1,3],
  dimension:{
    freq:{category:{index:{M:0}}}, unit:{category:{index:{RCH_A:0}}},
    coicop18:{category:{index:{TOTAL:0}}}, geo:{category:{index:{IT:0}}},
    time:{category:{index:{'2026-07':0,'2026-08':1,'2026-09':2}}}
  },
  value:{'0':2.1,'1':2.2}, updated:'2026-10-16T21:00:00Z'
};

describe('Eurostat JSON-stat (serie italiana)', () => {
  it('restituisce soltanto mesi realmente pubblicati e ordinati', () => {
    const result = parseItalianInflationSeries(sample,'2026-11-09T00:00:00Z');
    expect(result.history).toEqual([{period:'2026-07', annualRate:2.1},{period:'2026-08', annualRate:2.2}]);
    expect(result.period).toBe('2026-08');
    expect(result.source).toBe('Eurostat');
  });
  it('mantiene compatibile il parser del singolo dato', () => {
    const result=parseLatestItalianInflation(sample,'2026-11-09T00:00:00Z');
    expect(result.period).toBe('2026-08');
    expect(result.annualRate).toBe(2.2);
    expect('history' in result).toBe(false);
  });
  it('rifiuta un filtro geografico non italiano', () => {
    expect(()=>parseItalianInflationSeries({...sample,dimension:{...sample.dimension,geo:{category:{index:{DE:0}}}}},'x')).toThrow();
  });
  it('non inventa dati in assenza di osservazioni', () => {
    expect(()=>parseItalianInflationSeries({...sample,value:{}},'x')).toThrow();
  });
  it('gestisce il formato array e indici temporali fuori ordine', () => {
    const reversed={...sample,dimension:{...sample.dimension,time:{category:{index:{'2026-09':0,'2026-08':1,'2026-07':2}}}},value:[2.3,null,1.9]};
    const result=parseItalianInflationSeries(reversed,'now');
    expect(result.history).toEqual([{period:'2026-07',annualRate:1.9},{period:'2026-09',annualRate:2.3}]);
    expect(result.annualRate).toBe(2.3);
  });
  it('rifiuta dimensioni inattese e posizioni invalide',()=>{
    expect(()=>parseItalianInflationSeries({...sample,id:['freq','unit','geo','time'],size:[1,1,1,3]},'x')).toThrow();
    expect(()=>parseItalianInflationSeries({...sample,dimension:{...sample.dimension,geo:{category:{index:{IT:4}}}}},'x')).toThrow();
  });
});
