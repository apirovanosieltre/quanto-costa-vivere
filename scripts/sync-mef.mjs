import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';
import { normalizeMunicipalCsv } from './mef-csv.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const fileIndex=args.indexOf('--file');
const csvPath=fileIndex>=0 ? args[fileIndex+1] : null;
const publish=args.includes('--publish');
const reviewed=args.includes('--reviewed');
const manifestIndex=args.indexOf('--manifest');
const manifestFile=manifestIndex>=0 ? args[manifestIndex+1] : null;
const official='https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=2026';
const isSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
try {
  let buffer;
  if(csvPath){
    if(!csvPath)throw new Error('Specificare un file CSV dopo --file');
    buffer=await fs.readFile(csvPath);
  }else{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
    try{
      const response=await fetch(official,{signal:controller.signal});
      if(!response.ok)throw new Error('MEF HTTP '+response.status);
      buffer=Buffer.from(await response.arrayBuffer());
    }finally{clearTimeout(timeout);}
  }
  if(buffer.length<10000 || buffer.length>15_000_000)throw new Error('Dimensione del CSV MEF inattesa');
  let csv;
  try{csv=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
  catch{csv=new TextDecoder('windows-1252').decode(buffer);}
  const dataset=normalizeMunicipalCsv(csv,new Date().toISOString());
  const sourceSha256=createHash('sha256').update(buffer).digest('hex');
  const report=dataset.report;
  if(report.simple<1500||report.simple>3700)throw new Error('Aliquote semplici fuori dalla fascia di controllo: '+report.simple);
  const samples={
    simple:dataset.records.filter(r=>r.status==='simple').slice(0,10),
    needsReview:dataset.records.filter(r=>r.status==='needs-review').slice(0,10),
    pending:dataset.records.filter(r=>r.status==='pending').slice(0,10)
  };
  const audit={
    generatedAt:dataset.retrievedAt,sourceUrl:official,sourceSha256,
    sourceBytes:buffer.length,report,flagCounts:dataset.flagCounts,samples
  };
  await fs.writeFile(join(root,'mef-validation-report.json'),JSON.stringify(audit,null,2));
  await fs.writeFile(join(root,'mef-candidate-2026.json'),JSON.stringify(dataset,null,2));
  console.log('MEF 2026 QA:',JSON.stringify({sourceSha256,report,flagCounts:dataset.flagCounts},null,2));

  if(publish){
    if(!reviewed||!manifestFile)throw new Error('Blocco pubblicazione: fornire --reviewed --manifest dopo revisione dei campioni');
    const manifest=JSON.parse(await fs.readFile(resolve(root,manifestFile),'utf8'));
    if(manifest.taxYear!==2026||manifest.sourceSha256!==sourceSha256||
       manifest.expectedRows!==report.rows||
       !isSame(manifest.expectedCounts,report)||
       !Array.isArray(manifest.samples)||manifest.samples.length<8||
       !manifest.reviewedAt||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(manifest.reviewedAt)){
      throw new Error('La revisione non corrisponde al CSV ufficiale corrente: pubblicazione bloccata');
    }
    const recordByCode=new Map(dataset.records.map(r=>[r.code,r]));
    const seen=new Set();
    for(const s of manifest.samples){
      const entry=recordByCode.get(s.code);
      if(!entry||seen.has(s.code)||
         entry.municipality!==s.municipality||entry.status!==s.status||
         entry.ratePct!==s.ratePct||entry.exemptionThreshold!==s.exemptionThreshold){
        throw new Error('Campione delibera non corrispondente al file ufficiale: '+s.code);
      }
      seen.add(s.code);
    }
    if(![...seen].some(k=>recordByCode.get(k).status==='pending') ||
       ![...seen].some(k=>recordByCode.get(k).exemptionThreshold!==null) ||
       ![...seen].some(k=>recordByCode.get(k).status==='needs-review') ||
       ![...seen].some(k=>recordByCode.get(k).status==='simple'&&recordByCode.get(k).exemptionThreshold===null)){
      throw new Error('Campioni non coprono tutti i regimi (semplice, esenzione, speciale, pendente)');
    }
    dataset.published=true;
    dataset.review={
      status:'approved',sourceSha256,reviewedAt:manifest.reviewedAt,
      method:'conservative-csv-schema-and-sample-audit',
      sampleCodes:manifest.samples.map(s=>s.code)
    };
    // Rimuovi campi tecnici non usati dal frontend solo dopo la verifica.
    delete dataset.flagCounts;
    await fs.writeFile(join(root,'public/data/municipal-2026.json'),JSON.stringify(dataset));
    console.log('Dataset revisionato scritto su public/data/municipal-2026.json, sorgente '+sourceSha256);
  }else{
    console.log('Solo QA. Nessun dato pubblicato.');
  }
}catch(error){
  console.error('Importazione MEF bloccata:',error.message);
  process.exitCode=1;
}
