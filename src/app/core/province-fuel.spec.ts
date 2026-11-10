import { describe, expect, it } from 'vitest';
import {
  parseFuelSnapshot, isFuelRecent, fuelForProvince, monthlyFuelCost,
  type ProvinceFuelSnapshot
} from './province-fuel';

function fixture():ProvinceFuelSnapshot {
  return {
    schemaVersion:1,
    source:'Elaborazione optenergy su dati MIMIT (IODL 2.0)',
    sourceUrl:'https://optenergy.it/dati/',
    originalSourceUrl:'https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti',
    license:'CC BY 4.0',period:'2026-11-08',generatedAt:'2026-11-10T12:00:00.000Z',
    sourceSha256:'a'.repeat(64),geography:'province',
    method:'Mediana prezzi self per provincia.',
    provinces:Array.from({length:100},(_,i)=>({
      code:String.fromCharCode(65+Math.floor(i/26),65+i%26),
      name:'Provincia numero '+i,
      benzina_self:{median:1.99,q1:1.95,q3:2.01,stations:20},
      gasolio_self:{median:2.2,q1:2.15,q3:2.24,stations:20}
    }))
  };
}
describe('Carburanti territoriali: validazione e calcolo',()=>{
  it('accetta solo dati con fonte, provincia e impronta verificabili',()=>{
    expect(parseFuelSnapshot(fixture()).provinces).toHaveLength(100);
    expect(()=>parseFuelSnapshot({...fixture(),sourceSha256:'invalido'})).toThrow();
    expect(()=>parseFuelSnapshot({...fixture(),geography:'comune' as 'province'})).toThrow();
    expect(()=>parseFuelSnapshot({...fixture(),license:'proprietary' as 'CC BY 4.0'})).toThrow();
  });
  it('non sostituisce mai il prezzo mancante con un prezzo inventato',()=>{
    const d=fixture();
    expect(fuelForProvince(d,'ZZ')).toBeNull();
    expect(fuelForProvince(d,'AA')?.benzina_self.median).toBe(1.99);
  });
  it('rifiuta date troppo vecchie per stimare un costo attuale',()=>{
    const d=fixture();
    expect(isFuelRecent(d,new Date('2026-11-10T00:00:00Z'))).toBe(true);
    expect(isFuelRecent(d,new Date('2026-12-01T00:00:00Z'))).toBe(false);
  });
  it('calcola trasporto soltanto con km e consumi personali validi',()=>{
    expect(monthlyFuelCost(1.99,1000,6)).toBe(119.4);
    expect(monthlyFuelCost(1.99,0,6)).toBe(0);
    expect(monthlyFuelCost(1.99,-5,6)).toBeNull();
    expect(monthlyFuelCost(1.99,1000,0)).toBeNull();
    expect(monthlyFuelCost(Infinity,1000,6)).toBeNull();
  });
  it('blocca le osservazioni con quartili incoerenti',()=>{
    const d=fixture();d.provinces[0].benzina_self.q1=2.5;
    expect(()=>parseFuelSnapshot(d)).toThrow();
  });
});
