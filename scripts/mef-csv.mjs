/** Parser indipendente da librerie npm, supporta campi tra virgolette e ritorni a capo. */
export function parseCsv(content, delimiter=';') {
  const rows=[]; let row=[]; let cell=''; let quoted=false;
  const input=content.replace(/^\uFEFF/,'');
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(ch==='"') {
      if(quoted && input[i+1]==='"'){cell+='"';i++;} else quoted=!quoted;
    } else if(ch===delimiter && !quoted) {row.push(cell.trim());cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted) {
      if(ch==='\r'&&input[i+1]==='\n') i++;
      row.push(cell.trim());cell='';
      if(row.some(Boolean)) rows.push(row);
      row=[];
    } else cell+=ch;
  }
  if(quoted) throw new Error('CSV malformato: virgolette non chiuse');
  row.push(cell.trim()); if(row.some(Boolean)) rows.push(row);
  return rows;
}
export function detectDelimiter(content) {
  const first=content.split(/\r?\n/,1)[0];
  return [';','\t',','].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
}
function numberItalian(raw) {
  if(typeof raw!=='string') return null;
  const s=raw.trim();
  if(!s || !/^\d+(?:[.,]\d+)?$/.test(s)) return null;
  const n=Number(s.replace(',','.'));
  return Number.isFinite(n)?n:null;
}
/** Solo FLAG_NUOVA 1/2: mai interpretare scaglioni, soglie specifiche o casi atipici.
 * L'anteprima non viene pubblicata automaticamente e richiede controllo umano prima dell'uso.
 */
export function normalizeMunicipalRow(row) {
  if(row.length < 34) return null;
  const code=row[0]?.toUpperCase();
  if(!/^[A-Z][0-9]{3}$/.test(code)) return null;
  const municipality=row[1]||''; const province=row[2]||'';
  const flag=(row[32]||'').trim();
  const threshold=numberItalian(row[33]);
  const base={code,municipality,province,status:'needs-review',ratePct:null,exemptionThreshold:null,reason:'Delibera non interpretata automaticamente'};
  if(!municipality) return {...base,reason:'Comune senza denominazione'};
  if(row.some(v=>v.includes('0*'))) return {...base,status:'pending',reason:'Delibera 2026 non pubblicata: occorre verificare la regola dell\'anno precedente'};
  if(flag!=='1' && flag!=='2') return {...base,reason:`Regola MEF ${flag||'sconosciuta'}: scaglioni o casi speciali da verificare`};
  if(flag==='2' && (threshold===null || threshold<=0)) return {...base,reason:'Soglia esenzione assente o ambigua'};
  if(flag==='1' && threshold!==null && threshold!==0) return {...base,reason:'Soglia inattesa per aliquota unica'};
  // Dal 2021 i campi I:AF formano coppie (valore, descrizione). Limita ai campi valore.
  const numeric=[];
  for(let i=8;i<=30;i+=2){
    const n=numberItalian(row[i]);
    if(n!==null && n>0 && n<=1.5) numeric.push(n);
  }
  const rates=[...new Set(numeric)];
  if(rates.length!==1) return {...base,reason:'Aliquota assente o ambigua nelle colonne MEF'};
  return {...base,status:'simple',ratePct:rates[0],exemptionThreshold:flag==='2'?threshold:null,reason:'Aliquota unica riconosciuta automaticamente; validare il report prima di pubblicare'};
}
export function normalizeMunicipalCsv(raw, importedAt) {
  const rows=parseCsv(raw,detectDelimiter(raw));
  const records=rows.map(normalizeMunicipalRow).filter(Boolean);
  const unique=new Map();
  for(const row of records){
    if(unique.has(row.code)) throw new Error('Codice catastale ripetuto nel MEF: '+row.code);
    unique.set(row.code,row);
  }
  const total=records.length;
  if(total<7000 || total>9000) throw new Error(`Anomalia numero comuni: ${total}. Attesi 7.000-9.000; blocco pubblicazione.`);
  const count=status=>records.filter(r=>r.status===status).length;
  return {schemaVersion:1,taxYear:2026,sourceUrl:'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=2026',
    retrievedAt:importedAt,published:false,records,report:{rows:total,simple:count('simple'),needsReview:count('needs-review'),pending:count('pending')}};
}
