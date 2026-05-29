import { CONFIG } from '../config';
import {
  SEMANTIC_ID,
  type ElementDef,
  type ElementActivation,
  type ComputeContext,
} from '../types';
import { roundToEuro, annualFromMonthly } from '../utils/rounding';
import { buildNationalModalityElementDefs } from './nationalModalityRegistry';
import { buildConventionPrimeElement } from './primeElementFactory';

type Source = 'convention';
const SRC: Source = 'convention';

/** Règle d’affichage des modalités « Autres » dans le formulaire. */
export const UI_VISIBLE_MODALITE = {
  TOUJOURS: 'toujours',
  COMPTAGE_HORAIRE_CONVENTIONNEL: 'comptageHoraireConventionnel',
} as const;

export type UiVisibleQuand = (typeof UI_VISIBLE_MODALITE)[keyof typeof UI_VISIBLE_MODALITE];

export function isModaliteVisiblePourProfil(
  uiVisibleQuand: UiVisibleQuand | undefined,
  profil: { isCadre: boolean; forfait: string },
): boolean {
  if (!uiVisibleQuand || uiVisibleQuand === UI_VISIBLE_MODALITE.TOUJOURS) return true;
  if (uiVisibleQuand === UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL) {
    if (!profil.isCadre) return true;
    return profil.forfait !== 'jours';
  }
  return true;
}

export interface ModaliteRaw {
  stateKeyActif: string;
  stateKeyHeures?: string;
  inclusDansSMH: boolean;
  uiSection: 'main' | 'extra';
  uiVisibleQuand?: UiVisibleQuand;
  sourceArticle: string;
  conditionTexte: string;
  tooltip: string;
}

/**
 * Métadonnées juridiques et clés d’état des modalités « Autres ».
 * Chaque clé doit avoir une entrée miroir dans `nationalModalityRegistry.ts` (`NATIONAL_MODALITY_ENTRIES`).
 */
