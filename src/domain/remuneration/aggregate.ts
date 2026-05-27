import { type ElementResult } from '../types';
import { roundToEuro } from '../utils/rounding';

export interface AggregatedSection {
  label: string;
  items: ElementResult[];
  subtotal: number;
}

export interface AggregatedRemuneration {
  baseSMH: number;
  /** Primes / éléments `inclusDansSMH === true` affichés en sous-lignes « ↳ dont … » sous la base (hors section dédiée). */
  includedInSmhItems: ElementResult[];
  sections: AggregatedSection[];
  totalAnnual: number;
  totalMonthly: number;
}

function isPrimeInSmhSection(d: ElementResult): boolean {
  return d.inclusDansSMH === true;
}

function isPrimeOutSmhSection(d: ElementResult): boolean {
  return d.kind === 'prime' && d.inclusDansSMH !== true && d.amount > 0;
}

/** Éléments dont le montant s’ajoute au total au-delà de la ligne `baseSMH` (hors agrégés SMH strict). */
function contributesToTotalAboveBase(d: ElementResult): boolean {
  if (d.amount <= 0) return false;
  if (d.inclusDansSMH === true) return false;
  return true;
}

export function aggregateRemunerationDetails(
  details: ElementResult[],
  baseSMH: number,
  nbMois: number,
): AggregatedRemuneration {
  const primesInSMH = details.filter(
    (d) => d.kind === 'prime' && isPrimeInSmhSection(d) && d.amount > 0,
  );
  const primesOutSMH = details.filter(isPrimeOutSmhSection);
  const majorations = details.filter((d) => d.kind === 'majoration' && d.amount > 0);
  const forfaits = details.filter((d) => d.kind === 'forfait' && d.amount > 0);

  const sections: AggregatedSection[] = [];

  if (majorations.length > 0) {
    sections.push({
      label: 'Majorations',
      items: majorations,
      subtotal: majorations.reduce((s, d) => s + d.amount, 0),
    });
  }

  if (forfaits.length > 0) {
    sections.push({
      label: 'Forfaits',
      items: forfaits,
      subtotal: forfaits.reduce((s, d) => s + d.amount, 0),
    });
  }

  if (primesOutSMH.length > 0) {
    sections.push({
      label: 'Primes hors SMH',
      items: primesOutSMH,
      subtotal: primesOutSMH.reduce((s, d) => s + d.amount, 0),
    });
  }

  const forfaitSum = forfaits.reduce((s, d) => s + d.amount, 0);
  const extrasAboveBase = details
    .filter(contributesToTotalAboveBase)
    .reduce((s, d) => s + d.amount, 0);
  /** Forfaits cadre : comptés dans le total annuel « paquet » (aligné `RemunerationCalculator` legacy). */
  const totalAnnual = roundToEuro(baseSMH + forfaitSum + extrasAboveBase);
  const totalMonthly = roundToEuro(totalAnnual / nbMois);

  return {
    baseSMH,
    includedInSmhItems: primesInSMH,
    sections,
    totalAnnual,
    totalMonthly,
  };
}
