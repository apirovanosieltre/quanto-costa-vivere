import { Component } from '@angular/core';
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
          <a routerLink="/addizionali-comunali">Addizionali comunali</a>
          <a routerLink="/addizionali-regionali">Addizionali regionali</a>
          <a routerLink="/spese-famiglie">Spesa delle famiglie</a>
          <a routerLink="/quotazioni-omi">Affitti OMI</a>
          <a routerLink="/fonti-e-metodo">Fonti e limiti</a>
        </nav>
        <small>© 2026 · Prototipo informativo, non consulenza fiscale.</small>
      </div>
    </footer>
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
      .header-inner { flex-wrap: wrap; gap: 6px; padding-block: 12px 8px; }
      .brand { width: 100%; }
      .nav-links { width: 100%; margin-left: 0; overflow-x:auto; padding-bottom: 2px; gap: 4px; }
      .nav-links a { font-size: .83rem; padding: 10px 11px; }
      .site-footer { margin-top: 56px; }
    }
  `]
})
export class AppComponent {}
