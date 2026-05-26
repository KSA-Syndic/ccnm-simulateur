import { type Agreement } from './interface';
import { getAgreement, getAllAgreements } from './registry';

let activeAgreement: Agreement | null = null;

export function loadAgreement(id: string | null | undefined): Agreement | null {
  if (!id) {
    activeAgreement = null;
    return null;
  }

  const agreement = getAgreement(id);
  if (agreement) {
    activeAgreement = agreement;
    return agreement;
  }

  console.warn(`Accord "${id}" non trouvé dans le registre`);
  activeAgreement = null;
  return null;
}

export function getActiveAgreement(): Agreement | null {
  return activeAgreement;
}

export function hasActiveAgreement(): boolean {
  return activeAgreement !== null;
}

export function resetActiveAgreement(): void {
  activeAgreement = null;
}

export function loadAgreementFromURL(urlParams: URLSearchParams): Agreement | null {
  const accordId = urlParams.get('accord');
  return accordId ? loadAgreement(accordId) : null;
}

export interface AgreementSummary {
  id: string;
  nom: string;
  nomCourt: string;
  url: string;
  labels: Agreement['labels'];
}

export function getAvailableAgreements(): AgreementSummary[] {
  return getAllAgreements().map((a) => ({
    id: a.id,
    nom: a.nom,
    nomCourt: a.nomCourt,
    url: a.url,
    labels: a.labels,
  }));
}
