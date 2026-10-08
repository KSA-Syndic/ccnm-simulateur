import { CONFIG } from '../config';
import {
  POINTS_TERRITORIAUX,
  type PointTerritorialValeur,
  type TerritoirePoint,
} from '../config/pointsTerritoriaux';

/** Choix « autre territoire » : valeur du point saisie librement. */
export const TERRITOIRE_SAISIE_LIBRE = 'autre';

const BY_ID = new Map(POINTS_TERRITORIAUX.map((t) => [t.id, t]));

export function getTerritoirePoint(id: string | null | undefined): TerritoirePoint | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

function toIsoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export interface PointTerritorialADate {
  valeur: number;
  periode: PointTerritorialValeur;
  /** Date antérieure à la première valeur référencée : la plus ancienne valeur connue est appliquée. */
  anterieureNonReferencee: boolean;
}

/** Valeur du point en vigueur à une date pour une zone (historique trié par date d'effet). */
export function getPointTerritorialADate(
  territoire: TerritoirePoint,
  date: Date,
): PointTerritorialADate {
  const iso = toIsoDate(date);
  const hist = territoire.historique;
  let periode = hist[0]!;
  for (const p of hist) {
    if (p.depuis <= iso) periode = p;
    else break;
  }
  return { valeur: periode.valeur, periode, anterieureNonReferencee: iso < hist[0]!.depuis };
}

export interface TerritoirePourSelection {
  id: string;
  nom: string;
  departements: string;
  codes: readonly string[];
  /** Valeur en vigueur à la date demandée. */
  valeur: number;
  depuis: string;
}

/** Zones triées par nom, avec la valeur en vigueur à `date` (liste de sélection). */
export function listTerritoiresPourSelection(date: Date): TerritoirePourSelection[] {
  return [...POINTS_TERRITORIAUX]
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .map((t) => {
      const { valeur, periode } = getPointTerritorialADate(t, date);
      return {
        id: t.id,
        nom: t.nom,
        departements: t.departements,
        codes: t.codes,
        valeur,
        depuis: periode.depuis,
      };
    });
}

/**
 * Valeur du point appliquée au calcul : historique de la zone choisie à la date de référence,
 * ou valeur saisie librement (« autre territoire »).
 */
export function resolvePointTerritorial(
  situation: { territoireId?: string | null; pointTerritorial: number },
  date: Date,
): number {
  const territoire = getTerritoirePoint(situation.territoireId);
  if (territoire) return getPointTerritorialADate(territoire, date).valeur;
  return situation.pointTerritorial > 0
    ? situation.pointTerritorial
    : CONFIG.POINT_TERRITORIAL.valeurDefaut;
}
