
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseCsv, detectDelimiter, normalizeMunicipalRow } from './mef-csv.mjs';

const url='https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=2026';
let r;
try {
  r=await fetch(url,{signal:AbortSignal.timeout(30000)});
} catch(error) {
  console.error('MEF comunale temporaneamente non raggiungibile:',error.message);
  process.exit(2);
}
if([403,408,429].includes(r.status)||r.status>=500){
  console.error('MEF comunale temporaneamente non raggiungibile: HTTP '+r.status);
  process.exit(2);
}
if(!r.ok) throw Error('MEF HTTP '+r.status);
let bytes;
try { bytes=Buffer.from(await r.arrayBuffer()); }
catch(error){
  console.error('Lettura sorgente MEF comunale interrotta:',error.message);
  process.exit(2);
}
let source;
try{source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
catch{source=new TextDecoder('windows-1252').decode(bytes);}
if(source.includes('<html'))throw Error('HTML instead of CSV');
const rows=parseCsv(source,detectDelimiter(source));
const head=rows[0];
const records=rows.map((r,i)=>({r,i,n:normalizeMunicipalRow(r)})).filter(x=>x.n);
const simple=records.filter(x=>x.n.status==='simple');
const flag2=records.filter(x=>x.r[32]==='2');
const flag1Rejected=records.filter(x=>x.r[32]==='1' && x.n.status!=='simple');
const flagCount={};
for(const {r} of records)flagCount[r[32]]=(flagCount[r[32]]??0)+1;
console.log('CSV audit sourceSha256',createHash('sha256').update(bytes).digest('hex'));
console.log('CSV audit headers',JSON.stringify(head));
const noteFreq={};for(const item of records){const note=item.r[6]??'';noteFreq[note]=(noteFreq[note]??0)+1;}
console.log('CSV audit note frequencies',JSON.stringify(Object.entries(noteFreq).sort((a,b)=>b[1]-a[1]).slice(0,40)));
console.log('CSV audit note sample',JSON.stringify(records.filter(x=>['1','2'].includes(x.r[32])).slice(0,25).map(({r,n})=>({c:n.code,name:n.municipality,note:r[6],flag:r[32],reason:n.reason}))));

console.log('CSV audit total',records.length,'flags',JSON.stringify(flagCount));
console.log('CSV audit normalized statuses',JSON.stringify(Object.fromEntries(['simple','needs-review','pending'].map(k=>[k,records.filter(x=>x.n.status===k).length]))));
console.log('CSV audit representative simple FIRST',JSON.stringify(simple.slice(0,12).map(({r,n,i})=>({i,name:n.municipality,code:n.code,flag:r[32],threshold:r[33],values:r.slice(7,20),normalized:n}))));
const target=['F205','A390','H501','D612','G273','L219'];
console.log('CSV audit reference city rows',JSON.stringify(records.filter(x=>target.includes(x.n.code)).map(({r,n,i})=>({i,name:n.municipality,code:n.code,flag:r[32],values:r.slice(7,34),normalized:n}))));
console.log('CSV audit flag 2 examples',JSON.stringify(flag2.slice(0,18).map(({r,n,i})=>({i,name:n.municipality,flag:r[32],values:r.slice(7,34),normalized:n}))));
console.log('CSV audit rejected flag 1 examples',JSON.stringify(flag1Rejected.slice(0,15).map(({r,n,i})=>({i,name:n.municipality,flag:r[32],values:r.slice(7,34),normalized:n}))));
console.log('CSV audit simple OTHER',JSON.stringify(simple.slice(-8).map(({r,n,i})=>({i,name:n.municipality,code:n.code,flag:r[32],values:r.slice(7,18),normalized:n}))));
