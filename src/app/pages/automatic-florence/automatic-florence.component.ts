import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DEFAULT_FLORENCE_SOLO, estimateFlorenceSolo, foodProxySolo2025,
  type FlorenceSoloProfile, type RentContract, type TransitChoice
} from '../../core/automatic-cost-florence';

type EditableKey='groceriesEUR'|'electricityEUR'|'gasEUR'|'internetEUR'|'otherEUR';
type NumericKey=EditableKey|'areaSqm'|'waterCubicMetersPerYear';

@Component({
  selector:'app-automatic-florence',
  standalone:true,
  imports:[FormsModule,RouterLink],
  template:`
<section class="page-hero container">
  <a class="back-link" routerLink="/confronta-citta">← Torna al confronto città</a>
  <span class="eyebrow eyebrow-subtle">PROTOTIPO CON DATI DOCUMENTATI · FIRENZE</span>
  <h1>Quanto costa vivere a <span>Firenze da soli?</span></h1>
  <p>Parti da un budget già compilato. Gli importi con una fonte sono distinti dalle ipotesi di pianificazione e puoi modificare ogni cifra per adattarla al tuo caso.</p>
</section>

<section class="container auto-grid" aria-label="Calcolatore automatico Firenze persona sola">
  <div class="auto-controls">
    <div class="auto-card">
      <span class="auto-step">01 · Situazione abitativa</span>
      <h2>La casa</h2>
      <p>Applichiamo il canone medio annuo al metro quadro dei <strong>contratti registrati nel 2024 a Firenze</strong>, pubblicato dalla Regione Toscana. Non è il canone oggi richiesto negli annunci.</p>
      <div class="auto-inputs">
        <label for="fl-area">Superficie dell'appartamento (m²)</label>
        <input id="fl-area" type="number" min="15" max="300" step="5" [ngModel]="profile().areaSqm"
          (ngModelChange)="setNumber('areaSqm',$event)">
        <label for="fl-contract">Tipologia di contratto</label>
        <select id="fl-contract" [ngModel]="profile().contract" (ngModelChange)="setContract($event)">
          <option value="long">Ordinario oltre 3 anni</option>
          <option value="agreed">Canone concordato</option>
          <option value="temporary">Ordinario transitorio</option>
        </select>
      </div>
    </div>

    <div class="auto-card">
      <span class="auto-step">02 · Servizi e mobilità</span>
      <h2>Acqua e trasporto</h2>
      <p>La tariffa idrica 2026 dipende dai consumi. Per il trasporto usiamo l'abbonamento urbano ordinario, se pensi di utilizzarlo.</p>
      <div class="auto-inputs">
        <label for="fl-water">Consumo annuo d'acqua (m³)</label>
        <input id="fl-water" type="number" min="0" max="500" step="5"
          [ngModel]="profile().waterCubicMetersPerYear" (ngModelChange)="setNumber('waterCubicMetersPerYear',$event)">
        <label for="fl-transit">Come ti sposti abitualmente?</label>
        <select id="fl-transit" [ngModel]="profile().transit" (ngModelChange)="setTransit($event)">
          <option value="monthly-pass">Abbonamento urbano mensile</option>
          <option value="no-pass">Senza abbonamento (altri costi da valutare)</option>
        </select>
      </div>
    </div>

    <div class="auto-card">
      <span class="auto-step">03 · Alimentari e altri consumi</span>
      <h2>Personalizza le ipotesi</h2>
      <p>Gli alimentari partono da un proxy nazionale ISTAT: non sono una rilevazione per persona sola a Firenze. Gli altri importi sono <strong>scenari illustrativi, non prezzi di mercato verificati</strong>.</p>
      <div class="auto-inputs">
        @for(item of editableFields;track item.key) {
          <label [for]="'fl-'+item.key">{{item.label}} (€/mese)</label>
          <input type="number" inputmode="decimal" min="0" max="100000" step="5"
            [id]="'fl-'+item.key" [ngModel]="profile()[item.key]"
            (ngModelChange)="setNumber(item.key,$event)">
        }
      </div>
      <button type="button" class="auto-reset" (click)="resetGroceries()">Ripristina il proxy alimentare ISTAT: {{money(foodProxy())}} €</button>
      <p class="auto-note">Se non utilizzi gas o qualche servizio, inserisci 0. Le eventuali spese condominiali vanno considerate negli altri costi.</p>
    </div>

    <div class="auto-card">
      <span class="auto-step">04 · Il tuo reddito, se vuoi</span>
      <h2>Quanto ti rimarrebbe?</h2>
      <label for="fl-income">Reddito netto mensile (facoltativo)</label>
      <input id="fl-income" type="number" inputmode="decimal" min="0" max="100000" step="50"
        placeholder="Es. 1900" [ngModel]="profile().monthlyNetIncomeEUR"
        (ngModelChange)="setIncome($event)">
      <p class="auto-note">Il saldo appare soltanto quando inserisci il reddito. È il risultato di uno scenario, non una previsione garantita.</p>
      <button class="auto-reset" type="button" (click)="resetAll()">Ripristina lo scenario iniziale</button>
    </div>
    @if(error()){
      <p class="auto-error" role="alert">{{error()}}</p>
    }
  </div>

  <aside class="auto-result">
    <div class="auto-summary">
      <span class="auto-step auto-step-white">SIMULAZIONE PER 1 PERSONA</span>
      <h2>Budget mensile ipotetico</h2>
      <strong class="auto-total" aria-live="polite">{{money(result().monthlyScenarioTotalEUR)}} €</strong>
      <p>La somma include dati storici osservati, tariffe ufficiali, una proiezione ISTAT e ipotesi editoriali. Non è un costo medio rilevato a Firenze.</p>
      @if(result().monthlyBalanceEUR!==null) {
        <div class="auto-balance">
          <span>Saldo ipotetico con il tuo netto</span>
          <strong [class.is-negative]="result().monthlyBalanceEUR! < 0">{{money(result().monthlyBalanceEUR!)}} € / mese</strong>
        </div>
      }
    </div>
    <div class="auto-breakdown">
      <h3>Quanto del totale è supportato da dati?</h3>
      <div class="auto-split">
        <span>Osservazioni storiche + tariffe</span>
        <strong>{{money(result().observedAndTariffBasedEUR)}} €</strong>
      </div>
      <div class="auto-split">
        <span>Proiezione statistica nazionale</span>
        <strong>{{money(result().statisticalProxyEUR)}} €</strong>
      </div>
      <div class="auto-split">
        <span>Ipotesi modificabili non ufficiali</span>
        <strong>{{money(result().editorialAssumptionsEUR)}} €</strong>
      </div>
      <p class="auto-note">Il primo importo non è interamente osservato per il tuo immobile: anche m², consumo idrico e utilizzo dell'abbonamento sono scelte del profilo.</p>
    </div>

    <div class="auto-breakdown" aria-label="Dettaglio delle stime e attendibilità">
      <h3>Spese, fonti e attendibilità</h3>
      @for(line of result().lines;track line.key){
        <div class="auto-line">
          <div class="auto-line-top">
            <strong>{{line.label}}</strong>
            <strong>{{money(line.amountEUR)}} €</strong>
          </div>
          <p class="auto-line-meta">{{kindName(line.kind)}} · Attendibilità {{line.confidence}} · {{line.scope}} · {{line.referencePeriod}}</p>
          <p class="auto-line-method">{{line.method}}</p>
          @if(line.sourceUrl){
            <a [href]="line.sourceUrl" target="_blank" rel="noopener noreferrer">Fonte: {{line.sourceLabel}} ↗</a>
          } @else {
            <span class="auto-no-source">Ipotesi editoriale, nessuna rilevazione territoriale</span>
          }
        </div>
      }
    </div>
  </aside>
</section>
<section class="container auto-footer">
  <h2>Perché non diamo un unico prezzo “ufficiale” per Firenze?</h2>
  <p>Un contratto del 2024, un abbonamento 2026 e una media ISTAT nazionale misurano cose diverse. Il modello li tiene separati, espone le ipotesi e permette di sostituirle con costi reali. L'accuratezza migliorerà quando avremo dati recenti verificabili per quartiere, utenze e spesa alimentare.</p>
  <p>Il valore iniziale degli alimentari è una <strong>proiezione</strong> ottenuta applicando la quota nazionale degli alimentari di tutte le famiglie alla spesa media complessiva delle persone sole. È una semplificazione, non un'indagine sui singoli fiorentini.</p>
  <a routerLink="/confronta-citta" class="button-primary">Apri il confronto tra Firenze e altre città ↗</a>
</section>
`,
  styles:[`
    .auto-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:22px;align-items:start}
    .auto-controls{display:grid;gap:17px}
    .auto-card,.auto-breakdown{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;min-width:0}
    .auto-card h2{font-size:1.35rem;margin:8px 0}
    .auto-card>p{font-size:.87rem}
    .auto-step{font-size:.73rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--blue)}
    .auto-inputs{display:grid;grid-template-columns:1fr minmax(120px,165px);align-items:center;gap:11px 14px;margin-top:16px}
    .auto-inputs label,.auto-card>label{color:var(--navy);font-weight:650;font-size:.86rem}
    .auto-card input,.auto-card select{border:1px solid #b7c9db;padding:11px 12px;border-radius:10px;min-height:44px;width:100%;max-width:100%;color:var(--text);background:#fff}
    .auto-card>input{margin-top:12px}
    .auto-reset{background:#edf4fc;color:var(--navy);border:1px solid #c5d9eb;padding:10px 12px;border-radius:10px;font-size:.8rem;font-weight:750;margin-top:15px}
    .auto-reset:hover{background:#dcecff}
    .auto-note,.auto-no-source{color:var(--muted);font-size:.76rem;line-height:1.5}
    .auto-result{display:grid;gap:16px;min-width:0}
    .auto-summary{background:var(--navy);border-radius:18px;color:#fff;padding:28px}
    .auto-summary h2{font-size:1.35rem;color:#fff;margin:12px 0 6px}
    .auto-summary p{font-size:.82rem;color:#c4d6e5}
    .auto-step-white{color:#9ce5d0}
    .auto-total{font-size:clamp(2rem,5vw,3.2rem);letter-spacing:-.05em;font-variant-numeric:tabular-nums}
    .auto-balance{border-top:1px solid #49677f;margin-top:18px;padding-top:18px;display:grid;gap:7px}
    .auto-balance span{font-size:.79rem;color:#c7dde9}
    .auto-balance strong{font-size:1.4rem;color:#9ce5d0}
    .auto-balance strong.is-negative{color:#ffbbbe}
    .auto-breakdown h3{font-size:1.1rem;margin:0 0 16px}
    .auto-split{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);font-size:.82rem}
    .auto-split strong{white-space:nowrap;font-variant-numeric:tabular-nums}
    .auto-line{padding:16px 0;border-top:1px solid var(--line)}
    .auto-line-top{display:flex;justify-content:space-between;gap:14px;align-items:baseline;font-size:.88rem}
    .auto-line-top strong:last-child{font-variant-numeric:tabular-nums;white-space:nowrap}
    .auto-line-meta{font-size:.74rem;color:#456880;font-weight:650;margin:5px 0}
    .auto-line-method{font-size:.76rem;line-height:1.5;margin:6px 0}
    .auto-line a,.auto-no-source{font-size:.73rem;line-height:1.5}
    .auto-footer{margin-top:52px;max-width:850px}
    .auto-footer .button-primary{margin-top:12px}
    .auto-error{background:#ffebec;padding:12px;border:1px solid #dfafb4;border-radius:9px;color:#75252b;font-size:.84rem}
    @media(max-width:900px){.auto-grid{grid-template-columns:1fr}}
    @media(max-width:540px){.auto-card,.auto-breakdown{padding:19px}.auto-inputs{grid-template-columns:1fr;gap:7px}.auto-inputs input,.auto-inputs select{margin-bottom:9px}.auto-summary{padding:22px}}
  `]
})
export class AutomaticFlorenceComponent {
  readonly profile=signal<FlorenceSoloProfile>({...DEFAULT_FLORENCE_SOLO});
  readonly error=signal('');
  readonly result=computed(()=>estimateFlorenceSolo(this.profile()));
  readonly foodProxy=foodProxySolo2025;
  readonly editableFields:{key:EditableKey;label:string}[]=[
    {key:'groceriesEUR',label:'Alimentari e bevande'},
    {key:'electricityEUR',label:'Elettricità (ipotesi)'},
    {key:'gasEUR',label:'Gas e riscaldamento (ipotesi)'},
    {key:'internetEUR',label:'Internet e telefono (ipotesi)'},
    {key:'otherEUR',label:'Altre spese (ipotesi)'}
  ];
  private readonly fmt=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  money(v:number):string{return this.fmt.format(v);}
  setNumber(key:NumericKey,value:unknown):void{
    const n=value===''||value===null?NaN:Number(value);
    const max=key==='areaSqm'?300:key==='waterCubicMetersPerYear'?500:100000;
    const min=key==='areaSqm'?15:0;
    if(!Number.isFinite(n)||n<min||n>max){
      this.error.set(`Inserisci per "${key}" un valore valido tra ${min} e ${max}.`);
      return;
    }
    this.error.set('');
    this.profile.update(p=>({...p,[key]:n}));
  }
  setContract(v:unknown):void{
    if(v==='long'||v==='agreed'||v==='temporary'){
      this.profile.update(p=>({...p,contract:v as RentContract}));
    }
  }
  setTransit(v:unknown):void{
    if(v==='monthly-pass'||v==='no-pass'){
      this.profile.update(p=>({...p,transit:v as TransitChoice}));
    }
  }
  setIncome(v:unknown):void{
    if(v===null||v===''){
      this.profile.update(p=>({...p,monthlyNetIncomeEUR:null}));
      this.error.set('');return;
    }
    const n=Number(v);
    if(!Number.isFinite(n)||n<0||n>100000){this.error.set('Reddito netto non valido.');return;}
    this.error.set('');
    this.profile.update(p=>({...p,monthlyNetIncomeEUR:n}));
  }
  resetGroceries():void{this.profile.update(p=>({...p,groceriesEUR:foodProxySolo2025()}));}
  resetAll():void{this.error.set('');this.profile.set({...DEFAULT_FLORENCE_SOLO});}
  kindName(value:string):string{
    const names:Record<string,string>={
      observed:'Contratti osservati',tariff:'Tariffa applicata',
      'statistical-proxy':'Proiezione statistica',scenario:'Ipotesi'
    };
    return names[value]??'Tipo non noto';
  }
}
