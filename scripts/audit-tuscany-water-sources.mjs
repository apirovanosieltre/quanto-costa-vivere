/**
 * Monitors the OFFICIAL water-provider documents used for the 2026 Tuscany
 * 1-person resident cost estimates. Re-fetches weekly (GitHub Actions).
 *
 * IMPORTANT: Changed PDFs are NEVER silently transformed into published prices.
 * A bot pull request proposes source fingerprints and a review report. A human
 * must check the new 1-CNF water/sewer/treatment rows, effective dates, tax and
 * scope, and update the rates in tuscany-essential-2026.ts before merging.
 *
 * Expected-source failures are non-fatal. This prevents repeated CI failure mail
 * when third-party sites are temporarily unavailable.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const WATER_OFFICIAL_SOURCES=[
  {id:'nuove-acque',provider:'Nuove Acque',cities:'Arezzo',type:'html',
    url:'https://nuoveacque.it/tariffe-acqua/',landingUrl:'https://nuoveacque.it/tariffe-acqua/',year:'2026',
    tokens:['0,873755','1,544142','5,190004','34,11424']},
  {id:'publiacqua',provider:'Publiacqua',cities:'Firenze, Pistoia, Prato',type:'pdf',
    url:'https://www.publiacqua.it/sites/publiacqua/files/tariffe_2026.pdf',year:'2026',
    tokens:['2,000722','2,706863','5,531431','55,144788']},
  {id:'fiora',provider:'Acquedotto del Fiora',cities:'Grosseto, Siena',type:'pdf',
    url:'https://www.fiora.it/wp-content/uploads/2026/01/AdF_tariffe_2026.pdf',landingUrl:'https://www.fiora.it/richieste-e-servizi/bollette-e-pagamenti/tariffe/',year:'2026',
    tokens:['0,806200','1,612399','3,573745','25,721880']},
  {id:'asa',provider:'ASA',cities:'Livorno',type:'pdf',
    url:'https://www.asaspa.it/wp-content/uploads/2026/03/Tariffe-01_03_2026.pdf',landingUrl:'https://www.asaspa.it/acqua-i-tuoi-diritti/tariffe/sistema-tariffario/',year:'2026',
    tokens:['2,672341','3,505557','6,838421','59,258200']},
  {id:'geal',provider:'GEAL',cities:'Lucca',type:'pdf',
    url:'https://www.geal-lucca.it/wp-content/uploads/2025/10/Articolazione-tariffaria-civili-a-Valori-2025-GEAL.pdf',
    landingUrl:'https://www.geal-lucca.it/tariffe/',year:'2025 (esteso al 2026 dal gestore)',
    tokens:['0,503503','1,007005','2,224051','32,363518']},
  {id:'gaia',provider:'GAIA',cities:'Massa, bacino Piana',type:'pdf',
    url:'https://www.gaia-spa.it/images/CONTRATTO/Tariffa%20del%20servizio%20idrico/doc-pdf/Tariffe_2026.pdf',
    landingUrl:'https://www.gaia-spa.it/index.php/incarichi-e-consulenze/consulenti/14-categoria-contratto/50-tariffa-del-servizio-idrico',year:'2026',tokens:['0,512823','1,025645','3,076940','33,884388']},
  {id:'acque',provider:'Acque SpA',cities:'Pisa',type:'pdf',
    url:'https://www.acque.net/wp-content/uploads/tariffe-2026.pdf',
    landingUrl:'https://www.acque.net/i-miei-diritti/tariffe/tariffe-fornitura/',year:'2026',tokens:['0,711606','1,423211','3,284747','35,036307']}
];
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MANIFEST=path.join(ROOT,'data','tuscany-water-source-hashes.json');
const REPORT=path.join(ROOT,'docs','water-tariffs-review.md');
const hash=(x)=>createHash('sha256').update(x).digest('hex');
const escape=(x)=>String(x).replaceAll('|','/').replaceAll('\n',' ');

function isolateResidentHtml(html){
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim();
  const begin=text.search(/Domestica residente 1 CNF\s+Tariffa 2026/i);
  if(begin<0)throw Error('1 CNF 2026 not found in official HTML');
  const tail=text.slice(begin+25);
  const end=tail.search(/Domestica residente 2 CNF/i);
  if(end<0||end>2500)throw Error('Cannot delimit first household tariff in official HTML');
  return tail.slice(0,end).trim();
}

async function fetchDocument(url){
  let latest;
  for(let retry=0;retry<2;retry++){
    try{
      const r=await fetch(url,{headers:{'User-Agent':'QuantoCostaVivere/1.0 (+source checks; public statistics)'},
        signal:AbortSignal.timeout(16000)});
      if(!r.ok)throw Error('HTTP '+r.status);
      const contentLength=Number(r.headers.get('content-length')??0);
      if(contentLength>8_000_000)throw Error('Too large');
      const raw=Buffer.from(await r.arrayBuffer());
      if(raw.length<1500||raw.length>8_000_000)throw Error('Unexpected source size '+raw.length);
      return raw;
    }catch(e){latest=e;}
  }
  throw latest;
}

async function inspectTariffIndex(source){
  if(!source.landingUrl)return {nextYearListed:false,listingDigest:null};
  try{
    const raw=await fetchDocument(source.landingUrl);
    const html=raw.toString('utf8');
    // Only the tariff document links are relevant. Hashing full HTML would
    // create alerts when the provider changes cookie notices or site menus.
    const links=[];
    const anchors=html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi);
    for(const [, ,href,body] of anchors){
      const label=body.replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ')
        .replace(/\s+/g,' ').trim();
      if(!/tariff(?:e|ario|aria)?/i.test(label)||
        !/\b202[5-9]\b/.test(label))continue;
      try{links.push(label.slice(0,180)+'|'+new URL(href,source.landingUrl).href);}
      catch{/* Invalid site link skipped without causing false updates. */}
    }
    const relevant=[...new Set(links)].sort();
    return {
      nextYearListed:/tariff(?:e|ario)(?:\s|&nbsp;|<[^>]*>){0,15}(?:civili\s*)?2027/i.test(html)||
        /articolazione\s+tariffaria\s+2027/i.test(html),
      listingDigest:relevant.length?hash(relevant.join('\n')):null
    };
  }catch(e){
    console.warn('Tariff index temporarily unavailable',source.id,String(e).slice(0,150));
    return {nextYearListed:false,listingDigest:null};
  }
}
async function sourceRecord(source){
  const raw=await fetchDocument(source.url);
  let content;
  if(source.type==='pdf'){
    if(raw.subarray(0,5).toString('utf8')!=='%PDF-')
      throw Error('Expected PDF signature');
    const dir=await mkdtemp(path.join(tmpdir(),'water-official-'));
    try{
      const file=path.join(dir,'document.pdf');
      await writeFile(file,raw);
      content=execFileSync('pdftotext',['-layout',file,'-'],
        {encoding:'utf8',maxBuffer:5_000_000,timeout:12000});
    }finally{await rm(dir,{recursive:true,force:true});}
  }else{
    content=isolateResidentHtml(raw.toString('utf8'));
  }
  if(content.length<80)throw Error('Extracted text missing');
  // For the one-person category, check all reviewed numeric signatures.
  const tokensAbsent=source.tokens.filter(t=>!content.includes(t));
  // Binary hash for PDFs, normalized one-person tariff-section hash for HTML.
  const digest=hash(source.type==='pdf'?raw:content);
  const {nextYearListed,listingDigest}=await inspectTariffIndex(source);
  return {nextYearListed,listingDigest,id:source.id,provider:source.provider,cities:source.cities,url:source.url,
    sourceYear:source.year,sha256:digest,referenceTokensPresent:tokensAbsent.length===0,
    missingReferenceTokens:tokensAbsent};
}

