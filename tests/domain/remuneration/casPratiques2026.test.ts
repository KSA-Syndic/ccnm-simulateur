import { describe, expect, it } from 'vitest';
import '@/accords/index';
import { SEMANTIC_ID } from '@/domain/types';
import { aggregateRemunerationDetails } from '@/domain/remuneration/aggregate';
import { resolveWizardRemunerationElements } from '@/domain/remuneration/compute';
import {
  amountBySemanticId,
  baseWizardInput,
  computeDetails,
  primeAncienneteConventionAnnuelle,
  primeEquipeConventionAnnuelle,
  primeHabillageConventionAnnuelle,
  smhAnnuelAttendu,
  smhMensuelDepuisAnnuel,
  SMH_GRID_2026,
  tauxHoraireSmhAnnuel,
  totalAnnuelBrut,
} from './helpers/remunerationTestHelpers';
import { roundToEuro } from '@/domain/utils/rounding';

function totalMensuelFromInput(input: ReturnType<typeof baseWizardInput>): number {
  const resolved = resolveWizardRemunerationElements(input);
  const agg = aggregateRemunerationDetails(resolved.details, resolved.baseSMH, 12);
  return agg.totalMonthly;
}

describe('Cas pratiques 2026 (moteur wizard)', () => {
  describe('Cas n°1 — Opérateur A1, 5 ans, équipe + habillage', () => {
    const smh = SMH_GRID_2026[1]!;
    const taux = tauxHoraireSmhAnnuel(smh);
    const input = baseWizardInput({
      classe: 1,
      groupe: 'A',
      situation: {
        anciennete: 5,
        modalityState: {
          travailEquipe: true,
          primeHabillageDeshabillage: true,
        },
      },
    });

    it('SMH mensuel de base', () => {
      const resolved = resolveWizardRemunerationElements(input);
      expect(resolved.baseSMH).toBe(smh);
      expect(smhMensuelDepuisAnnuel(resolved.baseSMH)).toBe(1831.67);
    });

    it('composantes annuelles conformes aux formules CONFIG', () => {
      const details = computeDetails(input);
      expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_ANCIENNETE)).toBe(
        primeAncienneteConventionAnnuelle({ classe: 1, anciennete: 5 }),
      );
      expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_EQUIPE)).toBe(
        primeEquipeConventionAnnuelle(taux),
      );
      expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE)).toBe(
        primeHabillageConventionAnnuelle(taux),
      );
    });

    it('total mensuel brut cohérent avec le détail', () => {
      const resolved = resolveWizardRemunerationElements(input);
      const details = resolved.details;
      const totalAnnuel = totalAnnuelBrut(details, resolved.baseSMH);
      expect(totalMensuelFromInput(input)).toBe(roundToEuro(totalAnnuel / 12));
      expect(totalMensuelFromInput(input)).toBeGreaterThan(smhMensuelDepuisAnnuel(smh));
    });
  });

  describe('Cas n°2 — Technicien C5, 10 ans, heures sup + déplacements', () => {
    const smh = SMH_GRID_2026[5]!;
    const heuresSupMois = 15.17;
    const heuresDeplacement = 10;
    const input = baseWizardInput({
      classe: 5,
      groupe: 'C',
      situation: {
        anciennete: 10,
        travailHeuresSup: true,
        heuresSup: heuresSupMois,
        modalityState: {
          primeDeplacementProfessionnel: true,
          heuresDeplacementCompense: heuresDeplacement,
        },
      },
    });

    it('SMH et ancienneté', () => {
      const resolved = resolveWizardRemunerationElements(input);
      expect(resolved.baseSMH).toBe(smh);
      expect(smhMensuelDepuisAnnuel(resolved.baseSMH)).toBe(2042.5);
      expect(amountBySemanticId(resolved.details, SEMANTIC_ID.PRIME_ANCIENNETE)).toBe(
        primeAncienneteConventionAnnuelle({ classe: 5, anciennete: 10 }),
      );
    });

    it('heures sup et déplacement augmentent le total', () => {
      const sans = totalMensuelFromInput(
        baseWizardInput({ classe: 5, groupe: 'C', situation: { anciennete: 10 } }),
      );
      const avec = totalMensuelFromInput(input);
      expect(avec).toBeGreaterThan(sans);
      const details = computeDetails(input);
      expect(amountBySemanticId(details, SEMANTIC_ID.MAJORATION_HEURES_SUP_25)).toBeGreaterThan(0);
      expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_DEPLACEMENT_PRO)).toBe(
        Math.round(heuresDeplacement * tauxHoraireSmhAnnuel(smh) * 12),
      );
    });
  });

  describe('Cas n°3 — Cadre F11 forfait jours, 3 ans exp., astreinte week-end', () => {
    const input = baseWizardInput({
      classe: 11,
      groupe: 'F',
      situation: {
        anciennete: 3,
        experiencePro: 3,
        forfait: 'jours',
        modalityState: {
          primeAstreintePeriodeJourRepos: true,
          periodesAstreinteJourReposMois: 2,
        },
      },
    });

    it('SMH barème débutant (2–4 ans exp.) + forfait jours +30 %', () => {
      const resolved = resolveWizardRemunerationElements(input);
      const smhDebutant = smhAnnuelAttendu(11, 3);
      expect(smhDebutant).toBe(29_852);
      expect(resolved.baseSMH).toBe(smhDebutant);
      const forfait = amountBySemanticId(resolved.details, SEMANTIC_ID.FORFAIT_JOURS);
      expect(forfait).toBe(roundToEuro(smhDebutant * 0.3));
      expect(amountBySemanticId(resolved.details, SEMANTIC_ID.PRIME_ANCIENNETE)).toBe(0);
    });

    it('astreinte jour de repos comptée en sus', () => {
      const details = computeDetails(input);
      expect(
        amountBySemanticId(details, SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS),
      ).toBeGreaterThan(0);
      const total = totalMensuelFromInput(input);
      expect(total).toBeGreaterThan(smhMensuelDepuisAnnuel(29_852));
    });
  });
});
