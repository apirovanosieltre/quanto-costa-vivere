# QuantoCostaVivere · v0.3

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
| `/stato-dati` | Operativa | Verifica live dell'API Eurostat, disponibilità dataset MEF e provenienza |
| `/fonti-e-metodo` | Operativa | Trasparenza e limiti |

## Cloudflare Workers (Git integration)

Per un progetto creato da **Workers & Pages → Workers** il deploy legge `wrangler.jsonc`.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Output statico: `dist/quanto-costa-vivere/browser`
- Rotte Angular: fallback SPA con `assets.not_found_handling=single-page-application`, senza `_redirects`.
- API `/api/inflation`: entry point `worker/index.ts`, che riutilizza la funzione Eurostat.

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

La verifica produce `mef-validation-report.json` con SHA-256 del CSV e campioni distinti per stato, e `mef-candidate-2026.json` con `published:false`. La GitHub Action settimanale e avviabile manualmente (**Actions → MEF 2026 - controllo dataset → Run workflow**) conserva entrambi i file tra gli artifact, senza pubblicare il dataset. La pubblicazione revisionata sostituisce `public/data/municipal-2026.json`. Prima di fare commit, controlla **report, numero di comuni, casi pendenti, checksum e campioni casuali**. Il file vuoto iniziale (`published:false`) è intenzionale. **L'addizionale regionale NON è implementata**; non è lecito mostrare un netto complessivo. Non aggiungere tassi di una regione basandosi su un unico valore non verificato.

Una GitHub Action `.github/workflows/mef-quality.yml` esegue ogni settimana **solo controllo QA**, senza pubblicazione non revisionata.

Pagine ufficiali: [MEF Comuni](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/tabella.htm), [MEF Regioni](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/tabella.htm).

## Stima stipendio 2026: ipotesi importanti

Solo dipendente privato standard, anno intero di 365 giorni, nessun altro reddito, nessun familiare fiscalmente a carico. Aliquota contributi iniziale **9,19% modificabile**, valida solo come esempio standard. RAL supportata fino a **56.224 €** per evitare stime erronee oltre la soglia del contributo IVS aggiuntivo. Non applica il trattamento integrativo, le addizionali locali, bonus contrattuali, imposte sostitutive, detrazioni personali o conguagli. **Il netto per mensilità è la media matematica annuale prima delle imposte locali, non l'importo effettivo di ogni busta paga.**

Fonti: [art. 13 TUIR](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.articolo.numero=13&atto.codiceRedazionale=086U0917&atto.dataPubblicazioneGazzetta=1986-12-31&vigenza=2026-01-01), [L. 207/2024](https://www.normattiva.it/eli/id/2024/12/31/24G00229/CONSOLIDATED/20251219), [INPS 2026](https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.lavoratori-dipendenti-limite-minimo-di-retribuzione-giornaliera-2026.html).

## Ancora da sviluppare

1. **Regionali MEF** con scaglioni, esenzioni e test per le 19 regioni + province autonome.
2. **OMI**: condizioni di riutilizzo commerciale, estrazione periodica per zone e tipologia.
3. **Statistiche ISTAT specifiche** su spese familiari, prezzi locali disponibili e copertura geografica. La prima integrazione live è Eurostat (dati armonizzati prodotti dai Paesi UE). ISTAT limita il web service SDMX a 5 query/minuto/IP; un'eventuale integrazione futura dovrà usare caching e un dataset specifico con dimensioni verificate.
4. **Ricerca completa comuni**, normalizzazione catastale/ISTAT, mapping regioni e confronto territoriale.
5. **Stipendio netto effettivo**, includendo trattamento integrativo, casi contrattuali, addizionali e agevolazioni.
6. **SEO, accessibilità e privacy**: test browser/axe, pagine dinamiche SEO solo con dati autentici, CMP pubblicitaria se necessaria.

Il progetto non richiede un DB per l'API Eurostat. D1 può essere introdotto successivamente per storicizzare dataset e revisioni senza affidarsi a file statici.
