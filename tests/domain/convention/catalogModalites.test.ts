import { describe, expect, it } from 'vitest';
import {
  getNationalPrimeOverrideRows,
  isModaliteVisiblePourProfil,
  UI_VISIBLE_MODALITE,
} from '@/domain/convention/catalog';
import { assertNationalModalityRegistryCoversCatalog } from '@/domain/convention/nationalModalityRegistry';

describe('getNationalPrimeOverrideRows', () => {
  it('reste synchronisé avec le catalogue via le registre', () => {
    assertNationalModalityRegistryCoversCatalog();
  });

  it('propose les 7 modalités « Autres » dont astreinte repos et jour de repos', () => {
    const ids = getNationalPrimeOverrideRows().map((r) => r.semanticId);
    expect(ids).toContain('majorationInterventionAstreinte');
    expect(ids).toContain('primeAstreintePeriodeReposQuotidien');
    expect(ids).toContain('primeAstreintePeriodeJourRepos');
    expect(ids).toHaveLength(7);
  });
});

describe('isModaliteVisiblePourProfil', () => {
  it('masque le comptage horaire pour cadre au forfait jours', () => {
    expect(
      isModaliteVisiblePourProfil(UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL, {
        isCadre: true,
        forfait: 'jours',
      }),
    ).toBe(false);
  });

  it('affiche le comptage horaire pour non-cadre', () => {
    expect(
      isModaliteVisiblePourProfil(UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL, {
        isCadre: false,
        forfait: '35h',
      }),
    ).toBe(true);
  });
});
