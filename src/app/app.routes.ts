import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'QuantoCostaVivere | Calcolatore del budget mensile',
    loadComponent: () => import('./pages/budget/budget.component').then(m => m.BudgetComponent)
  },
  {
    path: 'irpef-2026',
    title: 'Calcolo IRPEF lorda 2026 | QuantoCostaVivere',
    loadComponent: () => import('./pages/tax/tax.component').then(m => m.TaxComponent)
  },
  {
    path: 'fonti-e-metodo',
    title: 'Fonti e metodo | QuantoCostaVivere',
    loadComponent: () => import('./pages/method/method.component').then(m => m.MethodComponent)
  },
  { path: 'stato-dati', title: 'Stato dati ufficiali | QuantoCostaVivere', loadComponent: () => import('./pages/data-status/data-status.component').then(m => m.DataStatusComponent) },
  { path: 'inflazione', title: 'Inflazione italiana: dati Eurostat | QuantoCostaVivere', loadComponent: () => import('./pages/inflation/inflation.component').then(m => m.InflationComponent) },
  { path: 'stipendio-netto-2026', title: 'Stima stipendio netto nazionale 2026 | QuantoCostaVivere', loadComponent: () => import('./pages/salary/salary.component').then(m => m.SalaryComponent) },
  { path: 'addizionali-comunali', title: 'Addizionali comunali MEF 2026 | QuantoCostaVivere', loadComponent: () => import('./pages/municipal/municipal.component').then(m => m.MunicipalComponent) },
  { path: 'addizionali-regionali', title: 'Addizionali regionali MEF 2026 | QuantoCostaVivere', loadComponent: () => import('./pages/regional/regional.component').then(m => m.RegionalComponent) },
  { path: 'spese-famiglie', title: 'Spesa media delle famiglie ISTAT 2025 | QuantoCostaVivere', loadComponent: () => import('./pages/household-spending/household-spending.component').then(m => m.HouseholdSpendingComponent) },
  { path: 'quotazioni-omi', title: 'Quotazioni OMI e stima canoni di locazione | QuantoCostaVivere', loadComponent: () => import('./pages/omi/omi.component').then(m => m.OmiComponent) },
  { path: 'confronta-citta', title: 'Confronta costo della vita tra città | QuantoCostaVivere', loadComponent: () => import('./pages/compare/compare.component').then(m => m.CompareComponent) },
  { path: '**', redirectTo: '' }
];
