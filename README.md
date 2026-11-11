# QuantoCostaVivere · v1.7

Portale Angular 22, mobile-first e accessibile, per **confronto del costo della vita tra città, budget domestico, IRPEF 2026, stima RAL e inflazione ufficiale italiana**. Integra una Cloudflare Pages Function per Eurostat e una pipeline **di acquisizione + validazione** degli elenchi MEF.

> Stato: repository GitHub con verifiche CI. CSV MEF comunale 2026 acquisito tramite GitHub Actions e revisionato tecnicamente contro lo schema ufficiale, con hash sorgente fissato e campioni verificati. **La revisione è tecnica e a campione, non un parere fiscale su tutte le 7.897 delibere.** Nessun deploy Cloudflare è stato certificato dall'ambiente di generazione.

## Funzionalità

| Route | Stato | Note |
|---|---|---|
| `/` | Operativa | Budget manuale, i valori iniziali sono demo; comune non influenza il budget |
| `/costo-vita-firenze-persona-sola` | Pilota automatico | Scenario per una persona, fonti Regione Toscana 2024, Publiacqua 2026, Autolinee Toscane, ISTAT 2025 + ipotesi editoriali esplicite | 
| `/confronta-citta` | Operativa | Due comuni MEF (7.897), **suggerimenti automatici per persona sola** (affitti storici dei 10 capoluoghi toscani e indicatore OMI aggregato Milano; casa non disponibile per gli altri comuni), budget personalizzato, RAL se verificata, OMI manuale, ISTAT e carburanti MIMIT |
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
- Per **Milano** viene mostrato un benchmark derivato e aggregato da 40 zone OMI (2025/2, abitazioni civili stato normale, superficie lorda), senza distribuire i singoli valori della banca dati. Per gli altri comuni le quotazioni **OMI** sono ricavate manualmente dall'utente per la zona, tipologia, superficie e semestre selezionati sul sito dell'Agenzia delle Entrate. Si possono applicare i valori minimo o massimo al proprio budget con un clic; non esiste importazione automatica dei prezzi.
- I riferimenti **ISTAT 2025** disponibili sono medie familiari per **8 regioni esplicitamente citate**, non importi delle città. Sono mostrati come informazioni di contesto, non sommati nel budget.
- Per 6 comuni con valori esplicitamente riportati dalla sintesi dell'indagine **Codacons 2025** dell'Ufficio statistico della Regione Puglia, viene visualizzato il costo del paniere campione di 28 alimentari + 11 servizi. Non rappresenta il costo mensile di vita, né viene inserito nel budget. Le cifre arrotondate dalla pubblicazione sono indicate come approssimative.
- Nessun login, database o raccolta dei numeri personali. Le spese restano in memoria del browser durante la sessione e non vengono condivise da URL.

Fonti:
- ISTAT, consumi famiglie 2025: https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/
- CODACONS 2025, sintesi Ufficio statistico Regione Puglia (13/01/2026): https://press.regione.puglia.it/web/ufficio-statistico/-/codacons.-i-prezzi-di-beni-e-servizi-nelle-principali-citta-italiane.-anno-2025
- Agenzia Entrate OMI: https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm

**Limite attuale:** non disponiamo di dati automaticamente riutilizzabili e verificati su affitti e prezzi di ogni singolo comune. Evitiamo di generare migliaia di pagine SEO vuote o inventate; il comparatore ha una singola pagina indicizzabile, con parametri per le coppie selezionate. L'espansione delle schede città richiederà dataset locali realmente pubblicabili.

## Confronto assistito per persona sola, capoluoghi toscani e Milano

La pagina principale `/confronta-citta` ora suggerisce automaticamente cinque macro-categorie di spesa per una **persona sola in affitto**, con superficie comune di riferimento (55 m², modificabile). Il risultato è un *budget di scenario*, non un costo della vita ufficiale né una classifica delle città.

