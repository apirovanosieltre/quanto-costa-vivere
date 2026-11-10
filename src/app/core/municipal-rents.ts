export interface MunicipalRentBenchmark {
  schemaVersion:1;
  municipalCode:string;
  city:string;
  geography:'city_unweighted_zone_aggregate';
  basePeriod:string;
  createdAt:string;
  sourcePublisher:string;
  sourceUrl:string;
  sourceCsvUrl:string;
  sourceLicense:'CC BY 4.0';
  sourceSha256:string;
  type:string;
  maintenance:string;
  areaType:'L';
  unit:'EUR/m²/month';
  zonesCount:number;
  lowerMedian:number;
  upperMedian:number;
  caveat:string;
  rawQuoteRowsPublished:false;
}
export interface MunicipalRentDataset {
  schemaVersion:1;
  generatedAt:string;
  methodology:string;
  cities:MunicipalRentBenchmark[];
}
const DATASET_URL='https://dati.comune.milano.it/dataset/ds3024-quotazioni-immobiliari-omi-locazione-semestre-2025-2';
export function parseMunicipalRentData(raw:unknown):MunicipalRentDataset {
  if(!raw||typeof raw!=='object')throw new Error('Dataset degli affitti assente');
  const d=raw as MunicipalRentDataset;
  if(d.schemaVersion!==1||!Array.isArray(d.cities)||d.cities.length!==1||!d.methodology)
    throw new Error('Copertura o schema degli affitti non validi');
  const r=d.cities[0];
  if(r.municipalCode!=='F205'||r.city!=='Milano'||r.basePeriod!=='2025/2'||
     r.geography!=='city_unweighted_zone_aggregate'||r.areaType!=='L'||
     r.unit!=='EUR/m²/month'||r.type!=='Abitazioni civili'||r.maintenance!=='NORMALE'||
     r.sourceLicense!=='CC BY 4.0'||r.sourceUrl!==DATASET_URL||
     !/^[a-f0-9]{64}$/.test(r.sourceSha256)||r.rawQuoteRowsPublished!==false||
     !Number.isInteger(r.zonesCount)||r.zonesCount<20||
     !Number.isFinite(r.lowerMedian)||!Number.isFinite(r.upperMedian)||
     r.lowerMedian<=0||r.upperMedian<r.lowerMedian||r.upperMedian>150) {
    throw new Error('Benchmark immobiliare non verificato');
  }
  return d;
}
export function benchmarkForMunicipality(d:MunicipalRentDataset|null,code:string):MunicipalRentBenchmark|null {
  return d?.cities.find(r=>r.municipalCode===code)??null;
}
export function rentalRangeForArea(benchmark:MunicipalRentBenchmark,areaSqm:number):{min:number;max:number}|null {
  if(!Number.isFinite(areaSqm)||areaSqm<15||areaSqm>500)return null;
  const money=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
  return {min:money(benchmark.lowerMedian*areaSqm),max:money(benchmark.upperMedian*areaSqm)};
}
