import { CONFIG } from '../config';

/** Année de référence grille SMH / barème débutants (aligné legacy `resolveReferenceYear` sans `Date`). */
export function resolveSmhDataYear(explicitYear?: number): number {
  return explicitYear ?? CONFIG.CURRENT_DATA_YEAR;
}

/** Grille SMH annuelle brute (sans barème débutant ni prorata). */
export function getSmhGridAnnual(classe: number, year?: number): number {
  const y = resolveSmhDataYear(year);
  const grid = CONFIG.SMH_BY_YEAR[y];
  if (!grid) return CONFIG.SMH[classe] ?? 0;
  return grid[classe] ?? CONFIG.SMH[classe] ?? 0;
}

/**
 * Tranche barème débutant (clés 0, 2, 4) selon `experiencePro` — aligné legacy.
 * - &lt; 2 ans → 0
 * - 2 à 4 ans → 2
 * - 4 à 6 ans → 4
 */
export function getBaremeDebutantTranche(experiencePro: number): number {
  const exp = Number(experiencePro) || 0;
  if (exp >= 4) return 4;
  if (exp >= 2) return 2;
  return 0;
}

/** Montant annuel barème débutant pour classe 11 ou 12 et une tranche donnée. */
export function getBaremeDebutantAnnual(classe: 11 | 12, tranche: number, year?: number): number {
  const y = resolveSmhDataYear(year);
  const byYear = CONFIG.BAREME_DEBUTANTS_BY_YEAR[y]?.[classe];
  const fallback = CONFIG.BAREME_DEBUTANTS[classe];
  return byYear?.[tranche] ?? fallback?.[tranche] ?? 0;
}

/**
 * SMH annuel plein temps avant prorata d’activité — aligné
 * `RemunerationCalculator.calculateAnnualRemuneration` (grille + barème F11/F12 si exp &lt; seuil catalogue).
 */
export function getAnnualSmhFullBeforeActivity(params: {
  classe: number;
  experiencePro: number;
  year?: number;
}): number {
  const { classe, experiencePro, year } = params;
  const grid = getSmhGridAnnual(classe, year);
  if (
    (classe === 11 || classe === 12) &&
    (Number(experiencePro) || 0) < CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO
  ) {
    const tranche = getBaremeDebutantTranche(Number(experiencePro) || 0);
    return getBaremeDebutantAnnual(classe as 11 | 12, tranche, year);
  }
  return grid;
}

/**
 * @param experiencePro — si fourni, applique le barème débutants pour les classes 11 et 12 (exp &lt; `CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO`).
 */
export function getSmhForClasse(classe: number, year?: number, experiencePro?: number): number {
  if (experiencePro === undefined) {
    return getSmhGridAnnual(classe, year);
  }
  if (year !== undefined) {
    return getAnnualSmhFullBeforeActivity({ classe, experiencePro, year });
  }
  return getAnnualSmhFullBeforeActivity({ classe, experiencePro });
}
