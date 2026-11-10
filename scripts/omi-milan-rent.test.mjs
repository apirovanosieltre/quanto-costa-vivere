import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMilanResidentialRents} from './omi-milan-rent.mjs';

const header='Area_territoriale;Regione;Prov;Comune_ISTAT;Comune_cat;Sez;Comune_amm;Comune_descrizione;Fascia;Zona;LinkZona;Cod_Tip;Descr_Tipologia;Stato;Stato_prev;Loc_min;Loc_max;Sup_NL_loc';
function makeFixture(){
  const rows=[header];
  const zones=['B','C','D','E'];
  for(let i=0;i<65;i++){
    const z=zones[i%4]+String(i+1);
    rows.push(['NORD-OVEST','LOMBARDIA','MI','3015146','C1AA',' ','F205','MILANO','B',z,'xyz','20','Abitazioni civili','NORMALE','P',String(10+i%9),String(14+i%9),'L'].join(';'));
    rows.push(['NORD-OVEST','LOMBARDIA','MI','3015146','C1AA',' ','F205','MILANO','B',z,'xyz','13','Box','NORMALE','P','10','14','L'].join(';'));
  }
  // 130 examples plus ignored commercial rows
  for(let i=0;i<200;i++)rows.push(['NORD-OVEST','LOMBARDIA','MI','3015146','C1AA',' ','F205','MILANO','B','X'+(i+1),'xyz','5','Negozi','NORMALE','P','40','70','L'].join(';'));
  return rows.join('\n');
}
test('derives medians across normal civil home zones without publishing raw quotations',()=>{
  const d=compileMilanResidentialRents(makeFixture(),'2026-11-10T12:00:00Z');
  assert.equal(d.municipalCode,'F205');assert.equal(d.basePeriod,'2025/2');
  assert.equal(d.zonesCount,65);assert.equal(d.areaType,'L');
  assert.equal(d.rawQuoteRowsPublished,false);
  assert.ok(d.lowerMedian>0&&d.upperMedian>d.lowerMedian);
  assert.equal(Object.hasOwn(d,'zones'),false);
});
test('rejects changed schema and unexpected territory',()=>{
  assert.throws(()=>compileMilanResidentialRents(makeFixture().replace('Sup_NL_loc','Area'),'x'),/schema/);
  assert.throws(()=>compileMilanResidentialRents(makeFixture().replaceAll(';F205;MILANO;', ';D612;FIRENZE;'),'x'),/territory/);
});
test('rejects duplicated normal civil zone quotes',()=>{
  const source=makeFixture();
  const normal=source.split('\n')[1];
  assert.throws(()=>compileMilanResidentialRents(source+'\n'+normal,'x'),/Duplicate/);
});
test('rejects invalid min or max rental observations instead of substituting',()=>{
  const source=makeFixture();
  assert.throws(()=>compileMilanResidentialRents(source.replace(';10;14;L',';45;22;L'),'x'),/malformed/);
});
