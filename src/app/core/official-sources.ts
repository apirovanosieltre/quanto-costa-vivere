export interface OfficialSource { id: string; label: string; url: string; cadence: string; usage: string; }
export const OFFICIAL_SOURCES: OfficialSource[] = [
 { id:'mef-comuni',label:'MEF - Addizionale comunale IRPEF',url:'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/tabella.htm',cadence:'Annuale e aggiornamenti',usage:'Importazione da verificare, aliquote ed esenzioni non uniformi'},
 { id:'mef-regioni',label:'MEF - Addizionale regionale IRPEF',url:'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/tabella.htm',cadence:'Annuale',usage:'Richiede modellazione degli scaglioni regionali'},
 { id:'istat',label:'ISTAT - Esplora dati e API',url:'https://esploradati.istat.it/',cadence:'Variabile per dataset',usage:'Statistiche aggregate, non prezzi puntuali comunali'},
 { id:'eurostat',label:'Eurostat - Prezzi armonizzati IPCA',url:'https://ec.europa.eu/eurostat/web/hicp/information-data',cadence:'Mensile',usage:'API prc_hicp_minr; tasso nazionale annuo, non spesa media locale'},
 { id:'omi',label:'Agenzia delle Entrate - Quotazioni immobiliari OMI',url:'https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari',cadence:'Semestrale',usage:'Intervalli di quotazioni, non canoni contrattuali reali'}
];
