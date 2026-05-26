import { CONFIG } from '../config';

export function getSmhForClasse(classe: number, year?: number): number {
  const y = year ?? CONFIG.CURRENT_DATA_YEAR;
  const grid = CONFIG.SMH_BY_YEAR[y];
  if (!grid) return 0;
  return grid[classe] ?? 0;
}
