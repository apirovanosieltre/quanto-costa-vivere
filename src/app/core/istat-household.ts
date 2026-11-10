/**
 * ISTAT - Spese per consumi delle famiglie, anno 2025.
 *
 * Trascrizione di indicatori esplicitamente riportati nel comunicato stampa
 * dell'8 ottobre 2026. NON è una stima del costo della vita per comune.
 * Fonte: https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/
 * Licenza di riutilizzo ISTAT: https://www.istat.it/dati/open-data/
 */
export interface RegionalHouseholdSpending {
  region: string;
  monthlyMeanEUR: number;
}
export interface HouseholdSpendingData {
  source: 'ISTAT';
  referenceYear: 2025;
  publishedAt: '2026-10-08';
  sourceUrl: string;
  unit: 'EUR per famiglia al mese';
  national: {
    mean: number;
    median: number;
    foodAndNonAlcoholicDrinks: number;
    rentAmongRentingHouseholds: number;
    singlePersonMean: number;
  };
  regions: RegionalHouseholdSpending[];
  coverage: 'Regioni citate esplicitamente nel comunicato; selezione non esaustiva';
  notes: string[];
}
export const HOUSEHOLD_SPENDING_2025: HouseholdSpendingData = {
  source: 'ISTAT',
  referenceYear: 2025,
  publishedAt: '2026-10-08',
  sourceUrl: 'https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/',
  unit: 'EUR per famiglia al mese',
  national: {
    mean: 2782,
    median: 2338,
    foodAndNonAlcoholicDrinks: 552,
    rentAmongRentingHouseholds: 438,
    singlePersonMean: 2070
  },
  regions: [
    { region: 'Trentino-Alto Adige', monthlyMeanEUR: 3444 },
    { region: 'Umbria', monthlyMeanEUR: 3257 },
    { region: 'Valle d’Aosta', monthlyMeanEUR: 3191 },
    { region: 'Emilia-Romagna', monthlyMeanEUR: 3159 },
    { region: 'Marche', monthlyMeanEUR: 3084 },
    { region: 'Sardegna', monthlyMeanEUR: 2431 },
    { region: 'Calabria', monthlyMeanEUR: 2042 },
    { region: 'Puglia', monthlyMeanEUR: 1975 }
  ],
  coverage: 'Regioni citate esplicitamente nel comunicato; selezione non esaustiva',
  notes: [
    'La spesa osservata non equivale al reddito necessario né al costo standard per abitante.',
    'Le medie includono famiglie con caratteristiche differenti e non sono valori comunali.',
    'Il valore medio degli affitti riguarda soltanto le famiglie che pagano un canone.',
    'Anno di riferimento 2025; dati non aggiornati in tempo reale.'
  ]
};
