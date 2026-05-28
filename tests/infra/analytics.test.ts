import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as analytics from '@/infra/analytics';

describe('analytics', () => {
  beforeEach(() => {
    analytics.resetAnalyticsSession();
    localStorage.clear();
    vi.stubGlobal('umami', { track: vi.fn() });
    vi.spyOn(analytics, 'isLocalEnv').mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resetAnalyticsSession permet un nouvel envoi Resultat salaire', () => {
    analytics.trackResultatSalaireOnce();
    analytics.resetAnalyticsSession();
    expect(() => analytics.trackResultatSalaireOnce()).not.toThrow();
  });

  it('trackEvent respecte le refus de consentement', () => {
    localStorage.setItem('analytics_consent', 'off');
    analytics.trackEvent('Test');
    const umami = (window as unknown as { umami: { track: ReturnType<typeof vi.fn> } }).umami;
    expect(umami.track).not.toHaveBeenCalled();
  });

  it('buildPdfArrieresAnalyticsPayload — dates ISO depuis periodKey', () => {
    const payload = analytics.buildPdfArrieresAnalyticsPayload(
      [
        { periodKey: '2024-03', salaireVerse: 2000 },
        { periodKey: '2024-01', salaireVerse: 1900 },
      ],
      {
        totalArretees: 100,
        groupe: 'C',
        classe: 11,
        nbMois: 12,
        accordNomCourt: 'Kuhn',
      },
    );
    expect(payload.dateDebut).toBe('2024-01-01');
    expect(payload.dateFin).toBe('2024-03-01');
    expect(payload.accord).toBe('Kuhn');
  });
});
