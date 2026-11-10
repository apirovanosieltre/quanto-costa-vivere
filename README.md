# QuantoCostaVivere · v0.8

Portale Angular 22, mobile-first e accessibile, per **confronto del costo della vita tra città, budget domestico, IRPEF 2026, stima RAL e inflazione ufficiale italiana**. Integra una Cloudflare Pages Function per Eurostat e una pipeline **di acquisizione + validazione** degli elenchi MEF.

> Stato: repository GitHub con verifiche CI. CSV MEF comunale 2026 acquisito tramite GitHub Actions e revisionato tecnicamente contro lo schema ufficiale, con hash sorgente fissato e campioni verificati. **La revisione è tecnica e a campione, non un parere fiscale su tutte le 7.897 delibere.** Nessun deploy Cloudflare è stato certificato dall'ambiente di generazione.

## Funzionalità

| Route | Stato | Note |
|---|---|---|
| `/` | Operativa | Budget manuale, i valori iniziali sono demo; comune non influenza il budget |
| `/confronta-citta` | Operativa | Due comuni MEF (7.897), budget personalizzato e RAL se verificata, OMI manuale, ISTAT, paniere campione e **prezzi provinciali dei carburanti MIMIT via optenergy** |
| `/irpef-2026` | Operativa | Imposta lorda nazionale a scaglioni |
| `/stipendio-netto-2026` | Operativa | Netto nazionale con comunali semplici revisionate e regionali verificate: Lombardia, Toscana, Emilia-Romagna, Liguria, Piemonte (senza figli a carico) e Valle d'Aosta; **netto completo solo con entrambe le addizionali disponibili** |
| `/inflazione` | API integrata nel codice | Eurostat ufficiale `prc_hicp_minr`, API Cloudflare `/api/inflation`, serie reale fino a 12 mesi e fallback diretto in sviluppo; **richiede deploy e collaudo live** |
| `/addizionali-comunali` | Snapshot revisionato | 7.897 comuni, 3.294 aliquote semplici calcolabili, 810 da verificare e 3.793 pendenti `0*` alla data del CSV 10/11/2026 |
| `/addizionali-regionali` | API MEF integrata | CSV MEF 2026 e calcolatore per sei profili regionali revisionati, con dettaglio delle fasce e conferma IRPEF netta dovuta |
| `/spese-famiglie` | Dataset ISTAT 2025 | Dati reali dal comunicato ISTAT 8 ottobre 2026, solo regioni citate nella pubblicazione |
| `/quotazioni-omi` | Strumento manuale | Ricerca nel portale ufficiale OMI e calcolo intervallo locazione da quote €/m²/mese inserite dall'utente |
| `/stato-dati` | Operativa | Verifica live dell'API Eurostat, disponibilità dataset MEF e provenienza |
| `/fonti-e-metodo` | Operativa | Trasparenza e limiti |

## Confronta città: metodi, fonti e limiti

La pagina `/confronta-citta` è una **simulazione personalizzata**, non una classifica automatica di affitti o prezzi locali:

