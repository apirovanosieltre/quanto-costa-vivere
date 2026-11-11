/**
 * October 2026 Facile.it nationwide quote sample: 1,894 kWh / 940.95 EUR
 * electricity; 725 Smc / 864.33 EUR gas; mean household 2.27 people.
 * The consumption coefficients used below are explicitly editorial SCENARIOS,
 * not observed averages for homes or households of a given size.
 * The sampled total-per-unit includes fixed costs; linear extrapolation is not
 * a tariff or a real supplier quote.
 */
export type HeatingChoice='gas'|'electric'|'none';
export interface HomeEnergyInput {
  areaSqm:number;
  residents:number;
  heating:HeatingChoice;
  electricityKwhYear?:number;
  gasSmcYear?:number;
}
export const ENERGY_MARKET_REFERENCE_2026={
  reportMonth:'ottobre 2026',
  sourceUrl:'https://www.facile.it/energia-luce-gas/osservatorio/italia.html',
  electricKwh:1894,electricTotalEUR:940.95,
  gasSmc:725,gasTotalEUR:864.33
} as const;
export interface HomeEnergyEstimate {
  electricityKwhYear:number;
  gasSmcYear:number;
  electricityMonthlyEUR:number;
  gasMonthlyEUR:number;
  note:string;
}
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function estimateHomeEnergy2026(input:HomeEnergyInput):HomeEnergyEstimate {
  const {areaSqm,residents,heating}=input;
  if(!Number.isFinite(areaSqm)||areaSqm<15||areaSqm>300||
     !Number.isInteger(residents)||residents<1||residents>8||
     !['gas','electric','none'].includes(heating))
    throw new Error('Profilo energetico non valido');
  // Editorial consumption scenarios. Electric heating assumes heat pump;
  // 'none' excludes dedicated household heating cost (e.g. condominium heating).
  const defaultKwh=Math.round(850+500*residents+1.1*areaSqm+
    (heating==='electric'?22*areaSqm:0));
  const defaultSmc=heating==='gas'
    ?Math.round(130+6*areaSqm+55*residents):0;
  const kwh=input.electricityKwhYear??defaultKwh;
  const smc=input.gasSmcYear??defaultSmc;
  if(!Number.isFinite(kwh)||kwh<0||kwh>20000||
     !Number.isFinite(smc)||smc<0||smc>5000||
     (heating!=='gas'&&smc!==0))throw new Error('Consumi energetici non validi');
  const price=ENERGY_MARKET_REFERENCE_2026;
  return {
    electricityKwhYear:kwh,gasSmcYear:smc,
    electricityMonthlyEUR:round(kwh*price.electricTotalEUR/price.electricKwh/12),
    gasMonthlyEUR:round(smc*price.gasTotalEUR/price.gasSmc/12),
    note:'Consumi stimati con coefficienti editoriali per occupanti, m² e riscaldamento; '+
      'spesa proporzionata ai rapporti spesa/consumo del campione nazionale ottobre 2026. '+
      'Non sono medie ufficiali per tipo di abitazione né offerte o bollette reali. '+
      'Costi fissi e scaglioni non scalano linearmente.'
  };
}
