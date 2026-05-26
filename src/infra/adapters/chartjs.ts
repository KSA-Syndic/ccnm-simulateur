import type { ChartConfiguration, Chart as ChartType } from 'chart.js';

let chartModule: typeof import('chart.js') | null = null;

async function getChartJs() {
  if (!chartModule) {
    chartModule = await import('chart.js');
    const {
      Chart,
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      BarElement,
      Title,
      Tooltip,
      Legend,
      Filler,
    } = chartModule;
    Chart.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      BarElement,
      Title,
      Tooltip,
      Legend,
      Filler,
    );
  }
  return chartModule;
}

export async function createChart(
  canvas: HTMLCanvasElement,
  config: ChartConfiguration,
): Promise<ChartType> {
  const { Chart } = await getChartJs();
  return new Chart(canvas, config);
}

export type { ChartType, ChartConfiguration };
