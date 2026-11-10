import { calculateMunicipalAdditional, type MunicipalDataset, type MunicipalRecord } from './municipal-data';
import { REGIONAL_MEF_PAGE_URL, type RegionalMefDataset, type RegionalMefRecord } from './mef-regional';
import { isValidMunicipalRegion } from './italian-territories';

export type TaxCalculationStatus = 'calculated' | 'excluded' | 'unavailable';
export interface TaxBandDetail {
  from: number;
  to: number | null;
  taxableSlice: number;
  ratePct: number;
  tax: number;
}
export interface TaxLine {
  status: TaxCalculationStatus;
  amount: number | null;
  note: string;
  bands?: TaxBandDetail[];
  sourceUrl?: string;
}
export interface LocalTaxResult {
  municipal: TaxLine;
  regional: TaxLine;
  localTotal: number | null;
  complete: boolean;
  yearlyNetAfterLocal: number | null;
  monthlyAverageAfterLocal: number | null;
}
const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
const unavailable=(note:string):TaxLine=>({status:'unavailable',amount:null,note});
const normalized=(s:string):string=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
type Profile={limits:readonly number[];rates:readonly number[];normNeedle:string;requiresNoChildren?:boolean};
/**
 * Profili 2026 verificati confrontando il CSV MEF del 10/11/2026 con i siti regionali.
 * Il calcolo parte esclusivamente se il CSV corrente ha ancora ESATTAMENTE le fasce, le
 * aliquote e la norma attese. Ogni differenza comporta "non disponibile".
 */
export const REGIONAL_PROFILES_2026:Readonly<Record<string,Profile>>={
  'REGIONE LOMBARDIA':{
    limits:[15000,28000,50000],rates:[1.23,1.58,1.72,1.73],
    normNeedle:'art. 72'
  },
  'REGIONE EMILIA-ROMAGNA':{
    limits:[15000,28000,50000],rates:[1.33,1.93,2.78,3.33],
    normNeedle:'legge regionale 25 luglio 2025'
  },
  'REGIONE TOSCANA':{
    limits:[15000,28000,50000],rates:[1.42,1.43,3.32,3.33],
    normNeedle:'legge regionale 28/12/2023'
  },
  'REGIONE LIGURIA':{
    limits:[28000,50000],rates:[1.23,3.18,3.23],
    normNeedle:'legge regionale 9 ottobre 2024'
  },
  'REGIONE PIEMONTE':{
    limits:[15000,28000,50000],rates:[1.62,2.68,3.31,3.33],
    normNeedle:'legge regionale 6 agosto 2025',requiresNoChildren:true
  }
};
export function progressiveTax(
  taxableIncome:number, limits:readonly number[], rates:readonly number[]
):{amount:number;bands:TaxBandDetail[]} | null {
  if (!Number.isFinite(taxableIncome)||taxableIncome<0||
    rates.length!==limits.length+1 || !rates.length ||
    limits.some((v,i)=>!Number.isFinite(v)||v<=0||(i>0&&v<=limits[i-1]))||
    rates.some(v=>!Number.isFinite(v)||v<0||v>5))return null;
  const bands:TaxBandDetail[]=[];
  let total=0;let from=0;
  for(let i=0;i<rates.length;i++){
    const to=limits[i]??null;
    const taxableSlice=Math.max(0,Math.min(taxableIncome,to??taxableIncome)-from);
    const part=taxableSlice*rates[i]/100;
    total+=part;
    bands.push({from,to,taxableSlice,ratePct:rates[i],tax:round(part)});
    from=to??taxableIncome;
  }
  return {amount:round(total),bands};
}
function expectedBands(limits:readonly number[]):string[] {
  return limits.concat([Infinity]).map((to,i)=>{
    const from=i===0?0:limits[i-1];
    if(i===0)return 'fino a '+to.toFixed(2)+' euro';
    if(to===Infinity)return 'oltre '+from.toFixed(2)+' euro';
    return 'oltre '+from.toFixed(2)+' e fino a '+to.toFixed(2)+' euro';
  });
}
function validRegionalRows(rows:RegionalMefRecord[],region:string,profile:Profile):boolean {
  if(rows.length!==profile.rates.length)return false;
  const labels=expectedBands(profile.limits);
  return rows.every((r,i)=>
    r.region===region && r.ratePct===profile.rates[i] &&
    normalized(r.bandLabel)===normalized(labels[i]) &&
    normalized(r.regulation).includes(profile.normNeedle) &&
    !r.notes.trim() &&
    (profile.requiresNoChildren
      ? normalized(r.disposition).includes("piu' di due figli a carico") &&
        normalized(r.disposition).includes('500,00')
      : !r.disposition.trim())
  );
}
/** L'addizionale è dovuta solo se l'IRPEF nazionale netta è positiva.
 * Un profilo con più fasce NON applica la fascia più alta all'intero reddito.
 */
