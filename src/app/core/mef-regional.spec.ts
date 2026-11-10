import { describe, expect, it } from 'vitest';
import { parseCsvTable, parseRegionalMefCsv } from './mef-regional';

const header='ANNO;REGIONE;NUMERO;DATA PUBBLICAZIONE;DISPOSIZIONE;NORME;NOTE;ALIQUOTA;FASCIA';
const rows=Array.from({length:11},(_,i)=>[
  '2026','REGIONE TEST','2167','19-GEN-26',
  '"Esenzione fino a 15.000 euro; oltre si applica l’aliquota"',
  'L.R. test','','1.23',i===0?'Aliquota Unica':'oltre 15000 euro'
].join(';'));
const valid=[header,...rows].join('\n');

describe('MEF addizionali regionali, CSV 2026',()=>{
  it('ricostruisce correttamente i campi con punto e virgola fra virgolette',()=>{
    const cells=parseCsvTable('a;b;c\n"test; interno";2;3',';');
    expect(cells[1][0]).toBe('test; interno');
  });
  it('legge le aliquote come righe descrittive, senza calcolo automatico',()=>{
    const result=parseRegionalMefCsv(valid,'2026-11-10T10:00:00Z');
    expect(result.records).toHaveLength(11);
    expect(result.records[0].ratePct).toBe(1.23);
    expect(result.records[0].disposition).toContain('Esenzione fino');
    expect(result.calculable).toBe(false);
    expect(result.source).toContain('MEF');
  });
  it('blocca tracciati modificati',()=>{
    expect(()=>parseRegionalMefCsv(valid.replace('ALIQUOTA','PERCENTUALE'),'x')).toThrow();
  });
  it('blocca una fonte con dati di annualita diversa',()=>{
    expect(()=>parseRegionalMefCsv(valid.replace('2026;REGIONE','2025;REGIONE'),'x')).toThrow();
  });
  it('non tratta una pagina HTML come CSV',()=>{
    expect(()=>parseRegionalMefCsv('<html>'+valid+'</html>','x')).toThrow();
  });
  it('rifiuta aliquote impossibili o righe troncate',()=>{
    expect(()=>parseRegionalMefCsv(valid.replace('1.23','9.50'),'x')).toThrow();
    expect(()=>parseRegionalMefCsv([header,...rows.slice(0,10),'2026;REGIONE TEST'].join('\n'),'x')).toThrow();
  });
});
