import { describe, expect, it } from 'vitest';
import { parseLatestItalianInflation } from './eurostat';
const sample = {
  id: ['freq','unit','coicop18','geo','time'], size:[1,1,1,1,3],
  dimension:{
    freq:{category:{index:{M:0}}}, unit:{category:{index:{RCH_A:0}}},
    coicop18:{category:{index:{TOTAL:0}}}, geo:{category:{index:{IT:0}}},
    time:{category:{index:{'2026-07':0,'2026-08':1,'2026-09':2}}}
  },value:{'0':2.1,'1':2.2}, updated:'2026-10-16T21:00:00Z'
};
describe('Eurostat JSON-stat', () => {
  it('seleziona l\'ultimo mese con valore e non inventa quello mancante', () => {
    const result=parseLatestItalianInflation(sample,'2026-11-09T00:00:00Z');
    expect(result.period).toBe('2026-08'); expect(result.annualRate).toBe(2.2);
  });
  it('rifiuta dimensioni non coerenti', () => {
    expect(()=>parseLatestItalianInflation({...sample, dimension:{...sample.dimension,geo:{category:{index:{DE:0}}}}},'x')).toThrow();
  });
  it('non usa un tasso fittizio in assenza di valori', () => {
    expect(()=>parseLatestItalianInflation({...sample,value:{}},'x')).toThrow();
  });
});
