import { describe, expect, it } from 'vitest';
import { calculateGrossIrpef2026 } from './irpef';

describe('IRPEF lorda 2026', () => {
  it('non tassa redditi nulli o invalidi', () => {
    expect(calculateGrossIrpef2026(-10).totalTax).toBe(0);
    expect(calculateGrossIrpef2026(Number.NaN).totalTax).toBe(0);
  });
  it('applica il 23% fino a 28.000 euro', () => {
    expect(calculateGrossIrpef2026(28000).totalTax).toBeCloseTo(6440);
  });
  it('applica il 33% fino a 50.000 euro', () => {
    expect(calculateGrossIrpef2026(35000).totalTax).toBeCloseTo(8750);
  });
  it('applica il 43% alla quota oltre 50.000 euro', () => {
    expect(calculateGrossIrpef2026(60000).totalTax).toBeCloseTo(18000);
  });
});
