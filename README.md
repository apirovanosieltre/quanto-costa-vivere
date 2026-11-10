# QuantoCostaVivere · v0.4

Portale Angular 22, mobile-first e accessibile, per **budget domestico, IRPEF 2026, stima nazionale da RAL e inflazione ufficiale italiana**. Integra una Cloudflare Pages Function per Eurostat e una pipeline **di acquisizione + validazione** degli elenchi MEF.

> Stato: codice sorgente pronto da caricare su GitHub. **Non è stato verificato un deploy reale Cloudflare né una sincronizzazione live del CSV MEF nell'ambiente di generazione.** Non si afferma che le addizionali siano già pubblicate. Nessun dato dimostrativo viene spacciato per statistica ufficiale.

## Funzionalità

| Route | Stato | Note |
|---|---|---|
| `/` | Operativa | Budget manuale, i valori iniziali sono demo; comune non influenza il budget |
| `/irpef-2026` | Operativa | Imposta lorda nazionale a scaglioni |
| `/stipendio-netto-2026` | Operativa | Stima per caso standard: fino a RAL 56.224 €, **prima di addizionali locali e altre variabili** |
| `/inflazione` | API integrata nel codice | Eurostat ufficiale `prc_hicp_minr`, API Cloudflare `/api/inflation`, serie reale fino a 12 mesi e fallback diretto in sviluppo; **richiede deploy e collaudo live** |
| `/addizionali-comunali` | Pipeline + UI pronte | Nessun valore ufficiale caricato finché non viene importato e revisionato il CSV MEF |
| `/addizionali-regionali` | API MEF integrata | CSV regionale 2026 letto dal Worker e verificato; mostra fasce e disposizioni senza calcolare l'imposta, richiede verifica live dopo deploy |
| `/spese-famiglie` | Dataset ISTAT 2025 | Dati reali dal comunicato ISTAT 8 ottobre 2026, solo regioni citate nella pubblicazione |
| `/quotazioni-omi` | Strumento manuale | Ricerca nel portale ufficiale OMI e calcolo intervallo locazione da quote €/m²/mese inserite dall'utente |
| `/stato-dati` | Operativa | Verifica live dell'API Eurostat, disponibilità dataset MEF e provenienza |
| `/fonti-e-metodo` | Operativa | Trasparenza e limiti |

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

La verifica produce `mef-validation-report.json` con SHA-256 del CSV e campioni distinti per stato, e `mef-candidate-2026.json` con `published:false`. La GitHub Action settimanale e avviabile manualmente (**Actions → MEF 2026 - controllo dataset → Run workflow**) conserva entrambi i file tra gli artifact, senza pubblicare il dataset. La pubblicazione revisionata sostituisce `public/data/municipal-2026.json`. Prima di fare commit, controlla **report, numero di comuni, casi pendenti, checksum e campioni casuali**. Il file vuoto iniziale (`published:false`) è intenzionale. **L'addizionale regionale non è calcolata**: le fasce MEF 2026 sono consultabili senza trasformarle in un netto complessivo. Non aggiungere tassi di una regione basandosi su un unico valore non verificato.

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
- **Le fasce non sono formule fiscali.** Umbria e Valle d'Aosta sono esempi di condizioni aggiuntive: gli importi regionali non sono sottratti automaticamente dalla stima della RAL.

## OMI: intervalli immobiliari

- La pagina `/quotazioni-omi` collega alla ricerca ufficiale per semestre, provincia, comune e zona.
- L'utente riporta valori minimo/massimo di locazione in €/m²/mese, superficie della stessa tipologia (lorda o netta), e riceve un semplice prodotto tra valori e metri quadrati.
- Nessun dato di mercato viene inventato o importato da portali terzi. Il portale non dispone ancora di un'API ufficiale OMI pubblica integrata o di un dataset bulk autorizzato per redistribuzione commerciale.
- I valori OMI non equivalgono a canoni contrattuali effettivi.

Consulta la fonte ufficiale: https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm

## Stima stipendio 2026: ipotesi importanti

Solo dipendente privato standard, anno intero di 365 giorni, nessun altro reddito, nessun familiare fiscalmente a carico. Aliquota contributi iniziale **9,19% modificabile**, valida solo come esempio standard. RAL supportata fino a **56.224 €** per evitare stime erronee oltre la soglia del contributo IVS aggiuntivo. Non applica il trattamento integrativo, le addizionali locali, bonus contrattuali, imposte sostitutive, detrazioni personali o conguagli. **Il netto per mensilità è la media matematica annuale prima delle imposte locali, non l'importo effettivo di ogni busta paga.**

Fonti: [art. 13 TUIR](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.articolo.numero=13&atto.codiceRedazionale=086U0917&atto.dataPubblicazioneGazzetta=1986-12-31&vigenza=2026-01-01), [L. 207/2024](https://www.normattiva.it/eli/id/2024/12/31/24G00229/CONSOLIDATED/20251219), [INPS 2026](https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.lavoratori-dipendenti-limite-minimo-di-retribuzione-giornaliera-2026.html).

## Ancora da sviluppare

1. **Calcolo regionale MEF** con modellazione e revisione legale di scaglioni, esenzioni e detrazioni per tutte le regioni e province autonome (la sola consultazione del CSV è integrata).
2. **OMI**: condizioni di riutilizzo commerciale, estrazione periodica bulk per zone e tipologia (consultazione ufficiale e calcolatore manuale disponibili).
3. **ISTAT SDMX**: completare tutte le regioni e aggiornare i dati annuali tramite un dataflow selezionato e verificato; oggi è disponibile uno snapshot ufficiale 2025 parziale. ISTAT limita il servizio a 5 query/minuto/IP: l'integrazione richiederà caching e controlli.
4. **Ricerca completa comuni**, normalizzazione catastale/ISTAT, mapping regioni e confronto territoriale.
5. **Stipendio netto effettivo**, includendo trattamento integrativo, casi contrattuali, addizionali e agevolazioni.
6. **SEO, accessibilità e privacy**: test browser/axe, pagine dinamiche SEO solo con dati autentici, CMP pubblicitaria se necessaria.

Il progetto non richiede un DB per l'API Eurostat. D1 può essere introdotto successivamente per storicizzare dataset e revisioni senza affidarsi a file statici.