export function estimateRegional2026(
  region:string,
  dataset:RegionalMefDataset|null,
  taxableIncome:number,
  nationalIrpefDue:number,
  options:{noDependentChildrenConfirmed?:boolean}={}
):TaxLine {
  if(!Number.isFinite(taxableIncome)||taxableIncome<0||!Number.isFinite(nationalIrpefDue) || nationalIrpefDue<0)
    return unavailable('Imponibile o IRPEF nazionale non validi.');
  if(nationalIrpefDue===0)return {status:'excluded',amount:0,note:'Non dovuta con IRPEF nazionale netta nulla.'};
  if(!dataset||dataset.year!==2026||dataset.source!=='MEF - Dipartimento delle Finanze'||
    dataset.sourceUrl!==REGIONAL_MEF_PAGE_URL||!Array.isArray(dataset.records))
    return unavailable('Elenco MEF regionale 2026 assente o non verificato.');
  const rows=dataset.records.filter(r=>r.region===region);
  if(region==="REGIONE VALLE D'AOSTA"){
    if(rows.length!==1)return unavailable('Disposizione Valle d’Aosta incompleta.');
    const r=rows[0],text=normalized(r.disposition);
    const valid=r.ratePct===1.23 && normalized(r.bandLabel)==='aliquota unica' &&
      normalized(r.regulation).includes('legge regionale n. 29 del 23 dicembre 2025') &&
      !r.notes.trim() &&
      text.includes('fino a 15.000 euro') &&
      text.includes('oltre 15.000 euro') &&
      text.includes("sull'intero imponibile");
    if(!valid)return unavailable('La disposizione MEF Valle d’Aosta non corrisponde alla regola revisionata.');
    const amount=taxableIncome<=15000?0:round(taxableIncome*1.23/100);
    return {status:'calculated',amount,sourceUrl:REGIONAL_MEF_PAGE_URL,
      note:taxableIncome<=15000?'Esenzione Valle d’Aosta fino a 15.000 €.'
        :'Aliquota unica 1,23% sull’intero imponibile oltre 15.000 €.'};
  }
  const profile=REGIONAL_PROFILES_2026[region];
  if(!profile)return unavailable('Territorio con agevolazioni o regole da modellare: calcolo non disponibile.');
  if(profile.requiresNoChildren&&!options.noDependentChildrenConfirmed)
    return unavailable('Piemonte: confermare l’assenza di figli a carico per escludere detrazioni regionali.');
  if(!validRegionalRows(rows,region,profile))
    return unavailable('Aliquote, fasce o disposizioni del CSV MEF modificate o non verificate.');
  const calculated=progressiveTax(taxableIncome,profile.limits,profile.rates);
  if(!calculated)return unavailable('Impossibile applicare le fasce regionali.');
  return {status:'calculated',amount:calculated.amount,bands:calculated.bands,
    sourceUrl:REGIONAL_MEF_PAGE_URL,
    note:'Calcolo progressivo sulle quote di imponibile in ciascuna fascia MEF 2026'+
      (profile.requiresNoChildren?', senza detrazioni per figli a carico.':'.')};
}

export function estimateMunicipal2026(
  record:MunicipalRecord|null,
  dataset:MunicipalDataset|null,
  taxableIncome:number,
  nationalIrpefDue:number
):TaxLine {
  if(!Number.isFinite(taxableIncome)||taxableIncome<0||!Number.isFinite(nationalIrpefDue)||nationalIrpefDue<0)
    return unavailable('Imponibile o IRPEF nazionale non validi.');
  if(nationalIrpefDue===0)return {status:'excluded',amount:0,note:'Non dovuta con IRPEF nazionale netta nulla.'};
  if(!record||!dataset?.published||dataset.taxYear!==2026||!dataset.review)
    return unavailable('Comune non selezionato o dataset MEF 2026 non revisionato.');
  const amount=calculateMunicipalAdditional(record,taxableIncome);
  if(amount===null)return unavailable('Regola comunale non calcolabile: delibera speciale o pendente.');
  return {status:'calculated',amount,note:record.exemptionThreshold===null
    ?'Aliquota unica comunale 2026 verificata.'
    :'Esenzione comunale generale: zero entro la soglia, aliquota sull’intero reddito oltre.'};
}
export function estimateLocalTaxes2026(input:{
  municipal:MunicipalRecord|null;
  municipalDataset:MunicipalDataset|null;
  regionalDataset:RegionalMefDataset|null;
  region:string;
  taxableIncome:number;
  nationalIrpefDue:number;
  yearlyBeforeLocal:number;
  installments:12|13|14;
  noDependentChildrenConfirmed?:boolean;
}):LocalTaxResult {
  if(!input.municipal||!isValidMunicipalRegion(input.municipal.province,input.region)){
    const status=unavailable('Comune e regione non corrispondono, o provincia non mappata.');
    return {municipal:status,regional:status,complete:false,localTotal:null,
      yearlyNetAfterLocal:null,monthlyAverageAfterLocal:null};
  }
  const municipal=estimateMunicipal2026(input.municipal,input.municipalDataset,
    input.taxableIncome,input.nationalIrpefDue);
  const regional=estimateRegional2026(input.region,input.regionalDataset,
    input.taxableIncome,input.nationalIrpefDue,
    {noDependentChildrenConfirmed:input.noDependentChildrenConfirmed});
  const complete=municipal.amount!==null&&regional.amount!==null &&
    Number.isFinite(input.yearlyBeforeLocal)&&input.yearlyBeforeLocal>=0 &&
    [12,13,14].includes(input.installments);
  const localTotal=complete?round(municipal.amount!+regional.amount!):null;
  const yearlyNetAfterLocal=localTotal===null?null:round(input.yearlyBeforeLocal-localTotal);
  return {municipal,regional,complete,localTotal,yearlyNetAfterLocal,
    monthlyAverageAfterLocal:yearlyNetAfterLocal===null?null:round(yearlyNetAfterLocal/input.installments)};
}
