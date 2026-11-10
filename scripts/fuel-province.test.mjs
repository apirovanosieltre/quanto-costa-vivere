import test from 'node:test';
import assert from 'node:assert/strict';
import { compileFuelSnapshot, FUEL_COLUMNS } from './fuel-province.mjs';

const provinces=Array.from({length:95},(_,i)=>{
  const a=String.fromCharCode(65+Math.floor(i/26));
  const b=String.fromCharCode(65+(i%26));
  return {code:a+b,name:'Provincia '+a+b};
});
const days=[...Array.from({length:10},(_,i)=>'2026-10-'+String(20+i)), '2026-11-08'];
function fixture(){
  const records=[FUEL_COLUMNS.join(',')];
  for(const day of days){
    for(const city of provinces){
      records.push([day,city.code,city.name,'benzina_self','EUR/l','40','1.799','1.749','1.849'].join(','));
      records.push([day,city.code,city.name,'gasolio_self','EUR/l','35','1.699','1.649','1.749'].join(','));
    }
  }
  return records.join('\n');
}
test('Aggregates the most recent real period and keeps provenance',()=>{
  const snapshot=compileFuelSnapshot(fixture(),'2026-11-10T10:00:00Z');
  assert.equal(snapshot.period,'2026-11-08');
  assert.equal(snapshot.geography,'province');
  assert.equal(snapshot.license,'CC BY 4.0');
  assert.equal(snapshot.provinces.length,95);
  assert.equal(snapshot.provinces[0].benzina_self.median,1.799);
  assert.equal(snapshot.provinces[0].benzina_self.stations,40);
  assert.equal(snapshot.provinces[0].gasolio_self.median,1.699);
});
test('Never publishes an outdated source',()=>{
  assert.throws(()=>compileFuelSnapshot(fixture(),'2026-12-01T10:00:00Z'),/stale/);
});
test('Never publishes a changed header',()=>{
  assert.throws(()=>compileFuelSnapshot(fixture().replace('sigla','provincia_id'),'2026-11-10T10:00:00Z'),/schema/);
});
test('Rejects insufficient province coverage',()=>{
  const source=fixture().split('\n').filter(line=>!/^2026-11-08,A/.test(line)).join('\n');
  assert.throws(()=>compileFuelSnapshot(source,'2026-11-10T10:00:00Z'),/provinces/);
});
test('Filters out invalid stations and never manufactures prices',()=>{
  const source=fixture().replace('2026-11-08,AA,Provincia AA,benzina_self,EUR/l,40,1.799,1.749,1.849',
    '2026-11-08,AA,Provincia AA,benzina_self,EUR/l,40,8.999,1.749,9.999');
  const output=compileFuelSnapshot(source,'2026-11-10T10:00:00Z');
  assert.equal(output.provinces.some(p=>p.code==='AA'),false);
});
