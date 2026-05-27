import type { Chart as ChartType } from 'chart.js';

/** Coordonnées d'un point Chart.js dans le repère du wrapper `.curve-chart-wrapper`. */
export function getChartPointCoordsInWrapper(
  chart: ChartType,
  canvas: HTMLCanvasElement,
  periodIndex: number,
): { x: number; y: number } | null {
  if (periodIndex < 0) return null;

  const meta = chart.getDatasetMeta(0);
  const el = meta.data[periodIndex] as { x?: number; y?: number } | undefined;
  if (!el || el.x == null || el.y == null) return null;

  const wrapper =
    (canvas.closest('.curve-host') as HTMLElement | null) ??
    (canvas.closest('.curve-chart-wrapper') as HTMLElement | null);
  if (!wrapper) return null;

  const wrapperRect = wrapper.getBoundingClientRect();
  const chartRect = canvas.getBoundingClientRect();

  return {
    x: el.x + (chartRect.left - wrapperRect.left),
    y: el.y + (chartRect.top - wrapperRect.top),
  };
}
