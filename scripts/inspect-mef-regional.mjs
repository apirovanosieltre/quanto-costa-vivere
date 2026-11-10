import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseCsv, detectDelimiter } from './mef-csv.mjs';

const SOURCE_URL = 'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/download.php?anno=2026&tipo=reg';
const args = process.argv.slice(2);
const filePosition = args.indexOf('--file');

try {
  let bytes;
  if (filePosition >= 0) {
    if (!args[filePosition+1]) throw new Error('Specificare --file percorso.csv');
    bytes = await fs.readFile(args[filePosition+1]);
  } else {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('MEF regioni: HTTP ' + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (bytes.length < 200 || bytes.length > 3_000_000) throw new Error('Dimensioni CSV inattese');
  let source;
  try { source = new TextDecoder('utf-8',{fatal:true}).decode(bytes); }
  catch { source = new TextDecoder('windows-1252').decode(bytes); }
  if (/<html|<!doctype/i.test(source.slice(0,500))) throw new Error('Il sito ha risposto HTML, non CSV');
  const delimiter = detectDelimiter(source);
  const rows = parseCsv(source, delimiter);
  if (rows.length < 10 || rows.length > 1500) throw new Error('Numero righe MEF regionale inatteso: ' + rows.length);
  const columns = rows[0]?.length ?? 0;
  const report = {
    sourceUrl: SOURCE_URL, taxYear: 2026, inspectedAt: new Date().toISOString(),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length, delimiter, rowCount: rows.length, columnCount: columns,
    headers: rows[0], firstRows: rows.slice(1, 5),
    widthDistribution: Object.fromEntries([...new Set(rows.map(r=>r.length))].sort((a,b)=>a-b).map(n=>[n, rows.filter(r=>r.length===n).length])),
    published: false,
    note: 'Ispezione struttura soltanto: nessuna aliquota regionale validata o pubblicata.'
  };
  await fs.writeFile('mef-regional-report.json', JSON.stringify(report,null,2));
  console.log('MEF regional CSV QA:', JSON.stringify({rowCount:report.rowCount,columnCount:report.columnCount,headers:report.headers,firstRows:report.firstRows,sha256:report.sha256},null,2));
} catch (e) {
  console.error('Importazione MEF regionale non validata:',e.message);
  process.exitCode = 1;
}