- Selezione da 7.897 comuni presenti nel catalogo pubblico MEF 2026, con codici catastali. Gli stessi codici nei parametri URL `?da=F205&a=F839` permettono di condividere **solo la coppia di comuni**, mai entrate o importi privati.
- Due budget indipendenti: stipendio/entrate nette, casa, utenze, alimentari, trasporti e altre spese. La cifra zero è valida **solo quando inserita esplicitamente**. Campi vuoti producono un confronto parziale, mai totali o residui fasulli.
- Differenza mensile tra i due totali e differenza nel residuo soltanto quando ci sono tutti i valori necessari. Non eseguiamo assunzioni generiche sui consumi di una persona o sulle differenze di prezzo tra città.
- Simulazione opzionale della **stessa RAL** nelle due città: usa il motore fiscale nazionale 2026, dati comunali MEF revisionati e profili regionali verificati. Un netto locale è mostrato soltanto quando entrambe le addizionali sono disponibili; poi l'utente può applicarlo volontariamente al budget. Per il Piemonte senza figli a carico è richiesta conferma esplicita.
- I prezzi dei **carburanti self-service** sono mediane provinciali reali MIMIT (elaborazione optenergy), accompagnate da data, numero di distributori e quartili; la loro applicazione al budget è volontaria e richiede km e consumi dell'auto.
- Le quotazioni **OMI** sono ricavate manualmente dall'utente per la zona, tipologia, superficie e semestre selezionati sul sito dell'Agenzia delle Entrate. Si possono applicare i valori minimo o massimo al proprio budget con un clic; non esiste importazione automatica dei prezzi.
- I riferimenti **ISTAT 2025** disponibili sono medie familiari per **8 regioni esplicitamente citate**, non importi delle città. Sono mostrati come informazioni di contesto, non sommati nel budget.
- Per 6 comuni con valori esplicitamente riportati dalla sintesi dell'indagine **Codacons 2025** dell'Ufficio statistico della Regione Puglia, viene visualizzato il costo del paniere campione di 28 alimentari + 11 servizi. Non rappresenta il costo mensile di vita, né viene inserito nel budget. Le cifre arrotondate dalla pubblicazione sono indicate come approssimative.
- Nessun login, database o raccolta dei numeri personali. Le spese restano in memoria del browser durante la sessione e non vengono condivise da URL.

Fonti:
- ISTAT, consumi famiglie 2025: https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/
- CODACONS 2025, sintesi Ufficio statistico Regione Puglia (13/01/2026): https://press.regione.puglia.it/web/ufficio-statistico/-/codacons.-i-prezzi-di-beni-e-servizi-nelle-principali-citta-italiane.-anno-2025
- Agenzia Entrate OMI: https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm

**Limite attuale:** non disponiamo di dati automaticamente riutilizzabili e verificati su affitti e prezzi di ogni singolo comune. Evitiamo di generare migliaia di pagine SEO vuote o inventate; il comparatore ha una singola pagina indicizzabile, con parametri per le coppie selezionate. L'espansione delle schede città richiederà dataset locali realmente pubblicabili.

## Prezzi territoriali dei carburanti: fonte, aggiornamento e limiti

- Fonte primaria **MIMIT**, prezzi comunicati dagli impianti di distribuzione carburanti (IODL 2.0):
  https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti
- Dataset **provinciale aggregato da optenergy** (CC BY 4.0): https://optenergy.it/dati/
  CSV `carburanti-province-ultimo-anno.csv` con giorno, sigla, nome provincia, tipo di carburante, numero di impianti, mediana, primo e terzo quartile.
- `scripts/fuel-province.mjs` valida schema, valori, date, unità EUR/l, copertura minima e congruenza statistica; `scripts/sync-fuel-province.mjs` prende **solo l'ultimo giorno effettivamente disponibile**, senza spacciare la data del download per data rilevazione.
- Il risultato è salvato in `public/data/province-fuel-latest.json`, piccolo JSON statico con 110 province nel primo snapshot (rilevazione **8 novembre 2026**). I dati non sono riferiti al singolo comune: entrambi i comuni della stessa provincia visualizzano gli stessi dati aggregati.
- GitHub Actions `.github/workflows/fuel-source-quality.yml` esegue controlli e aggiornamento giornalieri. In caso di sorgente non valida il nuovo JSON non viene pubblicato. Un nuovo periodo comporta un commit sul branch previsto; Cloudflare distribuisce il file con la successiva build.
- Nel comparatore seleziona **benzina self** oppure **gasolio self**, inserisci km/mese e litri/100 km per stimare la spesa in carburante. Il prezzo mediano provinciale è osservato, **i chilometri e i consumi sono personali**. Il pulsante applica volontariamente la stima alla voce Trasporti del budget, che deve essere integrata manualmente con eventuali altre spese.
- Uno snapshot di oltre 14 giorni è mostrato come dato storico ma non può essere applicato automaticamente al budget.
- **Non** sono inclusi automaticamente affitti, utenze, parcheggi, pedaggi o spesa alimentare per comune, poiché non abbiamo ancora verificato una fonte riutilizzabile con tale granularità. Le quotazioni OMI restano manuali sino a verifica delle condizioni di redistribuzione.

