import { CONSTANTS } from '../config/constants';

export interface ArreteesLegalNotes {
  /** Limites de la réclamation (prescription, entrée en vigueur CCNM). */
  neg: string[];
  /** Éléments favorables au dossier. */
  pos: string[];
  hasAny: boolean;
}

/** Même date décalée de `annees` ans (négatif : dans le passé). */
function decalerAnnees(date: Date, annees: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + annees);
  return d;
}

/**
 * Mentions juridiques du résumé des arriérés.
 * Prescription (Code du travail L. 3245-1) : la demande porte sur les 3 dernières années ou,
 * contrat rompu, sur les 3 années précédant la rupture.
 */
export function buildArreteesLegalNotes(params: {
  /** Premier mois saisi (`YYYY-MM`). */
  firstPeriodKey: string | undefined;
  accordEcrit: boolean;
  changementClassification: boolean;
  /** Date de rupture retenue (`YYYY-MM-DD`), `null` si le contrat est en cours. */
  dateRupture: string | null;
  today?: Date;
}): ArreteesLegalNotes {
  const today = params.today ?? new Date();
  const annees = CONSTANTS.PRESCRIPTION_ANNEES;
  const rupture = params.dateRupture ? new Date(params.dateRupture) : null;
  const neg: string[] = [];
  const pos: string[] = [];

  const firstPk = params.firstPeriodKey;
  if (firstPk) {
    const d = new Date(Number(firstPk.slice(0, 4)), Number(firstPk.slice(5, 7)) - 1, 1);
    const presc = decalerAnnees(rupture ?? today, -annees);
    if (d < presc) {
      const depuis = presc.toLocaleDateString('fr-FR');
      neg.push(
        rupture
          ? `Contrat rompu : la demande peut porter sur les salaires des ${annees} années précédant la rupture, soit à partir du ${depuis}.`
          : `La prescription de ${annees} ans limite les arriérés réclamables à partir du ${depuis}.`,
      );
    }
    if (d < CONSTANTS.DATE_CCNM_EFFET) {
      neg.push(
        'Les arriérés avant le 1er janvier 2024 ne sont pas réclamables au titre de cette convention.',
      );
    }
  }
  if (rupture && today > decalerAnnees(rupture, annees)) {
    neg.push(
      `Plus de ${annees} ans se sont écoulés depuis la rupture : l'action en paiement peut être prescrite (Code du travail L. 3245-1).`,
    );
  }
  if (params.accordEcrit) {
    pos.push("Un accord écrit avec l'employeur renforce votre position juridique.");
  }
  if (params.changementClassification) {
    pos.push('Un changement de classification documenté peut faciliter la réclamation.');
  }
  return { neg, pos, hasAny: neg.length > 0 || pos.length > 0 };
}
