/**
 * Profilo: 1 persona residente in affitto, trasporto pubblico urbano.
 * Tariffe 2026 documentate, riferimenti nazionali e ipotesi rigorosamente distinti.
 * NON e' un preventivo fiscale/bolletta e non pubblica valori non verificati per comune.
 */
import { tuscanCapitalRentRecord } from './tuscany-capital-rents-2024';
import { tariSingle2026BaseAnnual,tariSingle2026Record,tariNotAvailableReason,luccaTaric2026Annual,LUCCA_TARIC_2026 } from './tuscany-tari-2026';
import { type CityBudget } from './city-compare';

export type TransitPass = 'monthly'|'annual'|'none';
export type CostClassification = 'local-tariff'|'national-reference'|'assumption'|'unavailable';
export interface EvidenceAmount {
  monthlyEUR:number|null;
  annualEUR:number|null;
  classification:CostClassification;
  period:string;
  geography:string;
  title:string;
  sourceUrl:string|null;
  note:string;
}
export interface EssentialProfile {
  /** Superficie TARI imponibile ipotizzata. Non necessariamente identica ai m² OMI. */
  tariAreaSqm:number;
  /** Lucca TARIC: annual residual waste 25L emptyings; 12 = 2026 standard scenario. */
  luccaEmptyingsYear?:number;
  waterM3Year:number;
  /** L'utente puo' correggere la cifra: NON e' un prezzo del gas del comune. */
  gasMonthlyScenarioEUR:number;
  transitPass:TransitPass;
}
export const DEFAULT_ESSENTIAL_PROFILE:EssentialProfile={
  tariAreaSqm:55,
  luccaEmptyingsYear:12,
  waterM3Year:45,
  gasMonthlyScenarioEUR:50,
  transitPass:'monthly'
};
export const TUSCANY_ESSENTIAL_SOURCES={
  arezzoTari:'https://www.comune.arezzo.it/sites/default/files/2026-08/Allegato%20A%20tariffe%20utenze%20domestiche.pdf',
  arezzoTariPage:'https://www.comune.arezzo.it/tari-tassa-sui-rifiuti-2026',
  nuoveAcque:'https://nuoveacque.it/tariffe-acqua/',
  publiacqua:'https://www.publiacqua.it/sites/publiacqua/files/tariffe_2026.pdf',
  publiacquaCoverage:'https://www.publiacqua.it/chi-siamo',
  fiora:'https://www.fiora.it/wp-content/uploads/2026/01/AdF_tariffe_2026.pdf',
  asaLivorno:'https://www.asaspa.it/wp-content/uploads/2026/03/Tariffe-01_03_2026.pdf',
  gealLucca:'https://www.geal-lucca.it/wp-content/uploads/2025/10/Articolazione-tariffaria-civili-a-Valori-2025-GEAL.pdf',
  gealTariffs:'https://www.geal-lucca.it/tariffe/',
  acquePisa:'https://www.acque.net/wp-content/uploads/tariffe-2026.pdf',
  gaiaMassa:'https://www.gaia-spa.it/images/CONTRATTO/Tariffa%20del%20servizio%20idrico/doc-pdf/Tariffe_2026.pdf',
  gaiaMassaBasinEvidence:'https://comune.fosdinovo.ms.it/wp-content/uploads/sites/127/2021/05/Bilancio_2023-gaia-spa.pdf',
  busMonthly:'https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-mensile',
  busAnnual:'https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-annuale',
  electricArera:'https://www.arera.it/comunicati-stampa/dettaglio/elettricit%C3%A0-maggior-tutela-373-nel-iv-trimestre-2026-per-i-clienti-vulnerabili',
  gasArera:'https://www.arera.it/comunicati-stampa/dettaglio/gas-valore-materia-prima-vulnerabilita-ottobre-2026'
} as const;

