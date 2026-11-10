import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector:'app-omi',
  standalone:true,
  imports:[FormsModule, RouterLink],
  template:`
<section class="page-hero container">
  <a routerLink="/" class="back-link">← Torna al budget</a>
  <span class="eyebrow eyebrow-subtle">AGENZIA ENTRATE · OSSERVATORIO MERCATO IMMOBILIARE</span>
  <h1>Affitti e <span>quotazioni OMI.</span></h1>
  <p>Esplora le quotazioni ufficiali per zona OMI e calcola il corrispondente intervallo mensile di locazione, senza inventare prezzi per il tuo comune.</p>
</section>
<section class="container data-layout" style="padding-bottom:3rem">
  <div class="form-panel">
    <h2>1. Consulta la fonte ufficiale</h2>
    <p>Apri la mappa OMI, scegli anno e semestre, provincia, comune, zona e tipologia abitativa. Individua la quotazione di locazione minima e massima.</p>
    <p><a href="https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm" target="_blank" rel="noopener noreferrer">Apri la consultazione OMI dell'Agenzia delle Entrate ↗</a></p>
    <h2>2. Riporta i valori della zona</h2>
    <p class="field-hint">Le caselle sono intenzionalmente vuote. Inserisci solo importi letti sulla fonte ufficiale, espressi in €/m² al mese.</p>
    <label class="field-label" for="omi-size">Superficie di riferimento (m²)</label>
    <input class="standalone-input" id="omi-size" type="number" min="0" max="10000" step="1" [ngModel]="size()" (ngModelChange)="size.set(clamp($event,10000))">
    <label class="field-label" for="omi-surface">Criterio superficie indicato da OMI</label>
    <div class="select-wrap">
      <select id="omi-surface" [ngModel]="surface()" (ngModelChange)="surface.set($event)">
        <option value="L">L · superficie lorda</option>
        <option value="N">N · superficie netta</option>
      </select>
    </div>
    <p class="field-hint">La superficie inserita deve corrispondere al tipo L/N della specifica riga OMI.</p>
    <label class="field-label" for="omi-min">Quotazione minima locazione (€/m²/mese)</label>
    <input class="standalone-input" id="omi-min" type="number" min="0" max="1000" step="0.1" [ngModel]="minRate()" (ngModelChange)="minRate.set(clamp($event,1000))" placeholder="Inserisci valore ufficiale">
    <label class="field-label" for="omi-max">Quotazione massima locazione (€/m²/mese)</label>
    <input class="standalone-input" id="omi-max" type="number" min="0" max="1000" step="0.1" [ngModel]="maxRate()" (ngModelChange)="maxRate.set(clamp($event,1000))" placeholder="Inserisci valore ufficiale">
    @if (valid()) {
      <div class="data-detail" aria-live="polite">
        <h3>Intervallo di quotazione indicativo</h3>
        <p class="data-big-number">{{ money(low()) }} – {{ money(high()) }} €</p>
        <p>al mese per {{ size() }} m² di superficie {{ surface()==='L' ? 'lorda' : 'netta' }}, esclusi oneri e spese.</p>
      </div>
    } @else {
      <p class="field-hint">Inserisci superficie e valori min/max validi per vedere il calcolo. La quotazione minima deve essere inferiore o uguale alla massima.</p>
    }
    <div class="data-notice" role="note">
      <span class="notice-icon" aria-hidden="true">i</span>
      <p><strong>Quotazione, non annuncio.</strong> OMI indica intervalli ordinari per zona, destinazione d'uso e stato conservativo. Non è un prezzo garantito o una stima professionale per un immobile specifico.</p>
    </div>
  </div>
  <div class="method-card">
    <h2>Perché non mostriamo una media comunale inventata?</h2>
    <p>Le quotazioni OMI cambiano da una zona all'altra, anche nello stesso comune, e per tipologia e stato conservativo dell'immobile.</p>
    <p>In questa prima integrazione utilizzi la consultazione ufficiale e un calcolatore locale. Non importiamo e redistribuiamo l'intero archivio OMI fino alla verifica delle condizioni applicabili al riutilizzo commerciale.</p>
    <p><a href="https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/legenda.htm" target="_blank" rel="noopener noreferrer">Legenda OMI ufficiale ↗</a></p>
    <p><strong>Fonte:</strong> Agenzia Entrate - OMI.</p>
  </div>
</section>`
})
export class OmiComponent {
  readonly size=signal(0);
  readonly surface=signal('L');
  readonly minRate=signal(0);
  readonly maxRate=signal(0);
  readonly valid=computed(()=>this.size()>0&&this.minRate()>0&&this.maxRate()>0&&this.minRate()<=this.maxRate());
  readonly low=computed(()=>Math.round(this.size()*this.minRate()*100)/100);
  readonly high=computed(()=>Math.round(this.size()*this.maxRate()*100)/100);
  private readonly fmt=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  money(n:number):string{return this.fmt.format(n);}
  clamp(v:unknown,maximum:number):number{
    if(v===null || v===undefined || v==='')return 0;
    const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(maximum,n)):0;
  }
}