- **Dieci capoluoghi toscani**: affitto da nuovi contratti registrati 2024 nel rapporto Regione Toscana «Abitare in Toscana 2025» (tabella 2.2, pagina 35), con un unico metodo per i capoluoghi Arezzo, Firenze, Grosseto, Livorno, Lucca, Massa, Pisa, Pistoia, Prato e Siena. Soltanto per Firenze: quota idrica Publiacqua 2026 con consumo iniziale 45 m³/anno e trasporto urbano Autolinee Toscane (42,20 €). Per alimentari rimane un proxy nazionale ISTAT e per altre spese ipotesi dichiarate.
- **Milano**: intervallo OMI 2025/2 già revisionato e pubblicato come indicatore comunale aggregato. Per il budget usiamo il **punto medio dei due limiti aggregati** soltanto come scelta di scenario, non un affitto mediano. Trasporto urbano mensile ordinario ATM **39 €**; alimentari ISTAT e bollette/altre spese restano proxy o ipotesi. Fonte ATM: https://www.atm.it/it/ViaggiaConNoi/Abbonamenti/Pagine/Tipologie.aspx
- **Altri comuni**, inclusi quelli non capoluogo nelle province toscane: affitto sconosciuto e lasciato `null`, mai 0 o stimato da dati di altre città. Sono proposte le ipotesi nazionali per utenze, alimentari, mobilità e altri costi, sempre con indicazione di bassa attendibilità. I totali non sono considerati completi finché l'affitto non viene inserito dall'utente.
- Ogni macro-categoria espone nel pannello **Origine dei suggerimenti**: importo proposto, fonte, periodo, ambito territoriale, tipo e attendibilità. I valori modificati manualmente **non vengono sovrascritti** dai cambiamenti di superficie o fonte; il pulsante *Ripristina suggerimenti* li reimposta esplicitamente.
- Modifica superficie, tipologia di contratto nei capoluoghi toscani, consumo d'acqua a Firenze e inserisci, facoltativamente, lo stesso reddito netto per i due comuni. Le simulazioni fiscali e le schede di dettaglio OMI/carburanti restano accessibili più in basso.
- Il riepilogo ad apertura pagina mostra il totale o segnala l'importo mancante. Tra i dieci capoluoghi toscani presenta un **delta dell'affitto storico direttamente confrontabile** (stesso report, tipologia di contratto e superficie). Per Firenze vs Milano avvisa che **le fonti sugli affitti non sono metodologicamente omogenee** (contratti 2024 vs indicatori OMI 2025/2). Non usarlo per dedurre la convenienza generale di una città.
- Test automatici `src/app/core/automatic-city-compare.spec.ts` validano valori, fonte, copertura, affitti mancanti, scenario con metrature diverse e messaggi di comparabilità.

**Principio UX:** l'utente comincia da importi suggeriti e decide se correggerli, anziché compilare tutte le categorie. Il sito non spaccia ipotesi nazionali per prezzi realmente osservati in città.

## Aggiornamento fonti e qualità del confronto (v1.5)

**Aggiornamenti automatici sicuri, senza API a pagamento:**

| Fonte | Frequenza automatica | Risultato |
|---|---|---|
| Carburanti per provincia (optenergy su MIMIT, licenza CC BY 4.0) | Ogni giorno | Nuovo JSON pubblicato su GitHub solo dopo validazione tecnica e temporale (schema, prezzi, date, province) |
| Acqua 2026, 7 gestori / 10 capoluoghi toscani | Ogni lunedì | Impronte PDF e pagine ufficiali e presenza delle cifre note; cambiamenti -> una PR di revisione, **non cambiano automaticamente le tariffe** |
| Affitti storici Toscana, TARI Arezzo, abbonamenti urbani, riferimento luce/gas ARERA, spese famiglie ISTAT | Ogni martedì, 06:43 UTC | Controllo di 7 documenti ufficiali; impronta SHA-256/estratti circostanti i valori già verificati; una sola PR di revisione in caso di cambiamenti |
| Pubblicazioni per un nuovo anno (2027+) | Ogni gennaio | GitHub issue di revisione annuale, per cercare **nuovi documenti** anche se quelli vecchi non cambiano |

