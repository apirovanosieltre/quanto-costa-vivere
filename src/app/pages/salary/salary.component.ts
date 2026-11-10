import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { estimateSalary2026 } from '../../core/salary-2026';
import { estimateLocalTaxes2026 } from '../../core/local-tax-2026';
import { validateMunicipalDataset, type MunicipalDataset } from '../../core/municipal-data';
import type { RegionalMefDataset } from '../../core/mef-regional';

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
    <div class="data-notice" role="note"><span class="notice-icon" aria-hidden="true">!</span><p><strong>Simulazione fiscale.</strong> Sono inclusi IRPEF nazionale, detrazione lavoro dipendente e misure nazionali modellate. Le addizionali locali si calcolano separatamente, soltanto quando sono presenti regole MEF verificabili. Restano esclusi trattamento integrativo, familiari a carico, agevolazioni speciali, conguagli e differenze delle singole buste paga.</p></div>
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
<section class="container data-layout" style="padding-bottom:2rem" aria-label="Imposte locali 2026">
  <div class="form-panel">
    <h2>Integra le addizionali locali</h2>
    <p>Seleziona comune e regione di domicilio fiscale. Il calcolo si attiva solo con aliquote MEF revisionate e quando è dovuta IRPEF nazionale.</p>
    <label class="field-label" for="tax-municipality-search">Cerca il comune</label>
    <input class="standalone-input" id="tax-municipality-search" type="search"
      [ngModel]="municipalitySearch()" (ngModelChange)="changeMunicipalitySearch($event)"
      placeholder="Es. Milano, ABBATEGGIO, ABETONE" />
    @if (municipalDataset()?.published) {
      <p class="field-hint">{{municipalityMatches().length}} risultati mostrati (massimo 12). Seleziona il comune esatto.</p>
      <div class="municipal-results" role="group" aria-label="Comuni">
        @for (m of municipalityMatches(); track m.code) {
          <button type="button" class="municipality-button" [class.is-selected]="m.code===selectedMunicipalityCode()"
            (click)="selectedMunicipalityCode.set(m.code)" [attr.aria-pressed]="m.code===selectedMunicipalityCode()">
            {{m.municipality}} ({{m.province}})
          </button>
        } @empty { <p>Nessun comune nella ricerca.</p> }
      </div>
      @if (selectedMunicipality(); as m) {
        <p><strong>Comune selezionato:</strong> {{m.municipality}} ({{m.province}})</p>
        <p class="field-hint">{{m.status === 'simple' ? 'Aliquota semplice presente nel CSV verificato.' : m.reason}}</p>
      }
    } @else {
      <p class="data-error" role="status">Il dataset comunale revisionato non è pubblicato. La stima nazionale resta disponibile.</p>
    }
    <label class="field-label" for="tax-region">Regione di domicilio fiscale</label>
    <div class="select-wrap">
      <select id="tax-region" [ngModel]="selectedRegion()" (ngModelChange)="selectedRegion.set($event)">
        <option value="">Seleziona regione</option>
        @for (name of regions(); track name) {
          <option [value]="name">{{name}}</option>
        }
      </select>
    </div>
    <p class="field-hint">Per il momento il calcolo regionale automatico è disponibile solo per le regole riconosciute in modo esplicito; negli altri casi si mostrano le fasce su <a routerLink="/addizionali-regionali">MEF regionali</a>.</p>
    <label style="display:flex;align-items:flex-start;gap:.6rem;margin-top:1rem">
      <input type="checkbox" [ngModel]="locationConfirmed()" (ngModelChange)="locationConfirmed.set(!!$event)">
      <span>Confermo che regione e comune selezionati corrispondono al mio domicilio fiscale per il periodo considerato.</span>
    </label>
  </div>
  <div class="method-card">
    <h2>Risultato locale</h2>
    @if (!locationConfirmed()) {
      <p class="field-hint">Verifica e conferma il domicilio fiscale per abilitare il calcolo locale.</p>
    } @else if (!result().supported) {
      <p class="data-error">La stima nazionale non supporta questi parametri; non calcoliamo le addizionali.</p>
    } @else {
      <p><strong>Comunale:</strong>
        @if(local()?.municipal?.amount !== null && local()?.municipal?.amount !== undefined) {
          {{ money(local()!.municipal.amount!) }} € / anno
        } @else { Non calcolabile }
      </p>
      <p class="field-hint">{{local()?.municipal?.note}}</p>
      <p><strong>Regionale:</strong>
        @if(local()?.regional?.amount !== null && local()?.regional?.amount !== undefined) {
          {{ money(local()!.regional.amount!) }} € / anno
        } @else { Non calcolabile }
      </p>
      <p class="field-hint">{{local()?.regional?.note}}</p>
      @if(local()?.complete) {
        <div class="data-detail">
          <h3>Media netta stimata dopo le addizionali locali</h3>
          <p class="data-big-number">{{money(local()!.monthlyAverageAfterLocal!)}} €</p>
          <p>Netto annuo {{money(local()!.yearlyNetAfterLocal!)}} €. Distribuzione matematica su {{installments()}} mensilità, non previsione del cedolino.</p>
        </div>
      } @else {
        <div class="data-notice" role="note"><span class="notice-icon" aria-hidden="true">i</span>
          <p><strong>Risultato incompleto.</strong> Manca almeno una delle due addizionali verificabili. Non mostriamo un netto complessivo fittizio.</p>
        </div>
      }
    }
    <p class="field-hint">Il reddito imponibile utilizzato è {{money(result().taxableIncome)}} €; la simulazione non considera altri redditi, deduzioni o situazioni familiari.</p>
  </div>
