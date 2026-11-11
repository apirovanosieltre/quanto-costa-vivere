import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=p=>JSON.parse(read(p));
test('the weekly source manifests have complete, unique verified baselines',()=>{
  for(const [path,expected] of [
    ['data/official-cost-source-hashes.json',12],
    ['data/tuscany-water-source-hashes.json',7]
  ]){
    const m=manifest(path);
    assert.equal(m.sourceCount,expected,path);
    assert.equal(m.sources.length,expected,path);
    assert.equal(new Set(m.sources.map(s=>s.id)).size,expected,path);
    for(const s of m.sources){
      assert.match(s.sha256,/^[0-9a-f]{64}$/);
      assert.equal(s.referenceTokensPresent,true,s.id);
      assert.deepEqual(s.missingReferenceTokens,[],s.id);
    }
  }
});
test('weekly audits run on main, allow manual runs, never publish unreviewed figures',()=>{
  for(const [path,cron,check] of [
    ['.github/workflows/official-cost-source-audit.yml',"'43 6 * * 2'","node scripts/audit-official-cost-sources.mjs --check"],
    ['.github/workflows/water-source-quality.yml',"'17 5 * * 1'","node scripts/audit-tuscany-water-sources.mjs --check"]
  ]){
    const yaml=read(path);
    assert.ok(yaml.includes('schedule:'),path);
    assert.ok(yaml.includes('cron: '+cron),path);
    assert.ok(yaml.includes('workflow_dispatch:'),path);
    assert.ok(yaml.includes('branches: [main]'),path);
    assert.ok(yaml.includes(check),path);
    assert.ok(yaml.includes('peter-evans/create-pull-request'),path);
    assert.ok(!yaml.includes('feature/water-all-tuscany-auto-review'),path);
    assert.ok(!yaml.includes('feature/lucca-taric-2026-scenario'),path);
  }
});
test('automatic daily fuel update checks a structured snapshot before commit',()=>{
  const y=read('.github/workflows/fuel-source-quality.yml');
  assert.ok(y.includes("cron: '17 11 * * *'"));
  assert.ok(y.includes('workflow_dispatch:'));
  assert.ok(y.indexOf('Verify snapshot structure')<y.indexOf('Commit only new verified'));
});