Workflow: `.github/workflows/official-cost-source-audit.yml`; script:
`scripts/audit-official-cost-sources.mjs`; baseline:
`data/official-cost-source-hashes.json`.

L'obiettivo non è pubblicare automaticamente un prezzo preso da una pagina modificata: una
nuova pubblicazione può cambiare **anno, tipologia di contratto, misure, base imponibile,
unità, componenti incluse e tariffe**. Solo gli aggregati strutturati con controlli
vincolanti (attualmente i carburanti) vengono pubblicati senza revisione umana.
Se il bot non ha il permesso di creare una PR, prova a creare una issue unica: il
funzionamento dipende dalle autorizzazioni GitHub del repository. L'esecuzione del
monitor non prova che il deploy Cloudflare sia già aggiornato.

**Nuovo pannello "Quanto è completo il confronto?" in `/confronta-citta`:**
- Per ogni città separa **scenario compilato** (cinque macro-categorie con numeri)
  da dati territoriali verificati: un importo compilato non equivale a un prezzo osservato.
- Evidenzia affitti storici (Toscana **2024**, OMI Milano **2025/2**), TARI non
  inclusa, utenze ARERA per soli vulnerabili, gas ipotetico e alimentari
  derivati da proxy nazionale.
- Se l'affitto viene modificato manualmente, non lo considera più osservazione
  da fonte regionale e non sostiene più che i due importi siano confrontabili.
- Un confronto dei canoni è descrivibile come **omogeneo solo per le dieci città toscane
  con contratto e superficie comuni** (e senza override manuale). L'intero budget
  **non è mai un indice statistico ufficiale** né un confronto fra case equivalenti.

### Cosa manca per un confronto realmente affidabile

1. **TARI completa in tutti i 10 capoluoghi**, usando tariffa fissa/variabile per un
   occupante, superficie imponibile, TEFA, perequazione, riduzioni, eventuale bonus;
   ora esistono quote base per Arezzo, Livorno, Pisa, Pistoia e Siena (non incluse di default); Lucca usa TARIC.
2. **Affitti comparabili e attuali a parità di caratteristiche**: gli indicatori Toscana
   2024 e Milano OMI 2025/2 non usano la stessa metodologia, e manca il quartiere,
   lo stato dell'immobile, tipologia e la dimensione reale.
3. **Bollette domestiche coerenti**: elettricità ARERA 2026 è un riferimento per
   clienti vulnerabili (non mercato libero), gas è una simulazione; servono consumo kWh,
   gas Smc, riscaldamento, classe energetica e contratto selezionato.
4. **Spesa alimentare locale e per una sola persona**: oggi è un proxy ISTAT nazionale
   calcolato da dati di nuclei familiari eterogenei, non una media della città.
5. **Voci dimenticate**: condominio, manutenzioni, telefono/internet, sanità,
   assicurazioni, spese una tantum e impreviste. Sono oggi comprese solo in
   ipotesi aggregate, senza dettaglio.
6. **Trasporti realisticamente individuali**: abbonamento urbano esatto non include
   treni extraurbani, parcheggio, auto e commuting; serve scegliere il tragitto.
7. **Comuni oltre i capoluoghi toscani**: mancano tariffe comunali e dati immobiliari
   omogenei. Non usare una tariffa provinciale come se fosse la bolletta del comune.

Non generiamo una percentuale di attendibilità inventata. I controlli mostrano
categorie mancanti, provenienza, anni e limiti in forma verificabile.

## TARI domestica 2026: estensione a cinque capoluoghi (1 residente)

Dati estratti da prospetti 2026 ufficiali per uso **residenziale con un solo occupante**. Formula comune ai comuni coperti:
`quota fissa €/m²/anno × superficie imponibile + quota variabile €/utenza/anno`.

