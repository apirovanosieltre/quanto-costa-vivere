import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-method',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-hero container">
      <a routerLink="/" class="back-link"><span aria-hidden="true">←</span> Torna al budget</a>
      <span class="eyebrow eyebrow-subtle">TRASPARENZA PRIMA DI TUTTO</span>
      <h1>Da dove arrivano <span>i nostri numeri?</span></h1>
      <p>La fiducia si costruisce rendendo ogni dato verificabile e distinguendo chiaramente ciò che sappiamo da ciò che stiamo stimando.</p>
    </section>
    <div class="container methodology-layout">
      <section class="method-card" aria-labelledby="current-data-title">
        <div class="method-symbol" aria-hidden="true">✓</div>
        <h2 id="current-data-title">Cosa funziona già</h2>
        <p>Il budget usa gli importi inseriti nel browser. L'IRPEF lorda e la stima del netto prima delle addizionali applicano regole nazionali 2026. Per l'inflazione è pronto il collegamento all'API Eurostat (da verificare in Cloudflare).</p>
        <a routerLink="/irpef-2026" class="text-link">Apri il calcolo IRPEF <span aria-hidden="true">↗</span></a>
      </section>
      <section class="method-card" aria-labelledby="missing-data-title">
        <div class="method-symbol method-symbol-amber" aria-hidden="true">!</div>
        <h2 id="missing-data-title">Cosa non è ancora disponibile</h2>
        <p>I prezzi medi della vita per comune, gli affitti per zona e le addizionali fiscali locali non sono ancora pubblicati come dati verificati. Il selettore del comune serve a preparare le future funzioni e oggi non altera il calcolo.</p>
      </section>
    </div>
    <section class="container sources-section" aria-labelledby="sources-title">
      <span class="eyebrow eyebrow-subtle">I NOSTRI RIFERIMENTI</span>
      <h2 id="sources-title">Fonti ufficiali da utilizzare</h2>
      <p class="sources-lead">Alcune fonti sono già usate per le regole fiscali, altre sono pianificate. La disponibilità dei dati e le licenze di riutilizzo devono essere controllate prima di un'integrazione automatica.</p>
      <div class="sources-table-wrap">
        <table>
          <thead><tr><th scope="col">Fonte</th><th scope="col">Informazione</th><th scope="col">Stato</th></tr></thead>
          <tbody>
            <tr><td><a href="https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.riduzione-irpef-e-incremento-delle-maggiorazioni-sociali.html" target="_blank" rel="noopener noreferrer">INPS ↗</a></td><td>Modifica dell'aliquota intermedia IRPEF 2026</td><td><span class="status-tag ready">Regola applicata</span></td></tr>
            <tr><td><a href="https://temi.camera.it/temi/19_tl18_irpef.html" target="_blank" rel="noopener noreferrer">Camera dei Deputati ↗</a></td><td>Scaglioni nazionali e detrazioni</td><td><span class="status-tag ready">Fonte consultata</span></td></tr>
            <tr><td><a href="https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/tabella.htm" target="_blank" rel="noopener noreferrer">MEF ↗</a></td><td>Addizionali comunali IRPEF</td><td><span class="status-tag planned">Importatore con revisione</span></td></tr>
            <tr><td><a href="https://ec.europa.eu/eurostat/web/hicp/information-data" target="_blank" rel="noopener noreferrer">Eurostat ↗</a></td><td>IPCA: variazione prezzi annuale dell'Italia, API prc_hicp_minr</td><td><span class="status-tag ready">API predisposta</span></td></tr>
            <tr><td><a href="https://www.istat.it/" target="_blank" rel="noopener noreferrer">ISTAT ↗</a></td><td>Prezzi e statistiche sul costo della vita</td><td><span class="status-tag planned">Da integrare</span></td></tr>
            <tr><td><a href="https://www.agenziaentrate.gov.it/portale/" target="_blank" rel="noopener noreferrer">Agenzia delle Entrate ↗</a></td><td>Quotazioni OMI per zone immobiliari</td><td><span class="status-tag planned">Licenza e dataset da verificare</span></td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="container principles" aria-labelledby="principles-title">
      <h2 id="principles-title">Le regole del progetto</h2>
      <div class="principles-grid">
        <div><span>01</span><h3>Niente precisione finta</h3><p>Un dato non disponibile non diventa una media inventata.</p></div>
        <div><span>02</span><h3>Fonte e periodo visibili</h3><p>Ogni statistica territoriale avrà provenienza e data di riferimento.</p></div>
        <div><span>03</span><h3>Accessibile di base</h3><p>Navigazione da tastiera, etichette esplicite, contrasto elevato e layout mobile.</p></div>
        <div><span>04</span><h3>Privacy semplice</h3><p>Nella versione iniziale, gli importi non vengono inviati a server né salvati online.</p></div>
      </div>
    </section>
  `
})
export class MethodComponent {}
