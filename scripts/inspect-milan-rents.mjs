const url='https://dati.comune.milano.it/dataset/cac75735-6fee-4e46-813f-dc1a43c02b8e/resource/2b37b0fc-e7b5-4ba2-bd8b-073c987f19bf/download/quotazioni_omi_locazione_2025_2.csv';
const r=await fetch(url,{signal:AbortSignal.timeout(20000)});
if(!r.ok)throw Error('HTTP '+r.status);
const buf=Buffer.from(await r.arrayBuffer());
let s;try{s=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch{s=new TextDecoder('windows-1252').decode(buf)}
const lines=s.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
console.log('SOURCE',url,'size',buf.length,'rows',lines.length);
console.log('HEADER',JSON.stringify(lines[0]));
console.log('SAMPLES',JSON.stringify(lines.slice(1,14)));
console.log('TAIL',JSON.stringify(lines.slice(-5)));