### Aggiornamento e test

```bash
node --test scripts/fuel-province.test.mjs
node scripts/sync-fuel-province.mjs
npm test
npm run build
```

I dati aggregati sono distribuiti mantenendo la fonte e l'attribuzione, secondo la licenza CC BY 4.0.

## Cloudflare Workers (Git integration)

Per un progetto creato da **Workers & Pages → Workers** il deploy legge `wrangler.jsonc`.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Output statico: `dist/quanto-costa-vivere/browser`
- Rotte Angular: fallback SPA con `assets.not_found_handling=single-page-application`, senza `_redirects`.
- API `/api/inflation`, `/api/household-spending` e `/api/regional-rates`: entry point `worker/index.ts`, con tre moduli riutilizzabili come Pages Functions.

**Non inserire `/* /index.html 200` in `public/_redirects`**: il deploy Workers rileva una regola circolare e fallisce con codice 100324.

Le istruzioni **Cloudflare Pages** qui sotto sono un'alternativa per un progetto creato specificamente come Pages, con Pages Functions.

## Esecuzione Angular

Richiede Node **>= 22.22.3** o una release di Node 24 compatibile con Angular 22.

```bash
npm install
npm start
```

Apri `http://localhost:4200`. Con `ng serve` **la funzione Cloudflare non viene eseguita**: la pagina inflazione prova direttamente l'API Eurostat; alcuni browser potrebbero bloccare la richiesta cross-origin. Il comportamento previsto in produzione passa dalla Pages Function.

```bash
npm run build
npm test
npm run test:mef
```

### Cloudflare Pages (con Functions)

- Connetti il repository GitHub a **Workers & Pages → Pages**.
- Build command: `npm install && npm run build`
- Output directory: `dist/quanto-costa-vivere/browser`
- Root directory: `/`
- Il progetto contiene `functions/api/inflation.ts`: Cloudflare Pages Functions deve essere attivo (non utilizzare esclusivamente il caricamento statico di `dist`).
- La Pages Function usa cache edge di 6 ore, limita a 10 secondi l'attesa Eurostat e restituisce **HTTP 503 con nessun dato fittizio** quando la fonte non risponde.
- Nessuna chiave API, D1 o servizio commerciale richiesto per l'inflazione.

Endpoint dopo il deploy: `https://costovita.cicioweb.app/api/inflation` (JSON con `period`, `annualRate`, `history` [fino a 12 mesi effettivi], `sourceUpdatedAt`, `retrievedAt`, `sourceUrl`). Se Eurostat non è raggiungibile, risponde 503 senza dati simulati. Il percorso `/stato-dati` verifica l'API ad ogni apertura, non si basa su uno stato hardcoded.

## Fonte Eurostat: integrazione reale del codice

Endpoint interrogato dal backend:

```
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=IT&coicop18=TOTAL&unit=RCH_A&freq=M&lastTimePeriod=12&lang=EN
```

- **prc_hicp_minr**: dataset attuale che sostituisce l'archiviato `prc_hicp_manr`.
- **coicop18=TOTAL**: intero paniere secondo ECOICOP v2 (2026).
- **RCH_A**: variazione annuale percentuale, non variazione mensile.
- **IT**: dato nazionale, **non attribuibile a singolo comune**.
- Parser JSON-stat con verifica esplicita di dimensioni, unità e valori. Se il dato più recente manca, usa l'ultimo mese disponibile *dichiarandone il periodo*.

