import { computeSalaireProrataEntree } from '../utils/date';
import { roundToCents, roundToEuro } from '../utils/rounding';

export interface ArreteesMoisDetail {
  periode: string;
  periodeKey: string;
  year: number;
  salaireMensuelReel: number;
  salaireMensuelDu: number;
  difference: number;
}

export interface ArreteesAnneeDetail {
  annee: number;
  totalDu: number;
  totalReel: number;
  ecart: number;
  nbMoisSaisis: number;
  mois: ArreteesMoisDetail[];
}

export interface ArreteesResult {
  totalArretees: number;
  detailsArretees: ArreteesMoisDetail[];
  detailsTousMois: ArreteesMoisDetail[];
  detailsParAnnee: ArreteesAnneeDetail[];
}

export interface ArreteesParams {
  dateDebut: Date;
  dateFin: Date;
  dateEmbauche: Date;
  salairesParMois: Record<string, number>;
  calculateAnnualDue: (dateMois: Date, anciennete: number) => number;
  computeMensuelDue: (salaireAnnuel: number, month: number) => number;
}

export function calculerArreteesMoisParMois(params: ArreteesParams): ArreteesResult {
  const {
    dateDebut,
    dateFin,
    dateEmbauche,
    salairesParMois,
    calculateAnnualDue,
    computeMensuelDue,
  } = params;

  const detailsTousMois: ArreteesMoisDetail[] = [];
  const currentDate = new Date(dateDebut);

  while (currentDate <= dateFin) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    const salaireReel = salairesParMois[periodKey];

    if (salaireReel !== undefined && salaireReel !== null) {
      const moisDepuisEmbauche =
        (currentDate.getTime() - dateEmbauche.getTime()) / ((365.25 * 24 * 60 * 60 * 1000) / 12);
      const ancienneteMois = Math.floor(moisDepuisEmbauche / 12);

      const salaireAnnuelDuMois = calculateAnnualDue(currentDate, ancienneteMois);
      let salaireMensuelDu = computeMensuelDue(salaireAnnuelDuMois, month);

      const estPremierMois =
        currentDate.getFullYear() === dateEmbauche.getFullYear() &&
        currentDate.getMonth() === dateEmbauche.getMonth();
      if (estPremierMois) {
        const dernierJourMois = new Date(year, month, 0);
        salaireMensuelDu = computeSalaireProrataEntree(
          salaireMensuelDu,
          dateEmbauche,
          dernierJourMois,
        );
      }

      detailsTousMois.push({
        periode: currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        periodeKey: periodKey,
        year,
        salaireMensuelReel: salaireReel,
        salaireMensuelDu,
        difference: salaireMensuelDu - salaireReel,
      });
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Pass 2: group by calendar year (Art. 140 CCNM)
  const anneeMap = new Map<
    number,
    { totalDu: number; totalReel: number; mois: ArreteesMoisDetail[] }
  >();
  for (const row of detailsTousMois) {
    let entry = anneeMap.get(row.year);
    if (!entry) {
      entry = { totalDu: 0, totalReel: 0, mois: [] };
      anneeMap.set(row.year, entry);
    }
    entry.totalDu += row.salaireMensuelDu;
    entry.totalReel += row.salaireMensuelReel;
    entry.mois.push(row);
  }

  const detailsParAnnee: ArreteesAnneeDetail[] = [];
  let totalArretees = 0;
  for (const [annee, entry] of [...anneeMap.entries()].sort(([a], [b]) => a - b)) {
    const ecart = Math.max(0, entry.totalDu - entry.totalReel);
    detailsParAnnee.push({
      annee,
      totalDu: roundToCents(entry.totalDu),
      totalReel: roundToCents(entry.totalReel),
      ecart: roundToCents(ecart),
      nbMoisSaisis: entry.mois.length,
      mois: entry.mois,
    });
    totalArretees += ecart;
  }

  return {
    totalArretees: roundToEuro(totalArretees),
    detailsArretees: detailsTousMois.filter((d) => d.difference > 0),
    detailsTousMois,
    detailsParAnnee,
  };
}
