import { describe, expect, it } from 'vitest';
import { buildMonthlyPeriodsStub, enrichPeriodesSalaireDuMensuel } from '@/composables/useTimeline';

describe('buildMonthlyPeriodsStub', () => {
  it('commence la frise au 01/2024 si la date d’embauche est antérieure', () => {
    const periodes = buildMonthlyPeriodsStub({
      dateEmbauche: '2018-06-15',
      monthlyDu: 2000,
    });
    expect(periodes.length).toBeGreaterThan(0);
    expect(periodes[0]!.periodKey).toBe('2024-01');
  });
});

describe('useTimeline enrichPeriodesSalaireDuMensuel', () => {
  it('met à jour salaireDu selon la grille annuelle', () => {
    const periodes = buildMonthlyPeriodsStub({
      dateEmbauche: '2024-01-01',
      monthlyDu: 9999,
    });
    expect(periodes.length).toBeGreaterThan(0);
    enrichPeriodesSalaireDuMensuel(periodes, {
      classe: 5,
      experiencePro: 5,
      tempsPartiel: false,
      tauxActivite: 100,
    });
    const p2024 = periodes.find((p) => p.periodKey?.startsWith('2024'));
    expect(p2024).toBeDefined();
    expect(p2024!.salaireDu).not.toBe(9999);
    expect(p2024!.salaireDu).toBeGreaterThan(0);
  });
});