export const CONVENTION_MODALITES_PRIMES: Record<string, ModaliteRaw> = {
  interventionAstreinte: {
    stateKeyActif: 'majorationInterventionAstreinte',
    stateKeyHeures: 'heuresInterventionAstreinte',
    inclusDansSMH: false,
    uiSection: 'extra',
    uiVisibleQuand: UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL,
    sourceArticle: 'Code du travail L3121-9, L3121-10 ; CCNM (travail effectif)',
    conditionTexte: "Les heures d'intervention pendant une astreinte sont du travail effectif.",
    tooltip:
      'Indiquez les heures réellement travaillées en intervention. Les périodes de simple disponibilité sont traitées par les lignes « astreinte » ci-dessous (hors TTE).',
  },
  astreintePeriodeReposQuotidien: {
    stateKeyActif: 'primeAstreintePeriodeReposQuotidien',
    stateKeyHeures: 'periodesAstreinteReposQuotidienMois',
    inclusDansSMH: false,
    uiSection: 'extra',
    uiVisibleQuand: UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL,
    sourceArticle: 'CCNM (organisation du travail, astreinte hors temps de travail effectif)',
    conditionTexte:
      "Périodes d'astreinte sur les temps de repos quotidiens prévus par l'emploi du temps, hors travail effectif.",
    tooltip:
      'Nombre de périodes concernées par mois. Le montant par période suit le taux SMH horaire de votre classe.',
  },
  astreintePeriodeJourRepos: {
    stateKeyActif: 'primeAstreintePeriodeJourRepos',
    stateKeyHeures: 'periodesAstreinteJourReposMois',
    inclusDansSMH: false,
    uiSection: 'extra',
    uiVisibleQuand: UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL,
    sourceArticle: 'CCNM (organisation du travail, astreinte hors temps de travail effectif)',
    conditionTexte: "Périodes d'astreinte un jour de repos, hors travail effectif.",
    tooltip:
      'Nombre de périodes concernées par mois. Le montant par période applique le coefficient « jour de repos » sur le SMH horaire.',
  },
  panierNuit: {
    stateKeyActif: 'primePanierNuit',
    stateKeyHeures: 'nbPaniersNuit',
    inclusDansSMH: false,
    uiSection: 'extra',
    sourceArticle: 'CCNM Art. 147 ; barème fiscal repas (ACOSS / Urssaf)',
    conditionTexte:
      'Indemnité de repas de nuit lorsque les critères de la branche et la durée minimale de poste sont réunis.',
    tooltip:
      "Une unité correspond en principe à un poste éligible. Le montant unitaire suit le barème repas de nuit applicable pour l'année affichée (référence type ACOSS / Urssaf) ; un employeur peut prévoir un montant plus favorable.",
  },
  habillageDeshabillage: {
    stateKeyActif: 'primeHabillageDeshabillage',
    inclusDansSMH: false,
    uiSection: 'extra',
    sourceArticle: 'Code du travail L3121-3 ; CCNM',
    conditionTexte:
      "Contrepartie lorsque la tenue est imposée et que l'habillage ou le déshabillage s'effectue sur le lieu de travail.",
    tooltip:
      "Le simulateur applique chaque semaine l'équivalent d'une demi-heure au taux SMH horaire de votre classe.",
  },
  deplacementProfessionnel: {
    stateKeyActif: 'primeDeplacementProfessionnel',
    stateKeyHeures: 'heuresDeplacementCompense',
    inclusDansSMH: false,
    uiSection: 'extra',
    sourceArticle: 'Code du travail L3121-4 ; CCNM',
    conditionTexte:
      'Temps de trajet professionnel dépassant le temps habituel : indemnisation du temps excédentaire.',
    tooltip:
      'Saisir les heures excédentaires à indemniser ; le taux horaire retenu est le SMH de la classification.',
  },
  inventionBrevetable: {
    stateKeyActif: 'primeInventionBrevetable',
    stateKeyHeures: 'nombreInventionsBrevetablesAn',
    inclusDansSMH: false,
    uiSection: 'extra',
    sourceArticle: 'CCNM (invention de mission brevetable)',
    conditionTexte:
      'Rémunération minimale assimilée par invention de mission donnant lieu à brevet.',
    tooltip:
      "Nombre d'inventions concernées sur l'année. Le minimum conventionnel par invention figure dans le détail du calcul.",
  },
};

export function getConventionPrimeDefs(): ElementDef[] {
  return [
    buildConventionPrimeElement(
      'primeAnciennete',
      SEMANTIC_ID.PRIME_ANCIENNETE,
      "Prime d'ancienneté conventionnelle",
      {
        mode: 'custom',
        /** Mensuel = point × taux(classe) × min(ancienneté, plafond) × prorata ; annuel = `annualFromMonthly`. */
        compute: (ctx: ComputeContext) => {
          if (ctx.classe >= CONFIG.SEUIL_CADRE) return 0;
          const anciennete = Number(ctx.state['anciennete']) || 0;
          if (anciennete < CONFIG.ANCIENNETE.seuil) return 0;
          const anneesPrime = Math.min(anciennete, CONFIG.ANCIENNETE.plafond);
          const table = CONFIG.TAUX_ANCIENNETE as Record<number, number>;
          const tauxClasse = table[ctx.classe] ?? 0;
          const prorata = ctx.activityRate > 0 ? ctx.activityRate : 1;
          const montantMensuel = ctx.pointTerritorial * tauxClasse * anneesPrime * prorata;
          return annualFromMonthly(montantMensuel);
        },
      },
      {
        inclusDansSMH: CONFIG.ANCIENNETE.inclusDansSMH,
        activation: {
          type: 'custom',
          check: (ctx) =>
            ctx.classe < CONFIG.SEUIL_CADRE &&
            Number(ctx.state['anciennete'] ?? 0) >= CONFIG.ANCIENNETE.seuil,
        },
        sourceArticle:
          'CCNM Art. 142-143 ; art. 140 (prime d’ancienneté de branche hors assiette SMH)',
        conditionTexte: `Prime d'ancienneté dès ${CONFIG.ANCIENNETE.seuil} ans, plafond ${CONFIG.ANCIENNETE.plafond} ans. Non-cadres uniquement (convention).`,
        tooltip: 'Point territorial × taux de la classe × ancienneté × 12.',
        uiSection: 'main',
      },
    ),

    buildConventionPrimeElement(
      'primeEquipe',
      SEMANTIC_ID.PRIME_EQUIPE,
      "Prime d'équipe conventionnelle",
      {
        mode: 'postesXdureeXtaux',
        postes: { ref: 'constant', value: CONFIG.PRIME_EQUIPE_POSTES_MENSUELS_DEFAUT },
        dureeMinutes: { ref: 'constant', value: CONFIG.PRIME_EQUIPE_MINUTES_PAR_POSTE },
        taux: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'annual',
        prorataActivite: true,
      },
      {
        stateKeyActif: 'travailEquipe',
        inclusDansSMH: false,
        activation: {
          type: 'custom',
          check: (ctx) =>
            ctx.classe < CONFIG.SEUIL_CADRE &&
            (ctx.state['travailEquipe'] === true ||
              ctx.state['travailEquipe'] === 'true' ||
              (ctx.state['accordInputs'] as Record<string, unknown> | undefined)?.[
                'travailEquipe'
              ] === true),
        },
        sourceArticle: 'CCNM Art. 145 ; art. 140 (équipes successives — hors assiette SMH)',
        conditionTexte: "Prime d'équipe calculée sur la base horaire de référence.",
        tooltip: '30 min du taux horaire de base par poste. 22 postes/mois.',
        uiSection: 'main',
      },
    ),

    ...buildNationalModalityElementDefs(),
  ];
}

