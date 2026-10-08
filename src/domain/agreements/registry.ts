import { type Agreement, validateAgreement } from './interface';

const agreementsRegistry = new Map<string, Agreement>();

export function registerAgreement(agreement: unknown): boolean {
  if (!validateAgreement(agreement)) {
    console.error(
      `Cannot register agreement ${(agreement as Record<string, unknown>)?.['id'] ?? 'unknown'}: validation failed`,
    );
    return false;
  }
  agreementsRegistry.set(agreement.id, agreement);
  return true;
}

export function getAgreement(id: string): Agreement | null {
  if (!id) return null;
  return agreementsRegistry.get(id) ?? null;
}

/** Accord effectivement appliqué : chargé (URL / registre) et activé (« Appliquer l'accord »). */
export function resolveActiveAgreement(sel: {
  accordActif: boolean;
  activeAccordId: string | null;
}): Agreement | null {
  return sel.accordActif && sel.activeAccordId ? getAgreement(sel.activeAccordId) : null;
}

export function getAllAgreements(): Agreement[] {
  return Array.from(agreementsRegistry.values());
}
