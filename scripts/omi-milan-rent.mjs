/**
 * Derivative municipal rent benchmark. Do NOT republish OMI zone-level database.
 * Source: Comune di Milano Open Data DS3024, OMI locazione, 2025/2, CC BY 4.0.
 * Full OMI database separately subject to Agenzia delle Entrate conditions.
 * Result is *unweighted median of zone bounds*, not mean/median advertised rents.
 */
export const MILAN_RENT_CSV_URL='https://dati.comune.milano.it/dataset/cac75735-6fee-4e46-813f-dc1a43c02b8e/resource/2b37b0fc-e7b5-4ba2-bd8b-073c987f19bf/download/quotazioni_omi_locazione_2025_2.csv';
export const MILAN_DATASET_PAGE='https://dati.comune.milano.it/dataset/ds3024-quotazioni-immobiliari-omi-locazione-semestre-2025-2';
const EXPECTED='Area_territoriale;Regione;Prov;Comune_ISTAT;Comune_cat;Sez;Comune_amm;Comune_descrizione;Fascia;Zona;LinkZona;Cod_Tip;Descr_Tipologia;Stato;Stato_prev;Loc_min;Loc_max;Sup_NL_loc';
function num(value){
  if(typeof value!=='string'||!/^(?:\d+(?:[.,]\d+)?)$/.test(value.trim()))return null;
  const n=Number(value.replace(',','.'));
  return Number.isFinite(n)?n:null;
}
function median(values){
  const sorted=[...values].sort((a,b)=>a-b);
  const index=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[index]:(sorted[index-1]+sorted[index])/2;
}
function rounded(v){return Math.round((v+Number.EPSILON)*100)/100;}
export function compileMilanResidentialRents(csv,createdAt){
  if(!csv||typeof csv!=='string'||csv.length<1000||csv.length>1_000_000)throw Error('Unexpected Milan rental source size');
  const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  if(lines.shift()?.trim()!==EXPECTED)throw Error('Municipal OMI CSV schema changed; publication blocked');
  if(lines.length<300||lines.length>800)throw Error('Unexpected Milan dataset coverage');
  const zones=new Map();
  let eligible=0;let malformed=0;
  for(const line of lines){
    const r=line.split(';').map(v=>v.trim().replace(/^"|"$/g,''));
    if(r.length!==18)throw Error('Malformed rental row: width changed');
    if(r[2]!=='MI'||r[6]!=='F205'||r[7].toUpperCase()!=='MILANO')
      throw Error('Unexpected territory outside Milan');
    if(r[12].toLowerCase()!=='abitazioni civili'||r[13].toUpperCase()!=='NORMALE'||r[17].toUpperCase()!=='L')
      continue;
    const min=num(r[15]),max=num(r[16]);
    if(!/^([A-Z])\d{1,3}$/.test(r[9])||min===null||max===null||min<=0||max<min||max>200){
      malformed++;continue;
    }
    if(zones.has(r[9]))throw Error('Duplicate normal residential quotation for zone '+r[9]);
    zones.set(r[9],{min,max});
    eligible++;
  }
  if(malformed||zones.size<20||zones.size>200)throw Error('Inadequate or malformed normal residential rent quotations: '+zones.size+'/'+malformed);
  const minima=[...zones.values()].map(z=>z.min);
  const maxima=[...zones.values()].map(z=>z.max);
  // Do not output full OMI rows or per-zone records. Derived aggregate only.
  return {
    schemaVersion:1,
    municipalCode:'F205',
    city:'Milano',
    geography:'city_unweighted_zone_aggregate',
    basePeriod:'2025/2',
    createdAt,
    sourcePublisher:'Comune di Milano, fonte originaria Agenzia delle Entrate - OMI',
    sourceUrl:MILAN_DATASET_PAGE,
    sourceCsvUrl:MILAN_RENT_CSV_URL,
    sourceLicense:'CC BY 4.0',
    type:'Abitazioni civili',
    maintenance:'NORMALE',
    areaType:'L',
    unit:'EUR/m²/month',
    zonesCount:zones.size,
    lowerMedian:rounded(median(minima)),
    upperMedian:rounded(median(maxima)),
    caveat:'Mediana non ponderata dei limiti minimi e massimi OMI di zona. Non è un canone medio di mercato e non rappresenta una specifica zona o un immobile.',
    rawQuoteRowsPublished:false
  };
}