const HS_SEUIL_CCN = CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES;

/** Majorations CCNM : sujétions / HS — `inclusDansSMH: false` (voir `smhAssiettePolicy.ts`). */
export function getConventionMajorationDefs(): ElementDef[] {
  return [
    {
      id: 'majorationNuit',
      semanticId: SEMANTIC_ID.MAJORATION_NUIT,
      kind: 'majoration',
      source: SRC,
      valueKind: 'pourcentage',
      label: 'Majoration de nuit conventionnelle',
      activation: {
        type: 'custom',
        check: (ctx) =>
          String(ctx.state['typeNuit'] ?? 'aucun') !== 'aucun' &&
          Number(ctx.state['heuresNuit'] ?? 0) > 0,
      },
      computeMode: {
        mode: 'heuresXtaux',
        heures: { ref: 'state', key: 'heuresNuit' },
        taux: { ref: 'constant', value: CONFIG.MAJORATIONS_CCN.nuit },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'annual',
        majorationSeule: true,
      },
      inclusDansSMH: false,
      sourceArticle: 'CCNM art. 140 (sujétion — hors assiette SMH)',
      conditionTexte: `+${Math.round(CONFIG.MAJORATIONS_CCN.nuit * 100)}% du taux horaire (heures mensuelles × base × taux, annualisées).`,
    },
    {
      id: 'majorationDimanche',
      semanticId: SEMANTIC_ID.MAJORATION_DIMANCHE,
      kind: 'majoration',
      source: SRC,
      valueKind: 'pourcentage',
      label: 'Majoration du dimanche conventionnelle',
      activation: {
        type: 'custom',
        check: (ctx) =>
          ctx.state['travailDimanche'] === true && Number(ctx.state['heuresDimanche'] ?? 0) > 0,
      },
      computeMode: {
        mode: 'heuresXtaux',
        heures: { ref: 'state', key: 'heuresDimanche' },
        taux: { ref: 'constant', value: CONFIG.MAJORATIONS_CCN.dimanche },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'annual',
        majorationSeule: true,
      },
      sourceArticle: 'CCNM',
      conditionTexte: `+${Math.round(CONFIG.MAJORATIONS_CCN.dimanche * 100)}% du taux horaire de base du minimum (SMH), comme les autres sujétions : heures mensuelles × base × taux, annualisées.`,
    },
    {
      id: 'majorationHeuresSup25',
      semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
      kind: 'majoration',
      source: SRC,
      valueKind: 'pourcentage',
      label: 'Majoration heures supplémentaires (+25%)',
      conditionTexte: `Majoration sur la 1re tranche d'heures supplémentaires (jusqu'à ${HS_SEUIL_CCN} h/mois) : heures mensuelles × taux × +25 %, annualisées sur 12 mois.`,
      computeMode: {
        mode: 'heuresXtaux',
        heures: {
          ref: 'heuresSupTranche',
          stateKeyHeures: 'heuresSup',
          seuilMensuel: HS_SEUIL_CCN,
          tranche: '25',
        },
        taux: { ref: 'constant', value: CONFIG.MAJORATIONS_CCN.heuresSup25 },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'annual',
        majorationSeule: true,
      },
      stateKeyActif: 'travailHeuresSup',
      stateKeyHeures: 'heuresSup',
      config: { seuilMensuel: HS_SEUIL_CCN },
      inclusDansSMH: false,
      sourceArticle: 'CCNM art. 140 (majorations HS — hors assiette SMH)',
    },
    {
      id: 'majorationHeuresSup50',
      semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
      kind: 'majoration',
      source: SRC,
      valueKind: 'pourcentage',
      label: 'Majoration heures supplémentaires (+50%)',
      conditionTexte: `Majoration sur le reliquat d'heures supplémentaires (au-delà de ${HS_SEUIL_CCN} h/mois) : heures mensuelles × taux × +50 %, annualisées sur 12 mois.`,
      computeMode: {
        mode: 'heuresXtaux',
        heures: {
          ref: 'heuresSupTranche',
          stateKeyHeures: 'heuresSup',
          seuilMensuel: HS_SEUIL_CCN,
          tranche: '50',
        },
        taux: { ref: 'constant', value: CONFIG.MAJORATIONS_CCN.heuresSup50 },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'annual',
        majorationSeule: true,
      },
      stateKeyActif: 'travailHeuresSup',
      stateKeyHeures: 'heuresSup',
      config: { seuilMensuel: HS_SEUIL_CCN },
      inclusDansSMH: false,
      sourceArticle: 'CCNM art. 140 (majorations HS — hors assiette SMH)',
    },
  ];
}

