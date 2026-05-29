/**
 * Agrégation indicative par année civile à partir des périodes de la frise Vue
 * (libellés contenant une année type « janv. 2024 »).
 * Aligné sur l’esprit de `calculerArreteesMoisParMois` (Art. 140 CCNM) sans recalculer le dû mois par mois.
 */

export interface ArreteesAnneeStub {
  annee: number;
  nbMoisSaisis: number;
  totalDu: number;
  totalReel: number;
  /** max(0, totalDu − totalReel), arrondi centimes. */
  ecart: number;
}

const YEAR_RE = /\b(20\d{2})\b/;

export function extractYearFromPeriodeLabel(label: string): number | null {
  const m = YEAR_RE.exec(label);
  if (!m) return null;
  return Number(m[1]);
}

export function aggregateArreteesParAnneeFromPeriodeLabels(
  periodes: ReadonlyArray<{ label: string; salaireDu: number; salaireVerse: number | undefined }>,
): { detailsParAnnee: ArreteesAnneeStub[]; totalArretees: number } {
  const map = new Map<number, { totalDu: number; totalReel: number; nbMoisSaisis: number }>();

  for (const p of periodes) {
    if (p.salaireVerse === undefined) continue;
    const annee = extractYearFromPeriodeLabel(p.label);
    if (annee === null) continue;
    let e = map.get(annee);
    if (!e) {
      e = { totalDu: 0, totalReel: 0, nbMoisSaisis: 0 };
      map.set(annee, e);
    }
    e.totalDu += p.salaireDu;
    e.totalReel += p.salaireVerse;
    e.nbMoisSaisis += 1;
  }

  const detailsParAnnee: ArreteesAnneeStub[] = [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([annee, e]) => {
      const totalDu = Math.round(e.totalDu * 100) / 100;
      const totalReel = Math.round(e.totalReel * 100) / 100;
      const ecart = Math.round(Math.max(0, totalDu - totalReel) * 100) / 100;
      return {
        annee,
        nbMoisSaisis: e.nbMoisSaisis,
        totalDu,
        totalReel,
        ecart,
      };
    });

  const totalArretees = Math.round(detailsParAnnee.reduce((s, r) => s + r.ecart, 0));

  return { detailsParAnnee, totalArretees };
}

/** Ligne « détail mois par mois » pour l’UI étape 4. */
export interface ArreteesMoisVueRow {
  periode: string;
  periodKey?: string;
  salaireMensuelReel: number;
  salaireMensuelDu: number;
  difference: number;
  mensuelDuBase?: number;
  primesVerseesCeMois?: number;
  primesVerseesLabels?: string[];
  estMois13eMois?: boolean;
}

/** Données préparées pour le panneau résultats Vue (agrégation annuelle + détail mensuel saisi). */
export interface ArreteesSummaryVue {
  totalArretees: number;
  detailsParAnnee: ArreteesAnneeStub[];
  detailMois: ArreteesMoisVueRow[];
  dateDebutLabel: string;
  dateFinLabel: string;
  anneesAvecEcartCount: number;
  nbAnnees: number;
  conformeAuSMH: boolean;
}

/**
 * Construit le résumé affiché après « Calculer les arriérés » à partir des périodes de la frise.
 * Retourne `null` si aucun mois n’a de salaire versé saisi.
 */
export function buildArreteesSummaryFromPeriodes(
  periodes: ReadonlyArray<{
    label: string;
    salaireDu: number;
    salaireVerse: number | undefined;
    periodKey?: string;
    mensuelDuBase?: number;
    primesVerseesCeMois?: number;
    primesVerseesLabels?: string[];
    estMois13eMois?: boolean;
  }>,
): ArreteesSummaryVue | null {
  const filled = periodes.filter((p) => p.salaireVerse !== undefined && p.salaireVerse !== null);
  if (filled.length === 0) return null;

  const sorted = [...filled].sort((a, b) =>
    String(a.periodKey ?? a.label).localeCompare(String(b.periodKey ?? b.label)),
  );

  const agg = aggregateArreteesParAnneeFromPeriodeLabels(periodes);
  const detailMois: ArreteesMoisVueRow[] = sorted.map((p) => {
    const reel = Number(p.salaireVerse) || 0;
    const du = p.salaireDu;
    const row: ArreteesMoisVueRow = {
      periode: p.label,
      salaireMensuelReel: reel,
      salaireMensuelDu: du,
      difference: du - reel,
    };
    if (p.periodKey !== undefined) row.periodKey = p.periodKey;
    if (p.mensuelDuBase !== undefined) row.mensuelDuBase = p.mensuelDuBase;
    if (p.primesVerseesCeMois !== undefined) row.primesVerseesCeMois = p.primesVerseesCeMois;
    if (p.primesVerseesLabels?.length) row.primesVerseesLabels = [...p.primesVerseesLabels];
    if (p.estMois13eMois) row.estMois13eMois = true;
    return row;
  });

  const anneesAvecEcartCount = agg.detailsParAnnee.filter((a) => a.ecart > 0).length;

  return {
    totalArretees: agg.totalArretees,
    detailsParAnnee: agg.detailsParAnnee,
    detailMois,
    dateDebutLabel: sorted[0]!.label,
    dateFinLabel: sorted[sorted.length - 1]!.label,
    anneesAvecEcartCount,
    nbAnnees: agg.detailsParAnnee.length,
    conformeAuSMH: agg.totalArretees === 0,
  };
}