Fonti:
- [Eurostat HICP informazioni](https://ec.europa.eu/eurostat/web/hicp/information-data)
- [Documentazione Statistics API](https://ec.europa.eu/eurostat/en/web/user-guides/data-browser/api-data-access/api-getting-started/api)

## MEF: importazione con validazione (non pubblicata automaticamente)

Fonte ufficiale comunale 2026:

```
https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=2026
```

Il MEF pubblica elenchi CSV e **FLAG_NUOVA**. Lo script supporta CSV con virgolette, separatori e più codifiche, riconosce unicamente le ipotesi 1/2 (aliquota unica, con o senza esenzione generale), blocca 0*, regole a scaglioni, esenzioni speciali e dati ambigui. **La struttura delle aliquote non è stata collaudata contro il CSV corrente: un controllo umano è obbligatorio prima della pubblicazione.**

```bash
# Scarica, controlla struttura e genera report QA (NON pubblica):
npm run data:mef:check

# Alternativa se il sito MEF blocca il fetch automatico: scarica il CSV con browser
node scripts/sync-mef.mjs --file ./Add_comunale_irpef2026.csv

# SOLO DOPO aver confrontato le aliquote del report con la fonte ufficiale:
node scripts/sync-mef.mjs --file ./Add_comunale_irpef2026.csv --publish --reviewed
```

La verifica produce `mef-validation-report.json` con SHA-256 del CSV e campioni distinti per stato, e `mef-candidate-2026.json` con `published:false`. È stato revisionato tecnicamente lo schema CSV 2026: 34 colonne con `FLAG_NUOVA`, aliquota unica (flag 1), aliquota + esenzione generale (flag 2), controllo incrociato di importo esente e descrizione. Note straordinarie, aliquote zero, scaglioni, esenzioni speciali e `0*` sono bloccati o pendenti. La GitHub Action settimanale e avviabile manualmente (**Actions → MEF 2026 - controllo dataset → Run workflow**) conserva entrambi i file tra gli artifact, senza pubblicare il dataset. La pubblicazione revisionata sostituisce `public/data/municipal-2026.json`, richiede un checksum **identico** a `scripts/mef-reviewed-2026.json`, i conteggi uguali e tutti i comuni campione coerenti. **Qualunque cambiamento al CSV richiede una nuova revisione prima di ripubblicare**. La revisione 10/11/2026 copre 16 campioni, tra aliquote semplici, esenzioni, casi speciali e `0*`. I casi complessi non forniscono aliquote nel JSON. Il file vuoto iniziale (`published:false`) è intenzionale. **L'addizionale regionale non è calcolata per tutte le regioni**: il simulatore include i profili progressivi di Lombardia, Toscana, Emilia-Romagna, Liguria e Piemonte (senza figli a carico) e la regola della Valle d'Aosta. Gli altri enti restano consultabili senza trasformarli in un netto complessivo. Non aggiungere tassi di una regione basandosi su un unico valore non verificato.

Una GitHub Action `.github/workflows/mef-quality.yml` esegue ogni settimana **solo controllo QA**, senza pubblicazione non revisionata.

Pagine ufficiali: [MEF Comuni](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/tabella.htm), [MEF Regioni](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/tabella.htm).

## ISTAT: spese delle famiglie, dati 2025 verificabili

- Pagina `/spese-famiglie` e endpoint `/api/household-spending`.
- Snapshot versionato della pubblicazione ISTAT dell'8 ottobre 2026, riferimento anno 2025.
- Media nazionale 2.782 €/mese per famiglia, mediana 2.338 €/mese, consumi alimentari 552 €/mese, affitto medio delle sole famiglie in affitto 438 €/mese.
- Per le regioni pubblichiamo soltanto i valori esplicitamente riportati nel comunicato (8 regioni), senza ricostruire le restanti.
- Licenza ISTAT CC BY 4.0, con attribuzione alla fonte. Non è un dataset live SDMX: per quello serve individuare un dataflow specifico e validare dimensioni e filtri. Per evitare i limiti del servizio ISTAT, l'endpoint distribuisce uno snapshot locale.

Fonte: https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/

## MEF regionali: consultazione delle fasce e verifica della fonte

- Il CSV regionale 2026 ufficiale è reperibile su `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/download.php?anno=2026&tipo=reg`.
- L'API Worker `/api/regional-rates` recupera le righe, valida il tracciato a 9 colonne, la struttura delle aliquote e l'annualità, quindi restituisce le disposizioni testuali e le fasce. Cache edge 12 ore.
- Se il download fallisce o cambia il formato, risposta 503 senza aliquote sostitutive.
- La GitHub Action MEF produce anche `mef-regional-report.json` con hash SHA-256, intestazioni ed esempi, senza pubblicare aliquote comunali non revisionate.
- **Le fasce MEF non bastano sempre per calcolare l'imposta.** Il motore riconosce solo sei profili verificati, controllando aliquote, soglie, norme e condizioni. Le quote sono tassate progressivamente. Umbria e altri enti con regole particolari rimangono non calcolabili.

## Addizionale regionale 2026: calcolo dettagliato

Il sito calcola le fasce progressive solo per i profili confrontati con il CSV MEF 2026 e fonti regionali:
- **Lombardia**: 1,23% fino a 15.000 €, 1,58% tra 15.000 e 28.000 €, 1,72% tra 28.000 e 50.000 €, 1,73% oltre.
- **Toscana**: 1,42%, 1,43%, 3,32%, 3,33% sulle medesime quattro fasce.
- **Emilia-Romagna**: 1,33%, 1,93%, 2,78%, 3,33% sulle quattro fasce.
- **Piemonte**: 1,62%, 2,68%, 3,31%, 3,33%; calcolo solo previa conferma di assenza di figli a carico (sono previste detrazioni regionali).
- **Liguria**: 1,23% fino a 28.000 €, 3,18% tra 28.000 e 50.000 €, 3,23% oltre.
- **Valle d'Aosta**: esenzione fino a 15.000 €, aliquota 1,23% sull'intero imponibile oltre.

I profili verificano l'impronta SHA-256 del CSV ufficiale MEF 2026 approvato (cc7125ce020a754bb519d2ea2803c7fc81d8f92af040623cd6e7953c2dca25be), oltre a fasce, aliquote e norme attese. Ogni modifica causa un calcolo non disponibile. La verifica non sostituisce un parere fiscale.

La pagina addizionali-regionali chiede conferma che l'IRPEF nazionale netta sia dovuta, e per il Piemonte conferma dell'assenza di figli a carico. Il simulatore stipendio collega il comune alla regione tramite il codice di provincia e non mostra il netto dopo addizionali se manca uno dei due importi.

Fonti:
- Lombardia https://www.regione.lombardia.it/bollo-auto-e-tributi-regionali/red-addizionale-regionale-irpef
- Toscana CSV ufficiale MEF e l.r. 28/12/2023 n. 48
- Emilia-Romagna https://finanze.regione.emilia-romagna.it/tributi-regionali/imposte/addizionale-irpef/quanto-come-e-quando-si-paga
- Liguria https://www.regione.liguria.it/homepage-pagamenti-online-imposte/cosa-cerchi/irpef_addizionale_regionale_imposta_reddito/irpef-2025.html
- Piemonte https://www.regione.piemonte.it/web/temi/tributi/addizionali-regionali/addizionale-regionale-allirpef
- MEF https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/tabella.htm

## OMI: intervalli immobiliari

- La pagina `/quotazioni-omi` collega alla ricerca ufficiale per semestre, provincia, comune e zona.
- L'utente riporta valori minimo/massimo di locazione in €/m²/mese, superficie della stessa tipologia (lorda o netta), e riceve un semplice prodotto tra valori e metri quadrati.
- Nessun dato di mercato viene inventato o importato da portali terzi. Il portale non dispone ancora di un'API ufficiale OMI pubblica integrata o di un dataset bulk autorizzato per redistribuzione commerciale.
- I valori OMI non equivalgono a canoni contrattuali effettivi.

Consulta la fonte ufficiale: https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm

## Stima stipendio 2026: ipotesi importanti

Solo dipendente privato standard, anno intero di 365 giorni, nessun altro reddito, nessun familiare fiscalmente a carico. Aliquota contributi iniziale **9,19% modificabile**, valida solo come esempio standard. RAL supportata fino a **56.224 €** per evitare stime erronee oltre la soglia del contributo IVS aggiuntivo. Non applica il trattamento integrativo, bonus contrattuali, imposte sostitutive, detrazioni personali o conguagli. **Il netto per mensilità è una media matematica annuale; le addizionali locali sono sottratte solo quando entrambe calcolabili, non è una previsione del cedolino.**

Fonti: [art. 13 TUIR](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.articolo.numero=13&atto.codiceRedazionale=086U0917&atto.dataPubblicazioneGazzetta=1986-12-31&vigenza=2026-01-01), [L. 207/2024](https://www.normattiva.it/eli/id/2024/12/31/24G00229/CONSOLIDATED/20251219), [INPS 2026](https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.lavoratori-dipendenti-limite-minimo-di-retribuzione-giornaliera-2026.html).

## Ancora da sviluppare

1. **Calcolo regionale MEF** completo: attualmente sei profili sono calcolabili. Restano regioni con eccezioni, esenzioni e detrazioni da modellare con test dedicati.
2. **OMI**: condizioni di riutilizzo commerciale, estrazione periodica bulk per zone e tipologia (consultazione ufficiale e calcolatore manuale disponibili).
3. **ISTAT SDMX**: completare tutte le regioni e aggiornare i dati annuali tramite un dataflow selezionato e verificato; oggi è disponibile uno snapshot ufficiale 2025 parziale. ISTAT limita il servizio a 5 query/minuto/IP: l'integrazione richiederà caching e controlli.
4. **Anagrafica territoriale completa**: controllo provincia-regione già introdotto; resta l'importazione ISTAT per le riorganizzazioni provinciali.
5. **Stipendio netto effettivo**, includendo trattamento integrativo, casi contrattuali, addizionali e agevolazioni.
6. **SEO, accessibilità e privacy**: test browser/axe, pagine dinamiche SEO solo con dati autentici, CMP pubblicitaria se necessaria.

Il progetto non richiede un DB per l'API Eurostat. D1 può essere introdotto successivamente per storicizzare dataset e revisioni senza affidarsi a file statici.

## Pubblicazione revisionata: snapshot fiscale 2026
\n- Sorgente ufficiale MEF 10/11/2026, SHA-256: `831bcd85bb9f6e4b5b8e7eb7bc05ccbc5452d92e07d3873c187d0922c6e828be`.\n- Manifesto `scripts/mef-reviewed-2026.json`, 16 casi di confronto, report `7897` righe (`3294` semplici; `810` da verificare; `3793` pendenti).\n- Il file `public/data/municipal-2026.json` pubblica l'elenco completo con **importi calcolabili solo per le 3.294 aliquote semplici**. `published:true` certifica il controllo tecnico del tracciato e dei campioni, non una validazione legale di tutte le delibere.\n- Le pagine calcolo comunale e RAL richiedono presenza di IRPEF nazionale netta dovuta: in assenza, non è dovuta l'addizionale. Nel simulatore RAL è obbligatoria anche la conferma dell'associazione regione/comune.\n- **Non** fare un nuovo `npm run data:mef:publish` se il CSV è cambiato: il comando bloccherà la pubblicazione fino a una nuova verifica del file e del manifesto.\n- Le stime fiscali non sostituiscono il cedolino: le maggiorazioni, gli acconti, i conguagli e agevolazioni personali non sono riprodotti.\n