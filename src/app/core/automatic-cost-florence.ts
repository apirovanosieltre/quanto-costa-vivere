/**
 * Prototipo di costo della vita: FIRENZE, 1 PERSONA.
 *
 * Ogni importo distingue il dato osservato dalla regola ufficiale,
 * dalla proiezione statistica e dall'ipotesi editoriale.
 * Non rappresenta un listino 2026 né un preventivo di affitto.
 */

export type RentContract = 'long' | 'agreed' | 'temporary';
export type TransitChoice = 'monthly-pass' | 'no-pass';
export type EvidenceKind = 'observed' | 'tariff' | 'statistical-proxy' | 'scenario';
export type EstimateConfidence = 'alta' | 'media' | 'bassa';
export type EstimateKey =
  'housing'|'water'|'transit'|'groceries'|'electricity'|'gas'|'internet'|'other';

export interface CostEvidence {
  key:EstimateKey;
  label:string;
  amountEUR:number;
  kind:EvidenceKind;
  confidence:EstimateConfidence;
  scope:'Firenze città'|'Servizio Firenze'|'Italia'|'Ipotesi non territoriale';
  sourceLabel:string;
  sourceUrl:string|null;
  referencePeriod:string;
  method:string;
}

export interface FlorenceSoloProfile {
  areaSqm:number;
  contract:RentContract;
  waterCubicMetersPerYear:number;
  transit:TransitChoice;
  groceriesEUR:number;
  electricityEUR:number;
  gasEUR:number;
  internetEUR:number;
  otherEUR:number;
  monthlyNetIncomeEUR:number|null;
}

export interface AutomaticCostResult {
  lines:CostEvidence[];
  monthlyScenarioTotalEUR:number;
  observedAndTariffBasedEUR:number;
  statisticalProxyEUR:number;
  editorialAssumptionsEUR:number;
  monthlyBalanceEUR:number|null;
  assumptionCount:number;
  /** Presence of a source does not mean that the exact household price is measured. */
  disclaimer:string;
}

export const FLORENCE_RENT_REFERENCE = {
  url:'https://www.regione.toscana.it/documents/d/guest/abitare-in-toscana2025_v3_interattivo',
  title:'Regione Toscana, Abitare in Toscana 2025, tabella 2.2, pag. 35',
  observedYear:2024,
  publishedYear:2026,
  euroPerSquareMeterYear:{
    long:160,
    agreed:99,
    temporary:244
  } as const
};

export const AUTOLINEE_TOSCANE_REFERENCE = {
  url:'https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-mensile',
  monthlyPassEUR:42.20
};

export const PUBLIACQUA_REFERENCE = {
  url:'https://www.publiacqua.it/sites/publiacqua/files/tariffe_2026.pdf',
  year:2026,
  singleResidentFirstTierCubicMeters:19,
  singleResidentSecondTierEndCubicMeters:67,
  ratesEURPerCubicMeter:[2.000722,2.706863,5.531431] as const,
  annualFixedEUR:55.144788
};

export const ISTAT_SOLO_REFERENCE = {
  url:'https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/',
  year:2025,
  singlePersonHouseholdTotalEUR:2070,
  allHouseholdsMonthlyFoodEUR:552,
  allHouseholdsMonthlyTotalEUR:2782
};

export function money2(value:number):number {
  return Math.round((value+Number.EPSILON)*100)/100;
}

/** Scenario only: applies all-households food *share* to single-person total.
 * This is NOT observed food spending for a single person in Florence.
 */
export function foodProxySolo2025():number {
  return money2(ISTAT_SOLO_REFERENCE.singlePersonHouseholdTotalEUR*
    ISTAT_SOLO_REFERENCE.allHouseholdsMonthlyFoodEUR/
    ISTAT_SOLO_REFERENCE.allHouseholdsMonthlyTotalEUR);
}

/**
 * Applies Publiacqua 2026 one-resident household tariff to an assumed annual volume.
 * Quoted tariffs only: other bills, surcharges, taxes, separate condominium arrangements
 * and future tariff changes are not represented.
 */
export function waterMonthly2026(m3Year:number):number|null {
  if(!Number.isFinite(m3Year)||m3Year<0||m3Year>500)return null;
  const {ratesEURPerCubicMeter:r,annualFixedEUR:fixed}=PUBLIACQUA_REFERENCE;
  const first=Math.min(m3Year,19);
  const second=Math.max(0,Math.min(m3Year-19,48));
  const third=Math.max(0,m3Year-67);
  return money2((first*r[0]+second*r[1]+third*r[2]+fixed)/12);
}

export const DEFAULT_FLORENCE_SOLO:FlorenceSoloProfile={
  areaSqm:55,
  contract:'long',
  waterCubicMetersPerYear:45,
  transit:'monthly-pass',
  groceriesEUR:foodProxySolo2025(),
  electricityEUR:60, // Scenari arbitrari modificabili, NON rilevazioni.
  gasEUR:50,
  internetEUR:25,
  otherEUR:200,
  monthlyNetIncomeEUR:null
};

const RENT_CONTRACT_LABELS:Record<RentContract,string>={
  long:'ordinario oltre 3 anni',
  agreed:'concordato',
  temporary:'ordinario transitorio'
};

function nonnegative(value:number,name:string,max=100000):void {
  if(!Number.isFinite(value)||value<0||value>max)throw new Error('Valore non valido: '+name);
}

