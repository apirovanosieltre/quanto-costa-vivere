/**
 * Fonte: elaborazione optenergy su dati MIMIT (IODL 2.0).
 * Elaborazione optenergy: licenza CC BY 4.0 https://optenergy.it/dati/
 * Fonte primaria: https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti
 */
export const FUEL_SOURCE_URL = 'https://optenergy.it/dati/carburanti-province-ultimo-anno.csv';
export const FUEL_COLUMNS = ['giorno','sigla','provincia','carburante','unita','impianti','mediana','primo_quartile','terzo_quartile'];
export const FUEL_TYPES=['benzina_self','gasolio_self'];
const money3 = v => Math.round(v * 1000) / 1000;
function parseCsvLine(line) {
  const columns=[];let cell='',quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(ch===','&&!quoted){columns.push(cell.trim());cell='';}
    else cell+=ch;
  }
  if(quoted)throw Error('CSV with unterminated quotes');
  columns.push(cell.trim());
  return columns;
}
function validDate(value) {
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(value))return false;
  return new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
}
export function compileFuelSnapshot(csv, generatedAt='2026-11-10T13:00:00Z'){
  if(typeof csv!=='string'||csv.length<1000||csv.length>15_000_000)throw Error('Unexpected fuel CSV size');
  const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  const header=parseCsvLine(lines.shift()??'');
  if(header.length!==FUEL_COLUMNS.length||!FUEL_COLUMNS.every((name,i)=>name===header[i]))throw Error('Fuel CSV schema changed');
  if(lines.length<2000||lines.length>120000)throw Error('Fuel CSV row count anomalous');
  let newest='';
  const rows=[];
  for(const line of lines){
    const raw=parseCsvLine(line);
    if(raw.length!==9)throw Error('Malformed fuel CSV row');
    const [date,code,name,type,unit,countRaw,medianRaw,q1Raw,q3Raw]=raw;
    if(!validDate(date))throw Error('Invalid date in fuel feed: '+date);
    if(!FUEL_TYPES.includes(type))continue;
    const count=Number(countRaw),median=Number(medianRaw),q1=Number(q1Raw),q3=Number(q3Raw);
    if(!/^[A-Z]{2}$/.test(code)||name.length<2||unit!=='EUR/l'||
       !Number.isInteger(count)||count<0||count>10000||
       ![median,q1,q3].every(Number.isFinite)||median<0.5||median>4.5||
       q1<0.5||q3>4.5||q1>median||median>q3) {
      // Some upstream records are invalid. Never use them as observed prices.
      continue;
    }
    if(date>newest)newest=date;
    rows.push({date,code,name,type,count,median,q1,q3});
  }
  if(!newest)throw Error('No valid fuel date');
  const now=new Date(generatedAt);
  if(!Number.isFinite(now.valueOf()))throw Error('Invalid generation date');
  const ageDays=(now.getTime()-Date.parse(newest+'T00:00:00Z'))/86400000;
  if(ageDays>10||ageDays< -2)throw Error('Fuel feed date stale or in the future: '+newest);
  const provinceMap=new Map();
  for(const row of rows){
    if(row.date!==newest||row.count<5)continue;
    let p=provinceMap.get(row.code);
    if(!p){p={code:row.code,name:row.name,benzina_self:null,gasolio_self:null};provinceMap.set(row.code,p);}
    if(p[row.type]!==null)throw Error('Duplicate province and fuel on latest day: '+row.code+'/'+row.type);
    p[row.type]={median:money3(row.median),q1:money3(row.q1),q3:money3(row.q3),stations:row.count};
  }
  const provinces=[...provinceMap.values()].filter(p=>p.benzina_self&&p.gasolio_self).sort((a,b)=>a.code.localeCompare(b.code));
  if(provinces.length<90||provinces.length>120)throw Error('Unexpected count of provinces with both fuel types: '+provinces.length);
  return {
    schemaVersion:1,
    source:'Elaborazione di optenergy su dati MIMIT (IODL 2.0)',
    sourceUrl:'https://optenergy.it/dati/',
    originalSourceUrl:'https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti',
    license:'CC BY 4.0',
    period:newest,
    generatedAt:now.toISOString(),
    geography:'province',
    fuelTypes:['benzina_self','gasolio_self'],
    method:'Mediana di prezzi comunicati da impianti della provincia, servizio self. Non media comunale; nessuna interpolazione.',
    provinces
  };
}
