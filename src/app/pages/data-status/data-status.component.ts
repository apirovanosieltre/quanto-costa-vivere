import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OFFICIAL_SOURCES } from '../../core/official-sources';
import { validateMunicipalDataset } from '../../core/municipal-data';
@Component({selector:'app-data-status',standalone:true,imports:[RouterLink],template:`
<section class="page-hero container"><a routerLink="/" class="back-link">← Torna al budget</a><span class="eyebrow eyebrow-subtle">TRASPARENZA DEI DATI</span><h1>Fonti ufficiali e <span>copertura reale.</span></h1><p>Una fonte individuata non significa dato disponibile. Qui rendiamo visibili le integrazioni e gli aggiornamenti.</p></section>
<section class="container data-layout" style="padding-bottom:4rem" aria-label="Stato fonti">
<div class="form-panel"><h2>Integrazioni tecniche</h2>
  <article class="status-item"><span class="status-tag" [class.ready]="eurostatOk()" [class.planned]="!eurostatOk()">{{eurostatStatus()}}</span><h3>Eurostat · inflazione italiana</h3><p>{{eurostatInfo()}} Il backend restituisce fino a 12 rilevazioni mensili, con cache edge di 6 ore. Se Eurostat non risponde, non mostriamo valori di esempio.</p><a routerLink="/inflazione">Apri indicatore →</a></article>
  <article class="status-item"><span class="status-tag planned">{{mefStatus()}}</span><h3>MEF · addizionali comunali</h3><p>{{mefInfo()}}</p><a routerLink="/addizionali-comunali">Consulta stato e comuni →</a></article>
  <article class="status-item"><span class="status-tag planned">Solo fonte censita</span><h3>MEF · addizionali regionali</h3><p>Non importate né usate nel calcolo del netto. Gli scaglioni richiedono validazione separata.</p></article>
  <article class="status-item"><span class="status-tag planned">Non integrata</span><h3>OMI · quotazioni immobiliari</h3><p>Da verificare la modalità di download, le condizioni d'uso e la granularità prima di pubblicare dati sugli affitti.</p></article>
  <article class="status-item"><span class="status-tag ready">Formula nazionale codificata</span><h3>Stima RAL 2026</h3><p>Non è una API, ma un calcolo locale basato sulla normativa. Limitato al caso dipendente standard prima delle imposte locali.</p><a routerLink="/stipendio-netto-2026">Apri stima →</a></article>
</div>
<div class="method-card"><h2>Catalogo fonti primarie</h2>
@for(source of sources;track source.id){<article style="padding:1rem 0;border-bottom:1px solid #d8e2e9"><h3>{{source.label}}</h3><p>{{source.usage}}</p><p><strong>Aggiornamenti:</strong> {{source.cadence}}</p><a [href]="source.url" target="_blank" rel="noopener noreferrer">Fonte ufficiale ↗</a></article>}
</div></section>`})
export class DataStatusComponent implements OnInit {
  readonly sources=OFFICIAL_SOURCES;
  readonly eurostatOk=signal(false);
  readonly eurostatStatus=signal('Verifica API in corso');
  readonly eurostatInfo=signal('Controllo la disponibilità della fonte Eurostat.');
  readonly mefStatus=signal('In attesa di importazione');
  readonly mefInfo=signal('Script di acquisizione e controlli pronti. Il dataset non è ancora stato importato e verificato.');
  ngOnInit():void{void this.load();void this.checkEurostat();}
  async checkEurostat():Promise<void>{
    try {
      const response=await fetch('/api/inflation',{cache:'no-cache'});
      if (!response.ok) throw new Error('API HTTP ' + response.status);
      const data:unknown=await response.json();
      if(!data || typeof data!=='object' || !('period' in data) || !('annualRate' in data) || !('history' in data) ||
        typeof data.period!=='string' || !Number.isFinite(data.annualRate) || !Array.isArray(data.history) || !data.history.length) {
        throw new Error('Formato non valido');
      }
      this.eurostatOk.set(true);
      this.eurostatStatus.set('API disponibile');
      this.eurostatInfo.set('Collegamento verificato. Ultimo mese pubblicato: '+data.period+'.');
    } catch {
      this.eurostatStatus.set('API non raggiungibile');
      this.eurostatInfo.set('L’API /api/inflation non risponde con dati ufficiali validi. Verifica il deploy Workers e riprova.');
    }
  }
  async load():Promise<void>{
    try {const response=await fetch('/data/municipal-2026.json'); const d=validateMunicipalDataset(await response.json());
      if(d.published){this.mefStatus.set('Dataset pubblicato');this.mefInfo.set(`${d.report.rows} comuni importati, ${d.report.simple} aliquote semplici e ${d.report.needsReview+d.report.pending} da verificare. Acquisizione: ${d.retrievedAt??'non indicata'}.`);}
    } catch { this.mefInfo.set('Il catalogo comunale non è raggiungibile. Nessuna aliquota è mostrata.'); }
  }
}
