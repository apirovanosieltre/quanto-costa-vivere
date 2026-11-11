import {type CategorySuggestion} from './automatic-city-compare';
import {type CostKey} from './city-compare';
import {comparableTuscanRentPair} from './tuscany-capital-rents-2024';

/** An explicit checklist, never an invented "89% confidence" score. */
export interface ReliabilityAssessment {
  status:'parziale'|'scenario completo';
  mandatoryMissing:CostKey[];
  risks:string[];
  directlyComparableRent:boolean;
  historicalRent:boolean;
  nationalOrAssumedCount:number;
  hasUntestedLocalUtilityAssumptions:boolean;
}
export interface ReliabilityInput {
  cityCode:string;
  suggestions:CategorySuggestion[];
  expenses:Record<CostKey,number|null>;
  tariIncluded:boolean;
  tariVerifiedOrPersonal:boolean;
  manualEdited?:Partial<Record<CostKey,boolean>>;
}

export function assessReliability(input:ReliabilityInput):ReliabilityAssessment{
  const categories:['housing','utilities','groceries','transport','other']=
    ['housing','utilities','groceries','transport','other'];
  const mandatoryMissing=categories.filter(k=>{
    const amount=input.expenses[k];
    return amount===null||!Number.isFinite(amount)||amount<0;
  });
  const housing=input.suggestions.find(s=>s.key==='housing');
  const utilities=input.suggestions.find(s=>s.key==='utilities');
  const risks:string[]=[];
  const manuallyEditedHousing=input.manualEdited?.housing===true;
  const historicalRent=!manuallyEditedHousing&&!!housing&&(housing.kind==='observed'||housing.kind==='derived');
  if(manuallyEditedHousing)risks.push('Affitto personalizzato: cifra inserita dall’utente, non verificata dalle fonti del sito.');
  if(!manuallyEditedHousing&&housing?.kind==='observed')risks.push('Affitto: contratti storici 2024, non annunci o nuove offerte nel 2026.');
  if(!manuallyEditedHousing&&housing?.kind==='derived')risks.push('Affitto: indicatore OMI aggregato, non canone di una casa equivalente.');
  if(!housing||housing.amount===null)risks.push('Affitto: manca un riferimento locale verificato; inserire il costo effettivo.');
  if(!input.tariIncluded)risks.push('TARI: esclusa dal totale; il budget non include tutte le spese per abitare.');
  else if(!input.tariVerifiedOrPersonal)risks.push('TARI: valore non verificato per questo comune.');
  const hasUntestedLocalUtilityAssumptions=utilities?.kind==='mixed'||utilities?.kind==='scenario'||!utilities;
  if(hasUntestedLocalUtilityAssumptions)
    risks.push('Utenze: la stima combina il riferimento ARERA per vulnerabili con ipotesi sul gas; non equivale a una bolletta reale.');
  const nationalOrAssumedCount=input.suggestions.filter(s=>
    ['scenario','proxy','mixed'].includes(s.kind)).length;
  if(nationalOrAssumedCount>0)
    risks.push('Alcune voci usano proxy nazionali o spese illustrative, non prezzi osservati nel comune.');
  if(mandatoryMissing.length)
    risks.push('Totale non calcolabile: mancano '+mandatoryMissing.length+' delle cinque macro-categorie.');
  return {
    status:mandatoryMissing.length?'parziale':'scenario completo',
    mandatoryMissing,risks, directlyComparableRent:false,historicalRent,
    nationalOrAssumedCount,hasUntestedLocalUtilityAssumptions
  };
}

/** Only the housing historical component can be claimed comparable.
 * The monthly totals are NOT comparable as official city cost-of-living indices.
 */
export function assessComparisonReliability(
  left:ReliabilityInput,right:ReliabilityInput
):{canShowScenarioDelta:boolean;comparableHistoricalRent:boolean;warnings:string[]}{
  const a=assessReliability(left),b=assessReliability(right);
  const comparableHistoricalRent=comparableTuscanRentPair(left.cityCode,right.cityCode)&&
    left.manualEdited?.housing!==true&&right.manualEdited?.housing!==true;
  const warnings:string[]=[];
  if(a.status==='parziale'||b.status==='parziale')
    warnings.push('Una o entrambe le città hanno spese mancanti: il delta delle spese non è completo.');
  if(left.tariIncluded!==right.tariIncluded)
    warnings.push('La TARI è inclusa in una sola città: il confronto delle spese è asimmetrico.');
  if(!comparableHistoricalRent)
    warnings.push('Gli affitti delle due città non sono garantiti omogenei per fonte, periodo o tipologia.');
  else
    warnings.push('Solo la componente affitto storico è direttamente confrontabile: stessa fonte, anno e contratto.');
  warnings.push('Il totale resta uno scenario personalizzabile, non una graduatoria statistica del costo della vita.');
  return {
    canShowScenarioDelta:a.status==='scenario completo'&&b.status==='scenario completo',
    comparableHistoricalRent,warnings
  };
}
