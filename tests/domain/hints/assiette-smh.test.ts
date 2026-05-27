import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/domain/config';
import { buildSmhAssietteHintBlocks } from '@/domain/hints/engine';
import {
  buildLegacyRemunerationState,
  wizardStoresInputFromLegacyState,
} from '@/domain/remuneration/compute';

describe('buildSmhAssietteHintBlocks', () => {
  it('retourne une liste vide lorsque aucun libellé inclus/exclus SMH', () => {
    const input = wizardStoresInputFromLegacyState(
      buildLegacyRemunerationState({
        modeManuel: true,
        groupeManuel: 'A',
        classeManuel: 1,
        scoresSix: [1, 1, 1, 1, 1, 1],
        anciennete: 0,
        pointTerritorial: CONFIG.POINT_TERRITORIAL.valeurDefaut,
        travailTempsPartiel: false,
        tauxActivite: 100,
        forfait: '35h',
        experiencePro: 0,
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        travailHeuresSup: false,
        heuresSup: 0,
        travailJoursSupForfait: false,
        joursSupForfait: 0,
        accordActif: false,
        accordInputs: {},
      }),
    );
    expect(buildSmhAssietteHintBlocks(input, 12)).toEqual([]);
  });
});
