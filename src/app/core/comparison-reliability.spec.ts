import {describe,it,expect} from 'vitest';
import {assessReliability,assessComparisonReliability,type ReliabilityInput} from './comparison-reliability';
import {type CategorySuggestion} from './automatic-city-compare';

function profile(code='A390'):ReliabilityInput{
 const sources=[
  {key:'housing',amount:302.5,kind:'observed',confidence:'media'},
  {key:'utilities',amount:120.64,kind:'mixed',confidence:'bassa'},
  {key:'groceries',amount:410.73,kind:'proxy',confidence:'bassa'},
  {key:'transport',amount:42.2,kind:'tariff',confidence:'alta'},
  {key:'other',amount:225,kind:'scenario',confidence:'bassa'}
 ] as const;
 return {
  cityCode:code,
  expenses:{housing:302.5,utilities:120.64,groceries:410.73,transport:42.2,other:225},
  tariIncluded:false,tariVerifiedOrPersonal:code==='A390',
  suggestions:sources.map(s=>({...s,date:s.key==='housing'?'Nuovi contratti 2024':'',geography:'',sourceName:'',sourceUrl:null,explanation:''})) as CategorySuggestion[]
 };
}
describe('Comparison quality warnings: never advertise an official city-wide accuracy score',()=>{
 it('keeps complete scenarios separate from truly documented prices',()=>{
  const a=assessReliability(profile());
  expect(a.status).toBe('scenario completo');
  expect(a.historicalRent).toBe(true);
  expect(a.nationalOrAssumedCount).toBe(3);
  expect(a.risks.join(' ')).toContain('TARI: esclusa');
  expect(a.risks.join(' ')).toContain('bolletta reale');
 });
 it('flags missing rent and counts only finite nonnegative inputs',()=>{
  const p=profile('F839');
  p.expenses.housing=null;
  p.suggestions[0]={...p.suggestions[0],kind:'unavailable',amount:null};
  expect(assessReliability(p).status).toBe('parziale');
  expect(assessReliability(p).mandatoryMissing).toEqual(['housing']);
  p.expenses.utilities=NaN;
  expect(assessReliability(p).mandatoryMissing).toEqual(['housing','utilities']);
 });
 it('indicates same-source rent history only for different Tuscan capitals',()=>{
  const p=profile(),q=profile('D612');
  expect(assessComparisonReliability(p,q).comparableHistoricalRent).toBe(true);
  expect(assessComparisonReliability(p,q).canShowScenarioDelta).toBe(true);
  expect(assessComparisonReliability(p,q).warnings.join(' ')).toContain('Solo la componente affitto');
  q.cityCode='F205';
  expect(assessComparisonReliability(p,q).comparableHistoricalRent).toBe(false);
 });
 it('does not label manually changed rent as a historical municipal observation',()=>{
  const p=profile(),q=profile('D612');
  p.manualEdited={housing:true};
  const a=assessReliability(p);
  expect(a.historicalRent).toBe(false);
  expect(a.risks.join(' ')).toContain('Affitto personalizzato');
  expect(assessComparisonReliability(p,q).comparableHistoricalRent).toBe(false);
 });
 it('does not call asking 2026 rents historical or equivalent to signed contracts',()=>{
   const p=profile(),q=profile('D612');
   for(const data of [p,q])
     data.suggestions[0]={...data.suggestions[0],kind:'derived',date:'Prezzi richiesti negli annunci, ottobre 2026'};
   expect(assessReliability(p).historicalRent).toBe(false);
   expect(assessComparisonReliability(p,q).comparableHistoricalRent).toBe(false);
   expect(assessReliability(p).risks.join(' ')).toContain('annunci ottobre 2026');
 });
 it('warns if TARI is included for only one city',()=>{
  const p=profile(),q=profile('D612');
  p.tariIncluded=true;
  const assessment=assessComparisonReliability(p,q);
  expect(assessment.warnings.join(' ')).toContain('asimmetrico');
  expect(assessment.warnings.join(' ')).toContain('non una graduatoria');
 });
});
