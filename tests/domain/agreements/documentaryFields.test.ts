import { describe, expect, it } from 'vitest';
import '@/accords';
import { getAgreement, registerAgreement } from '@/domain/agreements/registry';
import { validateAgreement, type Agreement } from '@/domain/agreements/interface';
import { computeAnnualTotal } from '@/domain/remuneration/compute';
import { calculateSalaireMensuelDuPourPeriode } from '@/domain/arretees/salaireDuPourMois';
import { baseWizardInput } from '../remuneration/helpers/remunerationTestHelpers';

/** Retire les champs signalés « Documentaire » dans `interface.ts`. */
function sansChampsDocumentaires(ag: Agreement, id: string): Agreement {
  const { metadata: _m, elements: _e, pointsVigilance: _p, conges: _c, ...rest } = ag;
  const { baseCalcul: _b, ...anciennete } = ag.anciennete;
  const {
    plageDebut: _pd,
    plageFin: _pf,
    seuilHeuresPosteNuit: _s,
    posteMatin: _pm,
    ...nuit
  } = ag.majorations.nuit;
  const hs = ag.majorations.heuresSupplementaires;
  const { inclusDansSMH: _r, ...repartition13Mois } = ag.repartition13Mois;
  const { nomCourt: _n, ...labels } = ag.labels;
  return {
    ...rest,
    id,
    anciennete,
    majorations: {
      ...ag.majorations,
      nuit,
      ...(hs
        ? {
            heuresSupplementaires: { majoration25: hs.majoration25, majoration50: hs.majoration50 },
          }
        : {}),
    },
    repartition13Mois,
    labels,
    primes: ag.primes.map(
      ({ nonCumulAvec: _a, uiSection: _u, inputUnitLabel: _i, stateKeyValeur: _v, ...p }) => p,
    ),
  };
}

describe('champs documentaires des accords', () => {
  const kuhn = getAgreement('kuhn')!;
  const minimal = sansChampsDocumentaires(kuhn, 'kuhn-sans-documentaire');

  it('un accord sans champs documentaires reste valide', () => {
    expect(validateAgreement(minimal)).toBe(true);
    expect(registerAgreement(minimal)).toBe(true);
  });

  it('calcul identique avec ou sans champs documentaires', () => {
    for (const classe of [1, 5, 11, 14]) {
      for (const anciennete of [0, 2, 4, 10, 30]) {
        const agreementInput = (id: string) =>
          baseWizardInput({
            classe,
            situation: { anciennete, travailNuit: true, heuresNuit: 20 },
            agreement: {
              accordActif: true,
              activeAccordId: id,
              inputs: { primeVacances: true, travailEquipe: true },
            },
          });
        expect(computeAnnualTotal(agreementInput(minimal.id))).toBe(
          computeAnnualTotal(agreementInput('kuhn')),
        );
        const periode = {
          periodKey: '2025-07',
          dateEmbauche: '2015-01-15',
          nbMois: 13,
          smhSeul: false,
        };
        expect(calculateSalaireMensuelDuPourPeriode(agreementInput(minimal.id), periode)).toEqual(
          calculateSalaireMensuelDuPourPeriode(agreementInput('kuhn'), periode),
        );
      }
    }
  });
});
