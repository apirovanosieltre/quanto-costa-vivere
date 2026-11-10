import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { calculateGrossIrpef2026 } from '../../core/irpef';

@Component({
  selector: 'app-tax',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-hero container">
      <a routerLink="/" class="back-link"><span aria-hidden="true">←</span> Torna al budget</a>
      <span class="eyebrow eyebrow-subtle">FISCO · ANNO D'IMPOSTA 2026</span>
      <h1>Calcola la tua <span>IRPEF lorda.</span></h1>
      <p>Inserisci il reddito imponibile annuo e visualizza l'imposta nazionale per scaglione, con le aliquote 2026.</p>
    </section>
    <section class="container tax-layout" aria-label="Calcolatore IRPEF lorda 2026">
      <div class="form-panel">
        <div class="panel-title-row"><div><h2>Reddito imponibile</h2><p>Il punto di partenza del calcolo</p></div><span class="small-badge">2026</span></div>
        <label class="field-label" for="taxable-income">Imponibile IRPEF annuo</label>
        <div class="number-field"><span class="prefix" aria-hidden="true">€</span><input id="taxable-income" type="number" min="0" max="100000000" step="100" [ngModel]="taxableIncome()" (ngModelChange)="taxableIncome.set(clamp($event))" aria-describedby="tax-help"></div>
        <p class="field-hint" id="tax-help">Non è la RAL e non è il netto: è il reddito fiscalmente imponibile, dopo le deduzioni ammesse.</p>
        <div class="data-notice" role="note"><span class="notice-icon" aria-hidden="true">!</span><p><strong>Attenzione.</strong> Questo calcolo mostra esclusivamente l'IRPEF <strong>lorda nazionale</strong>. Non calcola il netto in busta paga e non include detrazioni, contributi INPS, addizionali regionali/comunali o trattamenti integrativi.</p></div>
        <div class="source-inline"><span>Fonte aliquote</span><a href="https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.riduzione-irpef-e-incremento-delle-maggiorazioni-sociali.html" target="_blank" rel="noopener noreferrer">INPS · legge di bilancio 2026 ↗</a></div>
      </div>
      <div class="result-panel tax-result">
        <div class="result-top"><span>RISULTATO DEL CALCOLO</span><span class="result-period">ANNUALE</span></div>
        <p class="result-intro">IRPEF lorda nazionale</p>
        <div class="result-number" aria-live="polite">{{ euro(result().totalTax) }}<span> €</span></div>
        <div class="result-divider"></div>
        <div class="summary-row"><span>Imponibile inserito</span><strong>{{ euro(result().taxableIncome) }} €</strong></div>
        <div class="summary-row"><span>Aliquota media lorda</span><strong>{{ percent(result().averageRate) }}%</strong></div>
        <div class="result-divider"></div>
        <h3 class="tax-breakdown-title">Imposta per scaglione</h3>
        <div class="tax-rows">
          @for (item of result().brackets; track item.label) {
            <div class="tax-bracket">
              <div><strong>{{ item.label }}</strong><span>Aliquota {{ percent(item.rate) }}%</span></div>
              <div class="tax-bracket-numbers"><span>Su {{ euro(item.taxableAmount) }} €</span><strong>{{ euro(item.tax) }} €</strong></div>
            </div>
          }
        </div>
        <p class="result-footnote">Calcolo informativo: per la tua imposta effettiva sono necessarie tutte le altre informazioni fiscali personali.</p>
      </div>
    </section>
    <div class="container tax-after"><h2>Perché non mostriamo subito il netto?</h2><p>Il netto dipende da contributi previdenziali, tipologia contrattuale, detrazioni, eventuali agevolazioni e addizionali del comune e della regione. Pubblicare un numero senza questi elementi rischierebbe di essere fuorviante. Integreremo questa funzione con le fonti ufficiali necessarie.</p><a class="text-link" routerLink="/fonti-e-metodo">Consulta fonti e metodologia <span aria-hidden="true">↗</span></a></div>
  `
})
export class TaxComponent {
  readonly taxableIncome = signal(35000);
  readonly result = computed(() => calculateGrossIrpef2026(this.taxableIncome()));
  private readonly formatter = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
  euro(value: number): string { return this.formatter.format(value); }
  percent(value: number): string { return this.formatter.format(value * 100); }
  clamp(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? Math.min(100000000, Math.max(0, n)) : 0; }
}
