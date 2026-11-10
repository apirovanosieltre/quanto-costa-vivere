import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, normalizeMunicipalRow, normalizeMunicipalCsv, MUNICIPAL_MEF_HEADERS } from './mef-csv.mjs';

function row(flag='1'){
  const r=Array(34).fill('');
  r[0]='A008';r[1]='ABBATEGGIO';r[2]='PE';r[7]='NO';r[8]='0,5';
  r[9]='Aliquota unica';r[32]=flag;r[33]='0';
  return r;
}
test('CSV con virgolette e separatori',()=>{
  assert.deepEqual(parseCsv('A;B;C\n"a;1";"b""b";c\n'),[['A','B','C'],['a;1','b"b','c']]);
});
test('flag 1: aliquota unica senza esenzione',()=>{
  assert.deepEqual(
    (({status,ratePct,exemptionThreshold})=>({status,ratePct,exemptionThreshold}))(normalizeMunicipalRow(row())),
    {status:'simple',ratePct:0.5,exemptionThreshold:null}
  );
});
test('flag 2: importo esente e aliquota nella seconda coppia del CSV, anche formato ,8',()=>{
  const r=row('2');
  r[7]='SI';r[8]='0';r[9]='Esenzione per redditi imponibili fino a euro 12.000,00';
  r[10]=',8';r[11]='Aliquota unica';r[33]='12000';
  const v=normalizeMunicipalRow(r);
  assert.equal(v.status,'simple');assert.equal(v.ratePct,0.8);assert.equal(v.exemptionThreshold,12000);
});
test('flag 2: soglia testuale discordante blocca il calcolo',()=>{
  const r=row('2');
  r[7]='SI';r[8]='0';r[9]='Esenzione per redditi imponibili fino a euro 12.000,00';
  r[10]=',8';r[11]='Aliquota unica';r[33]='13000';
  assert.equal(normalizeMunicipalRow(r).status,'needs-review');
});
test('note speciali o aliquote extra bloccano calcolo',()=>{
  const r=row();r[6]='condizioni particolari';
  assert.equal(normalizeMunicipalRow(r).status,'needs-review');
  r[6]='';r[12]='0,5';
  assert.equal(normalizeMunicipalRow(r).status,'needs-review');
});
test('zero esatto non viene trasformato in aliquota positiva o pubblicato',()=>{
  const r=row();r[8]='0';
  assert.equal(normalizeMunicipalRow(r).status,'needs-review');
});
test('0* significa delibera pendente e non aliquota 0%',()=>{
  const r=row();r[8]='0*';r[32]='';
  assert.equal(normalizeMunicipalRow(r).status,'pending');
});
test('flag 3, 4, 5, 6 non sono applicati automaticamente',()=>{
  for(const f of ['0','3','4','5','6']) {
    const r=row(f);
    assert.equal(normalizeMunicipalRow(r).status,'needs-review');
  }
});
test('la struttura CSV ufficiale deve essere quella revisionata',()=>{
  const raw=MUNICIPAL_MEF_HEADERS.join(';')+'\n'+row().join(';');
  assert.throws(()=>normalizeMunicipalCsv(raw.replace('FLAG_NUOVA','FLAG_VARIATO'),'x'),/Intestazione/);
  assert.throws(()=>normalizeMunicipalCsv(raw,'x'),/Numero comuni/);
});
