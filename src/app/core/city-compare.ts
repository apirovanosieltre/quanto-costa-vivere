import { HOUSEHOLD_SPENDING_2025 } from './istat-household';
import { taxRegionFromProvince } from './italian-territories';

export const COST_KEYS = ['housing','utilities','groceries','transport','other'] as const;
export type CostKey = typeof COST_KEYS[number];
export type MonthlyValues = Record<CostKey,number|null>;
export interface CityBudget {
  netIncome: number|null;
  expenses: MonthlyValues;
}
export interface BudgetSummary {
  knownExpenses: number;
  filled: number;
  totalCategories: number;
  complete: boolean;
  monthlyTotal: number|null;
  monthlyBalance: number|null;
  monthlyIncome: number|null;
}
export interface CityComparison {
  first:BudgetSummary;
  second:BudgetSummary;
  expenseDifference: number|null;
  balanceDifference: number|null;
  expenseDifferencePct: number|null;
}
export const COST_LABELS:Readonly<Record<CostKey,string>>={
  housing:'Affitto / mutuo',utilities:'Bollette e condominio',
  groceries:'Spesa alimentare',transport:'Trasporti',other:'Altre spese'
};
export const EMPTY_BUDGET:CityBudget={
  netIncome:null,
  expenses:{housing:null,utilities:null,groceries:null,transport:null,other:null}
};
function round(value:number):number{return Math.round((value+Number.EPSILON)*100)/100;}
export function validMoney(value:unknown,max=100000):number|null {
  if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)&&n>=0&&n<=max?round(n):null;
}
export function summarizeCity(budget:CityBudget):BudgetSummary {
  const values=COST_KEYS.map(key=>validMoney(budget.expenses[key]));
  const filled=values.filter(value=>value!==null).length;
  const knownExpenses=round(values.reduce<number>((sum,value)=>sum+(value??0),0));
  const complete=filled===COST_KEYS.length;
  const monthlyIncome=validMoney(budget.netIncome);
  return {
    knownExpenses,filled,totalCategories:COST_KEYS.length,complete,
    monthlyTotal:complete?knownExpenses:null,
    monthlyIncome,
    monthlyBalance:complete&&monthlyIncome!==null?round(monthlyIncome-knownExpenses):null
  };
}
export function compareCityBudgets(a:CityBudget,b:CityBudget):CityComparison {
  const first=summarizeCity(a),second=summarizeCity(b);
  const complete=first.monthlyTotal!==null&&second.monthlyTotal!==null;
  const expenseDifference=complete?round(second.monthlyTotal!-first.monthlyTotal!):null;
  const balanceDifference=first.monthlyBalance!==null&&second.monthlyBalance!==null
    ?round(second.monthlyBalance-first.monthlyBalance):null;
  const expenseDifferencePct=complete&&first.monthlyTotal!>0
    ?round(expenseDifference!/first.monthlyTotal!*100):null;
  return {first,second,expenseDifference,balanceDifference,expenseDifferencePct};
}
export interface CityBasketReference {
  cadastralCode:string;
  city:string;
  valueEUR:number;
  approximate:boolean;
}
/** CODACONS, indagine 2025 riportata da Ufficio Statistico Regione Puglia
 * il 13/01/2026. Paniere campione 28 alimentari + 11 servizi, NON budget
 * mensile e NON indice generale del costo della vita. Solo le 6 città
 * esplicitamente citate nell'articolo. Importi arrotondati riportati come ≈.
 */
export const CODACONS_BASKET_SOURCE={
  url:'https://press.regione.puglia.it/web/ufficio-statistico/-/codacons.-i-prezzi-di-beni-e-servizi-nelle-principali-citta-italiane.-anno-2025',
  organization:'CODACONS, ripreso dall’Ufficio statistico della Regione Puglia',
  referenceYear:2025,
  description:'Paniere osservato di 28 prodotti alimentari e 11 servizi. Non indica la spesa mensile di una famiglia.'
} as const;
export const CODACONS_BASKET_CITIES:readonly CityBasketReference[]=[
  {cadastralCode:'F205',city:'Milano',valueEUR:598.95,approximate:false},
  {cadastralCode:'A326',city:'Aosta',valueEUR:586,approximate:true},
  {cadastralCode:'A952',city:'Bolzano',valueEUR:574,approximate:true},
  {cadastralCode:'C352',city:'Catanzaro',valueEUR:424,approximate:true},
  {cadastralCode:'G273',city:'Palermo',valueEUR:408,approximate:true},
  {cadastralCode:'F839',city:'Napoli',valueEUR:369,approximate:true}
];
export function basketForCity(code:string):CityBasketReference|null {
  return CODACONS_BASKET_CITIES.find(x=>x.cadastralCode===code)??null;
}
export function regionalFamilySpending(province:string):{name:string;value:number}|null {
  const taxRegion=taxRegionFromProvince(province);
  if(!taxRegion)return null;
  const name=taxRegion.replace(/^REGIONE /,'');
  const aliases:Readonly<Record<string,string>>={
    "VALLE D'AOSTA":'Valle d’Aosta',
    'EMILIA-ROMAGNA':'Emilia-Romagna',
    'TRENTINO-ALTO ADIGE':'Trentino-Alto Adige',
    'SARDEGNA':'Sardegna',
    'PUGLIA':'Puglia',
    'UMBRIA':'Umbria',
    'CALABRIA':'Calabria',
    'MARCHE':'Marche',
    'PROVINCIA AUTONOMA DI TRENTO':'Trentino-Alto Adige',
    'PROVINCIA AUTONOMA DI BOLZANO':'Trentino-Alto Adige'
  };
  const lookup=aliases[taxRegion]??aliases[name]??name;
  const record=HOUSEHOLD_SPENDING_2025.regions.find(r=>r.region.toLocaleLowerCase('it')===lookup.toLocaleLowerCase('it'));
  return record?{name:record.region,value:record.monthlyMeanEUR}:null;
}
/** Canone OMI calcolato da una quotazione indicata dall'utente, non da valori inventati.
 * La fonte esprime la locazione in EUR/m²/mese, da confrontare con superficie
 * dello stesso tipo (netta/lorda).
 */
export function omiRentalRange(
  sqm:unknown,minimumPerSqm:unknown,maximumPerSqm:unknown
):{minimum:number;maximum:number}|null {
  const area=validMoney(sqm,10000),min=validMoney(minimumPerSqm,1000),max=validMoney(maximumPerSqm,1000);
  if(area===null||area<=0||min===null||max===null||min<=0||max<min)return null;
  return {minimum:round(area*min),maximum:round(area*max)};
}
