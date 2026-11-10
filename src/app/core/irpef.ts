/**
 * IRPEF lorda nazionale, periodo d'imposta 2026.
 * Fonte: art. 11 TUIR e legge 30 dicembre 2025, n. 199.
 * NON rappresenta il netto in busta paga: non sottrae detrazioni, addizionali,
 * contributi previdenziali o altre voci.
 */
export interface TaxBracket {
  label: string;
  rate: number;
  taxableAmount: number;
  tax: number;
}

export interface GrossIrpefResult {
  taxableIncome: number;
  totalTax: number;
  averageRate: number;
  brackets: TaxBracket[];
}

export function calculateGrossIrpef2026(rawIncome: number): GrossIrpefResult {
  const income = Number.isFinite(rawIncome) ? Math.max(0, rawIncome) : 0;
  const boundaries = [0, 28000, 50000, Number.POSITIVE_INFINITY];
  const rates = [.23, .33, .43];
  const labels = ['Fino a 28.000 €', 'Da 28.000 a 50.000 €', 'Oltre 50.000 €'];
  const brackets = rates.map((rate, i) => {
    const taxableAmount = Math.max(0, Math.min(income, boundaries[i + 1]) - boundaries[i]);
    return { label: labels[i], rate, taxableAmount, tax: taxableAmount * rate };
  });
  const totalTax = brackets.reduce((sum, part) => sum + part.tax, 0);
  return { taxableIncome: income, totalTax, averageRate: income > 0 ? totalTax / income : 0, brackets };
}
