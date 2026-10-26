import { CONFIG } from '../config';
import {
  SEMANTIC_ID,
  type ElementDef,
  type ElementActivation,
  type ComputeContext,
} from '../types';
import { roundToEuro, annualFromMonthly } from '../utils/rounding';
import { isCadre } from '../classification/engine';
import { buildNationalModalityElementDefs } from './nationalModalityRegistry';
import { buildConventionPrimeElement } from './primeElementFactory';

type Source = 'convention';
const SRC: Source = 'convention';

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
          if (isCadre(ctx.classe)) return 0;
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
            !isCadre(ctx.classe) && Number(ctx.state['anciennete'] ?? 0) >= CONFIG.ANCIENNETE.seuil,
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
            !isCadre(ctx.classe) &&
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
  const forfaits = CONFIG.FORFAITS;
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
      label: `Forfait Heures (+${Math.round(forfaits.heures * 100)}%)`,
      activation: actifHeures,
      inclusDansSMH: true,
      computeMode: {
        mode: 'pourcentageXbase',
        taux: { ref: 'constant', value: forfaits.heures },
        base: { ref: 'context', key: 'baseSMH' },
        period: 'annual',
      },
      config: { forfaitKey: 'heures', taux: forfaits.heures },
    },
    {
      id: 'forfaitJours',
      semanticId: SEMANTIC_ID.FORFAIT_JOURS,
      kind: 'forfait',
      source: SRC,
      valueKind: 'pourcentage',
      label: `Forfait Jours (+${Math.round(forfaits.jours * 100)}%)`,
      activation: actifJours,
      inclusDansSMH: true,
      computeMode: {
        mode: 'pourcentageXbase',
        taux: { ref: 'constant', value: forfaits.jours },
        base: { ref: 'context', key: 'baseSMH' },
        period: 'annual',
      },
      config: { forfaitKey: 'jours', taux: forfaits.jours },
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

let conventionDefsCache: readonly ElementDef[] | null = null;

/** Définitions conventionnelles (dérivées de `CONFIG`, immuables) — construites une seule fois. */
export function getAllConventionDefs(): readonly ElementDef[] {
  conventionDefsCache ??= [
    ...getConventionPrimeDefs(),
    ...getConventionMajorationDefs(),
    ...getConventionForfaitDefs(),
    getConventionRachatJoursReposForfaitDef(),
  ];
  return conventionDefsCache;
}
