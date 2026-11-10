/**
 * Builds a compact, reproducible province-level fuel snapshot for static Cloudflare assets.
 * It is sourced exclusively from optenergy's CC BY 4.0 aggregations of MIMIT IODL 2.0.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compileFuelSnapshot, FUEL_SOURCE_URL } from './fuel-province.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public/data/province-fuel-latest.json');
const response=await fetch(FUEL_SOURCE_URL,{
  signal:AbortSignal.timeout(25000),headers:{Accept:'text/csv,text/plain'}
});
if(!response.ok)throw Error('Fuel prices source HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if(bytes.length<10_000||bytes.length>15_000_000)throw Error('Fuel source size unexpected: '+bytes.length);
const csv=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
if(process.argv.includes('--inspect')){
  const rows=csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  console.log('SOURCE',FUEL_SOURCE_URL,'HTTP',response.status,'BYTES',bytes.length,'ROWS',rows.length);
  console.log('CSV HEADER',JSON.stringify(rows[0]));
  console.log('CSV SAMPLE',JSON.stringify(rows.slice(1,6)));
  console.log('CSV TAIL',JSON.stringify(rows.slice(-4)));
  process.exit(0);
}
const snapshot=compileFuelSnapshot(csv,new Date().toISOString());
snapshot.sourceSha256=createHash('sha256').update(bytes).digest('hex');
snapshot.sourceBytes=bytes.length;
const previous=await fs.readFile(output,'utf8').then(JSON.parse).catch(()=>null);
if(previous?.period===snapshot.period &&
  JSON.stringify(previous?.provinces)===JSON.stringify(snapshot.provinces)){
  console.log('No new observed fuel prices. Snapshot remains '+previous.period);
  process.exit(0);
}
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify(snapshot,null,2)+'\n');
console.log('Fuel prices saved:',JSON.stringify({
  period:snapshot.period,provinces:snapshot.provinces.length,
  sourceSha256:snapshot.sourceSha256,output:path.relative(root,output)
}));