async function run(){
  const mode=process.argv[2];
  if(!['--seed','--check'].includes(mode))throw Error('Usage: node scripts/audit-tuscany-water-sources.mjs --seed|--check');
  const existing=await readFile(MANIFEST,'utf8').then(JSON.parse).catch(()=>({schemaVersion:1,year:2026,sources:[]}));
  if(existing.schemaVersion!==1||existing.year!==2026||!Array.isArray(existing.sources))
    throw Error('Manifest schema invalid; do not overwrite');
  const found=await Promise.all(WATER_OFFICIAL_SOURCES.map(async source=>{
    try{
      const record=await sourceRecord(source);
      console.log('Official source checked',source.id,
        record.sha256.slice(0,12),record.referenceTokensPresent?'matches reviewed values':'REVIEW REQUIRED');
      return {source,record};
    }catch(error){
      console.warn('Source temporarily unavailable',source.id,String(error).slice(0,240));
      return {source,record:null};
    }
  }));
  const successes=found.filter(x=>x.record!==null);
  console.log('Coverage:',successes.length+'/'+WATER_OFFICIAL_SOURCES.length,'official providers reachable');
  if(mode==='--seed'){
    if(successes.length!==WATER_OFFICIAL_SOURCES.length||
      successes.some(x=>!x.record.referenceTokensPresent)){
      console.warn('SEED INCOMPLETE: all 7 official sources must have reviewed signatures before publishing baseline.');
      return;
    }
    const data={schemaVersion:1,year:2026,sourceCount:WATER_OFFICIAL_SOURCES.length,
      sources:successes.map(x=>x.record).sort((a,b)=>a.id.localeCompare(b.id))};
    await mkdir(path.dirname(MANIFEST),{recursive:true});
    await writeFile(MANIFEST,JSON.stringify(data,null,2)+'\n');
    console.log('Seeded reviewed-source fingerprint manifest.');
    return;
  }
  if(existing.sources.length!==WATER_OFFICIAL_SOURCES.length){
    console.warn('Baseline incomplete. Monitor cannot safely compare sources; needs manual initialization.');
    return;
  }
  const prior=new Map(existing.sources.map(r=>[r.id,r]));
  const changes=successes.filter(x=>
    prior.get(x.record.id)?.sha256!==x.record.sha256||
    (x.record.nextYearListed===true && prior.get(x.record.id)?.nextYearListed!==true)||
    (x.record.listingDigest!==null && prior.get(x.record.id)?.listingDigest!==null &&
      prior.get(x.record.id)?.listingDigest!==x.record.listingDigest)
  );
  if(!changes.length){
    console.log('No confirmed official source changes. Nothing to publish.');
    return;
  }
  const updated=new Map(existing.sources.map(x=>[x.id,x]));
  for(const {record} of changes)updated.set(record.id,record);
  const report=[
    '# Fonti acqua Toscana: verifica aggiornamenti automatica',
    '',
    '**Bozza creata automaticamente. NON approvare senza controllare i tariffari effettivi.**',
    '',
    'Il bot controlla ogni lunedì sette fonti ufficiali e verifica i PDF e la sezione',
    '“1 componente residente”. Un nuovo checksum non prova un cambio di tariffa;',
    'i dati utilizzati dal calcolatore NON sono modificati automaticamente.',
    '',
    '| Gestore e città | Digest precedente | Digest attuale | Confronto numeri pubblicati |',
    '|---|---|---|---|',
    ...changes.map(({source,record})=>
      `| ${escape(source.provider)} · ${escape(source.cities)} | ${prior.get(record.id)?.sha256?.slice(0,12)??'assente'} | ${record.sha256.slice(0,12)} | ${record.nextYearListed?'**Nuovo tariffario 2027 segnalato**. ':''}${record.referenceTokensPresent?'cifre già presenti':'**ATTENZIONE: cifre originarie modificate o struttura cambiata**'} |`),
    '',
    '## Revisione necessaria prima del merge',
    '',
    '- [ ] Aprire ogni fonte ufficiale e verificare anno / decorrenza e categoria **domestico residente, una persona**.',
    '- [ ] Controllare 3 scaglioni di acquedotto, fognatura, depurazione e quote fisse, e trattare esplicitamente componenti UI e IVA.',
    '- [ ] Aggiornare le tariffe in `src/app/core/tuscany-essential-2026.ts` e i test numerici, **se e solo se** sono effettivamente cambiate.',
    '- [ ] Verificare l’eventuale variazione del bacino tarifffario di Massa e la validità della conferma 2025 di Lucca.',
    '- [ ] Superare la CI e controllare gli esempi a 0, 19, 45, 67 e 100 m³/anno.',
    '- [ ] Non pubblicare tariffe di anni successivi sotto l’etichetta 2026.',
    '',
    ...changes.map(({source,record})=>
      `- [${source.provider} · ${source.cities}](${record.url})${record.missingReferenceTokens.length?' (cifre vecchie non trovate: '+record.missingReferenceTokens.join(', ')+')':''}`)
  ].join('\n')+'\n';
  const data={schemaVersion:1,year:2026,sourceCount:WATER_OFFICIAL_SOURCES.length,
    sources:[...updated.values()].sort((a,b)=>a.id.localeCompare(b.id))};
  await mkdir(path.dirname(MANIFEST),{recursive:true});
  await mkdir(path.dirname(REPORT),{recursive:true});
  await writeFile(MANIFEST,JSON.stringify(data,null,2)+'\n');
  await writeFile(REPORT,report);
  console.log('Changes detected:',changes.map(x=>x.source.id).join(', '),
    'Audit proposal prepared. No price values modified.');
}
await run();
