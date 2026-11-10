import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { REGIONAL_MEF_PAGE_URL, type RegionalMefDataset } from '../../core/mef-regional';

@Component({
  selector:'app-regional',
  standalone:true,
  imports:[FormsModule,RouterLink],
  template:`
<section class="page-hero container">
  <a class="back-link" routerLink="/">← Torna al budget</a>
  <span class="eyebrow eyebrow-subtle">MEF · REGIONALI 2026</span>
  <h1>Aliquote IRPEF <span>regionali.</span></h1>
  <p>Consulta le aliquote e le fasce pubblicate dal Dipartimento delle Finanze. La descrizione della disposizione può prevedere esenzioni, detrazioni e regole particolari.</p>
</section>
<section class="container data-layout" style="padding-bottom:3rem" aria-label="Consultazione addizionali regionali">
  <div class="form-panel">
    <h2>Elenco ufficiale 2026</h2>
    @if (loading()) { <p role="status">Caricamento dei dati MEF…</p> }
    @else if (error()) { <p class="data-error" role="status">{{error()}}</p> }
    @else if (data(); as dataset) {
      <p class="field-hint">Ultima lettura dalla fonte: {{ dataset.retrievedAt }}. Le informazioni sono cache per un massimo di 12 ore.</p>
      <label class="field-label" for="regional-select">Seleziona una regione o provincia autonoma</label>
      <div class="select-wrap">
        <select id="regional-select" [ngModel]="region()" (ngModelChange)="region.set($event)">
          @for (name of regions(); track name) {
            <option [value]="name">{{ name }}</option>
          }
        </select>
      </div>
      <p class="field-hint">{{ selected().length }} righe del CSV ufficiale per questo territorio.</p>
      @for (record of selected(); track $index) {
        <article class="data-detail" style="margin-top:1rem">
          <h3>{{ record.bandLabel }}</h3>
          <p>Aliquota riportata nel CSV: <strong>{{ rate(record.ratePct) }}%</strong></p>
          @if (record.disposition) {
            <p><strong>Disposizione:</strong> {{ record.disposition }}</p>
          }
          @if (record.notes) { <p><strong>Note:</strong> {{ record.notes }}</p> }
          @if (record.regulation) { <p class="field-hint"><strong>Norma:</strong> {{ record.regulation }}</p> }
        </article>
      }
      <div class="data-notice" role="note">
        <span class="notice-icon" aria-hidden="true">!</span>
        <p><strong>Non è un calcolo dell'imposta.</strong> Le aliquote indicate nelle righe possono essere modificate da condizioni nel testo. Non vanno applicate automaticamente all'intero reddito, né sommate come percentuali.</p>
      </div>
    }
    <a [href]="source" target="_blank" rel="noopener noreferrer">Verifica l'elenco generale MEF 2026 ↗</a>
  </div>
  <div class="method-card">
    <h2>Come leggere le fasce</h2>
    <p>Ogni riga è riportata dal CSV ufficiale con aliquota, etichetta di fascia e disposizioni. Lo stesso valore percentuale non garantisce lo stesso risultato fiscale.</p>
    <p>Per esempio, un'aliquota unica può prevedere esenzione totale per redditi inferiori a una soglia, indicata nel testo delle disposizioni.</p>
    <p>La <a routerLink="/stipendio-netto-2026">stima dello stipendio netto</a> rimane nazionale e non include ancora le addizionali regionali.</p>
  </div>
</section>`
})
export class RegionalComponent implements OnInit {
  readonly source=REGIONAL_MEF_PAGE_URL;
  readonly loading=signal(true);
  readonly error=signal('');
  readonly data=signal<RegionalMefDataset|null>(null);
  readonly region=signal('');
  readonly regions=computed(()=>[...new Set((this.data()?.records??[]).map(r=>r.region))].sort((a,b)=>a.localeCompare(b,'it')));
  readonly selected=computed(()=>(this.data()?.records??[]).filter(r=>r.region===this.region()));
  private readonly format=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  rate(value:number):string{return this.format.format(value);}
  ngOnInit():void {void this.load();}
  private async load():Promise<void>{
    try {
      const response=await fetch('/api/regional-rates',{headers:{Accept:'application/json'}});
      if(!response.ok || !(response.headers.get('content-type')??'').includes('application/json')) throw new Error('API indisponibile');
      const json:unknown=await response.json();
      if(!json || typeof json!=='object')throw new Error('Dati non validi');
      const data=json as RegionalMefDataset;
      if(data.year!==2026 || data.calculable!==false || !Array.isArray(data.records) || data.records.length<10 ||
        data.records.some(r=>!r.region || !r.bandLabel || !Number.isFinite(r.ratePct)))throw new Error('Tracciato dati non valido');
      this.data.set(data);
      const found=this.regions().find(r=>r.toLowerCase().includes('lombardia'));
      this.region.set(found??this.regions()[0]??'');
    } catch {
      this.error.set('Non è stato possibile leggere in sicurezza il CSV ufficiale MEF. Riprova più tardi o usa il collegamento alla fonte.');
    } finally {this.loading.set(false);}
  }
}
