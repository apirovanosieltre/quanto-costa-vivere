import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { INFLATION_SOURCE_URL, parseLatestItalianInflation, type InflationObservation } from '../../core/eurostat';

@Component({
  selector:'app-inflation', standalone:true, imports:[RouterLink, DatePipe],
  template:`
<section class="page-hero container">
  <a class="back-link" routerLink="/">← Torna al budget</a>
  <span class="eyebrow eyebrow-subtle">STATISTICHE UFFICIALI · ITALIA</span>
  <h1>Come cambiano <span>i prezzi?</span></h1>
  <p>L'inflazione annua armonizzata in Italia, ricavata direttamente da Eurostat. Nessuna stima comunale inventata.</p>
</section>
<section class="container data-layout" aria-label="Inflazione italiana" style="padding-bottom:3rem">
  <div class="form-panel">
    <h2>Inflazione annuale</h2>
    @if (loading()) { <p role="status">Caricamento dalla fonte ufficiale...</p> }
    @else if (data(); as observation) {
      <p class="eyebrow eyebrow-subtle">RIFERIMENTO {{ observation.period }}</p>
      <p class="data-big-number" aria-live="polite">{{ rate(observation.annualRate) }}%</p>
      <p>Variazione dell'indice IPCA del mese rispetto allo stesso mese dell'anno precedente, <strong>intera Italia</strong>.</p>
      <p class="field-hint">Aggiornamento dichiarato dalla fonte: {{ observation.sourceUpdatedAt || 'non indicato' }}.</p>
      <p class="field-hint">Consultato il {{ observation.retrievedAt | date:'dd/MM/yyyy HH:mm' }}.</p>
      <a [href]="observation.sourceUrl" target="_blank" rel="noopener noreferrer">Verifica il dato Eurostat ↗</a>
    } @else {
      <p class="data-error" role="status">{{ error() }}</p>
      <button class="ghost-button" type="button" (click)="load()">Riprova</button>
    }
    <div class="data-notice" role="note"><span class="notice-icon" aria-hidden="true">i</span><p><strong>Come leggerlo:</strong> un'inflazione del 2% indica la variazione media di un paniere di beni e servizi, non che ogni spesa familiare o affitto aumenti esattamente del 2%.</p></div>
  </div>
  <div class="method-card">
    <div class="method-symbol">✓</div>
    <h2>Una fonte verificabile</h2>
    <p>Eurostat pubblica l'indice armonizzato dei prezzi al consumo (HICP / IPCA). Qui mostriamo la variazione annua dell'intero paniere nazionale, non una previsione.</p>
    <p>API: <code>prc_hicp_minr</code> · <code>geo=IT</code> · <code>coicop18=TOTAL</code> · <code>unit=RCH_A</code>.</p>
    <a href="https://ec.europa.eu/eurostat/web/hicp/information-data" target="_blank" rel="noopener noreferrer">Metodologia Eurostat ↗</a>
  </div>
</section>`
})
export class InflationComponent implements OnInit {
  readonly loading=signal(true);
  readonly error=signal('');
  readonly data=signal<InflationObservation | null>(null);
  ngOnInit():void { void this.load(); }
  rate(n:number):string { return new Intl.NumberFormat('it-IT',{minimumFractionDigits:1, maximumFractionDigits:1}).format(n); }
  async load():Promise<void>{
    this.loading.set(true); this.error.set(''); this.data.set(null);
    try {
      let response:Response;
      try {
        response=await fetch('/api/inflation');
        if(!response.ok || !(response.headers.get('content-type')??'').includes('application/json')) throw new Error('Backend non disponibile');
        const result:unknown=await response.json();
        if(!result || typeof result!=='object' || !('annualRate' in result)) throw new Error('Dato non valido');
        const row=result as InflationObservation;
        if(!Number.isFinite(row.annualRate) || row.geography!=='IT' || row.category!=='TOTAL') throw new Error('Dato non valido');
        this.data.set(row); return;
      } catch {
        // ng serve non avvia Pages Functions: tentativo diretto all'API UE (potrebbe avere CORS).
        response=await fetch(INFLATION_SOURCE_URL,{headers:{Accept:'application/json'}});
        if(!response.ok) throw new Error('Eurostat non raggiungibile');
        const raw:unknown=await response.json();
        this.data.set(parseLatestItalianInflation(raw,new Date().toISOString()));
      }
    } catch { this.error.set('Il dato ufficiale non è disponibile. Riprova più tardi. Non mostriamo valori di esempio.'); }
    finally { this.loading.set(false); }
  }
}
