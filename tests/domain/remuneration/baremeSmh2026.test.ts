import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/domain/config';
import { roundHourlyRate } from '@/domain/utils/rounding';
import { HEURES_MOIS_REF } from './helpers/remunerationTestHelpers';
import {
  GROUPE_PAR_CLASSE,
  SMH_GRID_2026,
  smhAnnuelAttendu,
  tauxHoraireSmhAnnuel,
  YEAR_REF,
} from './helpers/remunerationTestHelpers';

describe('Barème SMH 2026 (CONFIG)', () => {
  it('grille annuelle 35 h — 18 classes alignées sur la synthèse métallurgie', () => {
    for (let classe = 1; classe <= 18; classe += 1) {
      expect(SMH_GRID_2026[classe]).toBe(CONFIG.SMH[classe]);
    }
    expect(SMH_GRID_2026[1]).toBe(21_980);
    expect(SMH_GRID_2026[5]).toBe(24_510);
    expect(SMH_GRID_2026[11]).toBe(35_200);
    expect(SMH_GRID_2026[18]).toBe(68_450);
  });

  it('taux horaire = SMH annuel / 12 / 151,67 h (4 déc. plafond, formule simulateur)', () => {
    for (let classe = 1; classe <= 18; classe += 1) {
      const annuel = SMH_GRID_2026[classe]!;
      const brut = annuel / 12 / HEURES_MOIS_REF;
      expect(tauxHoraireSmhAnnuel(annuel)).toBe(roundHourlyRate(brut));
    }
    expect(tauxHoraireSmhAnnuel(21_980)).toBe(12.0767);
    expect(tauxHoraireSmhAnnuel(24_510)).toBe(13.4668);
    expect(tauxHoraireSmhAnnuel(35_200)).toBe(19.3403);
  });

  it('barème débutants F11 — expérience pro < 6 ans', () => {
    expect(smhAnnuelAttendu(11, 1)).toBe(28_430);
    expect(smhAnnuelAttendu(11, 3)).toBe(29_852);
    expect(smhAnnuelAttendu(11, 6)).toBe(SMH_GRID_2026[11]);
  });

  it('chaque classe appartient à un groupe A–I', () => {
    for (let classe = 1; classe <= 18; classe += 1) {
      expect(GROUPE_PAR_CLASSE[classe]).toMatch(/^[A-I]$/);
    }
    expect(GROUPE_PAR_CLASSE[1]).toBe('A');
    expect(GROUPE_PAR_CLASSE[5]).toBe('C');
    expect(GROUPE_PAR_CLASSE[11]).toBe('F');
  });

  it('année de référence du simulateur', () => {
    expect(YEAR_REF).toBe(2026);
  });
});
