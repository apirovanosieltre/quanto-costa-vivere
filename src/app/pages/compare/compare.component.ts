import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { validateMunicipalDataset, type MunicipalRecord } from '../../core/municipal-data';
import { taxRegionFromProvince } from '../../core/italian-territories';
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
  <span class="eyebrow eyebrow-subtle">CONFRONTO TRA COMUNI ITALIANI</span>
  <h1>In quale città <span>ti resta di più?</span></h1>
  <p>Confronta il tuo budget mensile tra due città italiane, con le stesse categorie di spesa e il netto che prevedi di ricevere. Prezzi non verificati non vengono inseriti automaticamente.</p>
  <div class="compare-shortcuts" aria-label="Esempi di città">
    <button type="button" (click)="selectPair('F205','F839')">Milano vs Napoli</button>
    <button type="button" (click)="selectPair('A390','D612')">Arezzo vs Firenze</button>
    <button type="button" (click)="swapCities()">Inverti città ↔</button>
    <button type="button" (click)="shareCities()">Copia link alle città</button>
  </div>
  <p class="compare-micro" role="status">{{shareStatus()}}</p>
</section>

<section class="container compare-layout" aria-label="Budget delle due città">
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
      <p class="compare-tiny">Se una spesa non esiste, inserisci <strong>0</strong>. Lascia vuota una voce che non conosci: il confronto resterà parziale.</p>

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
  <h2>La differenza in numeri</h2>
  @if(sameCity()){
    <p class="compare-alert">Scegli due comuni diversi per confrontare le spese.</p>
  } @else if(comparison().expenseDifference!==null){
    <div class="compare-result-cards">
      <div class="compare-kpi">
        <span>Differenza nelle spese mensili · seconda meno prima</span>
        <strong>{{signedMoney(comparison().expenseDifference!)}} €</strong>
        <small>Confronto basato solo sulle cinque categorie compilate per entrambe le città.</small>
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
            <span>{{money(budget('left').expenses[key]!)}} €</span>
          </div>
          <div class="compare-bar-line">
            <span class="compare-bar-name">{{name('right')}}</span>
            <div class="compare-bar-track"><span class="compare-right-bar" [style.width.%]="barWidth('right',key)"></span></div>
            <span>{{money(budget('right').expenses[key]!)}} €</span>
          </div>
        </div>
      }
    </div>
  } @else {
    <div class="compare-intro" role="status">
      <h3>Il confronto si completa con i tuoi importi</h3>
      <p>Compila tutte le cinque voci in entrambe le città, anche con valore 0 quando non applicabile. Non assumiamo che una voce lasciata vuota sia gratuita.</p>
    </div>
  }
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
    .compare-results,.compare-reference,.compare-omi,.compare-footer{margin-top:48px}
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
      .compare-layout,.compare-result-cards{grid-template-columns:1fr}
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
  readonly loading=signal(true);
  readonly error=signal('');
  readonly shareStatus=signal('');
  readonly records=signal<MunicipalRecord[]>([]);
  readonly cityByCode=computed(()=>new Map(this.records().map(x=>[x.code,x])));
  readonly leftCode=signal('F205');
  readonly rightCode=signal('F839');
  readonly leftQuery=signal('Milano');
  readonly rightQuery=signal('Napoli');
  readonly leftBudget=signal<CityBudget>(emptyBudget());
  readonly rightBudget=signal<CityBudget>(emptyBudget());
  readonly leftOmi=signal<OmiInputs>(emptyOmi());
  readonly rightOmi=signal<OmiInputs>(emptyOmi());

  readonly comparison=computed(()=>compareCityBudgets(this.leftBudget(),this.rightBudget()));
  readonly sameCity=computed(()=>this.leftCode()===this.rightCode());
  readonly basketDifference=computed(()=>{
    const a=this.basket('left'),b=this.basket('right');
    return a&&b?Math.round((b.valueEUR-a.valueEUR)*100)/100:null;
  });
  private readonly formatter=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  constructor(private readonly route:ActivatedRoute,private readonly router:Router){}
  ngOnInit():void{void this.loadMunicipalities();}
  async loadMunicipalities():Promise<void>{
    try{
      const response=await fetch('/data/municipal-2026.json',{cache:'no-cache'});
      if(!response.ok)throw new Error('Il catalogo comunale non risponde');
      const dataset=validateMunicipalDataset(await response.json());
      if(!dataset.published)throw new Error('Il catalogo MEF non è stato ancora revisionato');
      this.records.set(dataset.records);
      const da=this.route.snapshot.queryParamMap.get('da')??'F205';
      const a=this.route.snapshot.queryParamMap.get('a')??'F839';
      if(this.cityByCode().has(da)&&this.cityByCode().has(a)&&da!==a)this.selectPair(da,a,false);
      else this.selectPair('F205','F839',false);
    }catch{
      this.error.set('Catalogo dei comuni non disponibile. Il confronto non usa dati dimostrativi: riprova dopo il deploy e verifica lo stato dei dati.');
    }finally{this.loading.set(false);}
  }
  city(side:Side):MunicipalRecord|null{return this.cityByCode().get(side==='left'?this.leftCode():this.rightCode())??null;}
  displayCity(city:MunicipalRecord):string {
    return city.municipality.toLocaleLowerCase('it').replace(/(^|[ '\-])([a-zà-ÿ])/g,(_all,prefix:string,ch:string)=>prefix+ch.toLocaleUpperCase('it'));
  }
  name(side:Side):string{return this.city(side)?this.displayCity(this.city(side)!):'Città non scelta';}
  nameRegion(province:string):string{return (taxRegionFromProvince(province)??'Regione non disponibile').replace(/^REGIONE /,'');}
  query(side:Side):string{return side==='left'?this.leftQuery():this.rightQuery();}
  onSearch(side:Side,value:string):void{
    if(side==='left'){this.leftQuery.set(value);this.leftCode.set('');this.leftBudget.set(emptyBudget());this.leftOmi.set(emptyOmi());}
    else{this.rightQuery.set(value);this.rightCode.set('');this.rightBudget.set(emptyBudget());this.rightOmi.set(emptyOmi());}
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
      if(this.leftCode()!==code){this.leftBudget.set(emptyBudget());this.leftOmi.set(emptyOmi());}
      this.leftCode.set(code);this.leftQuery.set(this.displayCity(city));
    }else{
      if(this.rightCode()!==code){this.rightBudget.set(emptyBudget());this.rightOmi.set(emptyOmi());}
      this.rightCode.set(code);this.rightQuery.set(this.displayCity(city));
    }
    this.updateUrl();
  }
  selectPair(first:string,second:string,update=true):void{
    const a=this.cityByCode().get(first),b=this.cityByCode().get(second);
    if(!a||!b||first===second)return;
    if(this.leftCode()!==first){this.leftBudget.set(emptyBudget());this.leftOmi.set(emptyOmi());}
    if(this.rightCode()!==second){this.rightBudget.set(emptyBudget());this.rightOmi.set(emptyOmi());}
    this.leftCode.set(first);this.rightCode.set(second);
    this.leftQuery.set(this.displayCity(a));this.rightQuery.set(this.displayCity(b));
    if(update)this.updateUrl();
  }
  swapCities():void{
    const a=this.leftCode(),b=this.rightCode();
    if(!this.cityByCode().has(a)||!this.cityByCode().has(b))return;
    const leftBudget=this.leftBudget(),rightBudget=this.rightBudget(),leftOmi=this.leftOmi(),rightOmi=this.rightOmi();
    this.leftCode.set(b);this.rightCode.set(a);
    this.leftQuery.set(this.displayCity(this.cityByCode().get(b)!));
    this.rightQuery.set(this.displayCity(this.cityByCode().get(a)!));
    this.leftBudget.set(rightBudget);this.rightBudget.set(leftBudget);
    this.leftOmi.set(rightOmi);this.rightOmi.set(leftOmi);
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
    this.setBudget(side,{...this.budget(side),expenses:{...this.budget(side).expenses,[key]:validMoney(value)}});
  }
  summary(side:Side){return side==='left'?this.comparison().first:this.comparison().second;}
  money(value:number):string{return this.formatter.format(value);}
  percent(value:number):string{return this.formatter.format(value);}
  absolute(value:number):number{return Math.abs(value);}
  signedMoney(value:number):string{return (value>0?'+':'')+this.money(value);}
  barWidth(side:Side,key:CostKey):number{
    const a=this.leftBudget().expenses[key]??0,b=this.rightBudget().expenses[key]??0;
    const max=Math.max(a,b);
    if(max===0)return 0;
    return Math.max(0,Math.min(100,(this.budget(side).expenses[key]??0)/max*100));
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
