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
        <p>Il budget e il comparatore tra città usano gli importi inseriti nel browser. L'IRPEF lorda e la stima del netto prima delle addizionali applicano regole nazionali 2026. Per l'inflazione è disponibile il collegamento Eurostat; per le fasce regionali il Worker legge il CSV MEF 2026. Le spese familiari ISTAT 2025 sono tratte dal comunicato ufficiale.</p>
        <a routerLink="/irpef-2026" class="text-link">Apri il calcolo IRPEF <span aria-hidden="true">↗</span></a>
      </section>
      <section class="method-card" aria-labelledby="missing-data-title">
        <div class="method-symbol method-symbol-amber" aria-hidden="true">!</div>
        <h2 id="missing-data-title">Cosa non è ancora disponibile</h2>
        <p>Il confronto tra due comuni è disponibile con le tue cifre, ma non esiste ancora un catalogo completo di prezzi locali automatici. La stima della RAL integra le addizionali comunali semplici e sei profili regionali verificati; negli altri casi il risultato locale resta parziale. Per OMI è disponibile un primo indicatore aggregato ricavato da quotazioni di Milano (secondo semestre 2025). Per gli altri comuni puoi consultare la mappa ufficiale e riportare manualmente i valori per zona; non abbiamo una banca dati immobiliare nazionale importata. Per i carburanti sono disponibili prezzi provinciali aggregati, non valori per singolo comune. Il comune selezionato nel budget non altera ancora il risultato.</p>
      </section>
    </div>
    <section class="container sources-section" aria-labelledby="sources-title">
      <span class="eyebrow eyebrow-subtle">I NOSTRI RIFERIMENTI</span>
      <h2 id="sources-title">Fonti ufficiali e integrazioni</h2>
      <p class="sources-lead">Alcune fonti sono già collegate, altre richiedono ancora validazione. La disponibilità dei dati e le licenze di riutilizzo devono essere controllate prima di un'integrazione automatica.</p>
      <div class="sources-table-wrap">
        <table>
          <thead><tr><th scope="col">Fonte</th><th scope="col">Informazione</th><th scope="col">Stato</th></tr></thead>
          <tbody>
            <tr><td><a href="https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.riduzione-irpef-e-incremento-delle-maggiorazioni-sociali.html" target="_blank" rel="noopener noreferrer">INPS ↗</a></td><td>Modifica dell'aliquota intermedia IRPEF 2026</td><td><span class="status-tag ready">Regola applicata</span></td></tr>
            <tr><td><a href="https://temi.camera.it/temi/19_tl18_irpef.html" target="_blank" rel="noopener noreferrer">Camera dei Deputati ↗</a></td><td>Scaglioni nazionali e detrazioni</td><td><span class="status-tag ready">Fonte consultata</span></td></tr>
            <tr><td><a href="https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/tabella.htm" target="_blank" rel="noopener noreferrer">MEF ↗</a></td><td>Addizionali comunali IRPEF</td><td><span class="status-tag ready">3.294 aliquote semplici revisionate</span></td></tr>
            <tr><td><a href="https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/tabella.htm" target="_blank" rel="noopener noreferrer">MEF regionali ↗</a></td><td>Righe e fasce MEF 2026 con calcolo progressivo solo per sei profili revisionati</td><td><span class="status-tag ready">API CSV con verifica</span></td></tr>
            <tr><td><a href="https://ec.europa.eu/eurostat/web/hicp/information-data" target="_blank" rel="noopener noreferrer">Eurostat ↗</a></td><td>IPCA: variazione prezzi annuale dell'Italia, API prc_hicp_minr</td><td><span class="status-tag ready">API predisposta</span></td></tr>
            <tr><td><a href="https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/" target="_blank" rel="noopener noreferrer">ISTAT ↗</a></td><td>Spesa delle famiglie, anno 2025: dati nazionali e subset regionale</td><td><span class="status-tag ready">Dataset pubblico versionato</span></td></tr>
            <tr><td><a href="https://press.regione.puglia.it/web/ufficio-statistico/-/codacons.-i-prezzi-di-beni-e-servizi-nelle-principali-citta-italiane.-anno-2025" target="_blank" rel="noopener noreferrer">CODACONS · Regione Puglia ↗</a></td><td>Paniere campione 2025 per sei città citate; non spesa mensile</td><td><span class="status-tag ready">Campione pubblicato</span></td></tr>
            <tr><td><a href="https://optenergy.it/dati/" target="_blank" rel="noopener noreferrer">optenergy / MIMIT ↗</a></td><td>Mediane giornaliere di benzina e gasolio self per provincia, aggregazioni optenergy su dati aperti MIMIT (CC BY 4.0), con numero di impianti e quartili. Non prezzi comunali.</td><td><span class="status-tag ready">Snapshot provinciale aggiornabile</span></td></tr>
            <tr><td><a href="https://www.comune.arezzo.it/tari-tassa-sui-rifiuti-2026" target="_blank" rel="noopener noreferrer">Comune Arezzo · TARI 2026 ↗</a></td><td>Solo quota comunale base per 1 occupante; altre imposte e componenti escluse.</td><td><span class="status-tag ready">Arezzo soltanto</span></td></tr>
            <tr><td><a href="https://nuoveacque.it/tariffe-acqua/" target="_blank" rel="noopener noreferrer">Nuove Acque · 2026 ↗</a> / <a href="https://www.publiacqua.it/sites/publiacqua/files/tariffe_2026.pdf" target="_blank" rel="noopener noreferrer">Publiacqua ↗</a></td><td>Scaglioni acqua, fognatura, depurazione e quote fisse per un residente: Arezzo, Firenze, Prato e Pistoia. Altre città non coperte.</td><td><span class="status-tag ready">4 capoluoghi</span></td></tr>
            <tr><td><a href="https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-mensile" target="_blank" rel="noopener noreferrer">Autolinee Toscane · abbonamenti ↗</a></td><td>Abbonamento mensile e annuale ordinario nei 10 capoluoghi toscani.</td><td><span class="status-tag ready">10 capoluoghi</span></td></tr>
            <tr><td><a href="https://www.arera.it/comunicati-stampa/dettaglio/elettricit%C3%A0-maggior-tutela-373-nel-iv-trimestre-2026-per-i-clienti-vulnerabili" target="_blank" rel="noopener noreferrer">ARERA · riferimento elettrico 2026 ↗</a></td><td>Spesa annuale indicativa del solo cliente tipo vulnerabile in Maggior Tutela; non bolletta del mercato libero. Gas tenuto come ipotesi, prezzo CMEM non usato come bolletta completa.</td><td><span class="status-tag ready">Riferimento nazionale, non locale</span></td></tr>
            <tr><td><a href="https://www.regione.toscana.it/documents/d/guest/abitare-in-toscana2025_v3_interattivo" target="_blank" rel="noopener noreferrer">Regione Toscana · Abitare in Toscana 2025 ↗</a></td><td>Tabella 2.2, pagina 35: canoni medi dei nuovi contratti 2024 per i 10 comuni capoluogo, separati per tipo di contratto; valori €/m²/anno, non canoni 2026</td><td><span class="status-tag ready">10 capoluoghi · storico</span></td></tr>
            <tr><td><a href="https://dati.comune.milano.it/dataset/ds3024-quotazioni-immobiliari-omi-locazione-semestre-2025-2" target="_blank" rel="noopener noreferrer">Comune di Milano · Open Data OMI ↗</a></td><td>Benchmark derivato delle quotazioni di abitazioni civili in 40 zone, semestre 2025/2. Mediana dei limiti di zona, non media dei contratti.</td><td><span class="status-tag ready">Solo Milano · storico</span></td></tr>
            <tr><td><a href="https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm" target="_blank" rel="noopener noreferrer">Agenzia delle Entrate ↗</a></td><td>Quotazioni OMI per zone immobiliari</td><td><span class="status-tag ready">Consultazione e stima manuale</span></td></tr>
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
