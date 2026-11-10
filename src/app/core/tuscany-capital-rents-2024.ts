/**
 * Regione Toscana, "Abitare in Toscana 2025", 14° Rapporto, pag. 35,
 * Tabella 2.2 "Prezzi medi al metro quadro dei contratti registrati nel 2024 per tipo".
 * Il testo chiarisce che il campione e' riferito alle CITTA' CAPOLUOGO.
 * Fonte primaria dei dati: elaborazione su dati OMI dei nuovi contratti.
 * Unita': EUR/m²/ANNO, non EUR/m²/mese.
 * Non usare per tutti i comuni della provincia o come canoni richiesti nel 2026.
 */
export type TuscanyContract='long'|'agreed'|'temporary';
export interface TuscanCapitalRent2024 {
  code:string;
  city:string;
  province:string;
  /** EUR/m²/year: newly registered contracts in 2024 */
  yearlyEURPerSqm:Record<TuscanyContract,number>;
}
export const TUSCANY_RENT_2024_SOURCE={
  url:'https://www.regione.toscana.it/documents/d/guest/abitare-in-toscana2025_v3_interattivo',
  title:'Regione Toscana, Abitare in Toscana 2025, Tabella 2.2, pagina 35',
  referenceYear:2024,
  published:'Aprile 2026',
  geographicScope:'Solo comuni capoluogo toscani (non tutte le localita delle province)',
  originalData:'Elaborazione Regione Toscana su dati OMI dei contratti registrati',
  unit:'EUR/m²/anno',
  caveat:'Medie indicative dei nuovi contratti 2024, non offerte di affitto 2026. Non corregge per posizione, dimensione, qualità degli immobili o composizione dei contratti.'
} as const;
const RENTS:readonly TuscanCapitalRent2024[]=[
  {code:'A390',city:'Arezzo',province:'AR',yearlyEURPerSqm:{agreed:69,long:66,temporary:76}},
  {code:'D612',city:'Firenze',province:'FI',yearlyEURPerSqm:{agreed:99,long:160,temporary:244}},
  {code:'E202',city:'Grosseto',province:'GR',yearlyEURPerSqm:{agreed:83,long:69,temporary:116}},
  {code:'E625',city:'Livorno',province:'LI',yearlyEURPerSqm:{agreed:69,long:87,temporary:105}},
  {code:'E715',city:'Lucca',province:'LU',yearlyEURPerSqm:{agreed:76,long:82,temporary:123}},
  // Nel rapporto la riga e' "Massa Carrara", provincia MS; il comune capoluogo e' Massa.
  {code:'F023',city:'Massa',province:'MS',yearlyEURPerSqm:{agreed:79,long:74,temporary:168}},
  {code:'G702',city:'Pisa',province:'PI',yearlyEURPerSqm:{agreed:88,long:105,temporary:136}},
  {code:'G713',city:'Pistoia',province:'PT',yearlyEURPerSqm:{agreed:75,long:63,temporary:88}},
  {code:'G999',city:'Prato',province:'PO',yearlyEURPerSqm:{agreed:78,long:101,temporary:107}},
  {code:'I726',city:'Siena',province:'SI',yearlyEURPerSqm:{agreed:92,long:98,temporary:102}}
];
export const TUSCANY_CAPITAL_RENTS_2024:readonly TuscanCapitalRent2024[]=RENTS;
const byCode=new Map(RENTS.map(r=>[r.code,r]));
export function tuscanCapitalRentRecord(code:string):TuscanCapitalRent2024|null{
  return byCode.get(code)??null;
}
/** Rent scenario using a stated nominal floor area, not a real property estimate. */
export function tuscanCapitalMonthlyRent2024(
  code:string,areaSqm:number,contract:TuscanyContract
):number|null{
  const city=tuscanCapitalRentRecord(code);
  if(!city||!Number.isFinite(areaSqm)||areaSqm<15||areaSqm>300||
     !['long','agreed','temporary'].includes(contract))return null;
  return Math.round((city.yearlyEURPerSqm[contract]*areaSqm/12+Number.EPSILON)*100)/100;
}
export function comparableTuscanRentPair(firstCode:string,secondCode:string):boolean {
  return firstCode!==secondCode && byCode.has(firstCode) && byCode.has(secondCode);
}
