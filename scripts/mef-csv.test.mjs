import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, normalizeMunicipalRow } from './mef-csv.mjs';
test('CSV con virgolette e separatori',()=>{
  assert.deepEqual(parseCsv('A;B;C\n"a;1";"b""b";c\n'),[['A','B','C'],['a;1','b"b','c']]);
});
test('aliquota unica può essere letta solo con flag chiaro',()=>{
  const row=Array(34).fill(''); row[0]='F205';row[1]='Milano';row[2]='MI';row[8]='0,80';row[32]='2';row[33]='23000';
  assert.equal(normalizeMunicipalRow(row).ratePct,0.8);
  row[32]='3';assert.equal(normalizeMunicipalRow(row).status,'needs-review');
});
test('0* non diventa erroneamente aliquota zero',()=>{
  const row=Array(34).fill('');row[0]='F205';row[1]='Milano';row[2]='MI';row[8]='0*';row[32]='1';
  assert.equal(normalizeMunicipalRow(row).status,'pending');
});
