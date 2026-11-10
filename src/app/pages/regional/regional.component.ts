import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { REGIONAL_MEF_PAGE_URL, type RegionalMefDataset } from '../../core/mef-regional';
import { estimateRegional2026 } from '../../core/local-tax-2026';

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
      <section class="data-detail" aria-label="Calcolo dettagliato addizionale regionale" style="margin:1.25rem 0">
        <h3>Calcola l'addizionale regionale</h3>
        <p class="field-hint">Disponibile per le fasce validate di Lombardia, Toscana, Emilia-Romagna, Liguria, Piemonte e per la regola di Valle d'Aosta. Negli altri territori è mostrata la fonte senza inventare un calcolo.</p>
        <label class="field-label" for="regional-income">Imponibile IRPEF annuo (€)</label>
        <input id="regional-income" class="standalone-input" type="number" min="0" max="100000000"
          [ngModel]="income()" (ngModelChange)="setIncome($event)">
        <label style="display:flex;gap:.5rem;align-items:flex-start;margin:1rem 0">
          <input type="checkbox" [ngModel]="irpefDue()" (ngModelChange)="irpefDue.set(!!$event)">
          <span>Confermo che, dopo le detrazioni, risulta dovuta IRPEF nazionale netta per questo anno.</span>
        </label>
        @if(region()==='REGIONE PIEMONTE'){
          <label style="display:flex;gap:.5rem;align-items:flex-start;margin:1rem 0">
            <input type="checkbox" [ngModel]="noChildren()" (ngModelChange)="noChildren.set(!!$event)">
            <span>Confermo l'assenza di figli fiscalmente a carico. Il calcolo non comprende le detrazioni regionali per figli.</span>
          </label>
        }
        @if(irpefDue()){
          @if(regionalEstimate().amount !== null) {
            <p><strong>Addizionale annua stimata: {{money(regionalEstimate().amount!)}} €</strong></p>
            @if(regionalEstimate().bands; as bands){
              <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;text-align:left">
                  <thead><tr><th scope="col">Fascia</th><th scope="col">Quota reddito</th><th scope="col">Aliquota</th><th scope="col">Imposta</th></tr></thead>
                  <tbody>
                    @for(band of bands;track $index){
                      <tr>
                        <th scope="row" style="padding:.5rem">{{money(band.from)}} – {{band.to===null?'oltre':money(band.to)}} €</th>
                        <td style="padding:.5rem">{{money(band.taxableSlice)}} €</td>
                        <td style="padding:.5rem">{{rate(band.ratePct)}}%</td>
                        <td style="padding:.5rem">{{money(band.tax)}} €</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            <p class="field-hint">{{regionalEstimate().note}}</p>
          } @else {
            <p class="data-error" role="status">{{regionalEstimate().note}}</p>
          }
        } @else {
          <p class="field-hint">Se non è dovuta IRPEF netta, non è dovuta l'addizionale. Conferma il requisito per attivare la stima delle fasce.</p>
        }
      </section>
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
        <p><strong>Attenzione alle eccezioni.</strong> Il calcolo usa soltanto profili regionali esplicitamente verificati. Le fasce con disposizioni speciali non modellate restano consultabili ma non calcolabili automaticamente.</p>
      </div>
    }
    <a [href]="source" target="_blank" rel="noopener noreferrer">Verifica l'elenco generale MEF 2026 ↗</a>
  </div>
  <div class="method-card">
    <h2>Come leggere le fasce</h2>
    <p>Ogni riga è riportata dal CSV ufficiale con aliquota, etichetta di fascia e disposizioni. Lo stesso valore percentuale non garantisce lo stesso risultato fiscale.</p>
    <p>Per esempio, un'aliquota unica può prevedere esenzione totale per redditi inferiori a una soglia, indicata nel testo delle disposizioni.</p>
    <p>Il <a routerLink="/stipendio-netto-2026">simulatore stipendio</a> combina le addizionali regionali calcolabili con quelle comunali revisionate, verificando anche la corrispondenza territoriale.</p>
  </div>
</section>`
})
export class RegionalComponent implements OnInit {
  readonly source=REGIONAL_MEF_PAGE_URL;
  readonly loading=signal(true);
  readonly error=signal('');
  readonly data=signal<RegionalMefDataset|null>(null);
  readonly region=signal('');
  readonly income=signal(30000);
  readonly irpefDue=signal(false);
  readonly noChildren=signal(false);
  readonly regionalEstimate=computed(()=>estimateRegional2026(this.region(),this.data(),this.income(),this.irpefDue()?1:0,{noDependentChildrenConfirmed:this.noChildren()}));
  readonly regions=computed(()=>[...new Set((this.data()?.records??[]).map(r=>r.region))].sort((a,b)=>a.localeCompare(b,'it')));
  readonly selected=computed(()=>(this.data()?.records??[]).filter(r=>r.region===this.region()));
  private readonly format=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  rate(value:number):string{return this.format.format(value);}
  money(value:number):string{return this.format.format(value);}
  setIncome(value:unknown):void{const n=Number(value);this.income.set(Number.isFinite(n)?Math.max(0,Math.min(n,100000000)):0);}
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
