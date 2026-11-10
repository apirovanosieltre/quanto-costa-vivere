/**
 * Suggerimenti iniziali per confronto città, profilo PERSONA SOLA.
 * Una cifra di scenario non è mai un prezzo osservato nel comune.
 * Dove non esiste un indicatore locale approvato (es. casa a Napoli), 
 * il valore rimane null e il totale completo è deliberatamente impossibile.
 */
import { type CostKey } from './city-compare';
import { foodProxySolo2025, estimateFlorenceSolo,
  DEFAULT_FLORENCE_SOLO, ISTAT_SOLO_REFERENCE,
  PUBLIACQUA_REFERENCE, AUTOLINEE_TOSCANE_REFERENCE,
  type RentContract, type CostEvidence } from './automatic-cost-florence';
import { benchmarkForMunicipality, rentalRangeForArea, type MunicipalRentDataset } from './municipal-rents';
import {
  tuscanCapitalRentRecord, tuscanCapitalMonthlyRent2024, comparableTuscanRentPair,
  TUSCANY_RENT_2024_SOURCE
} from './tuscany-capital-rents-2024';

export type SuggestionKind = 'observed'|'derived'|'tariff'|'proxy'|'scenario'|'mixed'|'unavailable';
export type Confidence = 'alta'|'media'|'bassa'|'non disponibile';
export interface CategorySuggestion {
  key:CostKey;
  amount:number|null;
  kind:SuggestionKind;
  confidence:Confidence;
  geography:string;
  date:string;
  explanation:string;
  sourceName:string;
  sourceUrl:string|null;
}
export interface SinglePersonOptions {
  /** Same reference floor area in both cities. Rent source methodologies still differ. */
  areaSqm:number;
  /** Same contract type for every covered Tuscan capital, not just Florence. */
  florenceContract:RentContract;
  waterM3PerYear:number;
}
export const DEFAULT_SINGLE_PERSON_OPTIONS:SinglePersonOptions={
  areaSqm:55, florenceContract:'long',waterM3PerYear:45
};

export const MILAN_ATM_2026={
  price:39,
  url:'https://www.atm.it/it/ViaggiaConNoi/Abbonamenti/Pagine/Tipologie.aspx',
  date:'Tariffa urbana mensile, 2026'
};
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const scenario=(key:CostKey,amount:number,explanation:string):CategorySuggestion=>({
  key,amount,kind:'scenario',confidence:'bassa',geography:'Ipotesi non territoriale',
  date:'Valore illustrativo modificabile',explanation,sourceName:'Nessuna rilevazione locale',
  sourceUrl:null
});
const unavailable=(key:CostKey,explanation:string):CategorySuggestion=>({
  key,amount:null,kind:'unavailable',confidence:'non disponibile',geography:'Comune',
  date:'Dati mancanti',explanation,sourceName:'Nessuna fonte verificata utilizzabile',
  sourceUrl:null
});

function fromTuscanCapitalRent(
  code:string,area:number,contract:RentContract
):CategorySuggestion{
  const record=tuscanCapitalRentRecord(code);
  const monthly=tuscanCapitalMonthlyRent2024(code,area,contract);
  if(!record||monthly===null)
    return unavailable('housing','Media dei nuovi contratti non disponibile per questo comune capoluogo.');
  const rate=record.yearlyEURPerSqm[contract];
  return {
    key:'housing',amount:monthly,kind:'observed',confidence:'media',
    geography:'Comune capoluogo di '+record.city+' (non provincia)',
    date:'Nuovi contratti registrati 2024, rapporto pubblicato aprile 2026',
    explanation:`Media storica per tipologia di contratto: ${rate} €/m²/anno × ${area} m² / 12. E' lo stesso metodo per tutti i dieci capoluoghi toscani; non rappresenta il canone di un immobile specifico né una quotazione del 2026.`,
    sourceName:TUSCANY_RENT_2024_SOURCE.title,sourceUrl:TUSCANY_RENT_2024_SOURCE.url
  };
}
function fromMilanRent(area:number,rentalData:MunicipalRentDataset|null):CategorySuggestion {
  const benchmark=benchmarkForMunicipality(rentalData,'F205');
  if(!benchmark)return unavailable('housing','Manca il benchmark di Milano revisionato. Nessuna stima dell’affitto viene inventata.');
  const r=rentalRangeForArea(benchmark,area);
  if(!r)return unavailable('housing','Superficie non supportata dalle quotazioni derivate di Milano.');
  return {
    key:'housing',amount:round((r.min+r.max)/2),kind:'derived',confidence:'bassa',
    geography:'Milano: aggregazione NON ponderata di 40 zone OMI',
    date:'Secondo semestre 2025',
    explanation:`Punto medio tra due mediane dei limiti OMI per ${area} m² lordi (${r.min}–${r.max} €/mese). È solo una scelta di scenario, NON il canone mediano di mercato. Fonte non omogenea ai contratti fiorentini 2024.`,
    sourceName:benchmark.sourcePublisher,sourceUrl:benchmark.sourceUrl
  };
}

function florenceWaterEvidence(water:CostEvidence):string{
  return `Scenario elettricità 60 € + gas 50 € non verificati localmente, più ${water.amountEUR.toFixed(2)} € da tariffa Publiacqua con consumo ipotizzato. Non comprende condominio né tutte le voci della bolletta.`;
}

/** No automatic category is counted as complete unless it has an explicit EUR value.
 * The user may override any category, including documented figures, in the UI.
 */