const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const assert=(n:number,min:number,max:number,label:string)=>{
  if(!Number.isFinite(n)||n<min||n>max)throw new Error('Parametro non valido: '+label);
};
const annualFromMonthly=(n:number|null)=>n===null?null:round(n*12);
const missing=(title:string,period:string,note:string):EvidenceAmount=>({
  title,period,monthlyEUR:null,annualEUR:null,classification:'unavailable',
  geography:'Comune non verificato',sourceUrl:null,note
});
type WaterTariff={provider:string,sourceUrl:string,firstEnd:number,secondEnd:number,
  tiers:readonly [number,number,number],fixedAnnual:number};
const PUBLIACQUA:WaterTariff={
  provider:'Publiacqua',sourceUrl:TUSCANY_ESSENTIAL_SOURCES.publiacqua,
  firstEnd:19,secondEnd:67,tiers:[2.000722,2.706863,5.531431],fixedAnnual:55.144788
};
const NUOVE_ACQUE:WaterTariff={
  provider:'Nuove Acque',sourceUrl:TUSCANY_ESSENTIAL_SOURCES.nuoveAcque,
  firstEnd:19,secondEnd:67,
  // Acquedotto + fognatura + depurazione della tariffa 1 componente 2026.
  tiers:[0.873755+0.581917+1.004682,1.544142+0.581917+1.004682,5.190004+0.581917+1.004682],
  fixedAnnual:34.11424+8.122437+11.912908
};
/* Tutti i dati sotto si riferiscono al residente con un solo componente.
 * ADF: tariffe base acquedotto/fognatura/depurazione senza componenti UI.
 * ASA: tariffario aggiornato dal 01/03/2026 (si confronta sul periodo
 * annualizzato come proiezione a condizioni del secondo periodo; il 2026
 * effettivo ha anche una fascia tariffaria precedente a marzo).
 * GEAL: conferma esplicita delle tariffe 2025 per il 2026 fino ad aggiornamento.
 * GAIA: Massa bacino Comuni Piana; bacino transitorio Massa terminato 2020
 * secondo bilancio ufficiale GAIA 2023.
 */
const FIORA:WaterTariff={
  provider:'Acquedotto del Fiora',sourceUrl:TUSCANY_ESSENTIAL_SOURCES.fiora,
  firstEnd:19,secondEnd:67,
  tiers:[0.806200+0.806199+1.209299,
         1.612399+0.806199+1.209299,
         3.573745+0.806199+1.209299],
  fixedAnnual:25.721880+8.418069+12.627104
};
const ASA:WaterTariff={
  provider:'ASA Livorno (tariffe dal 01/03/2026)',sourceUrl:TUSCANY_ESSENTIAL_SOURCES.asaLivorno,
  firstEnd:19,secondEnd:67,
  // Include componenti UI gia presenti nel totale A+F+D esposto da ASA.
  tiers:[2.672341,3.505557,6.838421],
  fixedAnnual:37.925249+7.110983+14.221968
};
const GEAL:WaterTariff={
  provider:'GEAL Lucca (tariffe 2025 confermate nel 2026)',sourceUrl:TUSCANY_ESSENTIAL_SOURCES.gealLucca,
  firstEnd:19,secondEnd:57,
  tiers:[0.503503+0.611039+0.647391,
         1.007005+0.611039+0.647391,
         2.224051+0.611039+0.647391],
  fixedAnnual:32.363518+15.772738+17.244860
};
const ACQUE:WaterTariff={
  provider:'Acque SpA Pisa',sourceUrl:TUSCANY_ESSENTIAL_SOURCES.acquePisa,
  firstEnd:19,secondEnd:67,
  tiers:[0.711606+0.884373+1.402002,
         1.423211+0.884373+1.402002,
         3.284747+0.884373+1.402002],
  fixedAnnual:35.036307+13.475502+18.865702
};
const GAIA_PIANA:WaterTariff={
  provider:'GAIA Massa · Bacino Comuni Piana',sourceUrl:TUSCANY_ESSENTIAL_SOURCES.gaiaMassa,
  firstEnd:19,secondEnd:67,
  tiers:[2.625136,3.137958,5.189253],
  fixedAnnual:33.884388+15.904915+19.362507
};
const WATER_BY_CITY:Readonly<Record<string,WaterTariff>>={
  A390:NUOVE_ACQUE,
  D612:PUBLIACQUA,
  E202:FIORA,
  E625:ASA,
  E715:GEAL,
  F023:GAIA_PIANA,
  G702:ACQUE,
  G713:PUBLIACQUA,
  G999:PUBLIACQUA,
  I726:FIORA
};

