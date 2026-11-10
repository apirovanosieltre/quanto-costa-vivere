/**
 * Provenienza: optenergy.it, dataset provinciale derivato da MIMIT.
 * Licenza: CC BY 4.0 (aggregazione optenergy), originale MIMIT IODL 2.0.
 * https://optenergy.it/dati/
 * Il periodo del dato non viene mai dedotto dal momento del download.
 */
const SOURCE='https://optenergy.it/dati/carburanti-province-ultimo-anno.csv';
const timeout=AbortSignal.timeout(25000);
const response=await fetch(SOURCE,{signal:timeout,headers:{Accept:'text/csv,text/plain'}});
if(!response.ok)throw Error('Feed provincia non disponibile: HTTP '+response.status);
const bytes=await response.arrayBuffer();
if(bytes.byteLength<10_000||bytes.byteLength>15_000_000)throw Error('Dimensione CSV anomala: '+bytes.byteLength);
const csv=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
console.log('SOURCE',SOURCE,'HTTP',response.status,'BYTES',bytes.byteLength,'ROWS',lines.length);
console.log('CSV HEADER',JSON.stringify(lines[0]));
console.log('CSV SAMPLE',JSON.stringify(lines.slice(1,6)));
console.log('CSV TAIL',JSON.stringify(lines.slice(-4)));