| Città | Fissa €/m² anno | Variabile €/anno | Base a 55 m² / anno |
|---|---:|---:|---:|
| Arezzo | 1,12107 | 138,77659 | 200,44 € |
| Livorno | 1,12 | 96,87 | 158,47 € |
| Pisa | 1,2302 | 148,1854 | 215,85 € |
| Pistoia | 1,03 | 114,40 | 171,05 € |
| Siena | 1,1524 | 50,3323 | 113,71 € |

**Fonti:** Siena [Sigerico, allegato 1 C.C. 112/2026](https://sigericospa.it/wp-content/uploads/2026/07/30913_ALL-_1_TARIFFE_TARI_2026.pdf); Arezzo [Comune, allegato 2026](https://www.comune.arezzo.it/sites/default/files/2026-08/Allegato%20A%20tariffe%20utenze%20domestiche.pdf); Livorno [delibera comunale 174/2026, tabella residenti, pag. 10](https://cloud-ita.municipiumapp.it/s3/3612/allegati/servizi/tributi/tari/delibere/unicopefdelibera2026_b4c67c0667cbc3b3_p7m_qrcode.pdf); Pisa [S.E.Pi. tariffa domestica 2026](https://www.sepi-pisa.it/en-us/download/utenze-domestiche-2026-5221-89-20046-d92cb77953270cfa58e91142933256d4); Pistoia [tabella TARI 2026](https://www.comune.pistoia.it/s3/5285/allegati/tributi/tariffe-tari/tariffe-tari-2026.pdf).

**Importante:** è sempre e soltanto la componente comunale base; il totale dell'avviso può includere **TEFA e perequazione ARERA**, sconti, conguagli e riduzioni. Pistoia pubblica una riduzione del 12% per un solo occupante: non viene applicata senza verificarne condizioni e modalità, perché il benchmark vuole distinguere la tariffa base dall'importo finale. **Lucca applica TARIC corrispettiva**, con una quota correlata ai conferimenti: non applichiamo la formula TARI a due quote. Per **Firenze, Grosseto, Massa, Prato e Lucca** il valore rimane non disponibile finché la tariffa e i suoi requisiti non saranno confermati in un documento ufficiale appropriato.

Il calcolatore non presume che la TARI sia compresa nell'affitto o nelle altre spese. L'utente può attivare l'inclusione nel totale oppure inserire l'importo effettivo del proprio avviso. **Mai aggiungerla automaticamente una seconda volta.** Implementazione: `src/app/core/tuscany-tari-2026.ts`, test `tuscany-tari-2026.spec.ts`.

## Motore spese essenziali 2026: profilo una persona in affitto

`src/app/core/tuscany-essential-2026.ts` integra la parte documentata di **TARI, servizio idrico, elettricità, gas e trasporto urbano** con le stime iniziali esistenti, utilizzando solo pagine e allegati istituzionali accessibili gratuitamente. Nessun database o API a pagamento.

### Copertura reale, senza dati inventati

| Componente | Comuni effettivamente coperti | Metodo | Limite |
|---|---|---|---|
| Trasporto pubblico urbano | Tutti e 10 i capoluoghi toscani | Abbonamento Autolinee Toscane mensile 42,20 €, annuale 342,80 € (pari a 28,57 €/mese) oppure nessun abbonamento | Prezzi per area urbana e titolo ordinario, non tutti gli spostamenti |
| Acqua, fognatura e depurazione | Tutti e 10 i capoluoghi (Nuove Acque Arezzo; Publiacqua Firenze/Pistoia/Prato; Fiora Grosseto/Siena; ASA Livorno; GEAL Lucca; GAIA Massa; Acque Pisa) | Scaglioni 2026 + quota fissa per **1 residente** e consumo annuo scelto | Non include IVA, conguagli, eventuali componenti aggiuntive o fatture condominiali |
| TARI 2026 | **Arezzo, Livorno, Pisa, Pistoia e Siena** con quote base documentate | Tariffa fissa €/m² + quota variabile per 1 occupante, per ogni comune da allegato ufficiale 2026 | **Quota base, NON avviso TARI completo**: esclusi TEFA, componenti perequative, bonus, riduzioni, conguagli |
| Elettricità | Indicatore **nazionale**, non comunale | Riferimento ARERA per il **cliente vulnerabile** tipo in Maggior Tutela, 2.000 kWh/anno e 3 kW: **665,38 €/anno** nel periodo 01/01/2026–31/12/2026 | Non è un'offerta del mercato libero né una stima della tua bolletta reale |
| Gas / riscaldamento | Nessun costo finale locale verificato | Spesa di scenario modificabile, inizialmente 50 €/mese; ARERA pubblica **solo materia prima** ottobre 2026 a 0,945436 €/Smc | La componente materia prima non si può utilizzare come bolletta completa; non è inserita automaticamente in luogo dell'ipotesi |
| Altri 5 capoluoghi senza TARI/TARIC calcolabile; acqua disponibile per tutti e 10 | **Non disponibili** | Senza allegato ufficiale verificato, il costo rimane nullo e modificabile manualmente; **Lucca usa TARIC puntuale**, non la TARI standard | Mai stimare copiando valori da un altro comune |

**Fonti ufficiali aggiunte per i sei capoluoghi prima scoperti:**
- **Grosseto e Siena**: Acquedotto del Fiora, tariffario 2026 per 1 residente, con 3 fasce, quota fissa e servizi separati: https://www.fiora.it/wp-content/uploads/2026/01/AdF_tariffe_2026.pdf
- **Livorno**: ASA, tariffa aggiornata **dal 1° marzo 2026**. Il calcolo annualizza il regime da marzo, **non** ricostruisce l'esatto anno civile 2026: https://www.asaspa.it/wp-content/uploads/2026/03/Tariffe-01_03_2026.pdf
- **Lucca**: GEAL, tariffe **2025 confermate provvisoriamente anche per il 2026** dall'AIT; scaglioni 0–19, 20–57 e oltre 57 m³: https://www.geal-lucca.it/tariffe/ e https://www.geal-lucca.it/wp-content/uploads/2025/10/Articolazione-tariffaria-civili-a-Valori-2025-GEAL.pdf
- **Pisa**: Acque SpA, tariffario 2026 **provvisorio** per 1 componente, fino a approvazione definitiva: https://www.acque.net/wp-content/uploads/tariffe-2026.pdf
- **Massa**: GAIA, tariffario 2026 per **Bacino Comuni Piana**. Il bacino transitorio del Comune di Massa è confluito in quello di pianura nel 2021 secondo il bilancio GAIA 2023: https://www.gaia-spa.it/images/CONTRATTO/Tariffa%20del%20servizio%20idrico/doc-pdf/Tariffe_2026.pdf

**Per 45 m³ annui, una persona, esclusi IVA e possibili oneri aggiuntivi**: Grosseto/Siena 16,23 €/mese; Livorno 16,77; Lucca 13,15; Massa 16,72; Pisa 18,40. Non sono bollette effettive.

**Aggiornamenti settimanali controllati**: `.github/workflows/water-source-quality.yml` ricontrolla ogni lunedì i 7 gestori dal sito o PDF ufficiale, i dati del nucleo residente con un componente e l'eventuale comparsa di nuovi tariffari. Le impronte digitali sono in `data/tuscany-water-source-hashes.json`. Quando una fonte cambia, il bot crea **una sola PR di verifica**, anziché sovrascrivere automaticamente numeri non revisionati; il merge delle nuove tariffe richiede verifica delle fasce, dell'anno di decorrenza, dei gestori e test CI. In caso di interruzione temporanea dei siti esterni, non pubblica dati falsi e non fa fallire la CI.

**Fonti esatte:**
- TARI domestica Arezzo 2026, allegato A del Comune (delibera C.C. n. 78, 29/07/2026): https://www.comune.arezzo.it/sites/default/files/2026-08/Allegato%20A%20tariffe%20utenze%20domestiche.pdf
- Nuove Acque, tariffa residente 1 CNF 2026, fasce 0–19/20–67/oltre 67 m³, quote fisse di acquedotto, fognatura e depurazione: https://nuoveacque.it/tariffe-acqua/
- Publiacqua, tariffario 2026 residenti 1 componente: https://www.publiacqua.it/sites/publiacqua/files/tariffe_2026.pdf
- Publiacqua, perimetro servizio Toscana centrale: https://www.publiacqua.it/chi-siamo
- Autolinee Toscane, mensile: https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-mensile
- Autolinee Toscane, annuale: https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-annuale
- ARERA, riferimento nazionale annuale e prezzi IV trimestre 2026: https://www.arera.it/comunicati-stampa/dettaglio/elettricit%C3%A0-maggior-tutela-373-nel-iv-trimestre-2026-per-i-clienti-vulnerabili
- ARERA, ottobre 2026 materia prima gas (non prezzo complessivo): https://www.arera.it/comunicati-stampa/dettaglio/gas-valore-materia-prima-vulnerabilita-ottobre-2026

### Interazione con il confronto

- Per **una persona residente**, imposta superficie dell'immobile, superficie imponibile TARI (può differire), consumo idrico, spesa gas ipotetica, tipo di abbonamento. Tutte le tariffe hanno fonte e periodo visualizzabili.
- La voce **Utenze** propone inizialmente un **totale di scenario**: riferimento ARERA 2026 cliente vulnerabile + ipotesi gas + acqua calcolata dai tariffari per tutti i 10 capoluoghi verificati (altrove **15 € puramente ipotetici**). È sempre etichettata come `mixed` e con **attendibilità bassa**, anche quando la componente acqua è supportata.
- La TARI comunale base dei cinque capoluoghi verificati è mostrata in €/anno e €/mese ma **non** viene inclusa inizialmente nel budget. L'utente può selezionare *Aggiungi TARI alle altre spese* oppure inserire un proprio importo annuo per altri comuni. Il modello somma la quota nella vista dei risultati **una volta sola**, lasciando invariato il campo «Altre spese» che rappresenta il budget senza TARI.
- Il totale automatico senza TARI **non è un costo completo**; la vista avvisa esplicitamente se TARI è inclusa per una sola città. Non sostituire un importo non disponibile con 0 (salvo scelta intenzionale dell'utente).
- I dati individuali restano sul browser, senza backend e senza condivisione da URL.
- Test: `src/app/core/tuscany-essential-2026.spec.ts`, `src/app/core/automatic-city-compare.spec.ts`.

## Estensione 2024: canoni registrati nei 10 capoluoghi toscani

**Fonte istituzionale unica:** Regione Toscana, Osservatorio Sociale Regionale, `Abitare in Toscana 2025`, rapporto pubblicato **aprile 2026**. La **tabella 2.2, pagina 35**, pubblica per ogni città capoluogo il canone medio `€/m²/ANNO` dei **nuovi contratti registrati nel 2024**, per tipologia contrattuale.

Documento originale: https://www.regione.toscana.it/documents/d/guest/abitare-in-toscana2025_v3_interattivo

| Comune capoluogo | Ordinario oltre 3 anni | Canone concordato | Ordinario transitorio |
|---|---:|---:|---:|
| Arezzo (A390) | 66 | 69 | 76 |
| Firenze (D612) | 160 | 99 | 244 |
| Grosseto (E202) | 69 | 83 | 116 |
| Livorno (E625) | 87 | 69 | 105 |
| Lucca (E715) | 82 | 76 | 123 |
| Massa (F023, riga provincia «Massa Carrara») | 74 | 79 | 168 |
| Pisa (G702) | 105 | 88 | 136 |
| Pistoia (G713) | 63 | 75 | 88 |
| Prato (G999) | 101 | 78 | 107 |
| Siena (I726) | 98 | 92 | 102 |

Unità: **€/m² all'anno**, non al mese. Calcolo mensile: `canone annuo/m² × superficie dichiarata / 12`. Esempio **55 m²**, ordinario oltre 3 anni: Arezzo **302,50 €/mese** e Firenze **733,33 €/mese** (delta **430,83 €/mese**). Queste non sono offerte attuali o tariffe per case equivalenti, ma indicatori storici del campione 2024. Il rapporto sottolinea che non distingue qualità, posizione e caratteristiche degli immobili.

Il dato è **valido solo per i dieci comuni capoluogo elencati**, non per gli altri comuni nelle rispettive province. La colonna si chiama «Provincia» nel documento ma il testo specifica «città capoluogo»; la riga «Massa Carrara» viene associata al comune capoluogo **Massa**, non a Carrara. La compatibilità fra capoluoghi toscani riguarda **solo la componente affitto del 2024**; utenze, alimentari e trasporti possono ancora essere ipotesi o dati non comparabili. I metodi di Milano e Toscana **non sono omogenei**, per cui non si può presentare una graduatoria nazionale.

Il file `src/app/core/tuscany-capital-rents-2024.ts` contiene soltanto i valori riassuntivi della tabella, con attribuzione puntuale. I test `tuscany-capital-rents-2024.spec.ts` verificano i dieci codici catastali, ogni cifra, il calcolo mensile e che i comuni non coperti **non** ricevano affitti inventati.

## Firenze, una persona: pilota di stima automatica verificabile

La route `/costo-vita-firenze-persona-sola` crea un **budget di scenario precompilato e modificabile** con fonti per ciascuna voce. **Non è un prezzo medio ufficiale di Firenze**: il totale mescola valori storici, tariffe attuali, un proxy statistico nazionale e ipotesi senza dati locali.

**Riferimenti:**
- **Affitto**: rapporto Regione Toscana `Abitare in Toscana 2025` (pubblicato aprile 2026), **Tabella 2.2, pagina 35**, nuovi contratti del 2024 nel capoluogo Firenze: `160 €/m²/anno` ordinario oltre 3 anni, `99 €/m²/anno` concordato e `244 €/m²/anno` ordinario transitorio. Per lo scenario si ipotizzano 55 m² editabili. Non sono quotazioni degli annunci 2026 e non rappresentano la stessa tipologia di immobile o zona. Fonte: https://www.regione.toscana.it/documents/d/guest/abitare-in-toscana2025_v3_interattivo
- **Acqua**: Publiacqua 2026, **uso domestico residente 1 componente**: quota fissa 55,144788 €/anno, 0–19 m³ a 2,000722 €/m³, 20–67 a 2,706863, oltre 67 a 5,531431. Scenario iniziale `45 m³/anno` (scelta di pianificazione, **non un consumo rilevato**). Il costo deriva dall'applicazione progressiva delle tariffe e dalla quota fissa, senza dare per inclusi eventuali imposte e costi aggiuntivi. Fonte: https://www.publiacqua.it/sites/publiacqua/files/tariffe_2026.pdf
- **Trasporto**: tariffa standard abbonamento urbano capoluogo Autolinee Toscane `42,20 €/mese`, valida anche nell'area metropolitana fiorentina secondo condizioni dell'operatore. Scelta dell'utente tra abbonamento e nessun abbonamento. Fonte: https://www.at-bus.it/it/ticket/abbonamenti-urbani/abbonamento-urbano-capoluogo-mensile
- **Alimentari**: ISTAT 2025 indica 2.070 €/mese di spesa totale media delle famiglie monocomponente e 552 € alimentari su 2.782 € di spesa media tra **tutte** le famiglie. Il valore iniziale usa **2.070 × 552/2.782**. È una *proiezione nazionale con attendibilità bassa*, **non** una rilevazione per persona sola o su Firenze. Fonte: https://www.istat.it/comunicato-stampa/spese-per-consumi-delle-famiglie-anno-2025/
- **Elettricità, gas, internet, altre spese**: cifre iniziali esclusivamente illustrative, da personalizzare. Non sono prezzi locali né sono state calibrate sui contratti di una specifica persona.
- **Reddito netto**: facoltativo; senza inserimento non viene calcolato il residuo mensile. I numeri restano soltanto nel browser e non vengono trasmessi al server.

Il modello separa le categorie in `observed`, `tariff`, `statistical-proxy`, `scenario`, specificando fonte, ambito geografico, data e attendibilità (alta, media, bassa); calcola i totali per gruppo senza attribuire un falso livello di precisione al totale complessivo. `src/app/core/automatic-cost-florence.ts` è puro, testato e separato dalla UI per agevolare l'estensione alle altre città.

**Nota importante**: il benchmark fiorentino non è lo stesso del benchmark OMI aggregato pubblicato per Milano nel sito; periodi, metodi e selezione degli immobili non sono omogenei. Non effettuare un confronto numerico tra questi due benchmark senza una metodologia comune.

## Benchmark degli affitti comunali: Milano, primo dataset

Il comparatore mostra un **riferimento indicativo derivato** dalle quotazioni OMI 2025/2 pubblicate come risorsa CC BY 4.0 sul portale open data del Comune di Milano:
https://dati.comune.milano.it/dataset/ds3024-quotazioni-immobiliari-omi-locazione-semestre-2025-2

- Fonte originaria: **Agenzia delle Entrate - Osservatorio Mercato Immobiliare (OMI)**. Il portale del Comune riporta anche condizioni ulteriori, e la pubblicazione della banca dati completa non è autorizzata da questo progetto.
- `scripts/omi-milan-rent.mjs` filtra esclusivamente **Abitazioni civili, stato NORMALE, superficie LORDA (L)**. Controlla codice catastale F205, schema ufficiale, numero di zone e intervalli validi.
- Il risultato aggrega i **limiti minimi e massimi delle quotazioni di 40 zone diverse**, tramite due mediane NON ponderate. Non è la media dei contratti, non descrive l'affitto effettivo di una specifica casa e non esprime il 25°/75° percentile dei prezzi.
- Valori ottenuti dalla fonte e dalla pipeline al 10/11/2026: **11,75 €/m²/mese** per la mediana dei limiti minimi di zona e **15,60 €/m²/mese** per la mediana dei massimi, riferiti al secondo semestre 2025.
- Nel comparatore si può scegliere una **superficie lorda** (iniziale 70 m² per esempio) per leggere l'intervallo derivato (con 70 m²: 822,50–1.092,00 €/mese). I due valori possono essere applicati volontariamente alla voce casa del budget. Nessun canone viene applicato automaticamente.
- Il file `public/data/municipal-rent-benchmarks.json` contiene **solo indicatori aggregati per una città**, date, metodologia, attribuzione e checksum. Le singole quotazioni OMI, le zone e la banca dati originale **non** sono ripubblicate.
- **Nessuna stima automatica per Arezzo, Firenze o altri comuni** in assenza di una fonte recente verificata e utilizzabile. I valori di Firenze 2013 sono disponibili come open data ma troppo vecchi per essere presentati come costi attuali.
- Script di controllo: `node --test scripts/omi-milan-rent.test.mjs` e `node scripts/sync-milan-rent.mjs`. La pubblicazione dei futuri semestri richiede una nuova revisione esplicita di struttura, fonte e permessi di riutilizzo, non avviene silenziosamente.
- Condizioni ufficiali da considerare prima di ulteriori forme di ridistribuzione:
https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari/condizioni-contrattuali-qi

**I valori sono un confronto di ordine di grandezza, non una quotazione di una zona specifica.** Per l'affitto reale occorrono area e immobile pertinenti, epoca dei dati e annunci verificabili.

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