import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { validateMunicipalDataset, type MunicipalRecord } from '../../core/municipal-data';
import { taxRegionFromProvince } from '../../core/italian-territories';
import {
  parseMunicipalRentData, benchmarkForMunicipality, rentalRangeForArea,
  type MunicipalRentDataset
} from '../../core/municipal-rents';
import {
  parseFuelSnapshot, isFuelRecent, fuelForProvince, monthlyFuelCost,
  type ProvinceFuelSnapshot, type FuelType
} from '../../core/province-fuel';
import { estimateSalary2026 } from '../../core/salary-2026';
import { estimateLocalTaxes2026 } from '../../core/local-tax-2026';
import { type RegionalMefDataset } from '../../core/mef-regional';
import { type MunicipalDataset } from '../../core/municipal-data';
import {
  suggestSinglePersonCosts, cityDataCoverage, compareMethodWarning,
  DEFAULT_SINGLE_PERSON_OPTIONS,
  type CategorySuggestion,type RentBaseline
} from '../../core/automatic-city-compare';
import {type RentContract} from '../../core/automatic-cost-florence';
import {type HeatingChoice} from '../../core/energy-household-2026';
import {
  assessReliability,assessComparisonReliability,
  type ReliabilityInput
} from '../../core/comparison-reliability';
import { comparableTuscanRentPair, tuscanCapitalRentRecord, TUSCANY_CAPITAL_RENTS_2024 } from '../../core/tuscany-capital-rents-2024';
import {
  estimateEssentialCosts2026, budgetWithOptionalTari, DEFAULT_ESSENTIAL_PROFILE, TUSCANY_ESSENTIAL_SOURCES,
  GAS_ARERA_COMMODITY_OCT_2026, type TransitPass
} from '../../core/tuscany-essential-2026';
import {
  COST_KEYS, COST_LABELS, EMPTY_BUDGET, compareCityBudgets,
  basketForCity, regionalFamilySpending, omiRentalRange,validMoney,
  CODACONS_BASKET_SOURCE, type CostKey, type CityBudget
} from '../../core/city-compare';

type Side='left'|'right';
interface OmiInputs {sqm:number|null; minRate:number|null; maxRate:number|null; areaType:'L'|'N';}
const emptyOmi=():OmiInputs=>({sqm:null,minRate:null,maxRate:null,areaType:'L'});
const emptyBudget=():CityBudget=>({
  netIncome:null,expenses:{...EMPTY_BUDGET.expenses}
});

