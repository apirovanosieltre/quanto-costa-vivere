import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HOUSEHOLD_SPENDING_2025, type HouseholdSpendingData } from '../../core/istat-household';

@Component({
  selector: 'app-household-spending',
  standalone: true,
  imports: [RouterLink],
  template: `
<section class="page-hero container">
  <a routerLink="/" class="back-link">← Torna al budget</a>
  <span class="eyebrow eyebrow-subtle">ISTAT · CONSUMI FAMILIARI 2025</span>
  <h1>Quanto spendono <span>le famiglie in Italia?</span></h1>
  <p>Statistiche ufficiali sulla spesa media mensile per consumi, pubblicate da ISTAT l'8 ottobre 2026. Non sono preventivi personalizzati né prezzi di una città.</p>
</section>
<section class="container data-layout" style="padding-bottom:3rem" aria-label="Spesa familiare ISTAT">
  <div class="form-panel">
    <h2>Italia · anno 2025</h2>
    <p class="field-hint">{{ apiState() }}</p>
    <p class="eyebrow eyebrow-subtle">SPESA MEDIA MENSILE PER FAMIGLIA</p>
    <p class="data-big-number">{{ euro(data().national.mean) }} €</p>
    <p>Spesa mediana: <strong>{{ euro(data().national.median) }} €</strong>. La mediana è inferiore alla media: almeno metà delle famiglie spende non più di questa cifra.</p>
    <div class="data-detail">
      <h3>Altri indicatori nazionali</h3>
      <p>Alimentari e bevande analcoliche: <strong>{{ euro(data().national.foodAndNonAlcoholicDrinks) }} €/mese</strong>, media di tutte le famiglie.</p>
      <p>Famiglie di una sola persona: <strong>{{ euro(data().national.singlePersonMean) }} €/mese</strong>, spesa media totale.</p>
      <p>Affitto pagato: <strong>{{ euro(data().national.rentAmongRentingHouseholds) }} €/mese</strong>, solo famiglie che vivono in affitto. Non è un canone tipico per un nuovo contratto.</p>
    </div>
    <h2>Alcune regioni citate nel comunicato</h2>
    <p class="field-hint">Copertura volutamente parziale. Non assumere che una regione non elencata abbia un dato mancante presso ISTAT.</p>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;text-align:left">
        <thead><tr><th scope="col" style="padding:.65rem;border-bottom:1px solid #b9c8d3">Regione</th><th scope="col" style="padding:.65rem;border-bottom:1px solid #b9c8d3">Media mensile/famiglia</th></tr></thead>
        <tbody>
          @for (r of data().regions; track r.region) {
            <tr><th scope="row" style="padding:.6rem;border-bottom:1px solid #dbe5ed">{{ r.region }}</th><td style="padding:.6rem;border-bottom:1px solid #dbe5ed">{{ euro(r.monthlyMeanEUR) }} €</td></tr>
          }
        </tbody>
      </table>
    </div>
    <p class="field-hint">I valori sono riferiti al 2025. Non rappresentano il costo minimo per vivere, non distinguono il numero di componenti e non possono essere applicati direttamente a un comune.</p>
    <a [href]="data().sourceUrl" target="_blank" rel="noopener noreferrer">Verifica il comunicato ufficiale ISTAT ↗</a>
  </div>
  <div class="method-card">
    <h2>Come usiamo questi dati</h2>
    <p>Questi importi descrivono i consumi delle famiglie intervistate, non una tariffa o un'indicazione di quanto dovresti spendere.</p>
    <p>Il tuo <a routerLink="/">calcolatore del budget</a> continua a usare soltanto i valori inseriti da te. Non sostituiamo affitto, utenze o spese personali con medie nazionali.</p>
    <p><strong>Fonte:</strong> ISTAT, Spese per consumi delle famiglie, anno 2025 (8 ottobre 2026).</p>
    <p><a href="https://www.istat.it/dati/open-data/" target="_blank" rel="noopener noreferrer">Condizioni di riutilizzo ISTAT ↗</a></p>
  </div>
</section>`
})
export class HouseholdSpendingComponent implements OnInit {
  readonly data=signal<HouseholdSpendingData>(HOUSEHOLD_SPENDING_2025);
  readonly apiState=signal('Dati ufficiali ISTAT, pubblicazione 8 ottobre 2026; verifica API in corso.');
  private readonly fmt=new Intl.NumberFormat('it-IT',{maximumFractionDigits:0});
  euro(value:number):string { return this.fmt.format(value); }
  ngOnInit():void { void this.load(); }
  private async load():Promise<void> {
    try {
      const response=await fetch('/api/household-spending');
      if(!response.ok || !(response.headers.get('content-type')??'').includes('application/json')) throw new Error('API non disponibile');
      const d:unknown=await response.json();
      if (!d || typeof d!=='object') throw new Error('Dato non valido');
      const raw=d as HouseholdSpendingData;
      if(raw.source!=='ISTAT' || raw.referenceYear!==2025 || raw.national?.mean!==2782 ||
          !Array.isArray(raw.regions) || raw.regions.length!==8) throw new Error('Versione dataset inattesa');
      this.data.set(raw);
      this.apiState.set('Dataset ufficiale 2025 disponibile via API interna.');
    } catch {
      // Il bundle include gli stessi dati ufficiali, versionati, per ng serve e in caso di downtime.
      this.apiState.set('Dataset 2025 versionato nel sito (la API non è raggiungibile).');
    }
  }
}
