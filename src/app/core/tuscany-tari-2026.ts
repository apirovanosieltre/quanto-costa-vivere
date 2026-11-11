/**
 * TARI 2026, quota COMUNALE BASE per abitazione di residenza con UN occupante.
 * Non e' l'avviso completo: esclude TEFA, componenti perequative, sconti,
 * riduzioni, bonus sociali, conguagli e periodi di occupazione diversi.
 *
 * Solo dati verificati nella tabella 2026 del comune/gestore concessionario.
 * NB Lucca usa TARIC puntuale (NON TARI): non applicare il modello a due quote.
 */
export interface TuscanyTariSingle2026 {
  code:string;
  city:string;
  fixedEURPerSqm:number;
  variableEURPerYear:number;
  sourceUrl:string;
  sourceName:string;
  methodologyNote:string;
}
export const VERIFIED_TARI_SINGLE_2026:readonly TuscanyTariSingle2026[]=[
  {
    code:'A390',city:'Arezzo',fixedEURPerSqm:1.12107,variableEURPerYear:138.77659,
    sourceUrl:'https://www.comune.arezzo.it/sites/default/files/2026-08/Allegato%20A%20tariffe%20utenze%20domestiche.pdf',
    sourceName:'Comune di Arezzo · Allegato A tariffe TARI 2026',
    methodologyNote:'Tariffa approvata C.C. n. 78 del 29/07/2026, quota 1 componente; nessuna agevolazione applicata.'
  },
  {
    code:'E625',city:'Livorno',fixedEURPerSqm:1.12,variableEURPerYear:96.87,
    sourceUrl:'https://cloud-ita.municipiumapp.it/s3/3612/allegati/servizi/tributi/tari/delibere/unicopefdelibera2026_b4c67c0667cbc3b3_p7m_qrcode.pdf',
    sourceName:'Comune di Livorno · C.C. n. 174/2026, tariffe 2026, pagina 10',
    methodologyNote:'Tabella 1 componente RESIDENTE, importi unitari pubblicati arrotondati a due decimali. Esclusi TEFA del 5%, componenti perequative e bonus. Non usare la riga non residenti.'
  },
  {
    code:'G702',city:'Pisa',fixedEURPerSqm:1.2302,variableEURPerYear:148.1854,
    sourceUrl:'https://www.sepi-pisa.it/en-us/download/utenze-domestiche-2026-5221-89-20046-d92cb77953270cfa58e91142933256d4',
    sourceName:'S.E.Pi. / Comune di Pisa · TARI 2026, utenze domestiche, tavola 1',
    methodologyNote:'Tabella famiglie di 1 componente, quota fissa €/m² + quota variabile €/utenza. Il totale medio della tabella e riferito a 80,49 m² e NON va utilizzato come importo per 55 m².'
  },
  {
    code:'G713',city:'Pistoia',fixedEURPerSqm:1.03,variableEURPerYear:114.40,
    sourceUrl:'https://www.comune.pistoia.it/s3/5285/allegati/tributi/tariffe-tari/tariffe-tari-2026.pdf',
    sourceName:'Comune di Pistoia · tariffe TARI 2026, 1 componente',
    methodologyNote:'Quota base 2026, prima delle riduzioni. Il Comune segnala una riduzione del 12% per le abitazioni con un solo occupante: non applicata automaticamente, per non supporre requisiti e modalita di riconoscimento.'
  }
];
const map=new Map(VERIFIED_TARI_SINGLE_2026.map(x=>[x.code,x]));
export function tariSingle2026Record(code:string):TuscanyTariSingle2026|null{
  return map.get(code)??null;
}
export function tariSingle2026BaseAnnual(code:string,areaSqm:number):number|null{
  if(!Number.isFinite(areaSqm)||areaSqm<15||areaSqm>300)return null;
  const rate=tariSingle2026Record(code);
  if(!rate)return null;
  return Math.round((areaSqm*rate.fixedEURPerSqm+rate.variableEURPerYear+Number.EPSILON)*100)/100;
}
export function tariNotAvailableReason(code:string):string{
  if(code==='E715')
    return 'Lucca applica la TARIC, una tariffa corrispettiva puntuale basata anche sui conferimenti. Non e una TARI standard: serve un modello dedicato prima di ottenere un totale affidabile.';
  if(['D612','E202','F023','G999','I726'].includes(code))
    return 'Delibera tariffaria 2026 individuata, ma la coppia di quote per un solo residente non e ancora verificata in un allegato ufficiale leggibile. Nessuna cifra viene inventata.';
  return 'Tariffa comunale 2026 per un residente non verificata: inserire l importo dell avviso se disponibile.';
}
