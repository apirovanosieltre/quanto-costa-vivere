# Fonti acqua Toscana: verifica aggiornamenti automatica

**Bozza creata automaticamente. NON approvare senza controllare i tariffari effettivi.**

Il bot controlla ogni lunedì sette fonti ufficiali e verifica i PDF e la sezione
“1 componente residente”. Un nuovo checksum non prova un cambio di tariffa;
i dati utilizzati dal calcolatore NON sono modificati automaticamente.

| Gestore e città | Digest precedente | Digest attuale | Confronto numeri pubblicati |
|---|---|---|---|
| Acquedotto del Fiora · Grosseto, Siena | da6ddfaf41d3 | da6ddfaf41d3 | cifre già presenti |

## Revisione necessaria prima del merge

- [ ] Aprire ogni fonte ufficiale e verificare anno / decorrenza e categoria **domestico residente, una persona**.
- [ ] Controllare 3 scaglioni di acquedotto, fognatura, depurazione e quote fisse, e trattare esplicitamente componenti UI e IVA.
- [ ] Aggiornare le tariffe in `src/app/core/tuscany-essential-2026.ts` e i test numerici, **se e solo se** sono effettivamente cambiate.
- [ ] Verificare l’eventuale variazione del bacino tarifffario di Massa e la validità della conferma 2025 di Lucca.
- [ ] Superare la CI e controllare gli esempi a 0, 19, 45, 67 e 100 m³/anno.
- [ ] Non pubblicare tariffe di anni successivi sotto l’etichetta 2026.

- [Acquedotto del Fiora · Grosseto, Siena](https://www.fiora.it/wp-content/uploads/2026/01/AdF_tariffe_2026.pdf)
