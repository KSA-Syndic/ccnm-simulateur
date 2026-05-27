import { describe, expect, it } from 'vitest';
import '@/accords/index';
import { CONFIG } from '@/domain/config';
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
    expect(attendu).toBe(513);
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
    const attendu = Math.round(heures * tauxA1 * 12);
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

  it('majoration heures sup +25 % — tranche 36e–43e heure mensuelle', () => {
    const smhC5 = SMH_GRID_2026[5]!;
    const heuresSup = 15.17;
    const details = computeDetails(
      baseWizardInput({
        classe: 5,
        groupe: 'C',
        situation: { travailHeuresSup: true, heuresSup: heuresSup },
      }),
    );
    const maj25 = amountBySemanticId(details, SEMANTIC_ID.MAJORATION_HEURES_SUP_25);
    expect(maj25).toBeGreaterThan(0);
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
