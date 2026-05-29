/** Données collectées avant export lettre Word + PDF (étape arriérés). */
export type ExportDocumentsPayload = {
  nom: string;
  employeur: string;
  lieu?: string;
  adresseSalarie?: string;
  cpVilleSalarie?: string;
  representant?: string;
  fonction?: string;
  adresseEmployeur?: string;
  cpVilleEmployeur?: string;
};