</section>
<section class="container method-card" style="margin-top:2rem">
  <h2>Fonti normative</h2>
  <p><a href="https://www.normattiva.it/atto/caricaDettaglioAtto?atto.articolo.numero=13&atto.codiceRedazionale=086U0917&atto.dataPubblicazioneGazzetta=1986-12-31&vigenza=2026-01-01" target="_blank" rel="noopener noreferrer">Articolo 13 TUIR (vigente nel 2026)</a>, <a href="https://www.normattiva.it/eli/id/2024/12/31/24G00229/CONSOLIDATED/20251219" target="_blank" rel="noopener noreferrer">Legge 207/2024</a>, <a href="https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.lavoratori-dipendenti-limite-minimo-di-retribuzione-giornaliera-2026.html" target="_blank" rel="noopener noreferrer">INPS: valori contributivi 2026</a>.</p>
  <p>Le formule qui sopra sono codificate nel progetto e non vengono aggiornate automaticamente. Prima di ogni nuovo anno d'imposta devono essere verificate.</p>
</section>
`})
export class SalaryComponent implements OnInit {
  readonly ral=signal(30000); readonly installments=signal<12|13|14>(13); readonly contributions=signal(9.19);
  readonly result=computed(()=>estimateSalary2026({grossYearlySalary:this.ral(),installments:this.installments(),employeeSocialSecurityRatePct:this.contributions()}));
  private readonly formatter=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  money(n:number):string{return this.formatter.format(n);}
  clamp(value:unknown,max:number):number {const v=Number(value); return Number.isFinite(v) ? Math.min(max,Math.max(0,v)) : 0;}
  setInstallments(v:unknown):void { const n=Number(v); if(n===12||n===13||n===14) this.installments.set(n); }
  readonly municipalDataset=signal<MunicipalDataset|null>(null);
  readonly regionalDataset=signal<RegionalMefDataset|null>(null);
  readonly municipalitySearch=signal('');
  readonly selectedMunicipalityCode=signal('');
  readonly selectedRegion=signal('');
  readonly locationConfirmed=signal(false);
  readonly regions=computed(()=>[...new Set((this.regionalDataset()?.records??[]).map(r=>r.region))].sort((a,b)=>a.localeCompare(b,'it')));
  readonly municipalityMatches=computed(()=>{
    const input=this.municipalitySearch().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toLowerCase();
    if(input.length<2)return [];
    return (this.municipalDataset()?.records??[]).filter(r=>
      (r.municipality+' '+r.province).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().includes(input)).slice(0,12);
  });
  readonly selectedMunicipality=computed(()=>this.municipalDataset()?.records.find(r=>r.code===this.selectedMunicipalityCode())??null);
  readonly local=computed(()=>{
    if(!this.locationConfirmed()||!this.result().supported)return null;
    return estimateLocalTaxes2026({
      municipal:this.selectedMunicipality(),municipalDataset:this.municipalDataset(),
      regionalDataset:this.regionalDataset(),region:this.selectedRegion(),
      taxableIncome:this.result().taxableIncome,nationalIrpefDue:this.result().nationalIrpefAfterDeductions,
      yearlyBeforeLocal:this.result().yearlyBeforeLocalTaxes,installments:this.installments()
    });
  });
  changeMunicipalitySearch(v:string):void{
    this.municipalitySearch.set(v);this.selectedMunicipalityCode.set('');this.locationConfirmed.set(false);
  }
  ngOnInit():void{void this.loadLocalDatasets();}
  async loadLocalDatasets():Promise<void>{
    try{
      const response=await fetch('/data/municipal-2026.json',{cache:'no-cache'});
      if(response.ok)this.municipalDataset.set(validateMunicipalDataset(await response.json()));
    }catch{/* Il calcolo nazionale resta disponibile. */}
    try{
      const response=await fetch('/api/regional-rates');
      if(response.ok){
        const raw:unknown=await response.json();
        if(raw && typeof raw==='object'){
          const dataset=raw as RegionalMefDataset;
          if(dataset.year===2026 && Array.isArray(dataset.records))this.regionalDataset.set(dataset);
        }
      }
    }catch{/* Non applicare regole non caricate. */}
  }
}