export function getConventionForfaitDefs(): ElementDef[] {
  const forfaits = CONFIG.FORFAITS as Record<string, number>;
  const seuilCadre = CONFIG.SEUIL_CADRE;
  const actifHeures: ElementActivation = {
    type: 'custom',
    check: (ctx) => ctx.classe >= seuilCadre && String(ctx.state['forfait'] ?? '35h') === 'heures',
  };
  const actifJours: ElementActivation = {
    type: 'custom',
    check: (ctx) => ctx.classe >= seuilCadre && String(ctx.state['forfait'] ?? '35h') === 'jours',
  };
  return [
    {
      id: 'forfaitHeures',
      semanticId: SEMANTIC_ID.FORFAIT_HEURES,
      kind: 'forfait',
      source: SRC,
      valueKind: 'pourcentage',
      label: `Forfait Heures (+${Math.round((forfaits['heures'] ?? 0.15) * 100)}%)`,
      activation: actifHeures,
      inclusDansSMH: true,
      computeMode: {
        mode: 'pourcentageXbase',
        taux: { ref: 'constant', value: forfaits['heures'] ?? 0.15 },
        base: { ref: 'context', key: 'baseSMH' },
        period: 'annual',
      },
      config: { forfaitKey: 'heures', taux: forfaits['heures'] ?? 0.15 },
    },
    {
      id: 'forfaitJours',
      semanticId: SEMANTIC_ID.FORFAIT_JOURS,
      kind: 'forfait',
      source: SRC,
      valueKind: 'pourcentage',
      label: `Forfait Jours (+${Math.round((forfaits['jours'] ?? 0.3) * 100)}%)`,
      activation: actifJours,
      inclusDansSMH: true,
      computeMode: {
        mode: 'pourcentageXbase',
        taux: { ref: 'constant', value: forfaits['jours'] ?? 0.3 },
        base: { ref: 'context', key: 'baseSMH' },
        period: 'annual',
      },
      config: { forfaitKey: 'jours', taux: forfaits['jours'] ?? 0.3 },
    },
  ];
}