export interface EssentialCosts {
  cityCode:string;
  coveredCapital:boolean;
  tari:EvidenceAmount;
  water:EvidenceAmount;
  electricity:EvidenceAmount;
  gas:EvidenceAmount;
  transit:EvidenceAmount;
  /** Tutte le componenti di questa cifra NON sono tariffe reali del contratto. */
  utilitiesScenarioMonthly:number;
  utilitiesAssumptions:string;
  /** Esclude sempre TARI: va selezionata manualmente prima di aggiungerla al budget. */
  tariIncludedByDefault:false;
}

export function waterMonthly2026ForCity(cityCode:string,annualM3:number):EvidenceAmount {
  assert(annualM3,0,500,'consumo acqua');
  const tariff=WATER_BY_CITY[cityCode];
  if(!tariff)return missing('Acqua, fognatura e depurazione','2026',
    'Tariffa del gestore comunale non ancora verificata. Il comparatore conserva una semplice ipotesi da 15 € nel totale delle utenze.');
  const first=Math.min(annualM3,tariff.firstEnd);
  const second=Math.min(Math.max(annualM3-tariff.firstEnd,0),tariff.secondEnd-tariff.firstEnd);
  const third=Math.max(annualM3-tariff.secondEnd,0);
  const annual=round(tariff.fixedAnnual+first*tariff.tiers[0]+second*tariff.tiers[1]+third*tariff.tiers[2]);
  return {
    // Divide annual euros in cents first: avoids 16.225 rounding down from binary floating point.
    monthlyEUR:Math.round(annual*100/12)/100,annualEUR:annual,classification:'local-tariff',
    title:'Acqua, fognatura e depurazione',geography:tariff.provider+' · utenza residente 1 componente',
    period:'Tariffe 2026',sourceUrl:tariff.sourceUrl,
    note:`Scaglioni e quota fissa per ${annualM3} m³/anno ipotizzati. Esclusi IVA, componenti eventuali, conguagli, differenze per utenze condominiali e altri oneri; non è una bolletta finale. Per Livorno si annualizza la tariffa dal 01/03/2026, non la spesa esatta dell'anno civile 2026. Per Lucca il gestore conferma le tariffe 2025 anche nel 2026, salvo successive approvazioni.`
  };
}

/** Base tariff formula for VERIFIED municipality, one RESIDENT.
 * Excludes provincial TEFA, ARERA equalization and reductions.
 */
