import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../config';
import {
  getBaremeDebutantTranche,
  getSmhForClasse,
  getAnnualSmhFullBeforeActivity,
  getSmhGridAnnual,
} from '../smh';

describe('smh / barème débutants F11–F12', () => {
  it('tranches expérience (0, 2, 4)', () => {
    expect(getBaremeDebutantTranche(0)).toBe(0);
    expect(getBaremeDebutantTranche(1.9)).toBe(0);
    expect(getBaremeDebutantTranche(2)).toBe(2);
    expect(getBaremeDebutantTranche(3)).toBe(2);
    expect(getBaremeDebutantTranche(4)).toBe(4);
    expect(getBaremeDebutantTranche(5.9)).toBe(4);
  });

  it('sans experiencePro : grille annuelle seule', () => {
    const y = CONFIG.CURRENT_DATA_YEAR;
    expect(getSmhForClasse(11)).toBe(getSmhGridAnnual(11, y));
  });

  it('classe 11, exp sous le seuil catalogue : barème débutant selon la tranche', () => {
    const y = CONFIG.CURRENT_DATA_YEAR;
    const tranche = getBaremeDebutantTranche(1);
    const attendu = CONFIG.BAREME_DEBUTANTS[11]![tranche]!;
    expect(getAnnualSmhFullBeforeActivity({ classe: 11, experiencePro: 1, year: y })).toBe(attendu);
    expect(getSmhForClasse(11, y, 1)).toBe(attendu);
  });

  it('classe 11, exp au seuil catalogue ou au-delà : grille SMH', () => {
    const y = CONFIG.CURRENT_DATA_YEAR;
    const grille = getSmhGridAnnual(11, y);
    const seuil = CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO;
    expect(getAnnualSmhFullBeforeActivity({ classe: 11, experiencePro: seuil, year: y })).toBe(
      grille,
    );
    expect(getSmhForClasse(11, y, seuil)).toBe(grille);
  });

  it('classe 5 : toujours la grille (barème débutants inactif)', () => {
    const y = CONFIG.CURRENT_DATA_YEAR;
    const grille = getSmhGridAnnual(5, y);
    expect(getSmhForClasse(5, y, 0)).toBe(grille);
    expect(getAnnualSmhFullBeforeActivity({ classe: 5, experiencePro: 0, year: y })).toBe(grille);
  });
});
