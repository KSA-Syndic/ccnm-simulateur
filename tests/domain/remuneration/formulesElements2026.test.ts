import { describe, expect, it } from 'vitest';
import '@/accords/index';
import { CONFIG } from '@/domain/config';
import { annualFromMonthly } from '@/domain/utils/rounding';
import { SEMANTIC_ID } from '@/domain/types';
import {
  amountBySemanticId,
  astreintePeriodesAnnuelle,
  baseWizardInput,
  computeDetails,
  primeAncienneteConventionAnnuelle,
  primeEquipeConventionAnnuelle,
  primeHabillageConventionAnnuelle,
  SMH_GRID_2026,
  tauxHoraireSmhAnnuel,
} from './helpers/remunerationTestHelpers';

describe('Formules conventionnelles 2026 (moteur = barème CONFIG)', () => {
  const smhA1 = SMH_GRID_2026[1]!;
  const tauxA1 = tauxHoraireSmhAnnuel(smhA1);

  it('prime d’ancienneté — point × taux classe × années (plafond 15)', () => {
    const attendu = primeAncienneteConventionAnnuelle({ classe: 1, anciennete: 5 });
    const details = computeDetails(
      baseWizardInput({
        classe: 1,
        groupe: 'A',
        situation: { anciennete: 5 },
      }),
    );
    const moteur = amountBySemanticId(details, SEMANTIC_ID.PRIME_ANCIENNETE);
    expect(moteur).toBe(attendu);
  });

  it('prime d’équipe — 22 postes × 30 min × taux SMH (défaut CONFIG)', () => {
    const attendu = primeEquipeConventionAnnuelle(tauxA1);
    const details = computeDetails(
      baseWizardInput({
        classe: 1,
        situation: { modalityState: { travailEquipe: true } },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_EQUIPE)).toBe(attendu);
    expect(attendu).toBeGreaterThan(0);
  });

  it('habillage / déshabillage — 0,5 h SMH par semaine (pas 4×0,5 h « par mois »)', () => {
    const attendu = primeHabillageConventionAnnuelle(tauxA1);
    const details = computeDetails(
      baseWizardInput({
        classe: 1,
        situation: { modalityState: { primeHabillageDeshabillage: true } },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE)).toBe(attendu);
  });

  it('astreinte repos quotidien — 1 × taux horaire SMH par période', () => {
    const coeff =
      CONFIG.CCNM_CONTREPARTIES_ORGANISATION.astreinteDisponibiliteSMHParPeriode
        .surReposQuotidienDansAstreinte;
    const periodes = 3;
    const attendu = astreintePeriodesAnnuelle(tauxA1, periodes, coeff);
    const details = computeDetails(
      baseWizardInput({
        classe: 1,
        situation: {
          modalityState: {
            primeAstreintePeriodeReposQuotidien: true,
            periodesAstreinteReposQuotidienMois: periodes,
          },
        },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN)).toBe(
      attendu,
    );
  });

  it('astreinte jour de repos — 2 × taux horaire SMH par période', () => {
    const coeff =
      CONFIG.CCNM_CONTREPARTIES_ORGANISATION.astreinteDisponibiliteSMHParPeriode.surJourRepos;
    const periodes = 2;
    const attendu = astreintePeriodesAnnuelle(tauxA1, periodes, coeff);
    const details = computeDetails(
      baseWizardInput({
        classe: 1,
        situation: {
          modalityState: {
            primeAstreintePeriodeJourRepos: true,
            periodesAstreinteJourReposMois: periodes,
          },
        },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS)).toBe(
      attendu,
    );
  });

  it('déplacement — heures excédentaires × taux SMH de base', () => {
    const heures = 10;
    const attendu = annualFromMonthly(heures * tauxA1);
    const details = computeDetails(
      baseWizardInput({
        classe: 1,
        situation: {
          modalityState: {
            primeDeplacementProfessionnel: true,
            heuresDeplacementCompense: heures,
          },
        },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_DEPLACEMENT_PRO)).toBe(attendu);
  });

  it('invention brevetable — 300 € × nombre (forfait annuel)', () => {
    const n = 2;
    const unit = CONFIG.CCNM_CONTREPARTIES_ORGANISATION.inventionBrevetableMinimumEuros;
    const details = computeDetails(
      baseWizardInput({
        classe: 1,
        situation: {
          modalityState: {
            primeInventionBrevetable: true,
            nombreInventionsBrevetablesAn: n,
          },
          nationalPrimeOverrides: { [SEMANTIC_ID.PRIME_INVENTION_BREVETABLE]: unit },
        },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_INVENTION_BREVETABLE)).toBe(n * unit);
  });

  it('majoration heures sup +25 % — heures mensuelles 1re tranche annualisées (×12)', () => {
    const smhC5 = SMH_GRID_2026[5]!;
    const heuresSupMensuelles = 10;
    const seuil = CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES;
    const h25 = Math.min(heuresSupMensuelles, seuil);
    const taux = tauxHoraireSmhAnnuel(smhC5);
    const attendu = annualFromMonthly(h25 * taux * CONFIG.MAJORATIONS_CCN.heuresSup25);
    const details = computeDetails(
      baseWizardInput({
        classe: 5,
        groupe: 'C',
        situation: { travailHeuresSup: true, heuresSup: heuresSupMensuelles },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.MAJORATION_HEURES_SUP_25)).toBe(attendu);
    expect(amountBySemanticId(details, SEMANTIC_ID.MAJORATION_HEURES_SUP_50)).toBe(0);
  });

  it('cadre F+ : pas de prime d’ancienneté conventionnelle', () => {
    const details = computeDetails(
      baseWizardInput({
        classe: 11,
        groupe: 'F',
        situation: { anciennete: 10 },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_ANCIENNETE)).toBe(0);
  });

  it('majoration heures sup +25 % / +50 % — dépassement du seuil mensuel, deux annualisations', () => {
    const smhC5 = SMH_GRID_2026[5]!;
    const seuil = CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES;
    const heuresSupMensuelles = seuil + 5;
    const taux = tauxHoraireSmhAnnuel(smhC5);
    const attendu25 = annualFromMonthly(seuil * taux * CONFIG.MAJORATIONS_CCN.heuresSup25);
    const attendu50 = annualFromMonthly(5 * taux * CONFIG.MAJORATIONS_CCN.heuresSup50);
    const details = computeDetails(
      baseWizardInput({
        classe: 5,
        groupe: 'C',
        situation: { travailHeuresSup: true, heuresSup: heuresSupMensuelles },
      }),
    );
    expect(amountBySemanticId(details, SEMANTIC_ID.MAJORATION_HEURES_SUP_25)).toBe(attendu25);
    expect(amountBySemanticId(details, SEMANTIC_ID.MAJORATION_HEURES_SUP_50)).toBe(attendu50);
  });

  it('primes organisation (équipe, habillage…) hors assiette SMH', () => {
    const details = computeDetails(
      baseWizardInput({
        classe: 1,
        situation: {
          modalityState: {
            travailEquipe: true,
            primeHabillageDeshabillage: true,
          },
        },
      }),
    );
    const equipe = details.find((d) => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE);
    const hab = details.find((d) => d.semanticId === SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE);
    expect(equipe?.inclusDansSMH).toBe(false);
    expect(hab?.inclusDansSMH).toBe(false);
  });
});
