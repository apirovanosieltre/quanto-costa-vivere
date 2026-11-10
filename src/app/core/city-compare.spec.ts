import { describe,expect,it } from 'vitest';
import { EMPTY_BUDGET,validMoney,summarizeCity,compareCityBudgets,omiRentalRange,
  regionalFamilySpending,basketForCity,CODACONS_BASKET_CITIES,type CityBudget } from './city-compare';

const budget=(net:number|null,costs:[number|null,number|null,number|null,number|null,number|null]):CityBudget=>({
  netIncome:net,expenses:{housing:costs[0],utilities:costs[1],groceries:costs[2],
    transport:costs[3],other:costs[4]}
});
describe('Confronta città: valori reali, incompleti e assenti',()=>{
  it('non trasforma campi mancanti in spesa zero',()=>{
    const result=summarizeCity(EMPTY_BUDGET);
    expect(result.knownExpenses).toBe(0);
    expect(result.filled).toBe(0);
    expect(result.complete).toBe(false);
    expect(result.monthlyTotal).toBeNull();
    expect(result.monthlyBalance).toBeNull();
  });
  it('considera il valore 0 esplicitamente inserito completo',()=>{
    const result=summarizeCity(budget(2000,[0,120,350,90,120]));
    expect(result.complete).toBe(true);
    expect(result.monthlyTotal).toBe(680);
    expect(result.monthlyBalance).toBe(1320);
  });
  it('mostra delta costi e saldo soltanto con due budget completi',()=>{
    const a=budget(2200,[600,150,400,120,130]);
    const b=budget(2500,[900,180,450,140,150]);
    expect(compareCityBudgets(a,b)).toEqual({
      first:{knownExpenses:1400,filled:5,totalCategories:5,complete:true,
        monthlyTotal:1400,monthlyIncome:2200,monthlyBalance:800},
      second:{knownExpenses:1820,filled:5,totalCategories:5,complete:true,
        monthlyTotal:1820,monthlyIncome:2500,monthlyBalance:680},
      expenseDifference:420,balanceDifference:-120,expenseDifferencePct:30
    });
    expect(compareCityBudgets(a,EMPTY_BUDGET).expenseDifference).toBeNull();
    expect(compareCityBudgets(a,EMPTY_BUDGET).balanceDifference).toBeNull();
  });
  it('non inferisce un saldo senza netto disponibile',()=>{
    const r=summarizeCity(budget(null,[600,150,400,120,130]));
    expect(r.monthlyTotal).toBe(1400);
    expect(r.monthlyBalance).toBeNull();
  });
  it('blocca numeri negativi, valori non finiti, input errati',()=>{
    expect(validMoney('')).toBeNull();
    expect(validMoney(null)).toBeNull();
    expect(validMoney(-1)).toBeNull();
    expect(validMoney(Number.POSITIVE_INFINITY)).toBeNull();
    expect(validMoney('xyz')).toBeNull();
    expect(validMoney(0)).toBe(0);
    expect(validMoney('148.55')).toBe(148.55);
    expect(validMoney(100001)).toBeNull();
  });
  it('OMI: usa solo minimi, massimi e metri quadri inseriti dall’utente',()=>{
    expect(omiRentalRange(80,8.5,12.75)).toEqual({minimum:680,maximum:1020});
    expect(omiRentalRange(80,null,12.75)).toBeNull();
    expect(omiRentalRange(80,13,8)).toBeNull();
    expect(omiRentalRange(0,8,12)).toBeNull();
  });
  it('metadati ISTAT: associa regione, non spaccia per costo del comune',()=>{
    expect(regionalFamilySpending('BO')).toEqual({name:'Emilia-Romagna',value:3159});
    expect(regionalFamilySpending('PG')).toEqual({name:'Umbria',value:3257});
    expect(regionalFamilySpending('FI')).toBeNull();
    expect(regionalFamilySpending('ZZ')).toBeNull();
    expect(regionalFamilySpending('TN')).toEqual({name:'Trentino-Alto Adige',value:3444});
  });
  it('paniere campione Codacons disponibile soltanto nelle città documentate',()=>{
    expect(CODACONS_BASKET_CITIES).toHaveLength(6);
    expect(basketForCity('F205')?.valueEUR).toBe(598.95);
    expect(basketForCity('F839')?.approximate).toBe(true);
    expect(basketForCity('A390')).toBeNull();
  });
});