export function tariBaseMonthly2026ForCity(cityCode:string,areaSqm:number,luccaEmptyingsYear:number=12):EvidenceAmount {
  assert(areaSqm,15,300,'superficie TARI');
  if(cityCode==='E715'){
    const annual=luccaTaric2026Annual(areaSqm,luccaEmptyingsYear);
    if(annual===null)return missing('TARIC Lucca 2026','2026',
      'Numero di svuotamenti non valido: per un residente il tariffario 2026 descrive 6–52 svuotamenti annui.');
    const t=LUCCA_TARIC_2026;
    return {
      monthlyEUR:Math.round(annual*100/12)/100,annualEUR:annual,
      classification:'local-tariff',period:'Misure TARIC Lucca 2026, delibera C.C. 52/2026',
      title:'TARIC Lucca, scenario 1 residente',
      geography:'Lucca · domestica un componente · bidone 25 litri',
      sourceUrl:t.sourceUrl,
      note:`TARIC 2026: tariffa corrispettiva e non TARI ordinaria: ${areaSqm} m² × ${t.fixedEURPerSqm.toLocaleString('it-IT')} €/m²/anno + ${t.variableStandardEURPerYear.toLocaleString('it-IT')} €/anno per ${t.standardEmptyings} svuotamenti standard, con correttivo per ${luccaEmptyingsYear} svuotamenti. Riduzione ${t.rebatePerReducedEmptyingEUR.toLocaleString('it-IT')} € per svuotamento sotto lo standard (minimo ${t.minEmptyings}) oppure aumento ${t.surchargePerExtraEmptyingEUR.toLocaleString('it-IT')} € sopra (fino a ${t.maxEmptyings}). Esclusi IVA e oneri ulteriori, bonus, agevolazioni e conguagli. Non è la fattura finale.`
    };
  }
  const rate=tariSingle2026Record(cityCode);
  const annual=rate?tariSingle2026BaseAnnual(cityCode,areaSqm):null;
  if(!rate||annual===null)return missing('TARI/TARIC, quota base','2026',
    tariNotAvailableReason(cityCode));
  return {
    monthlyEUR:Math.round(annual*100/12)/100,annualEUR:annual,
    classification:'local-tariff',period:'Tariffe comunali 2026, utenza residente un componente',
    title:'TARI, sola quota comunale base',
    geography:rate.city+', utenza domestica residente 1 occupante',
    sourceUrl:rate.sourceUrl,
    note:`Superficie imponibile ${areaSqm} m² × ${rate.fixedEURPerSqm.toLocaleString('it-IT')} €/m²/anno + quota variabile ${rate.variableEURPerYear.toLocaleString('it-IT')} €/anno. ${rate.methodologyNote} Esclusi TEFA, componenti perequative, eventuali riduzioni, bonus o conguagli; NON equivale all'avviso completo.`
  };
}

export function electricityReference2026():EvidenceAmount {
  // ARERA 29 settembre 2026: spesa ANNUA per 1/1/2026-31/12/2026 di un
  // CLIENTE TIPO VULNERABILE in Maggior Tutela, 2.000 kWh/anno, 3 kW.
  const annual=665.38;
  return {
    monthlyEUR:round(annual/12),annualEUR:annual,
    classification:'national-reference',period:'Riferimento ARERA anno 2026 (pubblicato 29/09/2026)',
    geography:'Italia · solo cliente tipo vulnerabile in Maggior Tutela',
    title:'Energia elettrica, riferimento nazionale',
    sourceUrl:TUSCANY_ESSENTIAL_SOURCES.electricArera,
    note:'665,38 €/anno per profilo ARERA da 2.000 kWh e potenza 3 kW, cliente vulnerabile in Maggior Tutela. NON è una tariffa del mercato libero, non varia in proporzione semplice ai kWh e non è necessariamente il costo della tua bolletta.'
  };
}
export const GAS_ARERA_COMMODITY_OCT_2026=0.945436; // EUR/Smc, solo componente CMEM,m
export function gasCommodityOnlyReference(annualSmc:number):number {
  assert(annualSmc,0,4000,'Smc gas');
  return round(GAS_ARERA_COMMODITY_OCT_2026*annualSmc/12);
}