function computeRachatJoursReposForfait(ctx: ComputeContext): number {
  const ref = CONFIG.FORFAIT_JOURS_REFERENCE;
  if (!(ref > 0)) return 0;
  const jours = Number(ctx.state['joursSupForfait']) || 0;
  if (jours <= 0) return 0;
  const agr = ctx.agreement as
    | { majorations?: { forfaitJours?: { rachatJoursMajoration?: number } } }
    | undefined;
  const accordRateRaw = agr?.majorations?.forfaitJours?.rachatJoursMajoration;
  const accordRate = Number(accordRateRaw);
  const minimum = CONFIG.FORFAIT_JOURS_RACHAT_MAJORATION_MIN;
  const majoration = Number.isFinite(accordRate) ? Math.max(minimum, accordRate) : minimum;
  const baseJour = ctx.baseSMH / ref;
  return roundToEuro(baseJour * jours * (1 + majoration));
}

/** Rachat de jours de repos (forfait jours, cadres). */
export function getConventionRachatJoursReposForfaitDef(): ElementDef {
  const seuilCadre = CONFIG.SEUIL_CADRE;
  return {
    id: 'rachatJoursForfait',
    semanticId: SEMANTIC_ID.RACHAT_JOURS_REPOS_FORFAIT,
    kind: 'prime',
    source: SRC,
    valueKind: 'montant',
    label: 'Rachat jours de repos forfait jours',
    inclusDansSMH: false,
    activation: {
      type: 'custom',
      check: (ctx) =>
        ctx.classe >= seuilCadre &&
        String(ctx.state['forfait'] ?? '35h') === 'jours' &&
        ctx.state['travailJoursSupForfait'] === true &&
        Number(ctx.state['joursSupForfait'] ?? 0) > 0,
    },
    computeMode: {
      mode: 'custom',
      compute: (ctx) => computeRachatJoursReposForfait(ctx),
    },
    sourceArticle: 'Code du travail L.3121-59',
    conditionTexte:
      'Indemnisation des jours travaillés au-delà du contingent conventionnel (forfait jours) ; majoration minimale paramétrée (accord le cas échéant).',
    uiSection: 'extra',
  };
}

export function getAllConventionDefs(): ElementDef[] {
  return [
    ...getConventionPrimeDefs(),
    ...getConventionMajorationDefs(),
    ...getConventionForfaitDefs(),
    getConventionRachatJoursReposForfaitDef(),
  ];
}

/** Type de champ valeur (taux / montant) pour la ligne « Autres ». */
export type NationalPrimeValueField = 'coefficient' | 'unitAmount' | 'optionalRate';

/** Lignes UI « Autres primes nationales » (activation + quantités + surcharge). */
export interface NationalPrimeOverrideRow {
  semanticId: string;
  label: string;
  unit: string;
  aide: string;
  /** Titre court pour l’infobulle (souvent identique au libellé de ligne). */
  title: string;
  sourceArticle: string;
  stateKeyActif: string;
  quantityKey?: string;
  /** Libellé au-dessus du champ quantité (ligne dédiée). */
  quantityLabel?: string;
  quantityUnitLabel?: string;
  quantityMode?: 'integer' | 'decimal';
  /** Libellé au-dessus du champ taux / montant (ligne dédiée). */
  valueLabel?: string;
  defaultQuantity?: number;
  valueField: NationalPrimeValueField;
  /** Valeur barème / préremplissage à l’activation (si `seedOverrideOnActivate`). */
  defaultValue: number;
  /** Préremplit `nationalPrimeOverrides` à l’activation (ex. panier, intervention). */
  seedOverrideOnActivate: boolean;
  /** Incrément clavier (flèches) pour le champ valeur. */
  valueStep?: number;
  uiVisibleQuand?: UiVisibleQuand;
  /** Masque le 2e champ (taux / montant) lorsque le barème est fixé par la convention. */
  hideValueField?: boolean;
}

export { getNationalPrimeOverrideRows } from './nationalModalityRegistry';
