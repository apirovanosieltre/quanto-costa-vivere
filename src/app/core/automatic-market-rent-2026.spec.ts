import {describe,expect,it} from 'vitest';
import {suggestSinglePersonCosts,compareMethodWarning,TUSCANY_ASKING_RENTS_OCT_2026,
  ASKING_RENTS_SOURCE_2026,DEFAULT_SINGLE_PERSON_OPTIONS} from './automatic-city-compare';
describe('asking rents snapshot October 2026',()=>{
  it('covers all ten capitals as asking prices, NOT signed contracts',()=>{
    expect(Object.keys(TUSCANY_ASKING_RENTS_OCT_2026)).toHaveLength(10);
    const s=suggestSinglePersonCosts('D612',null,{...DEFAULT_SINGLE_PERSON_OPTIONS,rentBaseline:'asking2026'});
    const home=s.find(x=>x.key==='housing')!;
    expect(home.amount).toBe(1177);
    expect(home.kind).toBe('derived');
    expect(home.confidence).toBe('bassa');
    expect(home.date).toContain('ottobre 2026');
    expect(home.explanation).toContain('Non è il canone');
    expect(home.sourceUrl).toBe(ASKING_RENTS_SOURCE_2026);
    expect(compareMethodWarning('A390','D612','asking2026')).toContain('Prezzi richiesti');
  });
  it('does not override the 2024 registered-lease benchmark by default',()=>{
    const historical=suggestSinglePersonCosts('D612',null,DEFAULT_SINGLE_PERSON_OPTIONS);
    expect(historical[0].amount).toBe(733.33);
    expect(historical[0].date).toContain('2024');
  });
});