import { afterNextRender, Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <a href="#main-content" class="skip-link">Vai al contenuto principale</a>
    <header class="site-header">
      <div class="container header-inner">
        <a routerLink="/" class="brand" aria-label="QuantoCostaVivere, homepage">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 36 36" focusable="false"><path d="m7 23 8-11 6 8 9-14"/><path d="M7 29h22"/></svg>
          </span>
          <span>quanto<span class="brand-accent">costa</span><span class="brand-sub">vivere</span></span>
        </a>
        <nav class="nav-links" aria-label="Navigazione principale">
          <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{exact:true}">Budget</a>
          <a routerLink="/confronta-citta" routerLinkActive="is-active">Confronta città</a>
          <a routerLink="/costo-vita-firenze-persona-sola" routerLinkActive="is-active">Stima Firenze</a>
          <a routerLink="/irpef-2026" routerLinkActive="is-active">IRPEF 2026</a>
          <a routerLink="/stipendio-netto-2026" routerLinkActive="is-active">RAL → netto</a>
          <a routerLink="/inflazione" routerLinkActive="is-active">Inflazione</a>
          <a routerLink="/spese-famiglie" routerLinkActive="is-active">Dati ISTAT</a>
          <a routerLink="/addizionali-regionali" routerLinkActive="is-active">Regioni</a>
          <a routerLink="/fonti-e-metodo" routerLinkActive="is-active">Fonti e metodo</a>
        </nav>
        <span class="header-note"><span class="note-dot" aria-hidden="true"></span>Chiaro, senza registrazione</span>
      </div>
    </header>
    <main id="main-content" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer">
      <div class="container footer-inner">
        <div>
          <strong>QuantoCostaVivere</strong>
          <p>Numeri comprensibili. Decisioni più consapevoli.</p>
        </div>
        <nav aria-label="Link nel piè di pagina">
          <a routerLink="/">Budget</a>
          <a routerLink="/irpef-2026">IRPEF 2026</a>
          <a routerLink="/inflazione">Inflazione</a>
          <a routerLink="/stipendio-netto-2026">Stipendio 2026</a>
          <a routerLink="/confronta-citta">Confronta città</a>
          <a routerLink="/costo-vita-firenze-persona-sola">Costo della vita a Firenze</a>
          <a routerLink="/addizionali-comunali">Addizionali comunali</a>
          <a routerLink="/addizionali-regionali">Addizionali regionali</a>
          <a routerLink="/spese-famiglie">Spesa delle famiglie</a>
          <a routerLink="/quotazioni-omi">Affitti OMI</a>
          <a routerLink="/fonti-e-metodo">Fonti e limiti</a>
        </nav>
        <small>© 2026 · Prototipo informativo, non consulenza fiscale.</small>
      </div>
    </footer>

    <button type="button" class="guide-launcher" (click)="openGuide()"
      aria-haspopup="dialog" aria-controls="site-guide-dialog"
      aria-label="Apri la guida alle funzionalità di QuantoCostaVivere">
      <span class="guide-launcher-symbol" aria-hidden="true">?</span>
      <span>Come funziona</span>
    </button>

    <dialog #guideDialog id="site-guide-dialog" class="site-guide"
      aria-labelledby="site-guide-title" aria-describedby="site-guide-intro"
      (click)="onDialogClick($event)">
      <div class="site-guide-shell">
        <header class="site-guide-header">
          <div>
            <p class="site-guide-eyebrow">GUIDA RAPIDA · QUANTOCOSTAVIVERE</p>
            <h2 id="site-guide-title">Cosa puoi fare su questo sito?</h2>
            <p id="site-guide-intro">Scegli uno strumento, parti dai valori disponibili e personalizzali.
              Per ogni importo controlla sempre se è una tariffa verificata oppure una stima.</p>
          </div>
          <button type="button" class="site-guide-dismiss" (click)="closeGuide()"
            aria-label="Chiudi la guida" title="Chiudi la guida">×</button>
        </header>

        <div class="site-guide-content">
          <section aria-labelledby="site-guide-steps">
            <h3 id="site-guide-steps">Inizia in quattro passaggi</h3>
            <ol class="site-guide-steps">
              <li><span class="site-guide-step-number" aria-hidden="true">1</span><span><strong>Scegli una funzione</strong><small>Budget, confronto città, stipendio, tasse o dati economici.</small></span></li>
              <li><span class="site-guide-step-number" aria-hidden="true">2</span><span><strong>Imposta il tuo caso</strong><small>Indica le città e, se previste, metratura, consumi e numero di occupanti.</small></span></li>
              <li><span class="site-guide-step-number" aria-hidden="true">3</span><span><strong>Controlla i dati</strong><small>Verifica periodo, fonte e attendibilità prima di interpretare il totale.</small></span></li>
              <li><span class="site-guide-step-number" aria-hidden="true">4</span><span><strong>Correggi le cifre</strong><small>Se conosci spese reali, sostituisci i valori suggeriti: il risultato è personale.</small></span></li>
            </ol>
          </section>

          <section aria-labelledby="site-guide-features">
            <h3 id="site-guide-features">Le funzionalità disponibili</h3>
            <div class="site-guide-feature-grid">
              <a routerLink="/confronta-citta" (click)="closeGuide()" class="site-guide-feature">
                <span class="site-guide-feature-icon" aria-hidden="true">↔</span>
                <strong>Confronta due città</strong>
                <span>Seleziona i comuni, modifica affitto, utenze e spese e confronta i budget mensili. Per i capoluoghi toscani trovi suggerimenti automatici, TARI e consumi simulati.</span>
                <em>Apri confronto →</em>
              </a>
              <a routerLink="/" (click)="closeGuide()" class="site-guide-feature">
                <span class="site-guide-feature-icon" aria-hidden="true">€</span>
                <strong>Calcola il budget</strong>
                <span>Inserisci entrate e spese mensili, oppure modifica i dati iniziali di esempio, per vedere uscite e disponibilità residua.</span>
                <em>Apri budget →</em>
              </a>
              <a routerLink="/costo-vita-firenze-persona-sola" (click)="closeGuide()" class="site-guide-feature">
                <span class="site-guide-feature-icon" aria-hidden="true">⌂</span>
                <strong>Stima per Firenze</strong>
                <span>Consulta un esempio guidato per una persona in affitto, con spiegazioni su costi locali e importi ipotetici.</span>
                <em>Apri stima →</em>
              </a>
              <a routerLink="/stipendio-netto-2026" (click)="closeGuide()" class="site-guide-feature">
                <span class="site-guide-feature-icon" aria-hidden="true">%</span>
                <strong>Da RAL a netto</strong>
                <span>Indica retribuzione lorda e parametri richiesti. Il calcolo locale è completo solo dove le addizionali sono disponibili e verificate.</span>
                <em>Calcola stipendio →</em>
              </a>
              <a routerLink="/irpef-2026" (click)="closeGuide()" class="site-guide-feature">
                <span class="site-guide-feature-icon" aria-hidden="true">∑</span>
                <strong>IRPEF e addizionali</strong>
                <span>Simula l’IRPEF nazionale e consulta separatamente le aliquote comunali e regionali, con i limiti dei dati pubblicati.</span>
                <em>Apri IRPEF →</em>
              </a>
              <a routerLink="/inflazione" (click)="closeGuide()" class="site-guide-feature">
                <span class="site-guide-feature-icon" aria-hidden="true">↗</span>
                <strong>Inflazione e spese ISTAT</strong>
                <span>Esplora gli indicatori Eurostat e le rilevazioni ISTAT sulle famiglie: sono dati di contesto, non la tua spesa effettiva.</span>
                <em>Vedi inflazione →</em>
              </a>
              <a routerLink="/quotazioni-omi" (click)="closeGuide()" class="site-guide-feature">
                <span class="site-guide-feature-icon" aria-hidden="true">m²</span>
                <strong>Affitti e quotazioni OMI</strong>
                <span>Usa l’intervallo €/m² pubblicato dall’Agenzia delle Entrate per stimare un canone: scegli tu zona, tipologia e superficie.</span>
                <em>Apri OMI →</em>
              </a>
              <a routerLink="/stato-dati" (click)="closeGuide()" class="site-guide-feature">
                <span class="site-guide-feature-icon" aria-hidden="true">i</span>
                <strong>Fonti e stato dei dati</strong>
                <span>Controlla disponibilità, aggiornamento e provenienza. Non tutti i prezzi si aggiornano automaticamente e non tutte le città hanno la stessa copertura.</span>
                <em>Verifica i dati →</em>
              </a>
            </div>
          </section>

          <section class="site-guide-legend" aria-labelledby="site-guide-legend-title">
            <h3 id="site-guide-legend-title">Legenda: come leggere le cifre</h3>
            <div class="site-guide-legend-grid">
              <p><span class="site-guide-dot dot-official" aria-hidden="true"></span><strong>Tariffa o dato osservato</strong><br>Proviene da una fonte identificata, ma verifica sempre l’anno e che il tuo caso rientri nei requisiti.</p>
              <p><span class="site-guide-dot dot-derived" aria-hidden="true"></span><strong>Indicatore derivato o storico</strong><br>È ricavato da una rilevazione; non equivale necessariamente al prezzo di oggi.</p>
              <p><span class="site-guide-dot dot-estimate" aria-hidden="true"></span><strong>Stima / scenario</strong><br>È un’ipotesi da personalizzare. Le TARI di Firenze, Grosseto, Massa e Prato sono stime da comuni di riferimento, non tariffe ufficiali.</p>
              <p><span class="site-guide-dot dot-missing" aria-hidden="true"></span><strong>Dato non disponibile</strong><br>Non significa costo zero: inserisci il valore reale se lo conosci.</p>
            </div>
            <p class="site-guide-footnote">I risultati sono indicativi, non preventivi né consulenza fiscale.
              Il confronto città usa anche affitti storici 2024 o prezzi richiesti negli annunci 2026: sono misure differenti.
              <a routerLink="/fonti-e-metodo" (click)="closeGuide()">Leggi fonti e metodo</a>.</p>
          </section>
        </div>

        <footer class="site-guide-actions">
          <span>La guida ricompare a ogni nuova apertura del sito e puoi riaprirla con «Come funziona».</span>
          <button type="button" class="button-primary" (click)="closeGuide()">Ho capito, inizia</button>
        </footer>
      </div>
    </dialog>
  `,
  styles: [`
    .site-header { background: rgba(255,255,255,.96); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 20; }
    .header-inner { min-height: 78px; display: flex; align-items: center; gap: 30px; }
    .brand { display: inline-flex; gap: 10px; align-items: center; font-size: 1.18rem; letter-spacing: -.045em; font-weight: 800; color: var(--navy); white-space: nowrap; text-decoration: none; }
    .brand-mark { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: var(--navy); }
    .brand-mark svg { width: 29px; height: 29px; fill: none; stroke: #9be6cd; stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; }
    .brand-accent { color: var(--blue); }
    .brand-sub { font-weight: 500; }
    .nav-links { display: flex; gap: 6px; margin-left: auto; align-items: center; }
    .nav-links a { padding: 10px 14px; border-radius: 10px; font-size: .9rem; font-weight: 650; text-decoration: none; color: var(--text-soft); white-space: nowrap; }
    .nav-links a:hover, .nav-links a.is-active { background: #eef4fd; color: var(--navy); }
    .header-note { color: #577268; display: flex; align-items: center; gap: 7px; font-size: .78rem; white-space: nowrap; border-left: 1px solid var(--line); padding-left: 22px; }
    .note-dot { width: 8px; height: 8px; background: #23a47a; border-radius: 50%; }
    .guide-launcher { position: fixed; z-index: 45; right: max(17px, env(safe-area-inset-right)); bottom: max(18px, env(safe-area-inset-bottom)); display: inline-flex; align-items: center; gap: 9px; border: 1px solid #aac4ec; border-radius: 999px; padding: 10px 16px 10px 10px; color: #fff; background: #245bd5; box-shadow: 0 7px 28px rgba(20,52,96,.25); font-weight: 750; font-size: .86rem; }
    .guide-launcher:hover { background: #1949b5; }
    .guide-launcher-symbol { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%; background: #fff; color: #1949b5; font-weight: 900; font-size: 1.05rem; }
    .site-guide { width: min(890px, calc(100vw - 28px)); max-height: min(90dvh, 900px); margin: auto; padding: 0; border: 0; border-radius: 19px; color: var(--text); background: #fff; box-shadow: 0 28px 90px rgba(4,26,53,.34); overflow-y: auto; overscroll-behavior: contain; }
    .site-guide:not([open]) { display: none; }
    .site-guide::backdrop { background: rgba(9,30,51,.68); }
    .site-guide-shell { display: flex; flex-direction: column; }
    .site-guide-header { display: flex; align-items: flex-start; gap: 20px; justify-content: space-between; padding: 27px 29px 19px; background: linear-gradient(135deg,#f4f8ff,#ecf4fc); border-bottom: 1px solid var(--line); }
    .site-guide-eyebrow { margin: 0 0 8px; color: #245bd5; font-size: .71rem; letter-spacing: .12em; font-weight: 850; }
    .site-guide-header h2 { font-size: clamp(1.5rem,3vw,2rem); margin: 0 0 9px; }
    .site-guide-header p:last-child { margin: 0; font-size: .91rem; max-width: 695px; line-height: 1.55; }
    .site-guide-dismiss { flex: 0 0 auto; border: 1px solid #cbd8e9; background: white; color: #1b385a; border-radius: 10px; font-size: 1.5rem; line-height: 1; padding: 5px 12px 8px; }
    .site-guide-dismiss:hover { background: #e5effe; }
    .site-guide-content { padding: 22px 29px 15px; }
    .site-guide-content section { margin-bottom: 25px; }
    .site-guide-content h3 { font-size: 1.05rem; margin: 0 0 13px; letter-spacing: -.02em; }
    .site-guide-steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px 16px; }
    .site-guide-steps li { display: flex; align-items: flex-start; gap: 9px; }
    .site-guide-step-number { flex-shrink: 0; display: grid; place-items: center; width: 25px; height: 25px; color: #145194; background: #eaf2fe; border-radius: 50%; font-size: .73rem; font-weight: 800; }
    .site-guide-steps strong { display: block; color: var(--navy); font-size: .82rem; }
    .site-guide-steps small { display: block; margin-top: 2px; color: #63748a; font-size: .76rem; line-height: 1.5; }
    .site-guide-feature-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
    .site-guide-feature { display: grid; grid-template-columns: 35px minmax(0,1fr); gap: 3px 10px; padding: 14px 13px; border: 1px solid #dfe8f3; border-radius: 12px; text-decoration: none; color: #394e65; background: #fff; }
    .site-guide-feature:hover { border-color: #98b7f0; background: #f6f9ff; }
    .site-guide-feature-icon { grid-row: 1/4; place-self: start center; background: #e7f0fd; color: #245bd5; display: grid; place-items: center; border-radius: 9px; height: 33px; width: 33px; font-size: 1.02rem; font-weight: 850; }
    .site-guide-feature strong { color: #163750; font-size: .84rem; }
    .site-guide-feature>span:not(.site-guide-feature-icon) { font-size: .75rem; line-height: 1.55; }
    .site-guide-feature em { color: #245bd5; font-size: .76rem; font-style: normal; font-weight: 750; margin-top: 4px; }
    .site-guide-legend { padding: 19px 20px 5px; border: 1px solid var(--line); border-radius: 13px; background: #f7faff; }
    .site-guide-legend-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 6px 16px; }
    .site-guide-legend-grid p { position: relative; padding-left: 21px; margin: 0 0 14px; font-size: .76rem; line-height: 1.6; }
    .site-guide-legend-grid strong { color: #233a53; font-size: .8rem; }
    .site-guide-dot { position: absolute; left: 2px; top: 5px; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(0,0,0,.12); }
    .dot-official { background: #0a8c65; } .dot-derived { background: #3574d8; }
    .dot-estimate { background: #d89114; } .dot-missing { background: #b6c2d0; }
    .site-guide-footnote { font-size: .73rem; margin: 0 0 13px; line-height: 1.6; }
    .site-guide-actions { position: sticky; bottom: 0; z-index: 1; display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 15px 29px; border-top: 1px solid var(--line); background: #fff; }
    .site-guide-actions span { font-size: .74rem; line-height: 1.5; color: #687b90; }
    .site-guide-actions .button-primary { border: none; padding: 11px 17px; white-space: nowrap; font-size: .82rem; box-shadow: none; }
    .site-footer { margin-top: 96px; padding: 32px 0; border-top: 1px solid var(--line); background: #fff; }
    .footer-inner { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 18px; }
    .footer-inner strong { color: var(--navy); }
    .footer-inner p { margin: 4px 0 0; font-size: .82rem; }
    .footer-inner nav { display: flex; gap: 20px; flex-wrap: wrap; font-size: .85rem; }
    .footer-inner a { color: var(--text-soft); }
    .footer-inner small { width: 100%; color: var(--muted); font-size: .78rem; }
    @media(max-width: 1150px) { .header-note { display:none; } }
    @media(max-width: 900px) { .header-inner { flex-wrap:wrap; } .nav-links { width:100%; margin-left:0; overflow-x:auto; } }
    @media(max-width: 700px) {
      .guide-launcher { right: 13px; bottom: 13px; padding: 8px 11px 8px 8px; font-size: .79rem; }
      .site-guide { width: calc(100vw - 16px); max-height: calc(100dvh - 22px); border-radius: 14px; }
      .site-guide-header { padding: 20px 17px 16px; gap: 10px; }
      .site-guide-content { padding: 18px 17px 4px; }
      .site-guide-steps { grid-template-columns: 1fr; }
      .site-guide-feature-grid,.site-guide-legend-grid { grid-template-columns: 1fr; }
      .site-guide-actions { padding: 12px 17px; align-items: flex-start; flex-direction: column; gap: 10px; }
      .site-guide-actions .button-primary { width: 100%; }
    } 
    @media(max-width: 700px) {
      .header-inner { flex-wrap: wrap; gap: 6px; padding-block: 12px 8px; }
      .brand { width: 100%; }
      .nav-links { width: 100%; margin-left: 0; overflow-x:auto; padding-bottom: 2px; gap: 4px; }
      .nav-links a { font-size: .83rem; padding: 10px 11px; }
      .site-footer { margin-top: 56px; }
    }
  `]
})
export class AppComponent {
  @ViewChild('guideDialog') private guideDialog?: ElementRef<HTMLDialogElement>;

  constructor() {
    // One opening per full document load (including reloads and direct deep links).
    // Angular in-app route changes do not re-open an already dismissed guide.
    afterNextRender(() => this.openGuide());
  }

  openGuide(): void {
    const dialog = this.guideDialog?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  }

  closeGuide(): void {
    const dialog = this.guideDialog?.nativeElement;
    if (dialog?.open) dialog.close();
  }

  onDialogClick(event: MouseEvent): void {
    // Explicit close via button, Escape, or a direct click on the backdrop.
    if (event.target === this.guideDialog?.nativeElement) this.closeGuide();
  }
}