@Component({
  selector:'app-compare',
  standalone:true,
  imports:[FormsModule,RouterLink],
  template:`
<section class="page-hero container">
  <span class="eyebrow eyebrow-subtle">CONFRONTO ASSISTITO · PERSONA SOLA</span>
  <h1>Due città, <span>un budget già pronto.</span></h1>
  <p>Parti dalle stime disponibili per una persona sola: abbiamo affitti storici calcolabili per tutti e 10 i capoluoghi toscani, dalla stessa fonte regionale. Fonti, anni e ipotesi sono sempre visibili. Quando manca un dato locale, lo segnaliamo.</p>
  <div class="compare-shortcuts" aria-label="Esempi di città">
    <button type="button" (click)="selectPair('G702','D612')">Pisa vs Firenze</button>
    <button type="button" (click)="selectPair('G999','G702')">Prato vs Pisa</button>
    <button type="button" (click)="selectPair('D612','F205')">Firenze vs Milano</button>
    <button type="button" (click)="selectPair('F205','F839')">Milano vs Napoli</button>
    <button type="button" (click)="selectPair('A390','D612')">Arezzo vs Firenze</button>
    <button type="button" (click)="swapCities()">Inverti città ↔</button>
    <button type="button" (click)="shareCities()">Copia link alle città</button>
  </div>
  <p class="compare-micro" role="status">{{shareStatus()}}</p>
  <p class="compare-tiny">Capoluoghi con affitto storico calcolabile: {{tuscanyCapitalNames}}. I dati sono riferiti al 2024, non ai canoni richiesti oggi.</p>
  <p><a routerLink="/costo-vita-firenze-persona-sola">Nuovo: stima iniziale automatica per Firenze, persona sola, con fonti e attendibilità ↗</a></p>
</section>

<section class="container compare-auto-panel" aria-labelledby="auto-panel-title">
  <div class="compare-auto-intro">
    <div>
      <span class="eyebrow eyebrow-subtle">STEP 1 · PROFILO DELLA SIMULAZIONE</span>
      <h2 id="auto-panel-title">Una persona in affitto, con mezzi pubblici</h2>
      <p>Le cifre vengono precompilate dove abbiamo dati o ipotesi dichiarate. I campi che cambi manualmente restano tuoi: aggiornare la superficie non li sovrascrive.</p>
    </div>
    <div class="compare-auto-controls">
      <div>
        <label class="field-label" for="auto-area">Superficie di riferimento (m²)</label>
        <input class="standalone-input" id="auto-area" type="number" min="15" max="300" step="5"
          [ngModel]="rentAreaSqm()" (ngModelChange)="setRentArea($event)">
      </div>
      <div>
        <label class="field-label" for="auto-residents">Occupanti (solo per le utenze)</label>
        <select class="standalone-input" id="auto-residents" [ngModel]="energyResidents()" (ngModelChange)="setEnergyResidents($event)">
          <option [ngValue]="1">1</option><option [ngValue]="2">2</option><option [ngValue]="3">3</option>
          <option [ngValue]="4">4</option><option [ngValue]="5">5</option>
        </select>
      </div>
      <div>
        <label class="field-label" for="auto-heating">Riscaldamento principale</label>
        <select class="standalone-input" id="auto-heating" [ngModel]="heatingChoice()" (ngModelChange)="setHeatingChoice($event)">
          <option value="gas">Autonomo a gas</option>
          <option value="electric">Elettrico / pompa di calore</option>
          <option value="none">Altro / centralizzato (riscaldamento escluso dalle utenze)</option>
        </select>
      </div>
      <div>
        <label class="field-label" for="auto-rent-baseline">Riferimento per l'affitto</label>
        <select class="standalone-input" id="auto-rent-baseline" [ngModel]="rentBaseline()" (ngModelChange)="setRentBaseline($event)">
          <option value="contracts2024">Contratti effettivi 2024 · Regione Toscana</option>
          <option value="asking2026">Annunci ottobre 2026 · prezzi richiesti idealista</option>
        </select>
        <p class="compare-tiny">Prezzi richiesti negli annunci e canoni effettivamente stipulati misurano cose diverse. Il dato 2026 è uno snapshot editoriale, non un monitor in tempo reale.</p>
      </div>
      <div>
        <label class="field-label" for="auto-florence-contract">Contratto (capoluoghi toscani)</label>
        <select class="standalone-input" id="auto-florence-contract"
          [ngModel]="florenceContract()" (ngModelChange)="setFlorenceContract($event)">
          <option value="long">Ordinario oltre 3 anni</option>
          <option value="agreed">Concordato</option>
          <option value="temporary">Transitorio</option>
        </select>
      </div>
      <div>
        <label class="field-label" for="auto-water">Consumo acqua (m³/anno, tariffario solo 1 residente)</label>
        <input class="standalone-input" id="auto-water" type="number" min="0" max="500" step="5"
          [ngModel]="autoWaterM3()" (ngModelChange)="setAutoWater($event)">
      </div>
      <div>
        <label class="field-label" for="auto-tari-area">Superficie soggetta a TARI (m²)</label>
        <input class="standalone-input" id="auto-tari-area" type="number" min="15" max="300" step="5"
          [ngModel]="tariAreaSqm()" (ngModelChange)="setTariArea($event)">
      </div>
      @if(leftCode()==='E715'||rightCode()==='E715'){
        <div>
          <label class="field-label" for="auto-lucca-emptyings">Lucca TARIC: svuotamenti annui dell'indifferenziato (bidone 25 L)</label>
          <input class="standalone-input" id="auto-lucca-emptyings" type="number" min="6" max="52" step="1"
            [ngModel]="luccaEmptyingsYear()" (ngModelChange)="setLuccaEmptyings($event)">
          <p class="compare-tiny">12 svuotamenti = tariffa standard 2026. Da 6 a 11 è prevista una riduzione, oltre 12 un incremento. Il totale resta al netto di IVA e componenti ulteriori.</p>
        </div>
      }
      <div>
        <label class="field-label" for="auto-pass">Abbonamento urbano (10 capoluoghi toscani)</label>
        <select class="standalone-input" id="auto-pass" [ngModel]="transitPass()" (ngModelChange)="setTransitPass($event)">
          <option value="monthly">Mensile ordinario · 42,20 €</option>
          <option value="annual">Annuale ordinario · 342,80 €/anno</option>
          <option value="none">Non acquisto un abbonamento</option>
        </select>
      </div>
      <p class="compare-tiny">Luce e gas: la spesa iniziale si aggiorna con numero di persone, metratura e tipo di riscaldamento. I consumi sono ipotesi editoriali, i rapporti di prezzo derivano da un campione italiano 2026. Puoi sovrascrivere il costo reale modificando «Utenze» nel budget. <strong>Solo l'energia e le utenze variano con gli occupanti: affitto e alimentari mantengono il profilo persona sola.</strong></p>
      <div>
        <label class="field-label" for="auto-common-income">Stesso netto mensile nelle due città (facoltativo)</label>
        <div class="compare-auto-inline">
          <input class="standalone-input" id="auto-common-income" type="number" min="0" max="100000" step="50"
            [ngModel]="commonNet()" (ngModelChange)="setCommonNet($event)" placeholder="Es. 1900">
          <button type="button" (click)="applyCommonNet()" [disabled]="commonNet()===null">Applica</button>
        </div>
      </div>
    </div>
  </div>
  <p class="compare-tiny">I suggerimenti non sono tutti prezzi locali: gli alimentari derivano da un proxy nazionale ISTAT e varie bollette sono ipotesi di pianificazione. <a routerLink="/costo-vita-firenze-persona-sola">Vedi anche il modello dettagliato per Firenze ↗</a></p>
  @if(autoFeedback()){<p class="compare-alert" role="status">{{autoFeedback()}}</p>}
</section>

<section class="container compare-quality" aria-labelledby="quality-title">
  <div class="compare-glance-head">
    <div>
      <span class="eyebrow eyebrow-subtle">CONTROLLO QUALITÀ DEI DATI</span>
      <h2 id="quality-title">Quanto è completo il confronto?</h2>
    </div>
  </div>
  <div class="compare-layout">
    @for(side of sides;track side.key){
      <article class="compare-quality-item">
        <h3>{{name(side.key)}}</h3>
        <p><strong>{{reliability(side.key).status==='parziale'?'Scenario parziale':'Scenario compilato'}}</strong></p>
        <p class="compare-tiny">Sono presenti {{reliability(side.key).nationalOrAssumedCount}} voci da ipotesi o proxy nazionali. La presenza di cinque importi non implica che il costo reale sia stato misurato.</p>
        <ul>
          @for(issue of reliability(side.key).risks;track issue){
            <li>{{issue}}</li>
          }
        </ul>
      </article>
    }
  </div>
  <p class="compare-tiny"><strong>Comparabilità:</strong> {{rentBaseline()==='asking2026'?'gli affitti richiesti nel 2026 non sono i contratti stipulati e variano secondo gli immobili presenti negli annunci.':comparisonReliability().comparableHistoricalRent?'gli affitti storici suggeriti utilizzano la stessa fonte regionale e tipologia.':'le cifre dell’affitto non sono garantite comparabili per fonte, periodo o modifiche manuali.'}} Il totale è sempre una simulazione, non un indice ufficiale dei prezzi urbani.</p>
  @if(tariIncluded('left')!==tariIncluded('right')){
    <p class="compare-alert" role="note">TARI inclusa soltanto in una delle due città: il totale confronta voci diverse.</p>
  }
  <p class="compare-tiny">Dati: contratti Toscana 2024 oppure annunci richiesti ottobre 2026, OMI Milano 2025/2, energia e trasporti 2026, ISTAT spese 2025. I dati non si aggiornano automaticamente solo perché le fonti sono monitorate.</p>
</section>

<section class="container compare-glance" aria-labelledby="glance-title">
  <div class="compare-glance-head">
    <div>
      <span class="eyebrow eyebrow-subtle">STEP 2 · PRIMA STIMA</span>
      <h2 id="glance-title">Un primo confronto senza compilare tutto</h2>
    </div>
    <a href="#budget-due-citta">Modifica i budget delle città ↓</a>
  </div>
  <div class="compare-layout">
    @for(side of sides;track side.key){
      <div class="compare-glance-card">
        <span class="compare-card-tag">{{side.title}}</span>
        <h3>{{name(side.key)}}</h3>
        @if(summary(side.key).monthlyTotal!==null){
          <strong class="compare-glance-total">{{money(summary(side.key).monthlyTotal!)}} € <small>/mese</small></strong>
          @if(summary(side.key).monthlyBalance!==null){
            <p>Residuo con il netto inserito: <strong>{{money(summary(side.key).monthlyBalance!)}} €</strong></p>
          }
        } @else {
          <strong class="compare-glance-unavailable">Stima parziale</strong>
          <p>Spese note {{money(summary(side.key).knownExpenses)}} €. Mancano: {{missingCategoryLabels(side.key)}}.</p>
        }
        <p class="compare-tiny">{{coverage(side.key).available}} voci precompilate su 5; {{coverage(side.key).supported}} usano un indicatore o tariffa territoriale. Le altre sono proxy o ipotesi.</p>
        @if(tariIncluded(side.key)){
          <p class="compare-tiny">La quota TARI {{money(tariMonthly(side.key)!)}} €/mese è inclusa nel totale e sommata alle altre spese, senza modificare il campo manuale.</p>
        } @else {
          <p class="compare-tiny">TARI esclusa dal totale iniziale. Puoi attivarla più sotto quando hai un importo.</p>
        }
      </div>
    }
  </div>
  @if(tariIncluded('left')!==tariIncluded('right')){
    <p class="compare-alert" role="note">Attenzione: la TARI è inclusa nel budget di una sola città. La differenza delle spese non comprende le stesse voci.</p>
  }
  @if(rentBaseline()==='contracts2024'&&comparableRents()){
    <p class="compare-glance-delta" role="note">
      <strong>Affitti confrontabili come dati storici (2024):</strong>
      @if(rentDelta()!==null) {
        nella seconda città il riferimento di affitto è
        <strong>{{signedMoney(rentDelta()!)}} € / mese</strong>
        rispetto alla prima, a parità di superficie e tipologia contrattuale.
      }
      <small>Fonte unica: Regione Toscana, Abitare in Toscana 2025, tabella 2.2. Non sono offerte di affitto del 2026.</small>
    </p>
  }
  @if(comparison().expenseDifference!==null && !sameCity()){
    <p class="compare-glance-delta">Differenza di spesa tra gli scenari (seconda città meno prima):
      <strong>{{signedMoney(comparison().expenseDifference!)}} € / mese</strong>
    </p>
    <p class="compare-tiny">Importo ipotetico, NON indice di quale città è realmente più economica. Le fonti sull'affitto sono omogenee soltanto tra i capoluoghi toscani coperti dal rapporto 2024.</p>
  }
</section>

<section class="container compare-essentials" aria-labelledby="essentials-title">
  <div class="compare-glance-head">
    <div>
      <span class="eyebrow eyebrow-subtle">TARI E UTENZE · DATI UFFICIALI 2026</span>
      <h2 id="essentials-title">Cosa è calcolato, cosa è soltanto ipotizzato</h2>
    </div>
  </div>
  <p class="compare-tiny">Luce e gas: consumi stimati per persone, superficie e riscaldamento, con valori nazionali non contrattuali. Le tariffe di acqua e TARI pubblicate nel sito valgono per UN residente: con più persone acqua diventa una semplice ipotesi e TARI va inserita dall’avviso reale.</p>
  <div class="compare-layout">
    @for(side of sides;track side.key){
      <article class="compare-essentials-card">
        <h3>{{name(side.key)}}</h3>
        @if(essentialsFor(side.key);as detail){
          <div class="compare-essential-line">
            <strong>Trasporto urbano</strong>
            @if(detail.transit.monthlyEUR!==null){
              <span>{{money(detail.transit.monthlyEUR!)}} €/mese</span>
              <p>{{detail.transit.note}}</p>
              <a [href]="detail.transit.sourceUrl" target="_blank" rel="noopener noreferrer">Autolinee Toscane, tariffa verificata ↗</a>
            } @else {<p>Tariffa urbana non disponibile</p>}
          </div>
          <div class="compare-essential-line">
            <strong>Acqua, fognatura, depurazione</strong>
            @if(detail.water.monthlyEUR!==null){
              <span>{{money(detail.water.monthlyEUR!)}} €/mese</span>
              <p>{{detail.water.geography}} · {{detail.water.period}}. {{detail.water.note}}</p>
              <a [href]="detail.water.sourceUrl" target="_blank" rel="noopener noreferrer">Consulta tariffe del gestore ↗</a>
            } @else {
              <span>Dato locale non disponibile</span>
              <p>La voce utenze contiene una mera ipotesi d'acqua, da correggere.</p>
            }
          </div>
          <div class="compare-essential-line">
            <strong>Elettricità: stima di consumo nazionale</strong>
            <span>{{money(detail.electricity.monthlyEUR!)}} €/mese</span>
            <p>{{detail.electricity.note}}</p>
            <a [href]="detail.electricity.sourceUrl" target="_blank" rel="noopener noreferrer">Fonte per la spesa indicativa ↗</a>
          </div>
          <div class="compare-essential-line">
            <strong>Gas e riscaldamento: scenario nazionale</strong>
            <span>{{money(detail.gas.monthlyEUR!)}} €/mese</span>
            <p>{{detail.gas.note}}</p>
            @if(detail.gas.sourceUrl){<a [href]="detail.gas.sourceUrl" target="_blank" rel="noopener noreferrer">Fonte di riferimento ↗</a>}
          </div>
          <div class="compare-essential-line">
            <strong>TARI/TARIC 2026: un occupante, quota base</strong>
            @if(detail.tari.monthlyEUR!==null){
              <span>{{money(detail.tari.monthlyEUR!)}} €/mese ({{money(detail.tari.annualEUR!)}} €/anno)</span>
              <p>{{detail.tari.note}}</p>
              <a [href]="detail.tari.sourceUrl" target="_blank" rel="noopener noreferrer">Documento ufficiale TARI/TARIC ↗</a>
            } @else {
              <span>Tariffa 2026 non verificata</span>
              <p>{{detail.tari.note}} Puoi inserire manualmente l'importo annuo di TARI/TARIC dell'avviso effettivo, se lo conosci.</p>
            }
            <label class="field-label" [for]="'tari-manual-'+side.key">Avviso TARI/TARIC annuo effettivo (facoltativo, €)</label>
            <input class="standalone-input" type="number" inputmode="decimal" min="0" max="10000" step="1"
              [id]="'tari-manual-'+side.key" [ngModel]="tariManual(side.key)"
              (ngModelChange)="setTariManual(side.key,$event)" placeholder="Usa la quota ufficiale o inserisci la tua">
            <label class="compare-tari-choice">
              <input type="checkbox" [ngModel]="tariIncluded(side.key)" (ngModelChange)="setTariIncluded(side.key,!!$event)"
                [disabled]="tariMonthly(side.key)===null">
              <span>Aggiungi {{tariMonthly(side.key)===null?'TARI':money(tariMonthly(side.key)!)+' €/mese'}} alle «Altre spese» del budget</span>
            </label>
            @if(tariIncluded(side.key)){
              <p class="compare-tiny">Inclusa una sola volta nel totale. La cifra nel campo «Altre spese» resta quella senza TARI.</p>
            } @else {
              <p class="compare-tiny">TARI non inclusa nel totale automatico. Le quote base TARI verificate di Arezzo, Livorno, Pisa, Pistoia e Siena escludono TEFA, perequazione, riduzioni e bonus. Lucca usa un modello TARIC distinto con svuotamenti: il suo importo non include IVA e oneri ulteriori.</p>
            }
          </div>
        } @else {
          <p class="compare-tiny">Motore essenziale 2026 disponibile per i 10 capoluoghi toscani. Per questo comune non sono state importate tariffe locali comparabili.</p>
        }
      </article>
    }
  </div>
  <p class="compare-tiny">La TARI aggiunta a una sola città rende il confronto dei totali non omogeneo. Per entrambe le città è preferibile usare l'importo annuo effettivo del proprio avviso, se disponibile. Il calcolo idrico usa le sole quote fisse e variabili pubblicate, escludendo imposte e ulteriori oneri.</p>
</section>

<section id="budget-due-citta" class="container compare-layout" aria-label="Budget delle due città">
  @if(loading()){
    <div class="compare-intro" role="status">Caricamento del catalogo comunale MEF 2026…</div>
  } @else if(error()){
    <div class="compare-intro" role="alert">{{error()}}</div>
  }
  @for(side of sides; track side.key) {
    <article class="compare-city-card">
      <span class="compare-card-tag">{{side.title}}</span>
      <label class="field-label" [for]="'search-'+side.key">Cerca un comune (nome o provincia)</label>
      <input class="standalone-input" type="search" autocomplete="off" [id]="'search-'+side.key"
        [ngModel]="query(side.key)" (ngModelChange)="onSearch(side.key,$event)"
        [disabled]="loading() || !!error()" placeholder="Es. Arezzo, Firenze, MI, BO">
      @if(matches(side.key).length) {
        <div class="compare-suggestions" role="group" [attr.aria-label]="'Risultati '+side.title">
          @for(city of matches(side.key);track city.code){
            <button type="button" (click)="selectCity(side.key,city.code)">
              {{displayCity(city)}} <span>{{city.province}}</span>
            </button>
          }
        </div>
      }
      @if(city(side.key);as current){
        <h2>{{displayCity(current)}}</h2>
        <p class="compare-meta">Provincia di {{current.province}} · {{nameRegion(current.province)}}</p>
        <p class="compare-tiny">
          Addizionale comunale 2026:
          @if(current.status==='simple'){
            aliquota unica {{percent(current.ratePct!)}}%
            @if(current.exemptionThreshold!==null){ · esenzione fino a {{money(current.exemptionThreshold)}} €}
          } @else { {{current.reason}} }
        </p>
      } @else {
        <p class="compare-tiny">Seleziona un comune dall'elenco per confrontare le città.</p>
      }

      <div class="compare-divider"></div>
      <h3>Entrate e spese mensili</h3>
      <p class="compare-tiny">Suggerimenti iniziali per persona sola. <strong>{{coverage(side.key).available}}/5 voci proposte</strong>, di cui {{coverage(side.key).supported}} con una tariffa o un indicatore territoriale diretto o derivato. Le altre sono ipotesi o proxy, non prezzi locali.</p>
      <label class="field-label" [for]="'income-'+side.key">Stipendio o entrate nette previste (€ / mese)</label>
      <input class="standalone-input" type="number" inputmode="decimal" min="0" max="100000" step="10"
        [id]="'income-'+side.key" [ngModel]="budget(side.key).netIncome"
        (ngModelChange)="setNet(side.key,$event)" placeholder="Da inserire">

      @for(key of costKeys;track key){
        <label class="field-label" [for]="side.key+'-'+key">{{costLabels[key]}} (€ / mese)</label>
        <input class="standalone-input" type="number" inputmode="decimal" min="0" max="100000" step="10"
          [id]="side.key+'-'+key" [ngModel]="budget(side.key).expenses[key]"
          (ngModelChange)="setCost(side.key,key,$event)" placeholder="Da inserire, oppure 0">
      }
      <div class="compare-shortcuts">
        <button type="button" (click)="resetAutoCosts(side.key)">Ripristina i suggerimenti di {{name(side.key)}}</button>
      </div>
      <p class="compare-tiny">Puoi correggere qualsiasi cifra. <strong>0</strong> significa che la spesa non esiste; un campo vuoto segnala una voce senza costo conosciuto.</p>
      <details class="compare-evidence">
        <summary>Origine dei suggerimenti e attendibilità delle 5 voci</summary>
        @for(suggestion of suggestionsFor(side.key);track suggestion.key){
          <div class="compare-evidence-line">
            <div class="compare-evidence-title">
              <strong>{{costLabels[suggestion.key]}}</strong>
              <span>{{suggestion.amount===null?'Senza stima':money(suggestion.amount)+' €'}} · {{suggestion.confidence}}</span>
            </div>
            <p>{{kindLabel(suggestion.kind)}} · {{suggestion.geography}} · {{suggestion.date}}
              @if(isEdited(side.key,suggestion.key)){ · <strong>Importo personalizzato</strong>}
            </p>
            <p>{{suggestion.explanation}}</p>
            @if(suggestion.sourceUrl){
              <a [href]="suggestion.sourceUrl" target="_blank" rel="noopener noreferrer">Fonte: {{suggestion.sourceName}} ↗</a>
            }
          </div>
        }
      </details>

      <div class="compare-city-result">
        <p>Voci compilate: <strong>{{summary(side.key).filled}} / {{summary(side.key).totalCategories}}</strong></p>
        <p>Spese note: <strong>{{money(summary(side.key).knownExpenses)}} €</strong></p>
        @if(summary(side.key).complete) {
          <p>Spesa mensile totale: <strong>{{money(summary(side.key).monthlyTotal!)}} €</strong></p>
        } @else { <p>Totale definitivo: <strong>non disponibile</strong></p> }
        @if(summary(side.key).monthlyBalance!==null){
          <p class="compare-balance">Residuo mensile: <strong>{{money(summary(side.key).monthlyBalance!)}} €</strong></p>
        } @else { <p>Residuo: <strong>servono entrate e tutte le spese</strong></p> }
      </div>
    </article>
  }
</section>

<section class="container compare-results" aria-label="Risultati del confronto">
  <h2>La differenza tra gli scenari</h2>
  <p class="compare-tiny">Non è una classifica del costo della vita: alcuni valori sono tariffe o rilevazioni, altri sono ipotesi. Per confrontare due città è essenziale controllare la copertura delle fonti.</p>
  @if(comparisonWarning()){
    <p class="compare-alert" role="note">{{comparisonWarning()}}</p>
  }
  @if(sameCity()){
    <p class="compare-alert">Scegli due comuni diversi per confrontare le spese.</p>
  } @else if(comparison().expenseDifference!==null){
    <div class="compare-result-cards">
      <div class="compare-kpi">
        <span>Differenza nelle spese mensili · seconda meno prima</span>
        <strong>{{signedMoney(comparison().expenseDifference!)}} €</strong>
        <small>Delta fra due scenari personalizzabili, NON differenza statistica certificata fra città.</small>
      </div>
      <div class="compare-kpi">
        <span>Differenza nel residuo mensile · seconda meno prima</span>
        <strong>{{comparison().balanceDifference===null?'Non disponibile':signedMoney(comparison().balanceDifference!)+' €'}}</strong>
        <small>Il residuo richiede anche le entrate nette previste in entrambe le città.</small>
      </div>
    </div>
    <div class="compare-bars">
      <h3>Dove cambiano le spese?</h3>
      @for(key of costKeys;track key){
        <div class="compare-bar-row">
          <strong>{{costLabels[key]}}</strong>
          <div class="compare-bar-line">
            <span class="compare-bar-name">{{name('left')}}</span>
            <div class="compare-bar-track"><span class="compare-left-bar" [style.width.%]="barWidth('left',key)"></span></div>
            <span>{{money(effectiveBudget('left').expenses[key]!)}} €</span>
          </div>
          <div class="compare-bar-line">
            <span class="compare-bar-name">{{name('right')}}</span>
            <div class="compare-bar-track"><span class="compare-right-bar" [style.width.%]="barWidth('right',key)"></span></div>
            <span>{{money(effectiveBudget('right').expenses[key]!)}} €</span>
          </div>
        </div>
      }
    </div>
  } @else {
    <div class="compare-intro" role="status">
      <h3>Il confronto si completa con i tuoi importi</h3>
      <p>La simulazione è già precompilata dove è possibile. Per completare il confronto mancano questi importi:</p>
      <p><strong>{{name('left')}}:</strong> {{missingCategoryLabels('left')}}</p>
      <p><strong>{{name('right')}}:</strong> {{missingCategoryLabels('right')}}</p>
      <p>Se conosci l'affitto di una città senza benchmark, inseriscilo. Non assumiamo che le voci lasciate vuote siano gratuite.</p>
    </div>
  }
</section>

<section class="container compare-salary" aria-labelledby="compare-salary-title">
  <h2 id="compare-salary-title">Stessa RAL, due comuni: cambia anche il netto?</h2>
  <p>Simula lo stesso stipendio lordo annuo nelle due città. Il risultato netto viene presentato <strong>solo se</strong> le addizionali 2026 comunali e regionali sono entrambe verificabili. Il calcolo è riferito al lavoratore dipendente privato standard, senza familiari a carico né altri redditi.</p>
  <div class="compare-salary-controls">
    <div>
      <label class="field-label" for="compare-ral">RAL (€ / anno, opzionale)</label>
      <input class="standalone-input" id="compare-ral" type="number" min="1" max="56224" step="500"
        [ngModel]="grossSalary()" (ngModelChange)="setSalary($event)" placeholder="Es. 30000">
    </div>
    <div>
      <label class="field-label" for="compare-contributions">Contributi INPS del dipendente (%)</label>
      <input class="standalone-input" id="compare-contributions" type="number" min="0" max="20" step=".01"
        [ngModel]="salaryContribution()" (ngModelChange)="setContribution($event)">
    </div>
    <div>
      <label class="field-label" for="compare-installments">Mensilità</label>
      <select class="standalone-input" id="compare-installments" [ngModel]="monthlyPaychecks()"
        (ngModelChange)="setPaychecks($event)">
        <option [ngValue]="12">12</option><option [ngValue]="13">13</option><option [ngValue]="14">14</option>
      </select>
    </div>
  </div>
  @if(nameRegion(city('left')?.province??'')==='PIEMONTE' || nameRegion(city('right')?.province??'')==='PIEMONTE') {
    <label class="compare-flag">
      <input type="checkbox" [ngModel]="noDependentChildren()" (ngModelChange)="noDependentChildren.set(!!$event)">
      <span>Confermo di non avere figli a carico, necessari per escludere le detrazioni regionali previste in Piemonte.</span>
    </label>
  }
  @if(salaryResult();as salary){
    @if(salary.supported){
      <p class="compare-tiny">Netto nazionale stimato prima delle addizionali: {{money(salary.monthlyBeforeLocalTaxes)}} € per mensilità, con le ipotesi indicate.</p>
      <div class="compare-layout">
        @for(side of sides;track side.key){
          <div class="compare-omi-card">
            <h3>{{name(side.key)}}</h3>
            @if(cityTax(side.key);as local){
              @if(local.complete){
                <p>Comunale: <strong>{{money(local.municipal.amount!)}} € / anno</strong></p>
                <p>Regionale: <strong>{{money(local.regional.amount!)}} € / anno</strong></p>
                <p class="compare-emphasis">Netto medio stimato: {{money(local.monthlyAverageAfterLocal!)}} € / mensilità</p>
                <button type="button" class="compare-use-net" (click)="applyEstimatedNet(side.key)">Usa questo netto nel budget</button>
              } @else {
                <p class="compare-tiny">Netto locale non calcolabile.</p>
                <p class="compare-tiny">Comunale: {{local.municipal.note}}</p>
                <p class="compare-tiny">Regionale: {{local.regional.note}}</p>
              }
            } @else {<p class="compare-tiny">Seleziona un comune valido.</p>}
          </div>
        }
      </div>
    } @else {<p class="compare-alert">{{salary.reason}}</p>}
  } @else {
    <p class="compare-tiny">Inserisci una RAL per abilitare il confronto fiscale. I netti dei due budget sopra restano liberamente modificabili.</p>
  }
  <p class="compare-tiny">Le addizionali dipendono dal domicilio fiscale e dalla capienza IRPEF, non dal luogo di lavoro. La stima è una media aritmetica annua e non riproduce i conguagli del cedolino. <a routerLink="/stipendio-netto-2026">Dettaglio delle ipotesi fiscali ↗</a></p>
</section>

<section class="container compare-reference">
  <h2>Dati territoriali: cosa sappiamo davvero</h2>
  <p>I riferimenti seguenti sono rilevazioni statistiche documentate. <strong>Non vengono utilizzati come importi predefiniti nel tuo budget</strong>, perché non descrivono la stessa famiglia o lo stesso immobile.</p>
  <div class="compare-layout">
    <article class="compare-reference-card">
      <h3>ISTAT · spesa media familiare 2025</h3>
      @for(side of sides;track side.key){
        <div class="compare-reference-row">
          <strong>{{name(side.key)}}</strong>
          @if(city(side.key);as current) {
            @if(istatReference(side.key);as info){
              <span>{{money(info.value)}} € / mese ({{info.name}})</span>
            } @else {<span>Dato regionale non incluso nella selezione disponibile</span>}
          } @else {<span>Seleziona un comune</span>}
        </div>
      }
      <p class="compare-tiny">Sono medie per <strong>tutta la regione e tutte le famiglie</strong>, non prezzi della città né valori per persona sola.</p>
      <a href="https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/" target="_blank" rel="noopener noreferrer">Fonte ISTAT, ottobre 2026 ↗</a>
    </article>
    <article class="compare-reference-card">
      <h3>Paniere comparabile di beni e servizi · indagine 2025</h3>
      @for(side of sides;track side.key){
        <div class="compare-reference-row">
          <strong>{{name(side.key)}}</strong>
          @if(basket(side.key);as item) {
            <span>{{item.approximate?'circa ':''}}{{money(item.valueEUR)}} €</span>
          } @else {<span>Non disponibile per questa città</span>}
        </div>
      }
      @if(basketDifference()!==null){
        <p class="compare-emphasis">Differenza del paniere campione: circa {{money(absolute(basketDifference()!))}} €.</p>
      }
      <p class="compare-tiny">{{basketSource.description}} Non è un canone né il costo di un mese di vita. Disponibile solo per le città esplicitamente citate nella fonte.</p>
      <a [href]="basketSource.url" target="_blank" rel="noopener noreferrer">Fonte: {{basketSource.organization}} ↗</a>
    </article>
  </div>
</section>

<section class="container compare-fuel" aria-labelledby="fuel-title">
  <h2 id="fuel-title">Prezzo dei carburanti: confronto tra province</h2>
  <p>Prezzi mediani alla pompa per benzina e gasolio self-service, aggregati per <strong>provincia</strong> a partire dai dati MIMIT. Non sono prezzi del singolo comune e non includono manutenzione, parcheggi, assicurazione o pedaggi.</p>
  @if(fuelLoading()){
    <p role="status">Caricamento dell'ultima rilevazione provinciale disponibile…</p>
  } @else if(fuelData(); as snapshot){
    <p class="compare-tiny">Ultimo giorno rilevato: <strong>{{snapshot.period}}</strong>. Campione disponibile per {{snapshot.provinces.length}} province. Valori in €/litro.</p>
    @if(!fuelRecent()){
      <p class="compare-alert" role="status">Rilevazione non abbastanza recente: mostriamo la data storica ma disabilitiamo l'applicazione automatica della stima al budget.</p>
    }
    <div class="compare-fuel-controls">
      <div>
        <label class="field-label" for="compare-fuel-type">Tipo di carburante</label>
        <select class="standalone-input" id="compare-fuel-type" [ngModel]="fuelType()" (ngModelChange)="setFuelType($event)">
          <option value="benzina_self">Benzina self</option>
          <option value="gasolio_self">Gasolio self</option>
        </select>
      </div>
      <div>
        <label class="field-label" for="compare-fuel-km">Chilometri percorsi al mese</label>
        <input class="standalone-input" id="compare-fuel-km" type="number" min="0" max="20000" step="50"
          [ngModel]="monthlyKilometers()" (ngModelChange)="setMonthlyKilometers($event)" placeholder="Inserisci i tuoi km">
      </div>
      <div>
        <label class="field-label" for="compare-fuel-consumption">Consumo dell'auto (litri/100 km)</label>
        <input class="standalone-input" id="compare-fuel-consumption" type="number" min="0.1" max="40" step=".1"
          [ngModel]="fuelConsumption()" (ngModelChange)="setFuelConsumption($event)" placeholder="Es. 6,5">
      </div>
    </div>
    <div class="compare-layout">
      @for(side of sides;track side.key){
        <article class="compare-omi-card">
          <h3>{{name(side.key)}}</h3>
          @if(fuelProvince(side.key); as province){
            <p class="compare-tiny">Prezzi rilevati nella provincia di <strong>{{province.name}} ({{province.code}})</strong>.</p>
            @if(fuelObservation(side.key);as observation){
              <p>Prezzo mediano: <strong>{{pricePerLitre(observation.median)}} €/l</strong></p>
              <p class="compare-tiny">Dal primo al terzo quartile: {{pricePerLitre(observation.q1)}} – {{pricePerLitre(observation.q3)}} €/l, {{observation.stations}} impianti.</p>
              @if(fuelMonthlyEstimate(side.key)!==null){
                <p class="compare-emphasis">Carburante stimato: {{money(fuelMonthlyEstimate(side.key)!)}} € / mese</p>
                <button type="button" class="compare-use-net"
                  [disabled]="!fuelRecent()" (click)="applyFuelEstimate(side.key)">
                  Usa questa stima nei trasporti
                </button>
              } @else {
                <p class="compare-tiny">Inserisci i tuoi km e il consumo della tua auto per stimare il costo del solo carburante.</p>
              }
            }
          } @else {
            <p class="compare-tiny">Nessuna rilevazione provinciale verificata per questo comune.</p>
          }
        </article>
      }
    </div>
    <p class="compare-tiny">Il pulsante sostituisce la voce «Trasporti» del budget con il costo stimato del <strong>solo carburante</strong>. Aggiungi manualmente le altre spese di mobilità, quando presenti.</p>
  } @else {
    <p class="compare-alert" role="status">{{fuelError()}}</p>
  }
  <p class="compare-tiny">Fonte: <a href="https://optenergy.it/dati/" target="_blank" rel="noopener noreferrer">elaborazione optenergy (CC BY 4.0)</a>
    su <a href="https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti" target="_blank" rel="noopener noreferrer">dati ufficiali MIMIT (IODL 2.0)</a>.
    Il file viene aggiornato con controlli di qualità; la data mostrata è quella della rilevazione, non della visita alla pagina.</p>
</section>

<section class="container compare-fuel" aria-labelledby="rents-open-data-title">
  <h2 id="rents-open-data-title">Affitti da dati territoriali documentati</h2>
  <p>Primi riferimenti automatici dove esiste una fonte pubblica utilizzabile. Non è un prezzo di mercato garantito: la zona, lo stato dell'immobile, il periodo e il tipo di superficie possono cambiare molto il canone.</p>
  @if(rentalLoading()){
    <p role="status">Caricamento dei benchmark pubblicati…</p>
  } @else if(rentalData()){
    <label class="field-label" for="rent-area">Superficie lorda dell'abitazione (m²)</label>
    <input class="standalone-input" style="width:160px;max-width:100%;padding:10px;border:1px solid #bfcddd;border-radius:9px"
      id="rent-area" type="number" min="15" max="500" step="5"
      [ngModel]="rentAreaSqm()" (ngModelChange)="setRentArea($event)">
    <p class="compare-tiny">Valore iniziale di 70 m² scelto solo per l'esempio: modificalo in base alla casa che stai valutando. Confrontiamo esclusivamente superfici lorde (L) equivalenti.</p>
    <div class="compare-layout">
      @for(side of sides;track side.key){
        <article class="compare-omi-card">
          <h3>{{name(side.key)}}</h3>
          @if(rentBenchmark(side.key);as benchmark){
            <p class="compare-tiny">Milano, OMI {{benchmark.basePeriod}} · {{benchmark.zonesCount}} zone residenziali · {{benchmark.type}}, stato {{benchmark.maintenance}}, superficie {{benchmark.areaType}}.</p>
            @if(estimatedRent(side.key);as rent){
              <p>Intervallo indicativo derivato: <strong>{{money(rent.min)}} – {{money(rent.max)}} € / mese</strong></p>
              <p class="compare-tiny">Calcolo: {{money(benchmark.lowerMedian)}} – {{money(benchmark.upperMedian)}} €/m²/mese × {{money(rentAreaSqm()!)}} m². Mediana non ponderata dei limiti di zona, non canone medio o contratto reale.</p>
              <div class="compare-shortcuts">
                <button type="button" (click)="applyRent(side.key,'min')">Usa il limite inferiore nell'affitto</button>
                <button type="button" (click)="applyRent(side.key,'max')">Usa il limite superiore nell'affitto</button>
              </div>
            } @else {
              <p class="compare-tiny">Inserisci una superficie valida tra 15 e 500 m².</p>
            }
          } @else {
            <p class="compare-tiny">Nessun benchmark comunale revisionato e pubblicabile per questa città. Non sostituiamo con la media regionale o con un affitto inventato.</p>
          }
        </article>
      }
    </div>
    <p class="compare-tiny">Fonte: <a href="https://dati.comune.milano.it/dataset/ds3024-quotazioni-immobiliari-omi-locazione-semestre-2025-2" target="_blank" rel="noopener noreferrer">Comune di Milano, dataset OMI 2025/2 (CC BY 4.0)</a>;
      fonte originaria: Agenzia delle Entrate - OMI. Abbiamo elaborato soltanto due indicatori aggregati, senza ripubblicare le righe della banca dati. Questo dato è storico e non garantisce il canone di oggi.
      <a href="https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari/condizioni-contrattuali-qi" target="_blank" rel="noopener noreferrer">Condizioni d'uso OMI</a>.</p>
  } @else {
    <p class="compare-alert" role="status">{{rentalError()}}</p>
  }
</section>

<section class="container compare-omi" aria-label="Verifica degli affitti con OMI">
  <div class="compare-omi-head">
    <div>
      <h2>Vuoi stimare l'affitto usando la tua zona OMI?</h2>
      <p>Consulta il semestre, la zona e la tipologia sul sito ufficiale dell'Agenzia delle Entrate. Inserisci la quotazione minima/massima e una superficie coerente (N = netta; L = lorda). Nessun canone è estratto automaticamente.</p>
    </div>
    <a href="https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm" target="_blank" rel="noopener noreferrer">Apri mappa OMI ↗</a>
  </div>
  <div class="compare-layout">
    @for(side of sides;track side.key){
      <div class="compare-omi-card">
        <h3>{{name(side.key)}}</h3>
        <label class="field-label" [for]="'omi-size-'+side.key">Superficie (m²)</label>
        <input class="standalone-input" type="number" min="0" max="10000" step="1"
          [id]="'omi-size-'+side.key" [ngModel]="omi(side.key).sqm"
          (ngModelChange)="setOmi(side.key,'sqm',$event)">
        <label class="field-label" [for]="'omi-kind-'+side.key">Tipo di superficie della riga OMI</label>
        <select class="standalone-input" [id]="'omi-kind-'+side.key"
          [ngModel]="omi(side.key).areaType" (ngModelChange)="setAreaType(side.key,$event)">
          <option value="L">L · Lorda</option><option value="N">N · Netta</option>
        </select>
        <label class="field-label" [for]="'omi-min-'+side.key">Quotazione minima (€ / m² / mese)</label>
        <input class="standalone-input" type="number" min="0" max="1000" step=".1"
          [id]="'omi-min-'+side.key" [ngModel]="omi(side.key).minRate"
          (ngModelChange)="setOmi(side.key,'minRate',$event)">
        <label class="field-label" [for]="'omi-max-'+side.key">Quotazione massima (€ / m² / mese)</label>
        <input class="standalone-input" type="number" min="0" max="1000" step=".1"
          [id]="'omi-max-'+side.key" [ngModel]="omi(side.key).maxRate"
          (ngModelChange)="setOmi(side.key,'maxRate',$event)">
        @if(omiRange(side.key);as range){
          <strong>Intervallo: {{money(range.minimum)}} – {{money(range.maximum)}} € / mese</strong>
          <p class="compare-tiny">Non è il prezzo garantito di un contratto. Applica solo il valore che ritieni pertinente.</p>
          <div class="compare-shortcuts">
            <button type="button" (click)="applyOmi(side.key,'minimum')">Usa minimo nel budget</button>
            <button type="button" (click)="applyOmi(side.key,'maximum')">Usa massimo nel budget</button>
          </div>
        } @else {
          <p class="compare-tiny">Servono metri quadrati e quotazioni min/max della stessa zona, tipologia e superficie.</p>
        }
      </div>
    }
  </div>
  <p class="compare-tiny">Agenzia Entrate - OMI. Confronta lo stesso semestre e una tipologia simile nelle due città. Il valore OMI descrive un intervallo ordinario per zona, non un annuncio verificato.</p>
</section>

<section class="container compare-footer">
  <h2>Come interpretare il risultato</h2>
  <p>Questa è una <strong>simulazione personalizzata</strong>. Il totale mensile usa soltanto valori inseriti da te. Le statistiche ISTAT, il paniere campione e le quotazioni OMI sono mostrati separatamente per evitare somme tra dati non omogenei. Non salviamo né condividiamo le tue cifre: il collegamento copiato contiene soltanto i codici pubblici dei comuni.</p>
  <p>Per stimare la differenza tra due RAL con imposte locali consulta il <a routerLink="/stipendio-netto-2026">simulatore stipendio 2026</a>, verificando la disponibilità delle aliquote. Per maggiori dettagli <a routerLink="/fonti-e-metodo">consulta fonti e metodo</a>.</p>
</section>
`,
  styles:[`
    .compare-essentials{margin-top:18px;margin-bottom:30px}
    .compare-essentials-card{background:#fff;border:1px solid var(--line);padding:21px;border-radius:16px;min-width:0}
    .compare-essentials-card h3{margin:0 0 15px}
    .compare-essential-line{border-top:1px solid #e2e8ef;padding:13px 0;font-size:.83rem;line-height:1.5}
    .compare-essential-line>strong{display:block;margin-bottom:5px}
    .compare-essential-line>span{display:block;font-weight:750;color:var(--navy);font-size:.98rem}
    .compare-essential-line p{color:var(--muted);font-size:.76rem;margin:6px 0}
    .compare-essential-line a{font-size:.76rem}
    .compare-essential-line>.standalone-input{display:block;margin:9px 0;width:100%}
    .compare-tari-choice{display:flex;align-items:flex-start;gap:10px;margin:12px 0;font-weight:650;font-size:.8rem}
    .compare-tari-choice input{width:19px;height:19px;flex-shrink:0}
    .compare-quality{margin-bottom:26px}
    .compare-quality-item{background:#fff;border:1px solid var(--line);border-radius:15px;padding:17px}
    .compare-quality-item h3{margin:0 0 8px}
    .compare-quality-item ul{padding-left:18px;font-size:.79rem;line-height:1.55;margin:10px 0}
    .compare-quality-item li+li{margin-top:8px}
    .compare-glance{margin-bottom:24px}
    .compare-glance-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:13px}
    .compare-glance-head h2{font-size:1.38rem;margin:6px 0}
    .compare-glance-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px}
    .compare-glance-card h3{margin:6px 0 14px}
    .compare-glance-total{display:block;font-size:clamp(1.6rem,3.4vw,2.25rem);color:var(--navy);font-variant-numeric:tabular-nums}
    .compare-glance-total small{font-size:.87rem;font-weight:500;color:var(--muted)}
    .compare-glance-unavailable{color:#815310;font-size:1.15rem}
    .compare-glance-delta{border:1px solid #c9dcec;background:#f0f7ff;padding:15px;border-radius:12px;font-size:.9rem;margin-top:15px}
    .compare-glance-delta strong{margin-left:7px}
    .compare-auto-panel{margin-bottom:22px;background:#fff;border:1px solid var(--line);padding:23px;border-radius:18px}
    .compare-auto-intro{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr);gap:22px}
    .compare-auto-intro h2{font-size:1.25rem;margin:7px 0 11px}
    .compare-auto-intro p{font-size:.85rem;margin:0}
    .compare-auto-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .compare-auto-controls>div{min-width:0}
    .compare-auto-controls .standalone-input{width:100%;min-height:44px;background:#fff;border:1px solid #bfcddd;border-radius:9px;padding:10px}
    .compare-auto-controls .field-label{display:block;margin-bottom:6px;font-size:.8rem}
    .compare-auto-inline{display:flex;align-items:center;gap:8px}
    .compare-auto-inline input{flex:1;min-width:0}
    .compare-auto-controls button{background:#1d4b8a;color:#fff;border:0;border-radius:8px;padding:9px 12px;font-weight:700}
    .compare-auto-controls button:disabled{opacity:.5;cursor:not-allowed}
    .compare-evidence{border:1px solid #d8e3ef;border-radius:10px;margin:16px 0;background:#f8fbfe}
    .compare-evidence summary{cursor:pointer;color:var(--navy);font-weight:750;font-size:.83rem;padding:13px}
    .compare-evidence-line{border-top:1px solid #e1e8ef;padding:12px 14px}
    .compare-evidence-title{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:.82rem}
    .compare-evidence-title span{color:#33536c}
    .compare-evidence-line p,.compare-evidence-line a{font-size:.76rem;margin:5px 0;line-height:1.45}
    .compare-shortcuts{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
    .compare-shortcuts button{border:1px solid #bfd1e2;background:#fff;color:var(--navy);font-weight:750;border-radius:10px;padding:10px 13px}
    .compare-shortcuts button:hover{background:#eaf1fc}
    .compare-micro{font-size:.82rem;min-height:1.25rem;margin:.5rem 0 0}
    .compare-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}
    .compare-city-card,.compare-reference-card,.compare-omi-card,.compare-intro,.compare-kpi{
      background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px;min-width:0
    }
    .compare-card-tag{font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);font-weight:800}
    .compare-city-card h2{margin:12px 0 3px;font-size:1.5rem}
    .compare-city-card h3,.compare-reference-card h3,.compare-omi-card h3{font-size:1.15rem;margin:0 0 13px}
    .compare-meta{margin:0 0 12px;font-size:.87rem}
    .compare-tiny{font-size:.79rem;color:var(--text-soft);line-height:1.5;margin:10px 0}
    .compare-city-card .field-label,.compare-omi-card .field-label{display:block;margin-top:16px;margin-bottom:6px;font-size:.85rem}
    .compare-city-card .standalone-input,.compare-omi-card .standalone-input{
      width:100%;max-width:none;border:1px solid #bfcddd;border-radius:9px;padding:12px;background:#fff;
      color:var(--text);min-height:45px
    }
    .compare-suggestions{margin:5px 0 10px;border:1px solid #c4d4e4;border-radius:10px;max-height:185px;overflow:auto}
    .compare-suggestions button{display:flex;justify-content:space-between;gap:8px;width:100%;padding:9px 11px;border:0;border-bottom:1px solid #e9eff5;background:#fff;text-align:left;color:var(--navy)}
    .compare-suggestions button:hover{background:#eaf3ff}
    .compare-divider{height:1px;background:var(--line);margin:20px 0}
    .compare-city-result{background:#eef5fd;border-radius:12px;margin-top:22px;padding:16px}
    .compare-city-result p{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:.85rem;margin:0 0 8px}
    .compare-city-result p:last-child{margin-bottom:0}
    .compare-balance{border-top:1px solid #c6d8ec;padding-top:12px;color:var(--navy)}
    .compare-results,.compare-reference,.compare-omi,.compare-footer,.compare-salary{margin-top:48px}
    .compare-salary{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px}
    .compare-salary-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin:18px 0}
    .compare-fuel{margin-top:48px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px}
    .compare-fuel-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin:20px 0}
    .compare-fuel-controls .standalone-input{width:100%;padding:11px;border:1px solid #bfcddd;border-radius:9px;min-height:44px;background:#fff}
    .compare-fuel-controls .field-label{display:block;margin-bottom:7px}
    .compare-fuel .compare-omi-card{background:#f4f8fc}
    .compare-use-net:disabled{opacity:.45;cursor:not-allowed}
    .compare-salary-controls .field-label{display:block;margin-bottom:7px}
    .compare-salary-controls .standalone-input{width:100%;padding:11px;border:1px solid #bfcddd;border-radius:9px;min-height:44px;background:#fff}
    .compare-salary .compare-omi-card{background:#f4f8fc}
    .compare-flag{display:flex;align-items:flex-start;gap:9px;margin:14px 0}
    .compare-use-net{background:var(--blue);color:#fff;border:0;border-radius:10px;padding:12px 15px;font-weight:750}
    .compare-results>h2,.compare-reference>h2{margin-bottom:14px}
    .compare-result-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px}
    .compare-kpi{display:flex;flex-direction:column;gap:8px}
    .compare-kpi span{color:var(--text-soft);font-size:.85rem}
    .compare-kpi strong{font-size:clamp(1.7rem,3vw,2.5rem);color:var(--navy);letter-spacing:-.04em}
    .compare-kpi small{font-size:.77rem;color:var(--muted)}
    .compare-bars{margin-top:22px;background:#fff;border:1px solid var(--line);border-radius:15px;padding:21px}
    .compare-bar-row{padding:12px 0;border-bottom:1px solid #edf1f5}
    .compare-bar-row:last-child{border:0}
    .compare-bar-row>strong{display:block;font-size:.84rem;margin-bottom:9px}
    .compare-bar-line{display:grid;grid-template-columns:120px 1fr 90px;gap:12px;align-items:center;font-size:.8rem;margin:6px 0}
    .compare-bar-line>span:last-child{text-align:right;font-variant-numeric:tabular-nums}
    .compare-bar-name{color:var(--text-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .compare-bar-track{height:12px;background:#edf2f9;border-radius:15px;overflow:hidden}
    .compare-bar-track span{display:block;height:100%;border-radius:15px}
    .compare-left-bar{background:#245bd5}
    .compare-right-bar{background:#0c9877}
    .compare-reference>p{max-width:820px}
    .compare-reference-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;border-bottom:1px solid #e8edf4;padding:10px 0;font-size:.85rem}
    .compare-reference-row span{color:var(--text-soft);text-align:right}
    .compare-reference-card a{font-size:.8rem}
    .compare-emphasis{font-weight:750;color:var(--navy);margin-top:14px}
    .compare-omi-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}
    .compare-omi-head div{flex:1;max-width:800px}
    .compare-omi-head a{font-weight:750}
    .compare-omi-card>strong{display:block;margin-top:14px;color:var(--navy)}
    .compare-footer{border-top:1px solid var(--line);padding-top:25px}
    .compare-alert{padding:15px;border-radius:10px;background:#fff1dc;color:#815310}
    @media(max-width:800px){
      .compare-layout,.compare-result-cards,.compare-salary-controls,.compare-fuel-controls,.compare-auto-intro,.compare-auto-controls{grid-template-columns:1fr}
      .compare-fuel{padding:18px}
      .compare-salary{padding:18px}
      .compare-city-card,.compare-reference-card,.compare-omi-card,.compare-intro,.compare-kpi{padding:18px}
      .compare-bar-line{grid-template-columns:70px 1fr 72px;gap:8px}
    }
  `]
})
export class CompareComponent implements OnInit {
  readonly sides=[{key:'left' as Side,title:'Prima città'},{key:'right' as Side,title:'Seconda città'}];
  readonly costKeys=COST_KEYS;
  readonly costLabels=COST_LABELS;
  readonly basketSource=CODACONS_BASKET_SOURCE;
  readonly tuscanyCapitalNames=TUSCANY_CAPITAL_RENTS_2024.map(x=>x.city).join(', ');
  readonly comparableRents=computed(()=>comparableTuscanRentPair(this.leftCode(),this.rightCode()));
  readonly rentDelta=computed(()=>{
    if(!this.comparableRents())return null;
    const a=this.leftSuggestions().find(x=>x.key==='housing')?.amount;
    const b=this.rightSuggestions().find(x=>x.key==='housing')?.amount;
    return a!==null&&a!==undefined&&b!==null&&b!==undefined
      ?Math.round((b-a)*100)/100:null;
  });
  readonly florenceContract=signal<RentContract>(DEFAULT_SINGLE_PERSON_OPTIONS.florenceContract);
  readonly autoWaterM3=signal(DEFAULT_SINGLE_PERSON_OPTIONS.waterM3PerYear);
  readonly tariAreaSqm=signal(DEFAULT_ESSENTIAL_PROFILE.tariAreaSqm);
  readonly luccaEmptyingsYear=signal(DEFAULT_ESSENTIAL_PROFILE.luccaEmptyingsYear??12);
  readonly gasMonthlyScenario=signal(DEFAULT_ESSENTIAL_PROFILE.gasMonthlyScenarioEUR);
  readonly energyResidents=signal(1);
  readonly heatingChoice=signal<HeatingChoice>('gas');
  readonly rentBaseline=signal<RentBaseline>('contracts2024');
  readonly transitPass=signal<TransitPass>(DEFAULT_ESSENTIAL_PROFILE.transitPass);
  readonly tariManualLeft=signal<number|null>(null);
  readonly tariManualRight=signal<number|null>(null);
  readonly tariIncludedLeft=signal(false);
  readonly tariIncludedRight=signal(false);
  readonly essentialSourceUrls=TUSCANY_ESSENTIAL_SOURCES;
  readonly gasRawReference=GAS_ARERA_COMMODITY_OCT_2026;
  readonly commonNet=signal<number|null>(null);
  readonly autoFeedback=signal('');
  readonly editedLeft=signal<Partial<Record<CostKey,boolean>>>({});
  readonly editedRight=signal<Partial<Record<CostKey,boolean>>>({});
  readonly loading=signal(true);
  readonly error=signal('');
  readonly shareStatus=signal('');
  readonly rentalData=signal<MunicipalRentDataset|null>(null);
  readonly rentalLoading=signal(true);
  readonly rentalError=signal('Benchmark affitti non disponibile.');
  readonly rentAreaSqm=signal<number|null>(DEFAULT_SINGLE_PERSON_OPTIONS.areaSqm);
  readonly fuelData=signal<ProvinceFuelSnapshot|null>(null);
  readonly fuelLoading=signal(true);
  readonly fuelError=signal('Dataset provinciale non disponibile.');
  readonly fuelType=signal<FuelType>('benzina_self');
  readonly monthlyKilometers=signal<number|null>(null);
  readonly fuelConsumption=signal<number|null>(null);
  readonly fuelRecent=computed(()=>{
    const snapshot=this.fuelData();
    return snapshot!==null && isFuelRecent(snapshot);
  });
  readonly records=signal<MunicipalRecord[]>([]);
  readonly municipalData=signal<MunicipalDataset|null>(null);
  readonly regionalTaxData=signal<RegionalMefDataset|null>(null);
  readonly grossSalary=signal<number|null>(null);
  readonly monthlyPaychecks=signal<12|13|14>(13);
  readonly salaryContribution=signal(9.19);
  readonly noDependentChildren=signal(false);
  readonly salaryResult=computed(()=>{
    const ral=this.grossSalary();
    return ral===null?null:estimateSalary2026({
      grossYearlySalary:ral,installments:this.monthlyPaychecks(),
      employeeSocialSecurityRatePct:this.salaryContribution()
    });
  });
  readonly cityByCode=computed(()=>new Map(this.records().map(x=>[x.code,x])));
  readonly leftCode=signal('A390');
  readonly rightCode=signal('D612');
  readonly leftQuery=signal('Arezzo');
  readonly rightQuery=signal('Firenze');
  readonly leftBudget=signal<CityBudget>(emptyBudget());
  readonly rightBudget=signal<CityBudget>(emptyBudget());
  readonly leftOmi=signal<OmiInputs>(emptyOmi());
  readonly rightOmi=signal<OmiInputs>(emptyOmi());