export function estimateFlorenceSolo(profile:FlorenceSoloProfile):AutomaticCostResult {
  nonnegative(profile.areaSqm,'superficie',300);
  if(profile.areaSqm<15)throw new Error('La superficie deve essere almeno 15 m²');
  nonnegative(profile.waterCubicMetersPerYear,'consumo acqua',500);
  if(!['long','agreed','temporary'].includes(profile.contract))throw new Error('Contratto non supportato');
  if(!['monthly-pass','no-pass'].includes(profile.transit))throw new Error('Trasporto non supportato');
  for(const k of ['groceriesEUR','electricityEUR','gasEUR','internetEUR','otherEUR'] as const)
    nonnegative(profile[k],k);
  if(profile.monthlyNetIncomeEUR!==null)nonnegative(profile.monthlyNetIncomeEUR,'reddito netto');

  const housing=money2(FLORENCE_RENT_REFERENCE.euroPerSquareMeterYear[profile.contract]*profile.areaSqm/12);
  const water=waterMonthly2026(profile.waterCubicMetersPerYear);
  if(water===null)throw new Error('Consumo acqua non valido');
  const transport=profile.transit==='monthly-pass'?AUTOLINEE_TOSCANE_REFERENCE.monthlyPassEUR:0;

  const lines:CostEvidence[]=[
    {
      key:'housing',label:'Affitto indicativo',amountEUR:housing,kind:'observed',confidence:'media',
      scope:'Firenze città',sourceLabel:FLORENCE_RENT_REFERENCE.title,
      sourceUrl:FLORENCE_RENT_REFERENCE.url,referencePeriod:'Contratti registrati 2024; pubblicazione aprile 2026',
      method:`Media storica ${RENT_CONTRACT_LABELS[profile.contract]}: ${FLORENCE_RENT_REFERENCE.euroPerSquareMeterYear[profile.contract]} €/m²/anno × ${profile.areaSqm} m² / 12. Non è un preventivo né il prezzo di un annuncio del 2026.`
    },
    {
      key:'water',label:'Acqua, fognatura e depurazione',amountEUR:water,kind:'tariff',confidence:'media',
      scope:'Servizio Firenze',sourceLabel:'Publiacqua, tariffe 2026, uso residente 1 componente',
      sourceUrl:PUBLIACQUA_REFERENCE.url,referencePeriod:'2026',
      method:`Calcolo di quote tariffarie 2026 e quota fissa su ${profile.waterCubicMetersPerYear} m³/anno ipotizzati; esclusi altri oneri e possibili imposte.`
    },
    {
      key:'transit',label:'Trasporto pubblico urbano',amountEUR:transport,kind:'tariff',confidence:'alta',
      scope:'Servizio Firenze',sourceLabel:'Autolinee Toscane, abbonamento urbano capoluogo mensile',
      sourceUrl:AUTOLINEE_TOSCANE_REFERENCE.url,referencePeriod:'Tariffa consultata 10/11/2026',
      method:profile.transit==='monthly-pass'?'Un abbonamento mensile ordinario, senza agevolazioni.':'Nessun abbonamento nel profilo selezionato: 0 € non significa trasporti gratuiti.'
    },
    {
      key:'groceries',label:'Alimentari e bevande',amountEUR:money2(profile.groceriesEUR),
      kind:'statistical-proxy',confidence:'bassa',scope:'Italia',
      sourceLabel:'ISTAT, spese per consumi delle famiglie 2025',sourceUrl:ISTAT_SOLO_REFERENCE.url,
      referencePeriod:'Anno 2025; pubblicazione 08/10/2026',
      method:'Proxy iniziale: 2.070 € (spesa totale media persona sola) × 552/2.782 (quota alimentare delle famiglie italiane). Non è una media alimentare delle persone sole né un prezzo a Firenze. Il valore è personalizzabile.'
    },
    ...([
      ['electricity','Elettricità',profile.electricityEUR],
      ['gas','Gas e riscaldamento',profile.gasEUR],
      ['internet','Internet e telefono',profile.internetEUR],
      ['other','Spese varie, sanità, tempo libero',profile.otherEUR]
    ] as const).map(([key,label,amountEUR]):CostEvidence=>({
      key,label,amountEUR:money2(amountEUR),kind:'scenario',confidence:'bassa',
      scope:'Ipotesi non territoriale',sourceLabel:'Ipotesi di pianificazione modificabile',
      sourceUrl:null,referencePeriod:'Scenario 2026, senza rilevazione locale',
      method:'Importo illustrativo scelto per rendere il modello immediatamente utilizzabile. Non è un prezzo ufficiale e va personalizzato.'
    }))
  ];
  const sum=(kind:EvidenceKind)=>money2(lines.filter(x=>x.kind===kind).reduce((t,x)=>t+x.amountEUR,0));
  const observedAndTariffBasedEUR=money2(sum('observed')+sum('tariff'));
  const statisticalProxyEUR=sum('statistical-proxy');
  const editorialAssumptionsEUR=sum('scenario');
  const monthlyScenarioTotalEUR=money2(observedAndTariffBasedEUR+statisticalProxyEUR+editorialAssumptionsEUR);
  return {
    lines,monthlyScenarioTotalEUR,observedAndTariffBasedEUR,statisticalProxyEUR,
    editorialAssumptionsEUR,
    monthlyBalanceEUR:profile.monthlyNetIncomeEUR===null?null:money2(profile.monthlyNetIncomeEUR-monthlyScenarioTotalEUR),
    assumptionCount:lines.filter(x=>x.kind==='scenario'||x.kind==='statistical-proxy').length,
    disclaimer:'Totale di scenario, NON costo medio rilevato a Firenze. Misura un mix di riferimenti storici, tariffe, proxy nazionali e ipotesi: controlla il tuo contratto, utenze, consumi e abitudini.'
  };
}
