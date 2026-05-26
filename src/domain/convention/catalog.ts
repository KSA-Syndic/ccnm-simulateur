import { CONFIG } from '../config';
import { SEMANTIC_ID, type ElementDef, type ComputeMode } from '../types';

type Source = 'convention';
const SRC: Source = 'convention';

interface ModaliteRaw {
  stateKeyActif: string;
  stateKeyHeures?: string;
  inclusDansSMH: boolean;
  uiSection: 'main' | 'extra';
  sourceArticle: string;
  conditionTexte: string;
  tooltip: string;
}

export const CONVENTION_MODALITES_PRIMES: Record<string, ModaliteRaw> = {
  interventionAstreinte: {
    stateKeyActif: 'majorationInterventionAstreinte',
    stateKeyHeures: 'heuresInterventionAstreinte',
    inclusDansSMH: false,
    uiSection: 'extra',
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
      "Une unité correspond en principe à un poste éligible. Le montant unitaire est celui du barème repas de nuit applicable pour l'année affichée.",
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

const panierNuitUnitaire = Number(
  CONFIG.INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR[CONFIG.CURRENT_DATA_YEAR]?.surLieuTravail ?? 0,
);
const habillageHeures = Number(CONFIG.CCNM_CONTREPARTIES_ORGANISATION.habillageHeuresSMHParSemaine);
const inventionMin = Number(CONFIG.CCNM_CONTREPARTIES_ORGANISATION.inventionBrevetableMinimumEuros);
const astreinteCoeffRepos = Number(
  CONFIG.CCNM_CONTREPARTIES_ORGANISATION.astreinteDisponibiliteSMHParPeriode
    .surReposQuotidienDansAstreinte,
);
const astreinteCoeffJour = Number(
  CONFIG.CCNM_CONTREPARTIES_ORGANISATION.astreinteDisponibiliteSMHParPeriode.surJourRepos,
);

function modaliteToPartial(m: ModaliteRaw): Partial<ElementDef> {
  const result: Partial<ElementDef> = {
    inclusDansSMH: m.inclusDansSMH,
    sourceArticle: m.sourceArticle,
    conditionTexte: m.conditionTexte,
    tooltip: m.tooltip,
    uiSection: m.uiSection,
    stateKeyActif: m.stateKeyActif,
  };
  if (m.stateKeyHeures !== undefined) {
    result.stateKeyHeures = m.stateKeyHeures;
  }
  return result;
}

export function getConventionPrimeDefs(): ElementDef[] {
  const mods = CONVENTION_MODALITES_PRIMES;
  return [
    buildPrime(
      'primeAnciennete',
      SEMANTIC_ID.PRIME_ANCIENNETE,
      "Prime d'ancienneté conventionnelle",
      {
        mode: 'pourcentageXbase',
        taux: {
          ref: 'bareme',
          table: CONFIG.TAUX_ANCIENNETE as unknown as Record<number, number>,
          lookupKey: 'classe',
        },
        base: { ref: 'context', key: 'pointTerritorial' },
        annees: { ref: 'context', key: 'anciennete' },
        period: 'annual',
      },
      {
        inclusDansSMH: CONFIG.ANCIENNETE.inclusDansSMH,
        activation: { type: 'anciennete', seuil: CONFIG.ANCIENNETE.seuil },
        sourceArticle: 'CCNM Art. 142-143',
        conditionTexte: `Prime d'ancienneté dès ${CONFIG.ANCIENNETE.seuil} ans, plafond ${CONFIG.ANCIENNETE.plafond} ans. Non-cadres uniquement (convention).`,
        tooltip: 'Point territorial × taux de la classe × ancienneté × 12.',
        uiSection: 'main',
      },
    ),

    buildPrime(
      'primeEquipe',
      SEMANTIC_ID.PRIME_EQUIPE,
      "Prime d'équipe conventionnelle",
      {
        mode: 'postesXdureeXtaux',
        postes: { ref: 'constant', value: CONFIG.PRIME_EQUIPE_POSTES_MENSUELS_DEFAUT },
        dureeMinutes: { ref: 'constant', value: CONFIG.PRIME_EQUIPE_MINUTES_PAR_POSTE },
        taux: { ref: 'context', key: 'tauxHoraire' },
        period: 'annual',
      },
      {
        stateKeyActif: 'travailEquipe',
        inclusDansSMH: false,
        sourceArticle: 'CCNM Art. 145',
        conditionTexte: "Prime d'équipe calculée sur la base horaire de référence.",
        tooltip: '30 min du taux horaire de base par poste. 22 postes/mois.',
        uiSection: 'main',
      },
    ),

    buildPrime(
      'majorationInterventionAstreinte',
      SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE,
      'Intervention sous astreinte (travail effectif)',
      {
        mode: 'heuresXtaux',
        heures: { ref: 'input', stateKey: mods['interventionAstreinte']!.stateKeyHeures! },
        taux: { ref: 'constant', value: 0 },
        base: { ref: 'context', key: 'tauxHoraire' },
        period: 'annual',
      },
      modaliteToPartial(mods['interventionAstreinte']!),
    ),

    buildPrime(
      'primeAstreintePeriodeReposQuotidien',
      SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN,
      'Astreinte (périodes sur repos quotidien, hors TTE)',
      {
        mode: 'unitesXmontant',
        unites: { ref: 'input', stateKey: mods['astreintePeriodeReposQuotidien']!.stateKeyHeures! },
        montant: { ref: 'constant', value: 0 },
        period: 'annual',
      },
      {
        ...modaliteToPartial(mods['astreintePeriodeReposQuotidien']!),
        config: { astreinteCoeff: astreinteCoeffRepos },
      },
    ),

    buildPrime(
      'primeAstreintePeriodeJourRepos',
      SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS,
      'Astreinte (périodes jour de repos, hors TTE)',
      {
        mode: 'unitesXmontant',
        unites: { ref: 'input', stateKey: mods['astreintePeriodeJourRepos']!.stateKeyHeures! },
        montant: { ref: 'constant', value: 0 },
        period: 'annual',
      },
      {
        ...modaliteToPartial(mods['astreintePeriodeJourRepos']!),
        config: { astreinteCoeff: astreinteCoeffJour },
      },
    ),

    buildPrime(
      'primePanierNuit',
      SEMANTIC_ID.PRIME_PANIER_NUIT,
      'Prime panier nuit',
      {
        mode: 'unitesXmontant',
        unites: { ref: 'input', stateKey: mods['panierNuit']!.stateKeyHeures! },
        montant: { ref: 'constant', value: panierNuitUnitaire },
        period: 'annual',
      },
      modaliteToPartial(mods['panierNuit']!),
    ),

    buildPrime(
      'primeHabillageDeshabillage',
      SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE,
      'Prime habillage / déshabillage',
      {
        mode: 'heuresXtaux',
        heures: { ref: 'constant', value: habillageHeures },
        taux: { ref: 'constant', value: 1 },
        base: { ref: 'context', key: 'tauxHoraire' },
        period: 'annual',
      },
      {
        ...modaliteToPartial(mods['habillageDeshabillage']!),
        config: { heuresSMHReferenceParSemaine: habillageHeures },
      },
    ),

    buildPrime(
      'primeDeplacementProfessionnel',
      SEMANTIC_ID.PRIME_DEPLACEMENT_PRO,
      'Prime déplacements professionnels',
      {
        mode: 'heuresXtaux',
        heures: { ref: 'input', stateKey: mods['deplacementProfessionnel']!.stateKeyHeures! },
        taux: { ref: 'constant', value: 1 },
        base: { ref: 'context', key: 'tauxHoraire' },
        period: 'annual',
      },
      modaliteToPartial(mods['deplacementProfessionnel']!),
    ),

    buildPrime(
      'primeInventionBrevetable',
      SEMANTIC_ID.PRIME_INVENTION_BREVETABLE,
      'Invention de mission (brevetable)',
      {
        mode: 'unitesXmontant',
        unites: { ref: 'input', stateKey: mods['inventionBrevetable']!.stateKeyHeures! },
        montant: { ref: 'constant', value: inventionMin },
        period: 'annual',
      },
      modaliteToPartial(mods['inventionBrevetable']!),
    ),
  ];
}

export function getConventionMajorationDefs(): ElementDef[] {
  return [
    {
      id: 'majorationNuit',
      semanticId: SEMANTIC_ID.MAJORATION_NUIT,
      kind: 'majoration',
      source: SRC,
      valueKind: 'pourcentage',
      label: 'Majoration de nuit conventionnelle',
      computeMode: {
        mode: 'pourcentageXbase',
        taux: { ref: 'constant', value: CONFIG.MAJORATIONS_CCN.nuit },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'monthly',
      },
      sourceArticle: 'CCNM',
      conditionTexte: `+${Math.round(CONFIG.MAJORATIONS_CCN.nuit * 100)}% du taux horaire.`,
    },
    {
      id: 'majorationDimanche',
      semanticId: SEMANTIC_ID.MAJORATION_DIMANCHE,
      kind: 'majoration',
      source: SRC,
      valueKind: 'pourcentage',
      label: 'Majoration du dimanche conventionnelle',
      computeMode: {
        mode: 'pourcentageXbase',
        taux: { ref: 'constant', value: CONFIG.MAJORATIONS_CCN.dimanche },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'monthly',
      },
      sourceArticle: 'CCNM',
      conditionTexte: `+${Math.round(CONFIG.MAJORATIONS_CCN.dimanche * 100)}% du taux horaire.`,
    },
    {
      id: 'majorationHeuresSup25',
      semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
      kind: 'majoration',
      source: SRC,
      valueKind: 'pourcentage',
      label: 'Majoration heures supplémentaires (+25%)',
      computeMode: {
        mode: 'heuresXtaux',
        heures: { ref: 'input', stateKey: 'heuresSup' },
        taux: { ref: 'constant', value: CONFIG.MAJORATIONS_CCN.heuresSup25 },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'monthly',
      },
      stateKeyActif: 'travailHeuresSup',
      stateKeyHeures: 'heuresSup',
      config: { seuilMensuel: CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES },
    },
    {
      id: 'majorationHeuresSup50',
      semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
      kind: 'majoration',
      source: SRC,
      valueKind: 'pourcentage',
      label: 'Majoration heures supplémentaires (+50%)',
      computeMode: {
        mode: 'heuresXtaux',
        heures: { ref: 'input', stateKey: 'heuresSup' },
        taux: { ref: 'constant', value: CONFIG.MAJORATIONS_CCN.heuresSup50 },
        base: { ref: 'context', key: 'tauxHoraireBase' },
        period: 'monthly',
      },
      stateKeyActif: 'travailHeuresSup',
      stateKeyHeures: 'heuresSup',
      config: { seuilMensuel: CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES },
    },
  ];
}

export function getConventionForfaitDefs(): ElementDef[] {
  const forfaits = CONFIG.FORFAITS as Record<string, number>;
  return [
    {
      id: 'forfaitHeures',
      semanticId: SEMANTIC_ID.FORFAIT_HEURES,
      kind: 'forfait',
      source: SRC,
      valueKind: 'pourcentage',
      label: `Forfait Heures (+${Math.round((forfaits['heures'] ?? 0.15) * 100)}%)`,
      computeMode: {
        mode: 'pourcentageXbase',
        taux: { ref: 'constant', value: forfaits['heures'] ?? 0.15 },
        base: { ref: 'context', key: 'baseSMH' },
        period: 'annual',
      },
    },
    {
      id: 'forfaitJours',
      semanticId: SEMANTIC_ID.FORFAIT_JOURS,
      kind: 'forfait',
      source: SRC,
      valueKind: 'pourcentage',
      label: `Forfait Jours (+${Math.round((forfaits['jours'] ?? 0.3) * 100)}%)`,
      computeMode: {
        mode: 'pourcentageXbase',
        taux: { ref: 'constant', value: forfaits['jours'] ?? 0.3 },
        base: { ref: 'context', key: 'baseSMH' },
        period: 'annual',
      },
    },
  ];
}

export function getAllConventionDefs(): ElementDef[] {
  return [
    ...getConventionPrimeDefs(),
    ...getConventionMajorationDefs(),
    ...getConventionForfaitDefs(),
  ];
}

// ── helpers ──

function buildPrime(
  id: string,
  semanticId: string,
  label: string,
  computeMode: ComputeMode,
  extra: Partial<ElementDef>,
): ElementDef {
  return {
    id,
    semanticId,
    kind: 'prime',
    source: SRC,
    valueKind: 'horaire',
    label,
    computeMode,
    ...extra,
  };
}
