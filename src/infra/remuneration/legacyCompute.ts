/**
 * Pont vers l'oracle de calcul legacy (JS) sous `legacy-archive/` (hors bundle Vite).
 * Parité chiffrée Vitest / E2E valeurs.
 */
export {
  calculateAnnualRemuneration,
  getMontantAnnuelSMHSeul,
} from '../../../legacy-archive/remuneration/RemunerationCalculator.js';
