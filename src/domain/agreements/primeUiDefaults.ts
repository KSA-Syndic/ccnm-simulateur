import { CONFIG } from '../config';
import type { PrimeDef } from './interface';
import { resolvePrimeSemanticId } from './interface';

/** Heures par défaut affichées / injectées à l’activation d’une modalité horaire. */
export function resolvePrimeDefaultHours(prime: PrimeDef): number {
  if (prime.autoHeures === true) {
    return Number(CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67);
  }
  const h = Number(prime.defaultHeures);
  return Number.isFinite(h) ? h : 0;
}

/** Afficher le champ « heures / mois » (masqué si l’accord fixe les heures, ex. prime équipe Kuhn). */
export function shouldShowPrimeHoursField(prime: PrimeDef): boolean {
  return prime.autoHeures !== true && Boolean(prime.stateKeyHeures);
}

/** Afficher le champ « taux / montant unitaire » lorsque l’accord ou le barème fournit une valeur officielle. */
export function shouldShowPrimeOfficialValueField(prime: PrimeDef): boolean {
  return resolvePrimeOfficialValue(prime) != null;
}

export function resolvePrimeOfficialValue(prime: PrimeDef): number | null {
  if (prime.valeurAccord == null) return null;
  const v = Number(prime.valeurAccord);
  return Number.isFinite(v) ? v : null;
}

export function resolvePrimeSemanticIdForUi(prime: PrimeDef): string {
  return resolvePrimeSemanticId(prime);
}

export type PrimeUiSeedTarget = {
  agreementInputs: Record<string, unknown>;
  nationalPrimeOverrides: Record<string, number>;
};

/**
 * Préremplit heures accord et surcharge de taux/montant (comme legacy + panier nuit dans « Autres »).
 * Ne remplace pas une valeur déjà saisie par l’utilisateur.
 */
export function seedAgreementPrimeUiDefaults(
  prime: PrimeDef,
  target: PrimeUiSeedTarget,
): PrimeUiSeedTarget {
  const agreementInputs = { ...target.agreementInputs };
  const nationalPrimeOverrides = { ...target.nationalPrimeOverrides };

  if (shouldShowPrimeHoursField(prime) && prime.stateKeyHeures) {
    const k = prime.stateKeyHeures;
    const cur = agreementInputs[k];
    if (cur == null || cur === '') {
      agreementInputs[k] = resolvePrimeDefaultHours(prime);
    }
  }

  const official = resolvePrimeOfficialValue(prime);
  const sid = resolvePrimeSemanticIdForUi(prime);
  if (official != null && sid && !(sid in nationalPrimeOverrides)) {
    nationalPrimeOverrides[sid] = official;
  }

  return { agreementInputs, nationalPrimeOverrides };
}
