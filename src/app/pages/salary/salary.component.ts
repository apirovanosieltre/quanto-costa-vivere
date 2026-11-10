import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { estimateSalary2026 } from '../../core/salary-2026';

@Component({selector:'app-salary',standalone:true, imports:[FormsModule,RouterLink], template:`
<section class="page-hero container">
  <a class="back-link" routerLink="/">← Torna al budget</a>
  <span class="eyebrow eyebrow-subtle">RETRIBUZIONE · ANNO D'IMPOSTA 2026</span>
  <h1>Dalla RAL <span>al netto nazionale.</span></h1>
  <p>Stima per lavoratori dipendenti privati a tempo pieno, con 365 giorni lavorativi fiscali, senza altri redditi e senza familiari a carico. <strong>Non comprende le addizionali locali.</strong></p>
</section>
<section class="container tax-layout" aria-label="Simulatore di stipendio" style="padding-bottom:2rem">
  <div class="form-panel">
    <h2>I tuoi dati</h2>
    <label class="field-label" for="ral">Retribuzione annua lorda (RAL)</label>
    <div class="number-field"><span class="prefix" aria-hidden="true">€</span><input id="ral" type="number" min="1" max="56224" step="500" [ngModel]="ral()" (ngModelChange)="ral.set(clamp($event,10000000))" aria-describedby="ral-info"></div>
    <p class="field-hint" id="ral-info">Supportiamo fino a 56.224 € per non approssimare le soglie previdenziali superiori.</p>
    <label class="field-label" for="installments">Mensilità contrattuali</label>
    <div class="select-wrap"><select id="installments" [ngModel]="installments()" (ngModelChange)="setInstallments($event)"><option [value]="12">12</option><option [value]="13">13</option><option [value]="14">14</option></select></div>
    <label class="field-label" for="contribution">Contributi INPS a carico del lavoratore (%)</label>
    <div class="number-field"><span class="prefix" aria-hidden="true">%</span><input id="contribution" type="number" min="0" max="20" step="0.01" [ngModel]="contributions()" (ngModelChange)="contributions.set(clamp($event,20))" aria-describedby="contribution-info"></div>
    <p class="field-hint" id="contribution-info">9,19% è un caso standard indicativo. L'aliquota effettiva può variare per settore, azienda e contratto.</p>
    <div class="data-notice" role="note"><span class="notice-icon" aria-hidden="true">!</span><p><strong>Risultato parziale.</strong> Sono inclusi IRPEF nazionale, detrazione base per dipendente e misure L. 207/2024. Sono escluse addizionali comunali e regionali, trattamento integrativo, familiari a carico, altre deduzioni, agevolazioni speciali, conguagli e differenze mensili.</p></div>
  </div>
  <aside class="result-panel tax-result" aria-label="Stima stipendio senza addizionali">
    <div class="result-top"><span>STIMA INFORMATIVA</span><span class="result-period">2026</span></div>
    @if (result().supported) {
      <p class="result-intro">Netto per mensilità <strong>prima delle addizionali locali</strong></p>
      <div class="result-number" aria-live="polite">{{ money(result().monthlyBeforeLocalTaxes) }}<span> €</span></div>
      <div class="result-divider"></div>
      <div class="summary-row"><span>RAL</span><strong>{{ money(result().ral) }} €</strong></div>
      <div class="summary-row"><span>Contributi dipendente</span><strong>− {{ money(result().socialSecurity) }} €</strong></div>
      <div class="summary-row"><span>Imponibile fiscale</span><strong>{{ money(result().taxableIncome) }} €</strong></div>
      <div class="summary-row"><span>IRPEF lorda</span><strong>− {{ money(result().grossIrpef) }} €</strong></div>
      <div class="summary-row"><span>Detrazione lavoro dipendente</span><strong>+ {{ money(result().employeeDeduction) }} €</strong></div>
      <div class="summary-row"><span>Ulteriore detrazione</span><strong>+ {{ money(result().additionalDeduction) }} €</strong></div>
      <div class="summary-row"><span>Somma non imponibile</span><strong>+ {{ money(result().nonTaxableSupplement) }} €</strong></div>
      <div class="summary-row summary-total"><span>Netto annuo prima di addizionali</span><strong>{{ money(result().yearlyBeforeLocalTaxes) }} €</strong></div>
      <p class="result-footnote">Il netto effettivo sarà inferiore quando sono dovute addizionali locali; le altre agevolazioni possono invece aumentarlo.</p>
    } @else {
      <p class="data-error" role="status">{{ result().reason }}</p>
      <p>Modifica la RAL o il valore dei contributi per rientrare nel campo supportato.</p>
    }
  </aside>
</section>
<section class="container method-card" style="margin-top:2rem">
  <h2>Fonti normative</h2>
  <p><a href="https://www.normattiva.it/atto/caricaDettaglioAtto?atto.articolo.numero=13&atto.codiceRedazionale=086U0917&atto.dataPubblicazioneGazzetta=1986-12-31&vigenza=2026-01-01" target="_blank" rel="noopener noreferrer">Articolo 13 TUIR (vigente nel 2026)</a>, <a href="https://www.normattiva.it/eli/id/2024/12/31/24G00229/CONSOLIDATED/20251219" target="_blank" rel="noopener noreferrer">Legge 207/2024</a>, <a href="https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.lavoratori-dipendenti-limite-minimo-di-retribuzione-giornaliera-2026.html" target="_blank" rel="noopener noreferrer">INPS: valori contributivi 2026</a>.</p>
  <p>Le formule qui sopra sono codificate nel progetto e non vengono aggiornate automaticamente. Prima di ogni nuovo anno d'imposta devono essere verificate.</p>
</section>
`})
export class SalaryComponent {
  readonly ral=signal(30000); readonly installments=signal<12|13|14>(13); readonly contributions=signal(9.19);
  readonly result=computed(()=>estimateSalary2026({grossYearlySalary:this.ral(),installments:this.installments(),employeeSocialSecurityRatePct:this.contributions()}));
  private readonly formatter=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  money(n:number):string{return this.formatter.format(n);}
  clamp(value:unknown,max:number):number {const v=Number(value); return Number.isFinite(v) ? Math.min(max,Math.max(0,v)) : 0;}
  setInstallments(v:unknown):void { const n=Number(v); if(n===12||n===13||n===14) this.installments.set(n); }
}
