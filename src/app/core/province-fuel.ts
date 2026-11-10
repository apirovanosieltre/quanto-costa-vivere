/**
 * Prezzi medi territoriali caricati da snapshot statico, non calcolati nel browser.
 * Fonte: elaborazione optenergy su dati MIMIT (IODL 2.0), CC BY 4.0.
 * L'unita territoriale e la PROVINCIA, non il comune.
 */
export interface FuelObservation {
  median:number;
  q1:number;
  q3:number;
  stations:number;
}
export interface ProvinceFuel {
  code:string;
  name:string;
  benzina_self:FuelObservation;
  gasolio_self:FuelObservation;
}
export type FuelType='benzina_self'|'gasolio_self';
export interface ProvinceFuelSnapshot {
  schemaVersion:1;
  source:string;
  sourceUrl:string;
  originalSourceUrl:string;
  license:'CC BY 4.0';
  period:string;
  generatedAt:string;
  sourceSha256:string;
  geography:'province';
  method:string;
  provinces:ProvinceFuel[];
}
export function parseFuelSnapshot(raw:unknown):ProvinceFuelSnapshot {
  if(!raw||typeof raw!=='object')throw new Error('Dataset carburanti assente');
  const d=raw as ProvinceFuelSnapshot;
  if(d.schemaVersion!==1||d.geography!=='province'||
     d.sourceUrl!=='https://optenergy.it/dati/'||
     d.license!=='CC BY 4.0'||!d.source.includes('MIMIT')||
     !/^20\d{2}-\d{2}-\d{2}$/.test(d.period)||
     !Number.isFinite(Date.parse(d.period+'T00:00:00Z'))||
     !/^[a-f0-9]{64}$/.test(d.sourceSha256)||
     !Array.isArray(d.provinces)||d.provinces.length<90||d.provinces.length>120)
    throw new Error('Fonte, licenza o periodo carburanti non validi');
  const seen=new Set<string>();
  for(const province of d.provinces){
    if(!/^[A-Z]{2}$/.test(province.code)||!province.name||seen.has(province.code))
      throw new Error('Provincia carburanti duplicata o non valida');
    seen.add(province.code);
    for(const type of ['benzina_self','gasolio_self'] as const){
      const obs=province[type];
      if(!obs || ![obs.median,obs.q1,obs.q3].every(v=>Number.isFinite(v)&&v>=0.5&&v<=4.5)
        ||obs.q1>obs.median||obs.median>obs.q3||
        !Number.isInteger(obs.stations)||obs.stations<5)throw new Error('Prezzi carburante non validi');
    }
  }
  return d;
}
/** I prezzi non si considerano attuali quando lo snapshot supera 14 giorni. */
export function isFuelRecent(data:ProvinceFuelSnapshot,asOf=new Date()):boolean{
  const age=(asOf.getTime()-Date.parse(data.period+'T00:00:00Z'))/86400000;
  return age>=0 && age<=14;
}
export function fuelForProvince(data:ProvinceFuelSnapshot|null,code:string):ProvinceFuel|null {
  return data?.provinces.find(p=>p.code===code)??null;
}
export function monthlyFuelCost(
  medianEurPerLitre:number,monthlyKm:number,litresPer100km:number
):number|null{
  if(![medianEurPerLitre,monthlyKm,litresPer100km].every(Number.isFinite)||
    medianEurPerLitre<=0||medianEurPerLitre>4.5||
    monthlyKm<0||monthlyKm>20000||
    litresPer100km<=0||litresPer100km>40)return null;
  return Math.round((monthlyKm/100*litresPer100km*medianEurPerLitre+Number.EPSILON)*100)/100;
}
