import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';
import { normalizeMunicipalCsv } from './mef-csv.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const fileIndex=args.indexOf('--file');
const csvPath=fileIndex>=0 ? args[fileIndex+1] : null;
const publish=args.includes('--publish');
const official='https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=2026';
try {
  let buffer;
  if(csvPath) buffer=await fs.readFile(csvPath);
  else {
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch(official,{signal:controller.signal});
      if(!response.ok) throw new Error(`MEF HTTP ${response.status}`);
      buffer=Buffer.from(await response.arrayBuffer());
      if(buffer.byteLength>15_000_000) throw new Error('File CSV troppo grande');
    } finally {clearTimeout(timeout);}
  }
  let text;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{text=new TextDecoder('windows-1252').decode(buffer);}
  const parsed=normalizeMunicipalCsv(text,new Date().toISOString());
  const summary=parsed.report;
  console.log('MEF 2026 - QA:',JSON.stringify(summary,null,2));
  if(summary.simple<500) throw new Error('Numero di aliquote semplici troppo basso: controllare parser manualmente');
  const reportFile=join(root,'mef-validation-report.json');
  await fs.writeFile(reportFile,JSON.stringify({generatedAt:parsed.retrievedAt,sourceUrl:official,report:summary,examples:parsed.records.slice(0,20)},null,2));
  if(publish){
    if(!args.includes('--reviewed')) throw new Error('Per pubblicare serve --reviewed dopo un controllo manuale sul CSV e sul report');
    parsed.published=true;
    await fs.writeFile(join(root,'public/data/municipal-2026.json'),JSON.stringify(parsed));
    console.log('Dataset pubblico aggiornato (rivedere il diff prima del commit).');
  } else console.log('Solo validazione. Nessun dato fiscale pubblicato.');
} catch(err){console.error('Importazione bloccata:',err.message); process.exitCode=1;}
