import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchInflationSeries,
  parseEurostatHicpInflation,
  parseWorldBankInflationResponse,
} from '@/domain/evolution/inflationFetch';
import { CONFIG } from '@/domain/config';

function eurostatJsonMinimal(): unknown {
  return {
    dimension: {
      time: {
        category: {
          index: { '2020': 0, '2021': 1, '2022': 2, '2023': 3, '2024': 4 },
        },
      },
    },
    value: { '0': 0.5, '1': 1.6, '2': 5.2, '3': 4.9, '4': 2.0 },
  };
}

describe('inflationFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parseEurostatHicpInflation extrait les taux %', () => {
    const r = parseEurostatHicpInflation(eurostatJsonMinimal());
    expect(r).not.toBeNull();
    expect(r!['2024']).toBe(2);
  });

  it('parseWorldBankInflationResponse extrait date → valeur', () => {
    const wb: unknown = [
      { page: 1 },
      [
        { date: '2020', value: 0.5 },
        { date: '2021', value: 1.6 },
        { date: '2022', value: 5.2 },
        { date: '2023', value: 4.9 },
        { date: '2024', value: 2.0 },
      ],
    ];
    const r = parseWorldBankInflationResponse(wb);
    expect(r).not.toBeNull();
    expect(r!['2023']).toBe(4.9);
  });

  it('fetchInflationSeries : Eurostat OK — URL contient unit=RCH_A_AVG', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => eurostatJsonMinimal(),
    });
    vi.stubGlobal('fetch', fetchMock);

    const r = await fetchInflationSeries();
    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0]![0])).toContain('unit=RCH_A_AVG');
    expect(r.source).toContain('Eurostat');
    expect(Object.keys(r.values).length).toBeGreaterThanOrEqual(5);
  });

  it('fetchInflationSeries : Eurostat KO puis Banque mondiale OK', async () => {
    const wb: unknown = [
      {},
      [
        { date: '2020', value: 0.5 },
        { date: '2021', value: 1.6 },
        { date: '2022', value: 5.2 },
        { date: '2023', value: 4.9 },
        { date: '2024', value: 2.0 },
      ],
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => wb });
    vi.stubGlobal('fetch', fetchMock);

    const r = await fetchInflationSeries();
    expect(r.source).toContain('Banque mondiale');
    expect(r.values['2024']).toBe(2);
  });

  it('fetchInflationSeries : toutes sources KO → fallback CONFIG', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const r = await fetchInflationSeries();
    expect(r.source).toContain('INSEE');
    expect(r.period).toBe(CONFIG.INFLATION_FALLBACK_PERIOD);
    expect(Object.keys(r.values).length).toBe(Object.keys(CONFIG.INFLATION_FALLBACK_SERIES).length);
  });
});