export function suggestSinglePersonCosts(
  municipalityCode:string,
  rents:MunicipalRentDataset|null,
  options:SinglePersonOptions=DEFAULT_SINGLE_PERSON_OPTIONS
):CategorySuggestion[]{
  if(!Number.isFinite(options.areaSqm)||options.areaSqm<15||options.areaSqm>300||
    !Number.isFinite(options.waterM3PerYear)||options.waterM3PerYear<0||options.waterM3PerYear>500||
    !['long','agreed','temporary'].includes(options.florenceContract)) {
    throw new Error('Parametri scenario persona sola non validi');
  }
  const isFirenze=municipalityCode==='D612';
  const isTuscanCapital=tuscanCapitalRentRecord(municipalityCode)!==null;
  const isMilano=municipalityCode==='F205';
  const fl=isFirenze?estimateFlorenceSolo({
    ...DEFAULT_FLORENCE_SOLO,areaSqm:options.areaSqm,
    contract:options.florenceContract,waterCubicMetersPerYear:options.waterM3PerYear
  }):null;
  const water=fl?.lines.find(x=>x.key==='water');
  const housing=isTuscanCapital
    ?fromTuscanCapitalRent(municipalityCode,options.areaSqm,options.florenceContract)
    :isMilano?fromMilanRent(options.areaSqm,rents)
    :unavailable('housing','Non esiste ancora un indicatore comunale dell’affitto verificato e riutilizzabile. Inserisci un importo reale o ricavato da una quotazione pertinente.');

  const utilities=water?{
    key:'utilities' as CostKey,amount:round(110+water.amountEUR),
    kind:'mixed' as SuggestionKind,confidence:'bassa' as Confidence,
    geography:'Tariffa idrica Firenze + ipotesi nazionali',
    date:'Acqua 2026; elettricità e gas senza rilevazione',
    explanation:florenceWaterEvidence(water),
    sourceName:'Publiacqua 2026 e ipotesi di pianificazione',
    sourceUrl:PUBLIACQUA_REFERENCE.url
  }:scenario('utilities',125,
    'Scenari: elettricità 60 €, gas 50 €, acqua 15 €. Non sono tariffe del comune né rappresentano la bolletta effettiva.');

  const groceries:CategorySuggestion={
    key:'groceries',amount:foodProxySolo2025(),kind:'proxy',confidence:'bassa',
    geography:'Italia, non singolo comune',date:'Dati ISTAT 2025',
    explanation:'Proxy: spesa totale italiana persona sola × quota alimentari sul totale di tutte le famiglie. Non è un prezzo alimentare osservato nel comune.',
    sourceName:'ISTAT, spese per consumi delle famiglie 2025',
    sourceUrl:ISTAT_SOLO_REFERENCE.url
  };
  let transport:CategorySuggestion;
  if(isFirenze){
    transport={key:'transport',amount:AUTOLINEE_TOSCANE_REFERENCE.monthlyPassEUR,
      kind:'tariff',confidence:'alta',geography:'Trasporto urbano Firenze',date:'Tariffa consultata novembre 2026',
      explanation:'Un abbonamento urbano mensile ordinario. Non include car sharing, automobile, treni o corse extra.',
      sourceName:'Autolinee Toscane',sourceUrl:AUTOLINEE_TOSCANE_REFERENCE.url};
  }else if(isMilano){
    transport={key:'transport',amount:MILAN_ATM_2026.price,
      kind:'tariff',confidence:'alta',geography:'Comune di Milano (urbano)',date:MILAN_ATM_2026.date,
      explanation:'Un abbonamento urbano mensile ATM ordinario. Non include spostamenti fuori Milano, auto o altre modalità.',
      sourceName:'ATM Milano, abbonamenti urbani',sourceUrl:MILAN_ATM_2026.url};
  }else{
    transport=scenario('transport',50,
      'Importo puramente illustrativo per mobilità: non è stato verificato un abbonamento comunale. Inserisci la tua spesa effettiva.');
  }
  return [
    housing,utilities,groceries,transport,
    scenario('other',225,
      'Ipotesi non territoriali: telefono/internet 25 € + spese varie 200 €. Copertura non esaustiva di salute, condominio, assicurazioni o emergenze.')
  ];
}

export function cityDataCoverage(suggestions:CategorySuggestion[]):{
  available:number; supported:number; incomplete:boolean; manualOrAssumption:number
}{
  const available=suggestions.filter(x=>x.amount!==null).length;
  const supported=suggestions.filter(x=>x.amount!==null&&['observed','derived','tariff'].includes(x.kind)).length;
  return {
    available,supported,incomplete:available<5,
    manualOrAssumption:suggestions.filter(x=>x.kind==='scenario'||x.kind==='proxy'||x.kind==='mixed').length
  };
}

export function compareMethodWarning(first:string,second:string):string|null{
  if(comparableTuscanRentPair(first,second))
    return 'Gli affitti dei due capoluoghi toscani provengono dalla stessa rilevazione dei nuovi contratti registrati nel 2024 e dalla stessa tipologia contrattuale. La differenza sugli affitti è confrontabile come dato storico; il totale mensile comprende però altre ipotesi non territoriali e NON dimostra quale città convenga nel 2026.';
  const tuscanyVsMilan=(
    (tuscanCapitalRentRecord(first)!==null&&second==='F205') ||
    (tuscanCapitalRentRecord(second)!==null&&first==='F205')
  );
  if(tuscanyVsMilan)
    return 'Attenzione: i capoluoghi toscani usano i nuovi contratti registrati nel 2024, Milano un punto medio di indicatori OMI del 2025. I metodi immobiliari non sono omogenei; la differenza complessiva NON è una classifica affidabile del costo della vita.';
  return 'Il confronto usa importi illustrativi e può avere voci senza dati territoriali. Una differenza di scenario non dimostra che una città sia più economica.';
}
