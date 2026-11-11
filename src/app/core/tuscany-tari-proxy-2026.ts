/**
 * PROXY editoriali TARI 2026, soltanto per quattro capoluoghi mancanti.
 * Non sono tariffe comunali né intervalli statistici di confidenza.
 *
 * Confronto esclusivamente con quote BASE TARI per 1 residente pubblicate
 * dai comuni. Lucca usa la TARIC a svuotamenti e non può essere mescolata.
 * La selezione manuale di capoluoghi relativamente vicini è una scelta di
 * scenario: non implica similitudine dei piani economici finanziari.
 */
import {tariSingle2026BaseAnnual,tariSingle2026Record} from './tuscany-tari-2026';

/** Codici comunali dei capoluoghi per i quali mancano quote approvate estratte. */
export const TARI_NEIGHBOR_REFERENCE_CODES_2026:Readonly<Record<string,readonly string[]>>={
  D612:['G713','I726','G702'], // Firenze: Pistoia, Siena, Pisa
  E202:['I726','E625'],       // Grosseto: Siena, Livorno
  F023:['G702','E625'],       // Massa: Pisa, Livorno (Lucca esclusa: TARIC)
  G999:['G713','G702']        // Prato: Pistoia, Pisa
};

export interface NeighborTariProxy2026 {
  cityCode:string;
  areaSqm:number;
  /** Mediana dei costi annuali BASE dei comuni di riferimento, non una tariffa locale. */
  estimatedAnnualEUR:number;
  /** Minimo e massimo osservati SOLTANTO fra i riferimenti, NON limiti attesi della bolletta. */
  peerMinAnnualEUR:number;
  peerMaxAnnualEUR:number;
  peers:readonly {city:string;code:string;annualEUR:number;sourceUrl:string}[];
  method:'peer-median';
}
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;

/** Lascia null per qualsiasi città fuori dall'elenco e per input anomali. */
export function tariNeighborProxy2026(code:string,areaSqm:number):NeighborTariProxy2026|null {
  if(!Number.isFinite(areaSqm)||areaSqm<15||areaSqm>300)return null;
  const codes=TARI_NEIGHBOR_REFERENCE_CODES_2026[code];
  if(!codes||codes.length<2)return null;
  const peers=codes.map(peerCode=>{
    const tariff=tariSingle2026Record(peerCode);
    const annual=tariSingle2026BaseAnnual(peerCode,areaSqm);
    if(!tariff||annual===null)throw Error('Proxy TARI con fonte mancante: '+peerCode);
    return {city:tariff.city,code:peerCode,annualEUR:annual,sourceUrl:tariff.sourceUrl};
  });
  const sorted=peers.map(p=>p.annualEUR).sort((a,b)=>a-b);
  const middle=sorted.length/2;
  const estimate=sorted.length%2===1
    ?sorted[Math.floor(middle)]
    :(sorted[middle-1]+sorted[middle])/2;
  return {
    cityCode:code,areaSqm,estimatedAnnualEUR:round(estimate),
    peerMinAnnualEUR:sorted[0],peerMaxAnnualEUR:sorted[sorted.length-1],
    peers,method:'peer-median'
  };
}
