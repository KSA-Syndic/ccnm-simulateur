import { formatMoney } from '../utils/format';
import type { ArreteesMoisVueRow } from './aggregateFromPeriodes';

type MensuelDuComposantesRow = Pick<
  ArreteesMoisVueRow,
  'primesVerseesCeMois' | 'primesVerseesLabels' | 'estMois13eMois'
>;

/** Complément d’affichage pour le dû mensuel (13e mois, primes à mois fixe). */
export function formatMensuelDuComposantes(row: MensuelDuComposantesRow): string | null {
  const bits: string[] = [];
  if (row.estMois13eMois) {
    bits.push('répartition 13e mois (double base mensuelle)');
  }
  const pv = row.primesVerseesCeMois;
  if (pv != null && pv > 0) {
    const lab =
      row.primesVerseesLabels && row.primesVerseesLabels.length > 0
        ? row.primesVerseesLabels.join(', ')
        : 'prime';
    bits.push(`${formatMoney(pv)} (${lab})`);
  }
  if (bits.length === 0) return null;
  return bits.join(' · ');
}

export function formatMensuelDuAvecDetail(
  row: MensuelDuComposantesRow & { salaireDu: number },
): string {
  const base = formatMoney(row.salaireDu);
  const comp = formatMensuelDuComposantes(row);
  return comp ? `${base} — dont ${comp}` : base;
}
