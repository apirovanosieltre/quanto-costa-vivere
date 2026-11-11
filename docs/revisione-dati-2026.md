# Verifica del comparatore: 11 novembre 2026

## Proxy TARI quando manca la tariffa approvata

Il comparatore può mostrare per i quattro capoluoghi ancora scoperti una
**stima NON ufficiale** costruita sulla mediana di importi TARI base 2026
dei capoluoghi selezionati come riferimenti vicini. Si utilizza la stessa
superficie imponibile e il profilo **un residente**. Ogni riferimento è
riproducibile attraverso i tariffari ufficiali già presenti in
`tuscany-tari-2026.ts`. Il modello è in
`tuscany-tari-proxy-2026.ts` ed è testato separatamente.

| Città senza tariffa verificata | Comuni usati come confronto |
| --- | --- |
| Firenze | Pistoia, Siena, Pisa |
| Grosseto | Siena, Livorno |
| Massa | Pisa, Livorno |
| Prato | Pistoia, Pisa |

La scelta geografica **non garantisce similitudine** tra costi di raccolta,
modello di gestione, sgravi e contribuzione. **Lucca è sempre esclusa come
riferimento** perché usa TARIC puntuale, non TARI ordinaria.

Gli importi pubblicati come proxy sono la **mediana dei riferimenti**
non la tassa realmente applicabile; il minimo e il massimo sono
il semplice intervallo dei campioni, **non un intervallo statistico di
confidenza né un limite plausibile del costo vero**.
Il proxy ha sempre `classification='assumption'` e
`sourceUrl=null`, non può essere contato come tariffa comunale
verificata, non è incluso automaticamente nel budget e può essere
sostituito con la cifra dell'avviso reale. Non usarlo per pagamenti,
dichiarazioni tributarie o calcoli di imposte dovute. Sono esclusi
TEFA, perequazione, agevolazioni e conguagli.

## TARI 2026: non inventare gli importi

**Da integrare dopo estrazione dei prospetti approvati:** Firenze (D612),
Grosseto (E202), Massa (F023), Prato (G999). Gli altri cinque capoluoghi
dispongono di quota comunale base verificata, Lucca è TARIC e resta separata.

- **Firenze**: Gestore AliaEstra, sezione «Tariffe 2026», Del. Consiglio n. 44 del 28/07/2026:
  https://aliaestra.it/ambiente/tariffa-rifiuti/firenze/regolamenti-e-moduli
- **Grosseto**: ricercare il tariffario saldo 2026, non confondere
  acconti su tariffe 2025 con la tariffa definitiva.
- **Massa**: 1,3503 €/m² e 99,12 €/anno appaiono su una tabella
  privata, ma l'allegato approvato non è stato individuato con corrispondenza
  certa. Non pubblicarli come quote verificate:
  https://www.amministrazionicomunali.net/tari/tariffe_tari_2026.php?comune=massa
- **Prato**: Plures pubblica il simulatore TARI, ma non un estratto
  sufficientemente verificato per 1 residente:
  https://www.plures.it/it-it/cittadini/cittadini/servizi/servizi-ai-cittadini/tariffa/prato

La revisione deve identificare: aliquote per 1 residente, eventuale
regime puntuale, mq imponibili, anno di decorrenza, TEFA, perequazione,
agevolazioni. Senza queste conferme la quota resta null.

## Modello luce/gas (stima, non bolletta)

Osservatorio Facile.it ottobre 2026:
https://www.facile.it/energia-luce-gas/osservatorio/italia.html
Sample nazionale: 1.894 kWh / 940,95 € annui luce;
725 Smc / 864,33 € gas, nuclei di 2,27 persone in media.
I consumi stimati nel modulo `energy-household-2026.ts`
usano **coefficienti editoriali** secondo occupanti, metratura,
riscaldamento: non esiste una misura osservata del campione per la
singola combinazione. Anche la conversione con rapporto spesa/consumo
non è una tariffa marginale perché contiene costi fissi.
Un preventivo aggiornato deve usare offerte e condizioni reali ARERA.

Per 2+ occupanti, nessun calcolo automatico TARI con coefficiente di
1 residente. L'acqua passa a un importo illustrativo fino a quando non
si verifica la reale tariffa per più componenti.

## Affitti recenti

Report idealista comune per comune, ottobre 2026:
https://www.idealista.it/sala-stampa/report-prezzo-immobile/affitto/toscana/report/
È uno snapshot editoriale dei **prezzi richiesti negli annunci**, non
dei canoni stipulati. Non rappresenta una casa identica a un immobile
da 55 m², né una media pesata per zone/contratto. Il report segnala
una modifica della propria metodologia da luglio 2026. La fonte dei
contratti registrati 2024 Toscana resta disponibile come scelta separata.
Per aggiornamenti automatici occorre verificare riuso/licenze del provider;
non implementiamo scraping di portali privati.

## Audit GitHub

Workflow:
- `water-source-quality.yml`: lunedì 05:17 UTC, controlla sette gestori,
  propone un'unica PR, senza aggiornare autonomamente le tariffe.
- `official-cost-source-audit.yml`: martedì 06:43 UTC, verifica dodici
  documenti istituzionali e crea una PR da revisionare.
- `fuel-source-quality.yml`: giornaliero, pubblica prezzi solo dopo validazione.
- `workflow_dispatch` permette l'esecuzione manuale da Actions.

Sono stati eliminati i vecchi seed su branch feature, e attivati i
trigger su `main` per i file audit. **La CI del PR e le esecuzioni
programmate vanno controllate separatamente**: una CI verde non prova
l'avvenuto aggiornamento esterno. Le fonti degli annunci e le quattro
TARI non ancora approvate non sono monitorate con import automatico.
