import {describe,expect,it} from 'vitest';
import {tariNeighborProxy2026,TARI_NEIGHBOR_REFERENCE_CODES_2026} from './tuscany-tari-proxy-2026';
import {tariSingle2026Record} from './tuscany-tari-2026';

describe('TARI scenario by neighbouring verified 2026 base figures',()=>{
  it('covers only four missing capitals without adding fake verified tariffs',()=>{
    const expected=['D612','E202','F023','G999'];
    expect(Object.keys(TARI_NEIGHBOR_REFERENCE_CODES_2026).sort()).toEqual(expected);
    for(const code of expected){
      const proxy=tariNeighborProxy2026(code,55);
      expect(proxy).not.toBeNull();
      expect(proxy?.peers.length).toBeGreaterThanOrEqual(2);
      expect(proxy?.method).toBe('peer-median');
      expect(tariSingle2026Record(code)).toBeNull();
      expect(proxy!.peerMinAnnualEUR).toBeLessThanOrEqual(proxy!.estimatedAnnualEUR);
      expect(proxy!.peerMaxAnnualEUR).toBeGreaterThanOrEqual(proxy!.estimatedAnnualEUR);
      for(const peer of proxy!.peers){
        expect(peer.sourceUrl).toMatch(/^https:\/\//);
        expect(tariSingle2026Record(peer.code)).not.toBeNull();
        expect(peer.code).not.toBe('E715'); // TARIC Lucca is never a comparator
      }
    }
  });
  it('uses 2026 official neighbor figures at equal floor area, and median',()=>{
    expect(tariNeighborProxy2026('D612',55)?.estimatedAnnualEUR).toBe(171.05);
    expect(tariNeighborProxy2026('D612',55)?.peerMinAnnualEUR).toBe(113.71);
    expect(tariNeighborProxy2026('D612',55)?.peerMaxAnnualEUR).toBe(215.85);
    expect(tariNeighborProxy2026('G999',55)?.estimatedAnnualEUR).toBe(193.45);
    expect(tariNeighborProxy2026('E202',55)?.estimatedAnnualEUR).toBe(136.09);
    expect(tariNeighborProxy2026('F023',55)?.estimatedAnnualEUR).toBe(187.16);
    const a=tariNeighborProxy2026('F023',35)!;
    const b=tariNeighborProxy2026('F023',120)!;
    expect(b.estimatedAnnualEUR).toBeGreaterThan(a.estimatedAnnualEUR);
  });
  it('never creates a proxy for an unknown town, a verified city, or nonsensical input',()=>{
    for(const code of ['E715','A390','G713','F205','F839']){
      expect(tariNeighborProxy2026(code,55)).toBeNull();
    }
    expect(tariNeighborProxy2026('D612',0)).toBeNull();
    expect(tariNeighborProxy2026('D612',301)).toBeNull();
    expect(tariNeighborProxy2026('D612',Number.NaN)).toBeNull();
  });
});