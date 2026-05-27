import { describe, expect, it } from 'vitest';
import { getChartPointCoordsInWrapper } from '../../../src/features/arretees/chartPointCoords';

describe('getChartPointCoordsInWrapper', () => {
  it('retourne null si le point est absent', () => {
    const chart = {
      getDatasetMeta: () => ({ data: [] }),
    } as never;
    const canvas = document.createElement('canvas');
    expect(getChartPointCoordsInWrapper(chart, canvas, 0)).toBeNull();
  });

  it('calcule les coordonnées dans le repère du wrapper', () => {
    const host = document.createElement('div');
    host.className = 'curve-host';
    host.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 200,
        width: 400,
        height: 300,
        right: 500,
        bottom: 500,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      }) as DOMRect;

    const canvas = document.createElement('canvas');
    host.appendChild(canvas);
    canvas.getBoundingClientRect = () =>
      ({
        left: 110,
        top: 210,
        width: 380,
        height: 280,
        right: 490,
        bottom: 490,
        x: 110,
        y: 210,
        toJSON: () => ({}),
      }) as DOMRect;

    const chart = {
      getDatasetMeta: () => ({
        data: [{ x: 50, y: 80 }],
      }),
    } as never;

    const coords = getChartPointCoordsInWrapper(chart, canvas, 0);
    expect(coords).toEqual({ x: 60, y: 90 });
  });
});
