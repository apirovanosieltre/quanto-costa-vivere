import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface City { name: string; region: string; province: string; }

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="hero container">
      <div class="hero-copy">
        <span class="eyebrow"><span class="eyebrow-icon" aria-hidden="true">✦</span> FINANZE PERSONALI, SENZA COMPLICAZIONI</span>
        <h1>Quanto ti resta<br> <span>per vivere bene?</span></h1>
        <p class="hero-lead">Metti in ordine le tue spese, scopri quanto puoi risparmiare e capisci davvero dove finiscono i tuoi soldi.</p>
        <div class="hero-actions">
          <a class="button-primary" href="#calcolatore">Calcola il tuo budget <span aria-hidden="true">→</span></a>
          <a class="text-link" routerLink="/confronta-citta">Confronta due città <span aria-hidden="true">↗</span></a>
          <a class="text-link" routerLink="/fonti-e-metodo">Come funzionano i calcoli <span aria-hidden="true">↗</span></a>
        </div>
        <div class="hero-benefits" aria-label="Caratteristiche del servizio">
          <span><i aria-hidden="true">✓</i> Gratis e senza account</span>
          <span><i aria-hidden="true">✓</i> Dati inseriti solo nel browser</span>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="decoration-grid"></div>
        <div class="preview-main">
          <span class="preview-caption">IL TUO BUDGET IN UN COLPO D'OCCHIO</span>
          <div class="preview-label">Disponibilità mensile</div>
          <div class="preview-amount">+ 430 <span>€</span></div>
          <div class="preview-track"><span></span></div>
          <div class="preview-rows"><span>Entrate</span><b>2.000 €</b></div>
          <div class="preview-rows"><span>Uscite</span><b>1.570 €</b></div>
        </div>
        <div class="float-chip float-chip-one"><span>↗</span> Spese sotto controllo</div>
        <div class="float-chip float-chip-two">◉ &nbsp; Tutto più chiaro</div>
        <small class="visual-hint">Anteprima con cifre di esempio</small>
      </div>
    </section>

    <div class="container">
      <div class="trust-strip">
        <div class="trust-item"><span class="trust-symbol" aria-hidden="true">01</span><span><b>Controlla le entrate</b><small>Parti dal tuo netto reale</small></span></div>
        <div class="trust-item"><span class="trust-symbol" aria-hidden="true">02</span><span><b>Inserisci le spese</b><small>Personalizza ogni importo</small></span></div>
        <div class="trust-item"><span class="trust-symbol" aria-hidden="true">03</span><span><b>Leggi il risultato</b><small>Capisci quanto ti rimane</small></span></div>
      </div>
    </div>

    <section id="calcolatore" class="calculator-section container" aria-labelledby="calculator-heading">
      <div class="section-heading">
        <div>
          <span class="eyebrow eyebrow-subtle">STRUMENTO GRATUITO</span>
          <h2 id="calculator-heading">Il tuo budget, nero su bianco.</h2>
          <p>Modifica gli importi e guarda i risultati aggiornarsi immediatamente.</p>
        </div>
        <span class="small-badge"><span class="badge-dot" aria-hidden="true"></span> Calcolo nel browser</span>
      </div>

      <div class="calculator-grid">
        <div class="form-panel">
          <div class="panel-title-row">
            <div><h3>Le tue informazioni</h3><p>Iniziamo dalle basi</p></div>
            <button type="button" class="ghost-button" (click)="reset()" aria-label="Ripristina i valori dimostrativi">Ripristina</button>
          </div>
          <div class="panel-section">
            <label class="field-label" for="city">Comune di riferimento</label>
            <div class="select-wrap">
              <select id="city" [ngModel]="city()" (ngModelChange)="city.set($event)">
                @for (c of cities; track c.name) {
                  <option [value]="c.name">{{ c.name }} ({{ c.province }})</option>
                }
              </select>
            </div>
            <p class="field-hint">Il comune è indicativo: i dati territoriali ufficiali saranno collegati in una fase successiva.</p>
          </div>
          <div class="panel-section">
            <div class="field-label-row"><label class="field-label" for="net-income">Entrate nette al mese</label><span>€ / mese</span></div>
            <div class="number-field"><span class="prefix" aria-hidden="true">€</span><input id="net-income" type="number" min="0" max="1000000" step="50" inputmode="decimal" [ngModel]="income()" (ngModelChange)="income.set(clamp($event))" aria-describedby="income-hint"></div>
            <p class="field-hint" id="income-hint">Inserisci il netto realmente disponibile, non la RAL.</p>
          </div>
          <div class="form-divider"></div>
          <div class="panel-title-row panel-title-sub"><div><h3>Le spese mensili</h3><p>Quanto spendi mediamente?</p></div></div>
          <div class="fields-grid">
            <div class="field"><label class="field-label" for="home-cost">Casa / affitto / mutuo</label><div class="number-field"><span class="prefix" aria-hidden="true">€</span><input id="home-cost" type="number" min="0" step="10" [ngModel]="housing()" (ngModelChange)="housing.set(clamp($event))"></div></div>
            <div class="field"><label class="field-label" for="bills">Bollette e utenze</label><div class="number-field"><span class="prefix" aria-hidden="true">€</span><input id="bills" type="number" min="0" step="10" [ngModel]="utilities()" (ngModelChange)="utilities.set(clamp($event))"></div></div>
            <div class="field"><label class="field-label" for="food">Spesa alimentare</label><div class="number-field"><span class="prefix" aria-hidden="true">€</span><input id="food" type="number" min="0" step="10" [ngModel]="food()" (ngModelChange)="food.set(clamp($event))"></div></div>
            <div class="field"><label class="field-label" for="transport">Trasporti</label><div class="number-field"><span class="prefix" aria-hidden="true">€</span><input id="transport" type="number" min="0" step="10" [ngModel]="transport()" (ngModelChange)="transport.set(clamp($event))"></div></div>
            <div class="field field-full"><label class="field-label" for="other">Tempo libero e altre spese</label><div class="number-field"><span class="prefix" aria-hidden="true">€</span><input id="other" type="number" min="0" step="10" [ngModel]="other()" (ngModelChange)="other.set(clamp($event))"></div></div>
          </div>
          <div class="data-notice" role="note"><span class="notice-icon" aria-hidden="true">i</span><p><b>Simulazione personalizzata.</b> Le cifre iniziali sono esempi, non medie certificate del comune selezionato. Modificale usando le tue spese reali.</p></div>
        </div>

        <aside class="result-panel" aria-label="Riepilogo del budget mensile">
          <div class="result-top"><span>IL TUO RIEPILOGO</span><span class="result-period">MENSILE</span></div>
          <p class="result-intro">A fine mese ti rimangono</p>
          <div class="result-number" [class.is-negative]="remaining() < 0" aria-live="polite">{{ money(remaining()) }}<span> €</span></div>
          <div class="result-status" [class.is-negative]="remaining() < 0">{{ remaining() >= 0 ? 'Saldo positivo' : 'Spese superiori alle entrate' }}</div>
          <div class="result-divider"></div>
          <div class="summary-row"><span>Entrate nette</span><strong>{{ money(income()) }} €</strong></div>
          <div class="summary-row"><span>Spese totali</span><strong>− {{ money(expenses()) }} €</strong></div>
          <div class="summary-row summary-total"><span>Residuo mensile</span><strong>{{ money(remaining()) }} €</strong></div>

          <div class="chart-section">
            <div class="chart-heading"><h4>Dove vanno i tuoi soldi</h4><span>{{ expensesShare() }}% delle entrate</span></div>
            <div class="progress-stack" role="img" [attr.aria-label]="'Spese totali: ' + money(expenses()) + ' euro, ' + expensesShare() + '% delle entrate'">
              <span class="stack-housing" [style.width.%]="barWidth(housing())"></span>
              <span class="stack-utilities" [style.width.%]="barWidth(utilities())"></span>
              <span class="stack-food" [style.width.%]="barWidth(food())"></span>
              <span class="stack-transport" [style.width.%]="barWidth(transport())"></span>
              <span class="stack-other" [style.width.%]="barWidth(other())"></span>
            </div>
            <div class="chart-legend">
              <div><i class="dot dot-housing" aria-hidden="true"></i>Casa <strong>{{ money(housing()) }} €</strong></div>
              <div><i class="dot dot-utilities" aria-hidden="true"></i>Utenze <strong>{{ money(utilities()) }} €</strong></div>
              <div><i class="dot dot-food" aria-hidden="true"></i>Alimentari <strong>{{ money(food()) }} €</strong></div>
              <div><i class="dot dot-transport" aria-hidden="true"></i>Trasporti <strong>{{ money(transport()) }} €</strong></div>
              <div><i class="dot dot-other" aria-hidden="true"></i>Altro <strong>{{ money(other()) }} €</strong></div>
            </div>
          </div>
          <div class="year-card">
            <span>Proiezione a 12 mesi, a spese costanti</span>
            <strong>{{ money(remaining() * 12) }} €</strong>
            <small>Non è una previsione di risparmio garantita.</small>
          </div>
          <p class="result-footnote">Comune selezionato: <strong>{{ city() }}</strong>. Nessun parametro locale applicato in questa versione.</p>
        </aside>
      </div>
    </section>

    <section class="more-tools container" aria-labelledby="more-heading">
      <div class="more-top"><span class="eyebrow eyebrow-subtle">UN PASSO IN PIÙ</span><h2 id="more-heading">Capire il budget è solo l'inizio.</h2></div>
      <div class="tool-card-grid">
        <a class="tool-card" routerLink="/confronta-citta"><div class="tool-symbol tool-symbol-green" aria-hidden="true">↔</div><span class="tool-label">NUOVO · CONFRONTO TRA CITTÀ</span><h3>Dove conviene vivere?</h3><p>Confronta due comuni italiani con spese personalizzate, statistiche documentate e quotazioni OMI.</p><span class="tool-arrow">Confronta due città <span aria-hidden="true">↗</span></span></a>
        <a class="tool-card" routerLink="/irpef-2026"><div class="tool-symbol tool-symbol-blue" aria-hidden="true">%</div><span class="tool-label">TASSE · AGGIORNATO AL 2026</span><h3>Calcolatore IRPEF lorda</h3><p>Scopri come si suddivide il tuo imponibile nei tre scaglioni nazionali.</p><span class="tool-arrow">Apri calcolatore <span aria-hidden="true">↗</span></span></a>
        <a class="tool-card" routerLink="/stipendio-netto-2026"><div class="tool-symbol tool-symbol-green" aria-hidden="true">€</div><span class="tool-label">STIPENDIO · ANNO 2026</span><h3>RAL, netto e addizionali</h3><p>Stima il netto nazionale e, quando calcolabili, le imposte comunali e regionali con dettaglio delle fasce.</p><span class="tool-arrow">Apri simulatore <span aria-hidden="true">↗</span></span></a>
        <a class="tool-card" routerLink="/inflazione"><div class="tool-symbol tool-symbol-blue" aria-hidden="true">↗</div><span class="tool-label">API UFFICIALE EUROSTAT</span><h3>Inflazione in Italia</h3><p>Leggi la variazione annua più recente dei prezzi al consumo, dalla fonte europea.</p><span class="tool-arrow">Mostra i dati <span aria-hidden="true">↗</span></span></a>
        <a class="tool-card" routerLink="/addizionali-comunali"><div class="tool-symbol tool-symbol-green" aria-hidden="true">⌁</div><span class="tool-label">DATI MEF · DA IMPORTARE</span><h3>Addizionali comunali</h3><p>Consulta le aliquote solo quando l'importazione ufficiale è stata verificata.</p><span class="tool-arrow">Stato dataset <span aria-hidden="true">↗</span></span></a>
        <a class="tool-card" routerLink="/spese-famiglie"><div class="tool-symbol tool-symbol-blue" aria-hidden="true">▥</div><span class="tool-label">DATI ISTAT · ANNO 2025</span><h3>Spesa delle famiglie</h3><p>Confronta le statistiche nazionali e alcune medie regionali pubblicate da ISTAT.</p><span class="tool-arrow">Scopri i dati <span aria-hidden="true">↗</span></span></a>
        <a class="tool-card" routerLink="/addizionali-regionali"><div class="tool-symbol tool-symbol-green" aria-hidden="true">%</div><span class="tool-label">CSV UFFICIALE · MEF 2026</span><h3>Aliquote regionali</h3><p>Consulta aliquote, fasce ed esenzioni riportate dal MEF senza stime fiscali arbitrarie.</p><span class="tool-arrow">Consulta le fasce <span aria-hidden="true">↗</span></span></a>
        <a class="tool-card" routerLink="/quotazioni-omi"><div class="tool-symbol tool-symbol-blue" aria-hidden="true">⌂</div><span class="tool-label">AGENZIA ENTRATE · OMI</span><h3>Quotazioni degli affitti</h3><p>Interroga la mappa ufficiale OMI e calcola intervalli a partire da valori verificati.</p><span class="tool-arrow">Apri strumento <span aria-hidden="true">↗</span></span></a>
      </div>
    </section>
  `
})
export class BudgetComponent {
  readonly cities: City[] = [
    { name: 'Arezzo', province: 'AR', region: 'Toscana' },
    { name: 'Bari', province: 'BA', region: 'Puglia' },
    { name: 'Bologna', province: 'BO', region: 'Emilia-Romagna' },
    { name: 'Firenze', province: 'FI', region: 'Toscana' },
    { name: 'Genova', province: 'GE', region: 'Liguria' },
    { name: 'Milano', province: 'MI', region: 'Lombardia' },
    { name: 'Napoli', province: 'NA', region: 'Campania' },
    { name: 'Palermo', province: 'PA', region: 'Sicilia' },
    { name: 'Roma', province: 'RM', region: 'Lazio' },
    { name: 'Torino', province: 'TO', region: 'Piemonte' }
  ];
  readonly city = signal('Milano');
  readonly income = signal(2000);
  readonly housing = signal(700);
  readonly utilities = signal(180);
  readonly food = signal(320);
  readonly transport = signal(150);
  readonly other = signal(220);
  readonly expenses = computed(() => this.housing() + this.utilities() + this.food() + this.transport() + this.other());
  readonly remaining = computed(() => this.income() - this.expenses());
  readonly expensesShare = computed(() => this.income() > 0 ? Math.round(100 * this.expenses() / this.income()) : 0);
  private readonly formatter = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  money(value: number): string { return this.formatter.format(value); }
  clamp(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(number, 1000000)) : 0;
  }
  barWidth(value: number): number { return this.expenses() > 0 ? (value / this.expenses()) * 100 : 0; }
  reset(): void {
    this.city.set('Milano'); this.income.set(2000); this.housing.set(700);
    this.utilities.set(180); this.food.set(320); this.transport.set(150); this.other.set(220);
  }
}
