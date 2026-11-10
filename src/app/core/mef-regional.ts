/** Dati MEF 2026, pubblicati dal Dipartimento delle Finanze.
 * Le aliquote e le fasce sono righe del CSV originale, NON formule di calcolo.
 * Le disposizioni possono includere esenzioni, detrazioni e condizioni speciali.
 */
export const REGIONAL_MEF_CSV_URL='https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/download.php?anno=2026&tipo=reg';
/** Impronta verificata sulla fonte ufficiale MEF 2026 il 10/11/2026.
 * Ogni aggiornamento del CSV sospende le stime fino a una nuova revisione. */
export const REVIEWED_REGIONAL_CSV_SHA256_2026='cc7125ce020a754bb519d2ea2803c7fc81d8f92af040623cd6e7953c2dca25be';
export const REGIONAL_MEF_PAGE_URL='https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/tabella.htm';

export interface RegionalMefRecord {
  region: string;
  ratePct: number;
  bandLabel: string;
  disposition: string;
  regulation: string;
  notes: string;
  publicationDate: string;
}
export interface RegionalMefDataset {
  year: 2026;
  source: 'MEF - Dipartimento delle Finanze';
  sourceUrl: string;
  retrievedAt: string;
  sourceSha256?: string;
  calculable: false;
  records: RegionalMefRecord[];
}

/** Parser CSV con doppi apici e newline nei campi. */
export function parseCsvTable(raw:string, separator:string):string[][] {
  const rows:string[][]=[];
  let row:string[]=[];let field='';let quote=false;
  const s=raw.replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(ch==='"'){
      if(quote && s[i+1]==='"'){ field+='"';i++; }
      else quote=!quote;
    } else if(ch===separator && !quote){ row.push(field.trim());field=''; }
    else if((ch==='\r'||ch==='\n')&&!quote){
      if(ch==='\r'&&s[i+1]==='\n')i++;
      row.push(field.trim());field='';
      if(row.some(Boolean))rows.push(row);
      row=[];
    } else field+=ch;
  }
  if(quote)throw new Error('CSV MEF malformato');
  row.push(field.trim());if(row.some(Boolean))rows.push(row);
  return rows;
}
export function parseRegionalMefCsv(raw:string,retrievedAt:string,sourceSha256?:string):RegionalMefDataset {
  const headers=['ANNO','REGIONE','NUMERO','DATA PUBBLICAZIONE','DISPOSIZIONE','NORME','NOTE','ALIQUOTA','FASCIA'];
  if (raw.length < 100 || raw.length > 3_000_000 || /<html|<!doctype/i.test(raw.slice(0,500))) throw new Error('Risposta CSV MEF regionale non valida');
  const separator=[';',',','\t'].sort((a,b)=>raw.split('\n',1)[0].split(b).length-raw.split('\n',1)[0].split(a).length)[0];
  const rows=parseCsvTable(raw,separator);
  if (rows.length<11 || rows.length>300)throw new Error('Numero righe regionale inatteso');
  const columns=(rows[0]??[]).map(h=>h.replace(/^\uFEFF/,'').trim().toUpperCase());
  if(columns.length!==headers.length || !headers.every((h,i)=>columns[i]===h))throw new Error('Tracciato CSV MEF regionale cambiato');
  const records:RegionalMefRecord[]=[];
  for(const row of rows.slice(1)){
    if(row.length!==9 || row[0]!=='2026'|| !row[1]?.trim() || !row[8]?.trim()){
      throw new Error('Riga MEF regionale ambigua');
    }
    const rate=Number(row[7].replace(',','.'));
    if(!Number.isFinite(rate) || rate<0 || rate>5)throw new Error('Aliquota MEF regionale inattesa');
    records.push({
      region:row[1].trim(),
      ratePct:rate,
      bandLabel:row[8],
      disposition:row[4],
      regulation:row[5],
      notes:row[6],
      publicationDate:row[3]
    });
  }
  if(!new Set(records.map(x=>x.region)).size)throw new Error('Regioni assenti');
  return {year:2026,source:'MEF - Dipartimento delle Finanze',sourceUrl:REGIONAL_MEF_PAGE_URL,
    retrievedAt,...(sourceSha256?{sourceSha256}:{}),calculable:false,records};
}