export function tuscanyTransit2026(code:string,pass:TransitPass):EvidenceAmount {
  if(!tuscanCapitalRentRecord(code))return missing('Abbonamento urbano','2026',
    'Nessuna tariffa urbana di questo comune verificata nella selezione capoluoghi toscani.');
  if(pass==='none')return {
    monthlyEUR:0,annualEUR:0,classification:'assumption',
    title:'Trasporto urbano non acquistato',geography:'Scelta personale',
    period:'Scenario 2026',sourceUrl:TUSCANY_ESSENTIAL_SOURCES.busMonthly,
    note:'Hai escluso l’abbonamento. Zero NON significa che treni, auto o altre corse siano gratuiti.'
  };
  const annual=pass==='annual'?342.80:42.20*12;
  return {
    monthlyEUR:round(annual/12),annualEUR:round(annual),
    classification:'local-tariff',
    title:'Abbonamento urbano '+(pass==='annual'?'annuale':'mensile'),
    geography:'Servizi urbani Autolinee Toscane · capoluoghi coperti',
    period:'Prezzi pubblicati e verificati a novembre 2026',
    sourceUrl:pass==='annual'?TUSCANY_ESSENTIAL_SOURCES.busAnnual:TUSCANY_ESSENTIAL_SOURCES.busMonthly,
    note:pass==='annual'
      ?'Costo 342,80 €/anno diviso 12 per confronto; il pagamento non avviene mensilmente. Non include tratte esterne alla validità del titolo.'
      :'Costo 42,20 € al mese solare per una persona, senza agevolazioni ISEE. L’abbonamento vale solo nell’area urbana coperta.'
  };
}

/**
 * Derive an effective monthly budget from the ORIGINAL manually editable budget.
 * Never mutate or persist the TARI addition inside the `other` input: avoids
 * accidental doubling on Angular signal recomputation and on profile changes.
 * Do not use the output of this function as the base for another application.
 */
export function budgetWithOptionalTari(
  original:CityBudget, tariMonthlyEUR:number|null, enabled:boolean
):CityBudget{
  if(!enabled||tariMonthlyEUR===null||original.expenses.other===null)return original;
  assert(tariMonthlyEUR,0,10000,'TARI mensile');
  const other=round(original.expenses.other+tariMonthlyEUR);
  return {...original,expenses:{...original.expenses,other}};
}

export function estimateEssentialCosts2026(code:string,profile:EssentialProfile):EssentialCosts{
  assert(profile.tariAreaSqm,15,300,'superficie TARI');
  assert(profile.waterM3Year,0,500,'acqua m³/anno');
  assert(profile.gasMonthlyScenarioEUR,0,1000,'costo gas ipotizzato');
  if(!['monthly','annual','none'].includes(profile.transitPass))throw new Error('Abbonamento non previsto');
  const coveredCapital=tuscanCapitalRentRecord(code)!==null;
  const water=waterMonthly2026ForCity(code,profile.waterM3Year);
  const electricity=electricityReference2026();
  const gas:EvidenceAmount={
    title:'Gas e riscaldamento (ipotesi)',
    monthlyEUR:round(profile.gasMonthlyScenarioEUR),annualEUR:round(profile.gasMonthlyScenarioEUR*12),
    classification:'assumption',geography:'Ipotesi editoriale, non prezzo del comune',
    period:'Importo modificabile',sourceUrl:null,
    note:'Valore ipotetico scelto dall’utente. ARERA pubblica soltanto la componente materia prima CMEMm ottobre 2026 a 0,945436 €/Smc: non basta a calcolare il costo complessivo comprensivo di rete e imposte.'
  };
  const waterPart=water.monthlyEUR??15;
  return {
    cityCode:code,coveredCapital,
    tari:tariBaseMonthly2026ForCity(code,profile.tariAreaSqm,profile.luccaEmptyingsYear??12),
    water,electricity,gas,
    transit:tuscanyTransit2026(code,profile.transitPass),
    utilitiesScenarioMonthly:round(electricity.monthlyEUR!+waterPart+gas.monthlyEUR!),
    utilitiesAssumptions:water.monthlyEUR===null
      ?'Riferimento elettrico nazionale per soli vulnerabili + gas ipotetico + acqua IPOTETICA 15 €/mese: nessuna tariffa idrica locale verificata.'
      :'Riferimento elettrico nazionale per soli vulnerabili + gas ipotetico + costo acqua da scaglioni e consumi ipotizzati del gestore locale. NON è una bolletta reale.',
    tariIncludedByDefault:false
  };
}
