import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/domain/config';
import { POINTS_TERRITORIAUX } from '@/domain/config/pointsTerritoriaux';
import {
  getPointTerritorialADate,
  getTerritoirePoint,
  listTerritoiresPourSelection,
  resolvePointTerritorial,
  TERRITOIRE_SAISIE_LIBRE,
} from '@/domain/remuneration/pointTerritorial';
import { prepareWizardCompute } from '@/domain/remuneration/compute';
import { baseWizardInput } from './helpers/remunerationTestHelpers';

const d = (iso: string) => new Date(`${iso}T00:00:00`);

describe('POINTS_TERRITORIAUX — intégrité', () => {
  it('identifiants uniques, zone par défaut présente', () => {
    const ids = POINTS_TERRITORIAUX.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(CONFIG.POINT_TERRITORIAL.territoireDefautId);
    expect(ids).not.toContain(TERRITOIRE_SAISIE_LIBRE);
  });

  it('historiques non vides, triés, dates ISO et valeurs plausibles', () => {
    for (const t of POINTS_TERRITORIAUX) {
      expect(t.historique.length, t.id).toBeGreaterThan(0);
      expect(t.codes.length, t.id).toBeGreaterThan(0);
      t.historique.forEach((p, i) => {
        expect(p.depuis, t.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(p.valeur, t.id).toBeGreaterThan(3);
        expect(p.valeur, t.id).toBeLessThan(7);
        if (i > 0) expect(p.depuis > t.historique[i - 1]!.depuis, t.id).toBe(true);
      });
    }
  });
});

describe('getPointTerritorialADate', () => {
  const basRhin = getTerritoirePoint('bas-rhin')!;

  it('applique la valeur en vigueur à la date (bornes incluses)', () => {
    expect(getPointTerritorialADate(basRhin, d('2025-03-31')).valeur).toBe(5.82);
    expect(getPointTerritorialADate(basRhin, d('2025-04-01')).valeur).toBe(5.9);
    expect(getPointTerritorialADate(basRhin, d('2026-10-08')).valeur).toBe(5.95);
  });

  it('avant la première valeur référencée : plus ancienne valeur, signalée', () => {
    const r = getPointTerritorialADate(basRhin, d('2024-02-01'));
    expect(r.valeur).toBe(5.82);
    expect(r.anterieureNonReferencee).toBe(true);
    expect(getPointTerritorialADate(basRhin, d('2024-06-01')).anterieureNonReferencee).toBe(false);
  });
});

describe('resolvePointTerritorial', () => {
  it('zone référencée : historique ; saisie libre : valeur saisie', () => {
    expect(
      resolvePointTerritorial({ territoireId: 'rhone', pointTerritorial: 9 }, d('2024-06-01')),
    ).toBe(4.45);
    expect(
      resolvePointTerritorial(
        { territoireId: TERRITOIRE_SAISIE_LIBRE, pointTerritorial: 6.4 },
        d('2025-01-01'),
      ),
    ).toBe(6.4);
    expect(resolvePointTerritorial({ pointTerritorial: 0 }, d('2025-01-01'))).toBe(
      CONFIG.POINT_TERRITORIAL.valeurDefaut,
    );
  });

  it('le moteur prend la valeur du mois de référence (arriérés)', () => {
    const input = baseWizardInput({ situation: { territoireId: 'bas-rhin', anciennete: 10 } });
    const avant = prepareWizardCompute(input, { referenceDate: d('2025-03-01') });
    const apres = prepareWizardCompute(input, { referenceDate: d('2025-05-01') });
    expect(avant.ctx.pointTerritorial).toBe(5.82);
    expect(apres.ctx.pointTerritorial).toBe(5.9);
  });
});

describe('listTerritoiresPourSelection', () => {
  it('triée par nom avec la valeur en vigueur', () => {
    const list = listTerritoiresPourSelection(d('2026-10-08'));
    expect(list).toHaveLength(POINTS_TERRITORIAUX.length);
    const noms = list.map((t) => t.nom);
    expect([...noms].sort((a, b) => a.localeCompare(b, 'fr'))).toEqual(noms);
    expect(list.find((t) => t.id === 'bas-rhin')).toMatchObject({
      valeur: 5.95,
      depuis: '2026-04-01',
    });
  });
});
