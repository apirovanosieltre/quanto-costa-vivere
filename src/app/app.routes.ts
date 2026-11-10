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
  { path: '**', redirectTo: '' }
];
