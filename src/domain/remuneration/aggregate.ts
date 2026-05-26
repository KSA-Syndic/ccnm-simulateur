import { type ElementResult } from '../types';
import { roundToEuro } from '../utils/rounding';

export interface AggregatedSection {
  label: string;
  items: ElementResult[];
  subtotal: number;
}

export interface AggregatedRemuneration {
  baseSMH: number;
  sections: AggregatedSection[];
  totalAnnual: number;
  totalMonthly: number;
}

export function aggregateRemunerationDetails(
  details: ElementResult[],
  baseSMH: number,
  nbMois: number,
): AggregatedRemuneration {
  const primesInSMH = details.filter((d) => d.kind === 'prime' && d.inclusDansSMH && d.amount > 0);
  const primesOutSMH = details.filter(
    (d) => d.kind === 'prime' && !d.inclusDansSMH && d.amount > 0,
  );
  const majorations = details.filter((d) => d.kind === 'majoration' && d.amount > 0);
  const forfaits = details.filter((d) => d.kind === 'forfait' && d.amount > 0);

  const sections: AggregatedSection[] = [];

  if (primesInSMH.length > 0) {
    sections.push({
      label: 'Primes incluses dans le SMH',
      items: primesInSMH,
      subtotal: primesInSMH.reduce((s, d) => s + d.amount, 0),
    });
  }

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

  const totalDetails = details.reduce((s, d) => s + d.amount, 0);
  const totalAnnual = baseSMH + totalDetails;
  const totalMonthly = roundToEuro(totalAnnual / nbMois);

  return { baseSMH, sections, totalAnnual, totalMonthly };
}
