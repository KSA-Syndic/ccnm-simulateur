import { CONFIG } from '../config';

export interface ClassificationResult {
  totalScore: number;
  groupe: string;
  classe: number;
}

export function calculateClassification(scores: number[]): ClassificationResult {
  if (!scores || scores.length !== 6) {
    console.warn('Scores invalides pour le calcul de classification');
    return { totalScore: 6, groupe: 'A', classe: 1 };
  }

  const totalScore = scores.reduce((sum, score) => sum + score, 0);

  for (const [min, max, groupe, classe] of CONFIG.MAPPING_POINTS) {
    if (totalScore >= min && totalScore <= max) {
      return { totalScore, groupe, classe };
    }
  }

  return { totalScore, groupe: 'A', classe: 1 };
}

export interface ActiveClassificationState {
  modeManuel?: boolean;
  groupeManuel?: string;
  classeManuel?: number;
  scores?: number[];
}

export function getActiveClassification(state: ActiveClassificationState): {
  groupe: string;
  classe: number;
} {
  if (!state) {
    return { groupe: 'A', classe: 1 };
  }

  if (state.modeManuel) {
    return {
      groupe: state.groupeManuel ?? 'A',
      classe: state.classeManuel ?? 1,
    };
  }

  const calc = calculateClassification(state.scores ?? []);
  return { groupe: calc.groupe, classe: calc.classe };
}

export function isCadre(classe: number): boolean {
  return classe >= CONFIG.SEUIL_CADRE;
}

export function getClassesForGroupe(groupe: string): number[] {
  return CONFIG.GROUPE_CLASSES[groupe] ?? [];
}
