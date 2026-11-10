import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileMilanResidentialRents,MILAN_RENT_CSV_URL} from './omi-milan-rent.mjs';

const output=path.join(path.dirname(fileURLToPath(import.meta.url)),'../public/data/municipal-rent-benchmarks.json');
const REVIEWED_MILAN_SOURCE_SHA256='588850f7745bfcdb680fe9d66007728493a8db74e52e2c43d195cc40c24c48be';
const response=await fetch(MILAN_RENT_CSV_URL,{signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('Source Milan OMI HTTP '+response.status);
const buf=Buffer.from(await response.arrayBuffer());
if(buf.length<20000||buf.length>500000)throw Error('Unexpected Milan source bytes: '+buf.length);
let csv;try{csv=new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch{csv=new TextDecoder('windows-1252').decode(buf);}
const fingerprint=createHash('sha256').update(buf).digest('hex');
if(fingerprint!==REVIEWED_MILAN_SOURCE_SHA256)
  throw Error('Il CSV Milano 2025/2 è cambiato: serve una nuova revisione tecnica e dei diritti.');
const entry=compileMilanResidentialRents(csv,new Date().toISOString());
entry.sourceSha256=fingerprint;
const snapshot={
  schemaVersion:1,
  generatedAt:entry.createdAt,
  methodology:'Mediana non ponderata dei limiti minimi/massimi per zone OMI residenziali omogenee: non è il canone medio di mercato.',
  cities:[entry]
};
const previous=await fs.readFile(output,'utf8').then(JSON.parse).catch(()=>null);
if(previous?.cities?.[0]?.sourceSha256===entry.sourceSha256){
  console.log('Milan OMI source unchanged',entry.basePeriod,entry.zonesCount,'zones');
  process.exit(0);
}
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify(snapshot,null,2)+'\n');
console.log('Milan rent derived benchmark',JSON.stringify({
  period:entry.basePeriod,zones:entry.zonesCount,lower:entry.lowerMedian,upper:entry.upperMedian,
  fingerprint:entry.sourceSha256
}));
