import { describe, expect, it } from 'vitest';
import { formatTauxActivite } from '@/domain/utils/format';
import { statutCadreClass, statutCadreLabel } from '@/domain/ui/labels';
import { CONFIG } from '@/domain/config';

describe('libellés communs écran / PDF', () => {
  it('formatTauxActivite : virgule, au plus 2 décimales, sans zéros inutiles', () => {
    expect(formatTauxActivite(80)).toBe('80');
    expect(formatTauxActivite(62.5)).toBe('62,5');
    expect(formatTauxActivite(33.333)).toBe('33,33');
  });

  it('statut cadre à partir du seuil de classe', () => {
    expect(statutCadreLabel(CONFIG.SEUIL_CADRE - 1)).toBe('Non-Cadre');
    expect(statutCadreLabel(CONFIG.SEUIL_CADRE)).toBe('Cadre');
    expect(statutCadreClass(CONFIG.SEUIL_CADRE - 1)).toBe('non-cadre');
    expect(statutCadreClass(CONFIG.SEUIL_CADRE)).toBe('cadre');
  });
});
