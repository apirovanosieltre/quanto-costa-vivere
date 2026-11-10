/** Associazione provincia -> ente regionale di applicazione dell'addizionale.
 * Un codice non riconosciuto causa blocco del netto completo, mai un'inferenza.
 * Le province autonome TN e BZ sono due enti distinti.
 */
export const PROVINCES_BY_TAX_REGION: Readonly<Record<string, readonly string[]>> = {
  'REGIONE ABRUZZO':['AQ','CH','PE','TE'],
  'REGIONE BASILICATA':['MT','PZ'],
  'REGIONE CALABRIA':['CS','CZ','KR','RC','VV'],
  'REGIONE CAMPANIA':['AV','BN','CE','NA','SA'],
  'REGIONE EMILIA-ROMAGNA':['BO','FE','FC','MO','PC','PR','RA','RE','RN'],
  'REGIONE FRIULI VENEZIA GIULIA':['GO','PN','TS','UD'],
  'REGIONE LAZIO':['FR','LT','RI','RM','VT'],
  'REGIONE LIGURIA':['GE','IM','SP','SV'],
  'REGIONE LOMBARDIA':['BG','BS','CO','CR','LC','LO','MB','MI','MN','PV','SO','VA'],
  'REGIONE MARCHE':['AN','AP','FM','MC','PU'],
  'REGIONE MOLISE':['CB','IS'],
  'REGIONE PIEMONTE':['AL','AT','BI','CN','NO','TO','VB','VC'],
  'REGIONE PUGLIA':['BA','BR','BT','FG','LE','TA'],
  'REGIONE SARDEGNA':['CA','NU','OR','SS','SU'],
  'REGIONE SICILIA':['AG','CL','CT','EN','ME','PA','RG','SR','TP'],
  'REGIONE TOSCANA':['AR','FI','GR','LI','LU','MS','PI','PO','PT','SI'],
  'REGIONE UMBRIA':['PG','TR'],
  "REGIONE VALLE D'AOSTA":['AO'],
  'REGIONE VENETO':['BL','PD','RO','TV','VE','VI','VR'],
  'PROVINCIA AUTONOMA DI TRENTO':['TN'],
  'PROVINCIA AUTONOMA DI BOLZANO':['BZ']
};
const map = new Map<string,string>();
for (const [region, provinces] of Object.entries(PROVINCES_BY_TAX_REGION)) {
  for (const province of provinces) {
    if (map.has(province)) throw new Error('Codice provincia ripetuto: '+province);
    map.set(province,region);
  }
}
export function taxRegionFromProvince(code:string):string|null {
  return map.get(code.trim().toUpperCase())??null;
}
export function isValidMunicipalRegion(province:string, selectedRegion:string):boolean {
  const region=taxRegionFromProvince(province);
  return region!==null && region===selectedRegion;
}
