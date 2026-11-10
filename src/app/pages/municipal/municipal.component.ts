import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { calculateMunicipalAdditional, validateMunicipalDataset, type MunicipalDataset, type MunicipalRecord } from '../../core/municipal-data';

@Component({ selector:'app-municipal',standalone:true,imports:[FormsModule,RouterLink],template:`
<section class="page-hero container">
  <a routerLink="/" class="back-link">← Torna al budget</a>
  <span class="eyebrow eyebrow-subtle">MEF · ADDIZIONALE COMUNALE 2026</span>
  <h1>La fiscalità <span>del tuo comune.</span></h1>
  <p>Il servizio legge i dati pubblicati dal MEF solo dopo un'importazione controllata. I casi a scaglioni o con esenzioni particolari restano da verificare.</p>
</section>
<section class="container data-layout" style="padding-bottom:3rem" aria-label="Ricerca delle addizionali comunali">
  <div class="form-panel">
    <h2>Consulta un comune</h2>
    @if (loading()) { <p role="status">Verifica disponibilità dei dati MEF…</p> }
    @else if (error()) { <p role="status" class="data-error">{{error()}}</p> }
    @else if (!dataset()?.published) {
      <p class="data-error" role="status"><strong>Dataset in attesa di validazione.</strong> Il sito non pubblica aliquote locali prima dell'importazione ufficiale.</p>
      <p>La pipeline di importazione è già predisposta. Dopo il controllo del file MEF 2026, sarà possibile cercare i comuni disponibili.</p>
    } @else {
      <p class="field-hint">Fonte: Dipartimento delle Finanze · importata il {{ dataset()?.retrievedAt || 'non disponibile' }}.</p>
      <label class="field-label" for="municipality-search">Cerca comune o provincia</label>
      <input class="standalone-input" id="municipality-search" type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Es. Milano, Arezzo, MI" aria-describedby="municipality-hint">
      <p id="municipality-hint" class="field-hint">Fino a 15 risultati. Se il comune non compare, specifica meglio la ricerca.</p>
      <div class="municipal-results" role="group" aria-label="Comuni trovati">
        @for(record of matches();track record.code){
          <button class="municipality-button" type="button" [class.is-selected]="selectedCode()===record.code" (click)="selectedCode.set(record.code)" [attr.aria-pressed]="selectedCode()===record.code">{{record.municipality}} ({{record.province}})</button>
        } @empty { <p>Nessun comune corrispondente.</p> }
      </div>
      @if(selected();as row) {
        <div class="data-detail" aria-live="polite">
          <h3>{{row.municipality}} ({{row.province}})</h3>
          @if(row.status==='simple') {
            <p>Aliquota comunale registrata: <strong>{{row.ratePct}}%</strong></p>
            @if(row.exemptionThreshold !== null) {<p>Esenzione generale fino a <strong>{{money(row.exemptionThreshold)}} €</strong> di imponibile.</p>}
            <label class="field-label" for="local-income">Imponibile annuo (€)</label>
            <input class="standalone-input" id="local-income" type="number" min="0" max="100000000" [ngModel]="income()" (ngModelChange)="income.set(clamp($event))">
            <p><strong>Addizionale comunale indicativa:</strong> {{money(amount()!)}} € annui</p>
          } @else {<p>Calcolo non disponibile: {{row.reason}}</p>}
          <p class="field-hint">Questo risultato non comprende l'addizionale regionale, detrazioni e condizioni particolari.</p>
        </div>
      }
    }
  </div>
  <div class="method-card">
    <h2>Come trattiamo i dati</h2>
    <p>Le righe del CSV del MEF vengono importate e validate, senza trasformare automaticamente regole particolari in una semplice aliquota.</p>
    <p>La dicitura <strong>0*</strong> non viene interpretata come esenzione: indica che è necessario controllare la disciplina precedente.</p>
    <a href="https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/tabella.htm" target="_blank" rel="noopener noreferrer">Consulta gli elenchi ufficiali MEF ↗</a>
  </div>
</section>` })
export class MunicipalComponent implements OnInit {
  readonly loading=signal(true); readonly error=signal(''); readonly dataset=signal<MunicipalDataset | null>(null);
  readonly search=signal('Milano'); readonly selectedCode=signal(''); readonly income=signal(30000);
  readonly matches=computed(()=>{
    const needle=this.search().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    if(needle.length<2) return [];
    return (this.dataset()?.records??[]).filter(r=>`${r.municipality} ${r.province}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(needle)).slice(0,15);
  });
  readonly selected=computed(()=>this.dataset()?.records.find(r=>r.code===this.selectedCode())??null);
  readonly amount=computed(()=>{const row=this.selected();return row?calculateMunicipalAdditional(row,this.income()):null;});
  private readonly formatter=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  money(n:number):string{return this.formatter.format(n);}
  clamp(x:unknown):number { const n=Number(x);return Number.isFinite(n)?Math.max(0,Math.min(n,100000000)):0; }
  ngOnInit():void {void this.load();}
  async load():Promise<void>{
    try{
      const response=await fetch('/data/municipal-2026.json',{cache:'no-cache'});
      if(!response.ok) throw new Error('File dati non disponibile');
      this.dataset.set(validateMunicipalDataset(await response.json()));
    }catch{this.error.set('Impossibile leggere il catalogo comunale. Non pubblichiamo aliquote non verificate.');}
    finally {this.loading.set(false);}
  }
}