  readonly leftEssentials=computed(()=>this.makeEssentials('left'));
  readonly rightEssentials=computed(()=>this.makeEssentials('right'));
  readonly leftSuggestions=computed(()=>this.makeSuggestions('left'));
  readonly rightSuggestions=computed(()=>this.makeSuggestions('right'));
  readonly comparisonWarning=computed(()=>compareMethodWarning(this.leftCode(),this.rightCode(),this.rentBaseline()));
  readonly reliabilityLeft=computed(()=>assessReliability(this.reliabilityInput('left')));
  readonly reliabilityRight=computed(()=>assessReliability(this.reliabilityInput('right')));
  readonly comparisonReliability=computed(()=>assessComparisonReliability(
    this.reliabilityInput('left'),this.reliabilityInput('right')
  ));
  readonly comparison=computed(()=>compareCityBudgets(this.effectiveBudget('left'),this.effectiveBudget('right')));
  readonly sameCity=computed(()=>this.leftCode()===this.rightCode());
  readonly basketDifference=computed(()=>{
    const a=this.basket('left'),b=this.basket('right');
    return a&&b?Math.round((b.valueEUR-a.valueEUR)*100)/100:null;
  });
  private readonly formatter=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  constructor(private readonly route:ActivatedRoute,private readonly router:Router){}
  ngOnInit():void{void this.loadMunicipalities();void this.loadRegionalTaxes();void this.loadFuelSnapshot();void this.loadRentalData();}
  async loadMunicipalities():Promise<void>{
    try{
      const response=await fetch('/data/municipal-2026.json',{cache:'no-cache'});
      if(!response.ok)throw new Error('Il catalogo comunale non risponde');
      const dataset=validateMunicipalDataset(await response.json());
      if(!dataset.published)throw new Error('Il catalogo MEF non è stato ancora revisionato');
      this.municipalData.set(dataset);
      this.records.set(dataset.records);
      const da=this.route.snapshot.queryParamMap.get('da')??'A390';
      const a=this.route.snapshot.queryParamMap.get('a')??'D612';
      if(this.cityByCode().has(da)&&this.cityByCode().has(a)&&da!==a)this.selectPair(da,a,false);
      else this.selectPair('A390','D612',false);
      this.refreshBothSuggestions();
    }catch{
      this.error.set('Catalogo dei comuni non disponibile. Il confronto non usa dati dimostrativi: riprova dopo il deploy e verifica lo stato dei dati.');
    }finally{this.loading.set(false);}
  }
  private async loadRentalData():Promise<void>{
    try{
      const response=await fetch('/data/municipal-rent-benchmarks.json',{cache:'no-cache'});
      if(!response.ok)throw Error('HTTP '+response.status);
      this.rentalData.set(parseMunicipalRentData(await response.json()));
      this.refreshBothSuggestions();
    }catch{
      this.rentalError.set('Le quotazioni immobiliari aggregate non sono disponibili. Puoi sempre inserire l’affitto manualmente.');
    }finally{this.rentalLoading.set(false);}
  }
  setRentArea(value:unknown):void{
    const area=validMoney(value,500);
    if(area===null||area<15||area>300){
      this.autoFeedback.set('La superficie deve essere compresa tra 15 e 300 m².');
      return;
    }
    this.autoFeedback.set('');
    this.rentAreaSqm.set(area);
    this.refreshBothSuggestions();
  }
  rentBenchmark(side:Side){
    return benchmarkForMunicipality(this.rentalData(),side==='left'?this.leftCode():this.rightCode());
  }
  estimatedRent(side:Side):{min:number;max:number}|null{
    const benchmark=this.rentBenchmark(side),area=this.rentAreaSqm();
    return benchmark!==null&&area!==null?rentalRangeForArea(benchmark,area):null;
  }
  applyRent(side:Side,bound:'min'|'max'):void{
    const result=this.estimatedRent(side);
    if(result!==null)this.setCost(side,'housing',result[bound]);
  }
  private async loadFuelSnapshot():Promise<void>{
    try{
      const response=await fetch('/data/province-fuel-latest.json',{cache:'no-cache'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const snapshot=parseFuelSnapshot(await response.json());
      this.fuelData.set(snapshot);
    }catch{
      this.fuelError.set('I prezzi provinciali verificati non sono disponibili. Nessun valore alternativo viene inventato.');
    }finally{this.fuelLoading.set(false);}
  }
  setFuelType(value:unknown):void{
    if(value==='benzina_self'||value==='gasolio_self')this.fuelType.set(value);
  }
  setMonthlyKilometers(value:unknown):void{
    this.monthlyKilometers.set(validMoney(value,20000));
  }
  setFuelConsumption(value:unknown):void{
    this.fuelConsumption.set(validMoney(value,40));
  }
  pricePerLitre(value:number):string{
    return new Intl.NumberFormat('it-IT',{minimumFractionDigits:3,maximumFractionDigits:3}).format(value);
  }
  fuelProvince(side:Side){
    const city=this.city(side);
    return city?fuelForProvince(this.fuelData(),city.province):null;
  }
  fuelObservation(side:Side){
    const province=this.fuelProvince(side);
    return province?province[this.fuelType()]:null;
  }
  fuelMonthlyEstimate(side:Side):number|null{
    const obs=this.fuelObservation(side),km=this.monthlyKilometers(),consumption=this.fuelConsumption();
    return obs&&km!==null&&consumption!==null
      ?monthlyFuelCost(obs.median,km,consumption):null;
  }
  applyFuelEstimate(side:Side):void{
    if(!this.fuelRecent())return;
    const amount=this.fuelMonthlyEstimate(side);
    if(amount!==null)this.setCost(side,'transport',amount);
  }
  private async loadRegionalTaxes():Promise<void>{
    try{
      const response=await fetch('/api/regional-rates');
      if(!response.ok)throw new Error('MEF non disponibile');
      const raw:unknown=await response.json();
      if(raw&&typeof raw==='object'){
        const d=raw as RegionalMefDataset;
        if(d.year===2026&&Array.isArray(d.records))this.regionalTaxData.set(d);
      }
    }catch{/* I netti locali vengono lasciati non calcolabili. */}
  }
  setSalary(value:unknown):void{this.grossSalary.set(validMoney(value,56224));}
  setContribution(value:unknown):void{
    const n=validMoney(value,20);
    if(n!==null)this.salaryContribution.set(n);
  }
  setPaychecks(value:unknown):void{
    const n=Number(value);
    if(n===12||n===13||n===14)this.monthlyPaychecks.set(n);
  }
  cityTax(side:Side){
    const city=this.city(side),salary=this.salaryResult();
    if(!city||!salary||!salary.supported)return null;
    return estimateLocalTaxes2026({
      municipal:city,municipalDataset:this.municipalData(),
      regionalDataset:this.regionalTaxData(),
      region:taxRegionFromProvince(city.province)??'',
      taxableIncome:salary.taxableIncome,
      nationalIrpefDue:salary.nationalIrpefAfterDeductions,
      yearlyBeforeLocal:salary.yearlyBeforeLocalTaxes,
      installments:this.monthlyPaychecks(),
      noDependentChildrenConfirmed:this.noDependentChildren()
    });
  }
  applyEstimatedNet(side:Side):void{
    const local=this.cityTax(side);
    if(local?.complete&&local.monthlyAverageAfterLocal!==null){
      this.setNet(side,local.monthlyAverageAfterLocal);
    }
  }
  city(side:Side):MunicipalRecord|null{return this.cityByCode().get(side==='left'?this.leftCode():this.rightCode())??null;}
  displayCity(city:MunicipalRecord):string {
    return city.municipality.toLocaleLowerCase('it').replace(/(^|[ '\-])([a-zà-ÿ])/g,(_all,prefix:string,ch:string)=>prefix+ch.toLocaleUpperCase('it'));
  }
  name(side:Side):string{return this.city(side)?this.displayCity(this.city(side)!):'Città non scelta';}
  nameRegion(province:string):string{return (taxRegionFromProvince(province)??'Regione non disponibile').replace(/^REGIONE /,'');}
  query(side:Side):string{return side==='left'?this.leftQuery():this.rightQuery();}
  private edited(side:Side){return side==='left'?this.editedLeft:this.editedRight;}
  isEdited(side:Side,key:CostKey):boolean{return this.edited(side)()[key]===true;}
  private makeEssentials(side:Side){
    const code=side==='left'?this.leftCode():this.rightCode();
    if(!tuscanCapitalRentRecord(code))return null;
    return estimateEssentialCosts2026(code,{
      tariAreaSqm:this.tariAreaSqm(),luccaEmptyingsYear:this.luccaEmptyingsYear(),
      waterM3Year:this.autoWaterM3(),
      gasMonthlyScenarioEUR:this.gasMonthlyScenario(),transitPass:this.transitPass(),
      energyProfile:{areaSqm:this.rentAreaSqm()??55,residents:this.energyResidents(),heating:this.heatingChoice()}
    });
  }
  essentialsFor(side:Side){return side==='left'?this.leftEssentials():this.rightEssentials();}
  private tariManualSignal(side:Side){return side==='left'?this.tariManualLeft:this.tariManualRight;}
  private tariIncludedSignal(side:Side){return side==='left'?this.tariIncludedLeft:this.tariIncludedRight;}
  tariManual(side:Side):number|null{return this.tariManualSignal(side)();}
  tariIncluded(side:Side):boolean{return this.tariIncludedSignal(side)();}
  tariMonthly(side:Side):number|null{
    const manual=this.tariManual(side);
    if(manual!==null)return Math.round(manual/12*100)/100;
    return this.essentialsFor(side)?.tari.monthlyEUR??null;
  }
  effectiveBudget(side:Side):CityBudget{
    return budgetWithOptionalTari(this.budget(side),this.tariMonthly(side),this.tariIncluded(side));
  }
  setTariManual(side:Side,value:unknown):void{
    if(value===''||value===null){
      this.tariManualSignal(side).set(null);
      if(this.essentialsFor(side)?.tari.monthlyEUR===null||!this.essentialsFor(side))
        this.tariIncludedSignal(side).set(false);
      this.autoFeedback.set('');
      return;
    }
    const num=validMoney(value,10000);
    if(num===null){this.autoFeedback.set('Importo TARI annuo non valido (0–10.000 €).');return;}
    this.tariManualSignal(side).set(num);
    this.autoFeedback.set('');
  }
  setTariIncluded(side:Side,value:boolean):void{
    if(value&&this.tariMonthly(side)===null){
      this.autoFeedback.set('La quota TARI per questa città non è disponibile: inserisci prima un importo annuo documentato.');
      this.tariIncludedSignal(side).set(false);return;
    }
    this.tariIncludedSignal(side).set(value);
    this.autoFeedback.set('');
  }
  private resetTariSide(side:Side):void{
    this.tariManualSignal(side).set(null);
    this.tariIncludedSignal(side).set(false);
  }
  setTariArea(value:unknown):void{
    const num=validMoney(value,300);
    if(num===null||num<15){this.autoFeedback.set('La superficie TARI deve essere tra 15 e 300 m².');return;}
    this.tariAreaSqm.set(num);this.autoFeedback.set('');
  }
  setLuccaEmptyings(value:unknown):void{
    const amount=Number(value);
    if(!Number.isInteger(amount)||amount<6||amount>52){
      this.autoFeedback.set('Per Lucca gli svuotamenti annui dell’indifferenziato devono essere da 6 a 52.');
      return;
    }
    this.luccaEmptyingsYear.set(amount);
    this.autoFeedback.set('');
  }
  setGasScenario(value:unknown):void{
    const n=validMoney(value,1000);
    if(n===null){this.autoFeedback.set('Spesa gas ipotizzata non valida (0–1.000 €).');return;}
    this.gasMonthlyScenario.set(n);this.autoFeedback.set('');
    this.refreshBothSuggestions();
  }
  setEnergyResidents(value:unknown):void{
    const n=Number(value);
    if(!Number.isInteger(n)||n<1||n>5)return;
    this.energyResidents.set(n);
    if(n!==1){this.tariIncludedLeft.set(false);this.tariIncludedRight.set(false);}
    this.refreshBothSuggestions();
  }
  setHeatingChoice(value:unknown):void{
    if(value!=='gas'&&value!=='electric'&&value!=='none')return;
    this.heatingChoice.set(value);this.refreshBothSuggestions();
  }
  setRentBaseline(value:unknown):void{
    if(value!=='contracts2024'&&value!=='asking2026')return;
    this.rentBaseline.set(value);this.refreshBothSuggestions();
  }
  setTransitPass(value:unknown):void{
    if(value==='monthly'||value==='annual'||value==='none'){
      this.transitPass.set(value);this.autoFeedback.set('');
      this.refreshBothSuggestions();
    }
  }
  private makeSuggestions(side:Side):CategorySuggestion[]{
    const code=side==='left'?this.leftCode():this.rightCode();
    if(!this.cityByCode().has(code))return [];
    return suggestSinglePersonCosts(code,this.rentalData(),{
      areaSqm:this.rentAreaSqm()??DEFAULT_SINGLE_PERSON_OPTIONS.areaSqm,
      waterM3PerYear:this.autoWaterM3(),florenceContract:this.florenceContract(),
      gasMonthlyScenarioEUR:this.gasMonthlyScenario(),transitPass:this.transitPass(),
      energyProfile:{areaSqm:this.rentAreaSqm()??55,residents:this.energyResidents(),heating:this.heatingChoice()},
      rentBaseline:this.rentBaseline()
    });
  }
  suggestionsFor(side:Side):CategorySuggestion[]{
    return side==='left'?this.leftSuggestions():this.rightSuggestions();
  }
  coverage(side:Side){return cityDataCoverage(this.suggestionsFor(side));}
  private reliabilityInput(side:Side):ReliabilityInput {
    const code=side==='left'?this.leftCode():this.rightCode();
    const tari=this.essentialsFor(side)?.tari;
    return {
      cityCode:code,
      suggestions:this.suggestionsFor(side),
      expenses:this.effectiveBudget(side).expenses,
      tariIncluded:this.tariIncluded(side),
      manualEdited:this.edited(side)(),
      tariVerifiedOrPersonal:this.tariManual(side)!==null||
        (tari!==null&&tari!==undefined&&tari.monthlyEUR!==null)
    };
  }
  reliability(side:Side){return side==='left'?this.reliabilityLeft():this.reliabilityRight();}
  missingCategoryLabels(side:Side):string{
    const missing=COST_KEYS.filter(k=>this.budget(side).expenses[k]===null);
    return missing.length?missing.map(k=>COST_LABELS[k]).join(', '):'nessun importo mancante';
  }
  kindLabel(kind:CategorySuggestion['kind']):string{
    return ({
      observed:'Contratti storici osservati',derived:'Indicatore derivato da dati pubblici',
      tariff:'Tariffa urbana pubblicata',proxy:'Proiezione nazionale',
      scenario:'Ipotesi illustrativa',mixed:'Tariffa + ipotesi',
      unavailable:'Dato non disponibile'
    } as const)[kind];
  }
  private refreshSideSuggestions(side:Side,force=false):void{
    if(!this.city(side))return;
    const current=this.budget(side);
    const edited=this.edited(side)();
    const next={...current.expenses};
    for(const s of this.suggestionsFor(side)){
      if(!force&&edited[s.key])continue;
      next[s.key]=s.amount;
    }
    this.setBudget(side,{...current,expenses:next});
    if(force)this.edited(side).set({});
  }
  private refreshBothSuggestions():void{
    this.refreshSideSuggestions('left');this.refreshSideSuggestions('right');
  }
  resetAutoCosts(side:Side):void{
    this.refreshSideSuggestions(side,true);
    this.autoFeedback.set('Suggerimenti ripristinati per '+this.name(side)+'. Le entrate nette non sono state modificate.');
  }
  setFlorenceContract(v:unknown):void{
    if(v==='long'||v==='agreed'||v==='temporary'){
      this.florenceContract.set(v);
      this.autoFeedback.set('');
      this.refreshBothSuggestions();
    }
  }
  setAutoWater(v:unknown):void{
    const amount=validMoney(v,500);
    if(amount===null){
      this.autoFeedback.set('Consumo annuo di acqua non valido (0–500 m³).');return;
    }
    this.autoWaterM3.set(amount);
    this.autoFeedback.set('');
    this.refreshBothSuggestions();
  }
  setCommonNet(v:unknown):void{this.commonNet.set(validMoney(v));}
  applyCommonNet():void{
    const n=this.commonNet();
    if(n===null)return;
    this.setNet('left',n);
    this.setNet('right',n);
    this.autoFeedback.set('Stesso netto applicato a entrambe le città.');
  }
  onSearch(side:Side,value:string):void{
    if(side==='left'){this.leftQuery.set(value);this.leftCode.set('');this.leftBudget.set(emptyBudget());this.leftOmi.set(emptyOmi());this.editedLeft.set({});this.resetTariSide('left');}
    else{this.rightQuery.set(value);this.rightCode.set('');this.rightBudget.set(emptyBudget());this.rightOmi.set(emptyOmi());this.editedRight.set({});this.resetTariSide('right');}
    this.shareStatus.set('');
  }
  matches(side:Side):MunicipalRecord[]{
    const q=this.query(side).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('it');
    const selected=this.city(side);
    if(q.length<2||!this.records().length||selected&&this.query(side)===this.displayCity(selected))return [];
    const otherCode=side==='left'?this.rightCode():this.leftCode();
    return this.records().filter(r=>r.code!==otherCode &&
      (r.municipality+' '+r.province).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it').includes(q)).slice(0,12);
  }
  selectCity(side:Side,code:string):void{
    const city=this.cityByCode().get(code);
    if(!city||code===(side==='left'?this.rightCode():this.leftCode()))return;
    if(side==='left'){
      if(this.leftCode()!==code){this.leftBudget.set(emptyBudget());this.leftOmi.set(emptyOmi());this.editedLeft.set({});this.resetTariSide('left');}
      this.leftCode.set(code);this.leftQuery.set(this.displayCity(city));
    }else{
      if(this.rightCode()!==code){this.rightBudget.set(emptyBudget());this.rightOmi.set(emptyOmi());this.editedRight.set({});this.resetTariSide('right');}
      this.rightCode.set(code);this.rightQuery.set(this.displayCity(city));
    }
    this.refreshSideSuggestions(side);
    this.updateUrl();
  }
  selectPair(first:string,second:string,update=true):void{
    const a=this.cityByCode().get(first),b=this.cityByCode().get(second);
    if(!a||!b||first===second)return;
    if(this.leftCode()!==first){this.leftBudget.set(emptyBudget());this.leftOmi.set(emptyOmi());this.editedLeft.set({});this.resetTariSide('left');}
    if(this.rightCode()!==second){this.rightBudget.set(emptyBudget());this.rightOmi.set(emptyOmi());this.editedRight.set({});this.resetTariSide('right');}
    this.leftCode.set(first);this.rightCode.set(second);
    this.leftQuery.set(this.displayCity(a));this.rightQuery.set(this.displayCity(b));
    this.refreshBothSuggestions();
    if(update)this.updateUrl();
  }
  swapCities():void{
    const a=this.leftCode(),b=this.rightCode();
    if(!this.cityByCode().has(a)||!this.cityByCode().has(b))return;
    const leftBudget=this.leftBudget(),rightBudget=this.rightBudget(),leftOmi=this.leftOmi(),rightOmi=this.rightOmi();
    const leftEdited=this.editedLeft(),rightEdited=this.editedRight();
    const leftTariManual=this.tariManualLeft(),rightTariManual=this.tariManualRight();
    const leftTariIncluded=this.tariIncludedLeft(),rightTariIncluded=this.tariIncludedRight();
    this.leftCode.set(b);this.rightCode.set(a);
    this.leftQuery.set(this.displayCity(this.cityByCode().get(b)!));
    this.rightQuery.set(this.displayCity(this.cityByCode().get(a)!));
    this.leftBudget.set(rightBudget);this.rightBudget.set(leftBudget);
    this.leftOmi.set(rightOmi);this.rightOmi.set(leftOmi);
    this.editedLeft.set(rightEdited);this.editedRight.set(leftEdited);
    this.tariManualLeft.set(rightTariManual);this.tariManualRight.set(leftTariManual);
    this.tariIncludedLeft.set(rightTariIncluded);this.tariIncludedRight.set(leftTariIncluded);
    this.updateUrl();
  }
  private updateUrl():void{
    if(!this.leftCode()||!this.rightCode())return;
    void this.router.navigate([],{relativeTo:this.route,
      queryParams:{da:this.leftCode(),a:this.rightCode()},replaceUrl:true});
  }
  async shareCities():Promise<void>{
    if(!this.leftCode()||!this.rightCode()||this.sameCity()){
      this.shareStatus.set('Seleziona due comuni diversi prima di copiare il link.');return;
    }
    const url=new URL('/confronta-citta',window.location.origin);
    url.searchParams.set('da',this.leftCode());url.searchParams.set('a',this.rightCode());
    try{
      await navigator.clipboard.writeText(url.toString());
      this.shareStatus.set('Link copiato: contiene soltanto i due comuni, non i tuoi importi.');
    }catch{this.shareStatus.set('Copia l’indirizzo della pagina per condividere le città.');}
  }
  budget(side:Side):CityBudget{return side==='left'?this.leftBudget():this.rightBudget();}
  private setBudget(side:Side,value:CityBudget):void{(side==='left'?this.leftBudget:this.rightBudget).set(value);}
  setNet(side:Side,value:unknown):void{this.setBudget(side,{...this.budget(side),netIncome:validMoney(value)});}
  setCost(side:Side,key:CostKey,value:unknown):void{
    this.edited(side).update(current=>({...current,[key]:true}));
    this.setBudget(side,{...this.budget(side),expenses:{...this.budget(side).expenses,[key]:validMoney(value)}});
  }
  summary(side:Side){return side==='left'?this.comparison().first:this.comparison().second;}
  money(value:number):string{return this.formatter.format(value);}
  percent(value:number):string{return this.formatter.format(value);}
  absolute(value:number):number{return Math.abs(value);}
  signedMoney(value:number):string{return (value>0?'+':'')+this.money(value);}
  barWidth(side:Side,key:CostKey):number{
    const left=this.effectiveBudget('left').expenses[key]??0;
    const right=this.effectiveBudget('right').expenses[key]??0;
    const max=Math.max(left,right);
    if(max===0)return 0;
    return Math.max(0,Math.min(100,(this.effectiveBudget(side).expenses[key]??0)/max*100));
  }
  istatReference(side:Side){const c=this.city(side);return c?regionalFamilySpending(c.province):null;}
  basket(side:Side){return basketForCity(side==='left'?this.leftCode():this.rightCode());}
  omi(side:Side):OmiInputs{return side==='left'?this.leftOmi():this.rightOmi();}
  setOmi(side:Side,key:'sqm'|'minRate'|'maxRate',value:unknown):void{
    const updated={...this.omi(side),[key]:validMoney(value,key==='sqm'?10000:1000)};
    (side==='left'?this.leftOmi:this.rightOmi).set(updated);
  }
  setAreaType(side:Side,value:unknown):void{
    if(value!=='L'&&value!=='N')return;
    (side==='left'?this.leftOmi:this.rightOmi).set({...this.omi(side),areaType:value});
  }
  omiRange(side:Side){const a=this.omi(side);return omiRentalRange(a.sqm,a.minRate,a.maxRate);}
  applyOmi(side:Side,kind:'minimum'|'maximum'):void{
    const r=this.omiRange(side);
    if(r)this.setCost(side,'housing',r[kind]);
  }
}
