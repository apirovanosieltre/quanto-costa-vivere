/** CSV ufficiale MEF, schema 2021+, 34 colonne. Non convertire casi specifici in aliquote. */
export const MUNICIPAL_MEF_HEADERS = [
 'CODICE_CATASTALE','COMUNE','PR','NUMERO_DELIBERA','DATA_DELIBERA','DATA_PUBBLICAZIONE',
 'NOTE','MULTIALIQ','ALIQUOTA','FASCIA','ALIQUOTA_2','FASCIA_2','ALIQUOTA_3','FASCIA_3',
 'ALIQUOTA_4','FASCIA_4','ALIQUOTA_5','FASCIA_5','ALIQUOTA_6','FASCIA_6',
 'ALIQUOTA_7','FASCIA_7','ALIQUOTA_8','FASCIA_8','ALIQUOTA_9','FASCIA_9',
 'ALIQUOTA_10','FASCIA_10','ALIQUOTA_11','FASCIA_11','ALIQUOTA_12','FASCIA_12',
 'FLAG_NUOVA','IMPORTO_ESENTE'
];
export function parseCsv(content, delimiter=';') {
  const rows=[];let row=[];let cell='';let quoted=false;
  const input=content.replace(/^\uFEFF/,'');
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(ch==='"') {
      if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    } else if(ch===delimiter&&!quoted) {row.push(cell.trim());cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){
      if(ch==='\r'&&input[i+1]==='\n')i++;
      row.push(cell.trim());cell='';if(row.some(Boolean))rows.push(row);row=[];
    }else cell+=ch;
  }
  if(quoted)throw new Error('CSV malformato: virgolette non chiuse');
  row.push(cell.trim());if(row.some(Boolean))rows.push(row);
  return rows;
}
export function detectDelimiter(content) {
  const first=content.split(/\r?\n/,1)[0];
  return [';','\t',','].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
}
function numberItalian(raw,{allowLeadingSeparator=false}={}) {
  if(typeof raw!=='string')return null;
  let value=raw.trim();
  if(allowLeadingSeparator && /^[,.]\d+$/.test(value))value='0'+value;
  if(!/^\d+(?:[.,]\d+)?$/.test(value))return null;
  const n=Number(value.replace(',','.'));
  return Number.isFinite(n)?n:null;
}
function readExemptionFromDescription(value) {
  const match=/^esenzione per redditi imponibili fino a euro\s+([\d.,]+)\s*\.?$/i.exec(value.trim());
  if(!match)return null;
  const normalized=match[1].replace(/\.(?=\d{3}(?:[,.]|$))/g,'');
  return numberItalian(normalized);
}
export function normalizeMunicipalRow(row) {
  if(row.length!==34)return null;
  const code=row[0]?.toUpperCase();
  if(!/^[A-Z][0-9]{3}$/.test(code))return null;
  const municipality=row[1]?.trim()??'';
  const province=row[2]?.trim()??'';
  const flag=(row[32]??'').trim();
  const base={code,municipality,province,status:'needs-review',ratePct:null,
    exemptionThreshold:null,reason:'Delibera con regola non riconosciuta automaticamente'};
  if(!municipality || !province) return {...base,reason:'Denominazione o provincia mancante'};
  if(row[8].includes('0*'))return {...base,status:'pending',reason:'Nessuna delibera 2026 pubblicata alla data del file MEF (0*), non equivale a 0%'};
  if(flag!=='1'&&flag!=='2')return {...base,reason:'Flag MEF '+(flag||'assente')+': regime a scaglioni/speciale o non validato'};
  // Le note e altre coppie di aliquote richiedono un esame della delibera.
  const administrativeNote=row[6].trim().toUpperCase();
  if(!['','CONFERMA','MODIFICA','ISTITUISCE'].includes(administrativeNote))
    return {...base,reason:'Nota amministrativa speciale da esaminare: '+administrativeNote};
  const expectedHeader=flag==='1' ? 'NO' : 'SI';
  if(row[7].trim().toUpperCase()!==expectedHeader)return {...base,reason:'Indicatore di multi-aliquota non coerente'};
  const threshold=numberItalian(row[33]);
  if(threshold===null || (flag==='1'&&threshold!==0) || (flag==='2'&&threshold<=0)) {
    return {...base,reason:'Soglia generale assente o incoerente'};
  }
  let rate;
  if(flag==='1'){
    if(row[9].trim().toLowerCase()!=='aliquota unica' || row.slice(10,32).some(Boolean))
      return {...base,reason:'Aliquota unica con ulteriori condizioni'};
    rate=numberItalian(row[8],{allowLeadingSeparator:true});
  }else{
    const describedThreshold=readExemptionFromDescription(row[9]);
    if(describedThreshold===null || Math.abs(describedThreshold-threshold)>0.001)
      return {...base,reason:'Esenzione descritta non corrispondente al campo IMPORTO_ESENTE'};
    if(numberItalian(row[8])!==0 || row[11].trim().toLowerCase()!=='aliquota unica'
      || row.slice(12,32).some(Boolean)) {
      return {...base,reason:'Esenzione o aliquote aggiuntive non riconosciute'};
    }
    rate=numberItalian(row[10],{allowLeadingSeparator:true});
  }
  if(rate===null || rate<=0 || rate>1.5)
    return {...base,reason:'Aliquota nulla o fuori intervallo: richiede revisione'};
  return {...base,status:'simple',ratePct:rate,
    exemptionThreshold:flag==='2'?threshold:null,
    reason:flag==='1'?'Aliquota unica MEF 2026, tracciato verificato':'Aliquota unica con esenzione generale e soglia confrontata col testo MEF'};
}
export function normalizeMunicipalCsv(raw,importedAt) {
  if(/<html|<!doctype/i.test(raw.slice(0,500)))throw new Error('Il MEF ha restituito HTML al posto del CSV');
  const rows=parseCsv(raw,detectDelimiter(raw));
  if(!rows.length || rows[0].length!==MUNICIPAL_MEF_HEADERS.length ||
    !MUNICIPAL_MEF_HEADERS.every((key,i)=>rows[0][i]?.trim()===key))
      throw new Error('Intestazione del CSV MEF 2026 non corrispondente allo schema revisionato');
  if(rows.slice(1).some(r=>r.length!==34))throw new Error('CSV MEF contiene righe con un numero inatteso di colonne');
  const records=rows.slice(1).map(normalizeMunicipalRow).filter(Boolean);
  const unique=new Map();
  for(const row of records){
    if(unique.has(row.code))throw new Error('Codice catastale ripetuto nel MEF: '+row.code);
    unique.set(row.code,row);
  }
  const total=records.length;
  if(total<7000||total>9000)throw new Error('Numero comuni inatteso: '+total);
  const count=status=>records.filter(r=>r.status===status).length;
  const flagCounts={};
  for(const row of rows.slice(1)){
    const f=row[32];flagCounts[f]=(flagCounts[f]??0)+1;
  }
  return {
    schemaVersion:1,taxYear:2026,
    sourceUrl:'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=2026',
    retrievedAt:importedAt,published:false,records,
    report:{rows:total,simple:count('simple'),needsReview:count('needs-review'),pending:count('pending')},
    flagCounts
  };
}
