/**
 * Audit source material for costs which cannot be safely updated automatically:
 * Tuscany historical rent, municipal TARI for five Tuscan capitals, urban passes, ARERA
 * electricity/gas reference, national ISTAT consumer spending.
 *
 * The weekly job creates ONE REVIEW PR, never edits the numerical models.
 * Document/year transitions must be reviewed by a human, because a heading or
 * a newly uploaded PDF cannot safely express the same cohort, price components,
 * or observation period as the published benchmark.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath=path.join(root,'data','official-cost-source-hashes.json');
const reportPath=path.join(root,'docs','official-cost-sources-review.md');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const roundText=text=>text.replace(/\s+/g,' ').replace(/&nbsp;|&#160;/gi,' ').trim();
const oneLine=text=>String(text).replace(/[\r\n|]/g,' ').slice(0,160);

export const OFFICIAL_COST_SOURCES=[
  {id:'tuscany-rents-2024',topic:'Affitti storico 2024 · 10 capoluoghi',
    kind:'pdf',year:'2024',sourceDate:'aprile 2026',
    url:'https://www.regione.toscana.it/documents/d/guest/abitare-in-toscana2025_v3_interattivo',
    requiredTokens:['TABELLA 2.2','PREZZI MEDI','CONTRATTI REGISTRATI NEL 2024','Arezzo','Firenze','Pistoia']},
  {id:'arezzo-tari-2026',topic:'TARI Arezzo · quota fissa/variabile 1 componente',
    kind:'pdf',year:'2026',sourceDate:'29 luglio 2026',
    url:'https://www.comune.arezzo.it/sites/default/files/2026-08/Allegato%20A%20tariffe%20utenze%20domestiche.pdf',
    indexUrl:'https://www.comune.arezzo.it/tari-tassa-sui-rifiuti-2026',
    requiredTokens:['1,12107','138,77659']},
  {id:'livorno-tari-2026',topic:'TARI Livorno · 1 residente, quota comunale base',
    kind:'pdf',year:'2026',sourceDate:'30 luglio 2026',
    url:'https://cloud-ita.municipiumapp.it/s3/3612/allegati/servizi/tributi/tari/delibere/unicopefdelibera2026_b4c67c0667cbc3b3_p7m_qrcode.pdf',
    indexUrl:'https://comune.livorno.it/it/documenti_pubblici/delibere-tari',
    requiredTokens:['1,12','96,87']},
  {id:'pisa-tari-2026',topic:'TARI Pisa · 1 componente, quota fissa e variabile',
    kind:'pdf',year:'2026',sourceDate:'tariffe 2026',
    url:'https://www.sepi-pisa.it/en-us/download/utenze-domestiche-2026-5221-89-20046-d92cb77953270cfa58e91142933256d4',
    requiredTokens:['1,2302','148,1854']},
  {id:'pistoia-tari-2026',topic:'TARI Pistoia · quota base 1 residente, senza riduzione 12%',
    kind:'pdf',year:'2026',sourceDate:'tariffe 2026',
    url:'https://www.comune.pistoia.it/s3/5285/allegati/tributi/tariffe-tari/tariffe-tari-2026.pdf',
    indexUrl:'https://www.comune.pistoia.it/it/documenti_pubblici/tariffe-tari',
    requiredTokens:['1,03','114,40']},
  {id:'siena-tari-2026',topic:'TARI Siena · 1 residente quota QF/QV, CC 112/2026',
    kind:'pdf',year:'2026',sourceDate:'23 luglio 2026',
    url:'https://sigericospa.it/wp-content/uploads/2026/07/30913_ALL-_1_TARIFFE_TARI_2026.pdf',
    indexUrl:'https://sigericospa.it/tari-regolamenti-e-tariffe/',
    requiredTokens:['1,1524','50,3323']},
  {id:'lucca-taric-2026',topic:'TARIC Lucca · 1 residente, scaglioni svuotamenti',
    kind:'pdf',year:'2026',sourceDate:'11 giugno 2026',
    url:'https://www.comune.lucca.it/app/uploads/2025/05/Allegato-C-tariffe-TARIC-2026.pdf',
    indexUrl:'https://www.comune.lucca.it/notizia/tariffa-corrispettiva-taric/',
    requiredTokens:['1,17070','57,42675','1,457','0,457']},
  {id:'tuscany-bus-month',topic:'Autolinee Toscane · abbonamento mensile',
    kind:'html',year:'2026',sourceDate:'controllo novembre 2026',
    url:'https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-mensile',
    requiredTokens:['42,20','Arezzo','Firenze','Siena']},
  {id:'tuscany-bus-year',topic:'Autolinee Toscane · abbonamento annuale',
    kind:'html',year:'2026',sourceDate:'controllo novembre 2026',
    url:'https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-annuale',
    requiredTokens:['342,80','Arezzo','Firenze','Siena']},
  {id:'arera-electric-reference-2026',topic:'Energia: riferimento ARERA vulnerabili, NON mercato libero',
    kind:'html',year:'2026',sourceDate:'29 settembre 2026',
    url:'https://www.arera.it/comunicati-stampa/dettaglio/elettricit%C3%A0-maggior-tutela-373-nel-iv-trimestre-2026-per-i-clienti-vulnerabili',
    requiredTokens:['665,38','2026','vulnerabili']},
  {id:'arera-gas-commodity-2026',topic:'Gas: sola componente materia prima CMEMm (NON bolletta)',
    kind:'html',year:'2026',sourceDate:'ottobre 2026',
    url:'https://www.arera.it/comunicati-stampa/dettaglio/gas-valore-materia-prima-vulnerabilita-ottobre-2026',
    requiredTokens:['0,945436','2026','ottobre']},
  {id:'istat-household-spending-2025',topic:'ISTAT: consumi famiglie 2025, proxy alimentari',
    kind:'html',year:'2025',sourceDate:'8 ottobre 2026',
    url:'https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/',
    requiredTokens:['2025','2.070','2.782','552']}
];
async function download(url){
  let error;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(url,{
        headers:{'User-Agent':'QuantoCostaVivereSourceAudit/1.0 (public tariff verification)'},
        signal:AbortSignal.timeout(15000)
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      const size=Number(response.headers.get('content-length')||0);
      if(size>12_000_000)throw Error('Document too large');
      const buffer=Buffer.from(await response.arrayBuffer());
      if(buffer.length<350||buffer.length>12_000_000)throw Error('Document size unexpected: '+buffer.length);
      return buffer;
    }catch(e){error=e;}
  }
  throw error;
}
async function pdfText(buffer){
  if(buffer.subarray(0,5).toString('utf8')!=='%PDF-')throw Error('Expected official PDF content');
  const dir=await mkdtemp(path.join(tmpdir(),'cost-source-'));
  try{
    const name=path.join(dir,'source.pdf');
    await writeFile(name,buffer);
    return execFileSync('pdftotext',['-layout',name,'-'],{
      encoding:'utf8',timeout:18000,maxBuffer:8_000_000
    });
  }finally{await rm(dir,{recursive:true,force:true});}
}
function htmlText(html){
  return roundText(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&euro;|&#8364;/gi,'€')
    .replace(/&[a-z]+;/gi,' '));
}
async function inspect(source){
  const raw=await download(source.url);
  const text=source.kind==='pdf'?await pdfText(raw):htmlText(raw.toString('utf8'));
  if(text.length<100)throw Error('No extractable source text');
  const normalized=roundText(text);
  const missingTokens=source.requiredTokens.filter(x=>!normalized.toLowerCase().includes(x.toLowerCase()));
  // PDF binary digests are sensitive to any upstream re-publication.
  // HTML digest is restricted to contextual snippets around reference tokens,
  // reducing false alerts due to navigation, banners, or tracking changes.
  const snippets=source.requiredTokens.map(token=>{
    const index=normalized.toLowerCase().indexOf(token.toLowerCase());
    return index<0?'MISSING '+token:normalized.slice(Math.max(0,index-80),index+token.length+80);
  });
  const digest=sha256(source.kind==='pdf'?raw:snippets.join('\n'));
  let indexDigest=null;
  if(source.indexUrl){
    try{
      const indexHtml=(await download(source.indexUrl)).toString('utf8');
      const links=[...indexHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
        .map(([,url,label])=>[url,htmlText(label)])
        .filter(([,label])=>/tariff|allegat|202[6-9]/i.test(label))
        .map(([url,label])=>label.slice(0,100)+' '+new URL(url,source.indexUrl).href).sort();
      if(links.length)indexDigest=sha256([...new Set(links)].join('\n'));
    }catch(e){console.warn('Index not reachable:',source.id,String(e).slice(0,180));}
  }
  return {
    id:source.id,topic:source.topic,url:source.url,year:source.year,kind:source.kind,
    published:source.sourceDate,sha256:digest,indexDigest,
    referenceTokensPresent:missingTokens.length===0,missingReferenceTokens:missingTokens
  };
}
function changed(before,after){
  return !before||before.sha256!==after.sha256||
    (before.indexDigest!==null&&after.indexDigest!==null&&before.indexDigest!==after.indexDigest)||
    (before.referenceTokensPresent&&!after.referenceTokensPresent);
}
async function main(){
  const mode=process.argv[2];
  if(mode!=='--seed'&&mode!=='--check')throw Error('Usage: --seed | --check');
  const old=await readFile(manifestPath,'utf8').then(JSON.parse)
    .catch(()=>({schemaVersion:1,sourceCount:0,sources:[]}));
  if(old.schemaVersion!==1||!Array.isArray(old.sources))throw Error('Invalid manifest');
  const reports=await Promise.all(OFFICIAL_COST_SOURCES.map(async source=>{
    try{
      const record=await inspect(source);
      console.log(source.id,record.sha256.slice(0,12),
        record.referenceTokensPresent?'reviewed tokens present':'REVIEW: missing tokens');
      return {source,record,error:null};
    }catch(e){
      console.warn(source.id,'temporarily unavailable:',String(e).slice(0,240));
      return {source,record:null,error:String(e)};
    }
  }));
  const valid=reports.filter(r=>r.record);
  console.log('Official source audit:',valid.length,'of',OFFICIAL_COST_SOURCES.length,'reachable');
  if(mode==='--seed'){
    if(valid.length!==OFFICIAL_COST_SOURCES.length||
      valid.some(r=>!r.record.referenceTokensPresent)){
      console.warn('No baseline written: every primary source must be reachable with reviewed reference tokens.');
      return;
    }
    await mkdir(path.dirname(manifestPath),{recursive:true});
    await writeFile(manifestPath,JSON.stringify({
      schemaVersion:1,sourceCount:OFFICIAL_COST_SOURCES.length,
      sources:valid.map(x=>x.record).sort((a,b)=>a.id.localeCompare(b.id))
    },null,2)+'\n');
    console.log('Baseline seeded. Source snapshots do NOT modify published prices.');
    return;
  }
  if(old.sources.length!==OFFICIAL_COST_SOURCES.length){
    console.warn('Missing baseline. Manual initialization required; not publishing prices.');
    return;
  }
  const previous=new Map(old.sources.map(x=>[x.id,x]));
  const differences=valid.filter(({record})=>changed(previous.get(record.id),record));
  if(!differences.length){console.log('No verified document change; incomplete fetches cannot change published prices.');return;}
  const next=new Map(old.sources.map(x=>[x.id,x]));
  for(const {record} of differences)next.set(record.id,record);
  const rows=differences.map(({record})=>{
    const oldRow=previous.get(record.id);
    return '| '+oneLine(record.topic)+' | '+(oldRow?.sha256?.slice(0,12)??'?')+
      ' | '+record.sha256.slice(0,12)+' | '+
      (record.referenceTokensPresent?'Previously reviewed values still present':'**VALUE / FORMAT CHANGED**')+' |';
  });
  const report=[
    '# Verifica nuove fonti ufficiali dei costi',
    '',
    '**ATTENZIONE: il bot non ha modificato alcun dato o formula nel comparatore.**',
    '',
    '| Fonte | Fingerprint prima | Fingerprint dopo | Controllo valori preesistenti |',
    '|---|---|---|---|',...rows,'',
    'Per ogni fonte controllare:',
    '',
    '- [ ] Data di pubblicazione e di efficacia: la pagina storica potrebbe non rappresentare l’anno corrente.',
    '- [ ] Identità della misura: nucleo di 1 persona, territorio, classe, servizio e unità di misura.',
    '- [ ] Costi fissi, scaglioni, IVA, contributi aggiuntivi e agevolazioni quando applicabili.',
    '- [ ] Se c’è un nuovo anno, aggiornare le formule e le etichette in codice, con nuovi test numerici.',
    '- [ ] Se è cambiata solo l’impaginazione, aggiornare solo il checksum dopo aver verificato i valori.',
    '- [ ] Approvare solo dopo CI e documentazione: NON unire questa PR automaticamente.',
    '',
    ...differences.map(({record})=>'- ['+oneLine(record.topic)+']('+record.url+')'+
      (record.missingReferenceTokens.length?
        ' (mancano: '+record.missingReferenceTokens.join(', ')+')':'')),
    ''
  ].join('\n');
  await mkdir(path.dirname(manifestPath),{recursive:true});
  await mkdir(path.dirname(reportPath),{recursive:true});
  await writeFile(manifestPath,JSON.stringify({
    schemaVersion:1,sourceCount:OFFICIAL_COST_SOURCES.length,
    sources:[...next.values()].sort((a,b)=>a.id.localeCompare(b.id))
  },null,2)+'\n');
  await writeFile(reportPath,report);
  console.log('Source changes awaiting human review:',differences.map(x=>x.source.id).join(', '));
}
await main();
