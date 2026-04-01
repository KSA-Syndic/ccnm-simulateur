/**
 * ============================================
 * CONVENTION CATALOG - Éléments CCN (schéma générique)
 * ============================================
 *
 * Catalogue des éléments de rémunération définis par la convention collective
 * (primes, majorations, forfaits). Même structure que les éléments d'accord
 * pour permettre un calcul unifié et le principe de faveur.
 */

import { CONFIG } from '../core/config.js';
import {
    SOURCE_CONVENTION,
    ELEMENT_KIND_PRIME,
    ELEMENT_KIND_MAJORATION,
    ELEMENT_KIND_FORFAIT,
    VALUE_KIND_POURCENTAGE,
    VALUE_KIND_HORAIRE,
    VALUE_KIND_MAJORATION_HORAIRE,
    SEMANTIC_ID
} from '../core/RemunerationTypes.js';

// Modalités nationales CCNM / Code : montants indexés sur CONFIG (SMH, ACOSS, barème contreparties organisation).
// Hors assiette de comparaison au SMH : CONFIG.CCNM_CONTREPARTIES_ORGANISATION.rolesSimulation.
export const CONVENTION_MODALITES_PRIMES = {
    interventionAstreinte: {
        stateKeyActif: 'majorationInterventionAstreinte',
        stateKeyHeures: 'heuresInterventionAstreinte',
        tauxMajoration: 0,
        inclureBaseHoraire: true,
        unit: '%',
        defaultHeures: 0,
        inputUnitLabel: "heures d'intervention/mois",
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: true,
        deriveFrom: 'majorations.heuresSup25',
        sourceArticle: 'Code du travail L3121-9, L3121-10 ; CCNM (travail effectif)',
        conditionTexte: 'Les heures d\'intervention pendant une astreinte sont du travail effectif.',
        tooltip: 'Indiquez les heures réellement travaillées en intervention. Les périodes de simple disponibilité sont traitées par les lignes « astreinte » ci-dessous (hors TTE).',
        requiresKeys: [],
        nonCumulAvec: []
    },
    astreintePeriodeReposQuotidien: {
        stateKeyActif: 'primeAstreintePeriodeReposQuotidien',
        stateKeyHeures: 'periodesAstreinteReposQuotidienMois',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        defaultHeures: 0,
        inputUnitLabel: 'périodes/mois',
        unit: '€/période',
        sourceArticle: 'CCNM (organisation du travail, astreinte hors temps de travail effectif)',
        conditionTexte: 'Périodes d\'astreinte sur les temps de repos quotidiens prévus par l\'emploi du temps, hors travail effectif.',
        tooltip: 'Nombre de périodes concernées par mois. Le montant par période suit le taux SMH horaire de votre classe, selon les coefficients prévus par la branche dans cet outil.',
        requiresKeys: [],
        nonCumulAvec: []
    },
    astreintePeriodeJourRepos: {
        stateKeyActif: 'primeAstreintePeriodeJourRepos',
        stateKeyHeures: 'periodesAstreinteJourReposMois',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        defaultHeures: 0,
        inputUnitLabel: 'périodes/mois',
        unit: '€/période',
        sourceArticle: 'CCNM (organisation du travail, astreinte hors temps de travail effectif)',
        conditionTexte: 'Périodes d\'astreinte un jour de repos, hors travail effectif.',
        tooltip: 'Nombre de périodes concernées par mois. Le montant par période applique le coefficient « jour de repos » sur le SMH horaire de votre classe (comme dans le détail du calcul).',
        requiresKeys: [],
        nonCumulAvec: []
    },
    panierNuit: {
        stateKeyActif: 'primePanierNuit',
        stateKeyHeures: 'nbPaniersNuit',
        valeurHoraire: Number(CONFIG?.INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR?.[CONFIG.CURRENT_DATA_YEAR]?.surLieuTravail ?? 0),
        unit: '€/unité',
        defaultHeures: 0,
        inputUnitLabel: 'postes indemnisables/mois',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        deriveFrom: null,
        sourceArticle: 'CCNM Art. 147 ; barème fiscal repas (ACOSS / Urssaf)',
        conditionTexte: 'Indemnité de repas de nuit lorsque les critères de la branche et la durée minimale de poste sont réunis.',
        tooltip: 'Une unité correspond en principe à un poste éligible (durée minimale fixée par la branche). Le montant unitaire est celui du barème repas de nuit applicable pour l\'année affichée dans le simulateur.',
        requiresKeys: [],
        nonCumulAvec: []
    },
    habillageDeshabillage: {
        stateKeyActif: 'primeHabillageDeshabillage',
        heuresSMHReferenceParSemaine: Number(CONFIG?.CCNM_CONTREPARTIES_ORGANISATION?.habillageHeuresSMHParSemaine ?? 0),
        unit: '€/h',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        deriveFrom: null,
        sourceArticle: 'Code du travail L3121-3 ; CCNM',
        conditionTexte: 'Contrepartie lorsque la tenue est imposée et que l\'habillage ou le déshabillage s\'effectue sur le lieu de travail.',
        tooltip: 'Lorsque la case est cochée, le simulateur applique chaque semaine l\'équivalent d\'une demi-heure au taux SMH horaire de votre classe (réparti sur le mois, comme indiqué dans le détail du résultat).',
        requiresKeys: [],
        nonCumulAvec: []
    },
    deplacementProfessionnel: {
        stateKeyActif: 'primeDeplacementProfessionnel',
        stateKeyHeures: 'heuresDeplacementCompense',
        valeurHoraire: 0,
        baseTauxSmhHierarchique: true,
        unit: '€/h',
        defaultHeures: 0,
        inputUnitLabel: 'heures indemnisées/mois',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        deriveFrom: null,
        sourceArticle: 'Code du travail L3121-4 ; CCNM',
        conditionTexte: 'Temps de trajet professionnel dépassant le temps habituel : indemnisation du temps excédentaire assimilée au SMH horaire de la classe.',
        tooltip: 'Saisir les heures excédentaires à indemniser ; le taux horaire retenu est le SMH de la classification (hors accord plus favorable).',
        requiresKeys: [],
        nonCumulAvec: []
    },
    inventionBrevetable: {
        stateKeyActif: 'primeInventionBrevetable',
        stateKeyHeures: 'nombreInventionsBrevetablesAn',
        montantMinimumParUnite: Number(CONFIG?.CCNM_CONTREPARTIES_ORGANISATION?.inventionBrevetableMinimumEuros ?? 0),
        unit: '€',
        defaultHeures: 0,
        inputUnitLabel: 'inventions éligibles/an',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        sourceArticle: 'CCNM (invention de mission brevetable)',
        conditionTexte: 'Rémunération minimale assimilée par invention de mission donnant lieu à brevet, lorsque le droit s\'ouvre.',
        tooltip: 'Nombre d\'inventions concernées sur l\'année. Le minimum conventionnel utilisé par le simulateur par invention figure dans le détail du calcul ; un accord peut prévoir un montant plus favorable.',
        requiresKeys: [],
        nonCumulAvec: []
    }
};

/**
 * Définitions des primes prévues par la CCN.
 * @returns {import('../core/RemunerationTypes.js').ElementDef[]}
 */
export function getConventionPrimeDefs() {
    const interventionAstreinte = CONVENTION_MODALITES_PRIMES.interventionAstreinte;
    const astreinteReposQuotidien = CONVENTION_MODALITES_PRIMES.astreintePeriodeReposQuotidien;
    const astreinteJourRepos = CONVENTION_MODALITES_PRIMES.astreintePeriodeJourRepos;
    const panierNuit = CONVENTION_MODALITES_PRIMES.panierNuit;
    const habillage = CONVENTION_MODALITES_PRIMES.habillageDeshabillage;
    const deplacement = CONVENTION_MODALITES_PRIMES.deplacementProfessionnel;
    const invention = CONVENTION_MODALITES_PRIMES.inventionBrevetable;

    return [
        {
            id: 'primeAnciennete',
            semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_POURCENTAGE,
            label: 'Prime d\'ancienneté conventionnelle',
            config: {
                seuil: CONFIG.ANCIENNETE.seuil,
                plafond: CONFIG.ANCIENNETE.plafond,
                tauxParClasse: CONFIG.TAUX_ANCIENNETE,
                inclusDansSMH: CONFIG.ANCIENNETE.inclusDansSMH === true,
                formule: 'Point × Taux × Années × 12'
            }
        },
        {
            id: 'primeEquipe',
            semanticId: SEMANTIC_ID.PRIME_EQUIPE,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_HORAIRE,
            label: 'Prime d\'équipe conventionnelle',
            config: {
                stateKeyActif: 'travailEquipe',
                postesMensuels: CONFIG.PRIME_EQUIPE_POSTES_MENSUELS_DEFAUT ?? 22,
                minutesParPoste: CONFIG.PRIME_EQUIPE_MINUTES_PAR_POSTE ?? 30,
                inclusDansSMH: false,
                uiSection: 'main',
                ratioSMHHoraire: 1,
                formule: 'Nombre de postes/mois × (30 min en heures SMH / poste) × 12'
            }
        },
        {
            id: 'majorationInterventionAstreinte',
            semanticId: SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_MAJORATION_HORAIRE,
            label: 'Intervention sous astreinte (travail effectif)',
            config: {
                stateKeyActif: interventionAstreinte.stateKeyActif || 'majorationInterventionAstreinte',
                stateKeyHeures: interventionAstreinte.stateKeyHeures || 'heuresInterventionAstreinte',
                taux: Number(interventionAstreinte.tauxMajoration ?? 0),
                inclureBaseHoraire: interventionAstreinte.inclureBaseHoraire !== false,
                unit: interventionAstreinte.unit || '%',
                defaultHeures: Number(interventionAstreinte.defaultHeures ?? 0),
                inputUnitLabel: interventionAstreinte.inputUnitLabel || 'heures/mois',
                inclusDansSMH: interventionAstreinte.inclusDansSMH === true,
                uiSection: interventionAstreinte.uiSection || 'extra',
                allowUserOverride: interventionAstreinte.allowUserOverride === true,
                deriveFrom: interventionAstreinte.deriveFrom || null,
                sourceArticle: interventionAstreinte.sourceArticle || '',
                conditionTexte: interventionAstreinte.conditionTexte || '',
                tooltip: interventionAstreinte.tooltip || '',
                requiresKeys: Array.isArray(interventionAstreinte.requiresKeys) ? interventionAstreinte.requiresKeys : [],
                nonCumulAvec: Array.isArray(interventionAstreinte.nonCumulAvec) ? interventionAstreinte.nonCumulAvec : []
            }
        },
        {
            id: 'primeAstreintePeriodeReposQuotidien',
            semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_HORAIRE,
            label: 'Astreinte (périodes sur repos quotidien, hors TTE)',
            config: {
                stateKeyActif: astreinteReposQuotidien.stateKeyActif,
                stateKeyHeures: astreinteReposQuotidien.stateKeyHeures,
                tauxHoraire: 0,
                unit: astreinteReposQuotidien.unit || '€/période',
                defaultHeures: Number(astreinteReposQuotidien.defaultHeures ?? 0),
                inputUnitLabel: astreinteReposQuotidien.inputUnitLabel || 'périodes/mois',
                inclusDansSMH: astreinteReposQuotidien.inclusDansSMH === true,
                uiSection: astreinteReposQuotidien.uiSection || 'extra',
                allowUserOverride: astreinteReposQuotidien.allowUserOverride === true,
                modeCalcul: 'periodesAstreinteSMH',
                sourceArticle: astreinteReposQuotidien.sourceArticle || '',
                conditionTexte: astreinteReposQuotidien.conditionTexte || '',
                tooltip: astreinteReposQuotidien.tooltip || ''
            }
        },
        {
            id: 'primeAstreintePeriodeJourRepos',
            semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_HORAIRE,
            label: 'Astreinte (périodes jour de repos, hors TTE)',
            config: {
                stateKeyActif: astreinteJourRepos.stateKeyActif,
                stateKeyHeures: astreinteJourRepos.stateKeyHeures,
                tauxHoraire: 0,
                unit: astreinteJourRepos.unit || '€/période',
                defaultHeures: Number(astreinteJourRepos.defaultHeures ?? 0),
                inputUnitLabel: astreinteJourRepos.inputUnitLabel || 'périodes/mois',
                inclusDansSMH: astreinteJourRepos.inclusDansSMH === true,
                uiSection: astreinteJourRepos.uiSection || 'extra',
                allowUserOverride: astreinteJourRepos.allowUserOverride === true,
                modeCalcul: 'periodesAstreinteSMH',
                sourceArticle: astreinteJourRepos.sourceArticle || '',
                conditionTexte: astreinteJourRepos.conditionTexte || '',
                tooltip: astreinteJourRepos.tooltip || ''
            }
        },
        {
            id: 'primePanierNuit',
            semanticId: SEMANTIC_ID.PRIME_PANIER_NUIT,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_HORAIRE,
            label: 'Prime panier nuit',
            config: {
                stateKeyActif: 'primePanierNuit',
                stateKeyHeures: 'nbPaniersNuit',
                tauxHoraire: Number(panierNuit.valeurHoraire ?? 0),
                unit: panierNuit.unit || '€/h',
                defaultHeures: Number(panierNuit.defaultHeures ?? 0),
                inputUnitLabel: panierNuit.inputUnitLabel || 'heures/mois',
                inclusDansSMH: panierNuit.inclusDansSMH === true,
                uiSection: panierNuit.uiSection || 'extra',
                allowUserOverride: panierNuit.allowUserOverride === true,
                deriveFrom: panierNuit.deriveFrom || null,
                sourceArticle: panierNuit.sourceArticle || '',
                conditionTexte: panierNuit.conditionTexte || '',
                tooltip: panierNuit.tooltip || ''
            }
        },
        {
            id: 'primeHabillageDeshabillage',
            semanticId: SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_HORAIRE,
            label: 'Prime habillage / déshabillage',
            config: {
                stateKeyActif: habillage.stateKeyActif || 'primeHabillageDeshabillage',
                stateKeyHeures: habillage.stateKeyHeures || null,
                heuresSMHReferenceParSemaine: Number(habillage.heuresSMHReferenceParSemaine ?? 0),
                tauxHoraire: Number(habillage.valeurHoraire ?? 0),
                unit: habillage.unit || '€/h',
                defaultHeures: Number(habillage.defaultHeures ?? 0),
                inputUnitLabel: habillage.inputUnitLabel || 'heures/mois',
                inclusDansSMH: habillage.inclusDansSMH === true,
                uiSection: habillage.uiSection || 'extra',
                allowUserOverride: habillage.allowUserOverride === true,
                deriveFrom: habillage.deriveFrom || null,
                sourceArticle: habillage.sourceArticle || '',
                conditionTexte: habillage.conditionTexte || '',
                tooltip: habillage.tooltip || ''
            }
        },
        {
            id: 'primeDeplacementProfessionnel',
            semanticId: SEMANTIC_ID.PRIME_DEPLACEMENT_PRO,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_HORAIRE,
            label: 'Prime déplacements professionnels',
            config: {
                stateKeyActif: deplacement.stateKeyActif || 'primeDeplacementProfessionnel',
                stateKeyHeures: deplacement.stateKeyHeures || 'heuresDeplacementCompense',
                tauxHoraire: Number(deplacement.valeurHoraire ?? 0),
                baseTauxSmhHierarchique: deplacement.baseTauxSmhHierarchique === true,
                unit: deplacement.unit || '€/h',
                defaultHeures: Number(deplacement.defaultHeures ?? 0),
                inputUnitLabel: deplacement.inputUnitLabel || 'heures/mois',
                inclusDansSMH: deplacement.inclusDansSMH === true,
                uiSection: deplacement.uiSection || 'extra',
                allowUserOverride: deplacement.allowUserOverride === true,
                deriveFrom: deplacement.deriveFrom || null,
                sourceArticle: deplacement.sourceArticle || '',
                conditionTexte: deplacement.conditionTexte || '',
                tooltip: deplacement.tooltip || ''
            }
        },
        {
            id: 'primeInventionBrevetable',
            semanticId: SEMANTIC_ID.PRIME_INVENTION_BREVETABLE,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_HORAIRE,
            label: 'Invention de mission (brevetable)',
            config: {
                stateKeyActif: invention.stateKeyActif || 'primeInventionBrevetable',
                stateKeyHeures: invention.stateKeyHeures || 'nombreInventionsBrevetablesAn',
                tauxHoraire: 0,
                montantMinimumParUnite: Number(invention.montantMinimumParUnite ?? 0),
                unit: invention.unit || '€',
                defaultHeures: Number(invention.defaultHeures ?? 0),
                inputUnitLabel: invention.inputUnitLabel || 'inventions/an',
                inclusDansSMH: invention.inclusDansSMH === true,
                uiSection: invention.uiSection || 'extra',
                allowUserOverride: invention.allowUserOverride === true,
                modeCalcul: 'inventionForfaitAn',
                sourceArticle: invention.sourceArticle || '',
                conditionTexte: invention.conditionTexte || '',
                tooltip: invention.tooltip || ''
            }
        }
    ];
}

/**
 * Définitions des majorations prévues par la CCN.
 * @returns {import('../core/RemunerationTypes.js').ElementDef[]}
 */
export function getConventionMajorationDefs() {
    return [
        {
            id: 'majorationNuit',
            semanticId: SEMANTIC_ID.MAJORATION_NUIT,
            kind: ELEMENT_KIND_MAJORATION,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_POURCENTAGE,
            label: 'Majoration de nuit conventionnelle',
            config: {
                taux: CONFIG.MAJORATIONS_CCN.nuit,
                typeUnique: true
            }
        },
        {
            id: 'majorationDimanche',
            semanticId: SEMANTIC_ID.MAJORATION_DIMANCHE,
            kind: ELEMENT_KIND_MAJORATION,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_POURCENTAGE,
            label: 'Majoration du dimanche conventionnelle',
            config: {
                taux: CONFIG.MAJORATIONS_CCN.dimanche
            }
        },
        {
            id: 'majorationHeuresSup25',
            semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
            kind: ELEMENT_KIND_MAJORATION,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_POURCENTAGE,
            label: 'Majoration heures supplémentaires (+25%) conventionnelle',
            config: {
                taux: CONFIG.MAJORATIONS_CCN.heuresSup25,
                stateKeyActif: 'travailHeuresSup',
                stateKeyHeures: 'heuresSup',
                seuilMensuel: CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES ?? 34.67
            }
        },
        {
            id: 'majorationHeuresSup50',
            semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
            kind: ELEMENT_KIND_MAJORATION,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_POURCENTAGE,
            label: 'Majoration heures supplémentaires (+50%) conventionnelle',
            config: {
                taux: CONFIG.MAJORATIONS_CCN.heuresSup50,
                stateKeyActif: 'travailHeuresSup',
                stateKeyHeures: 'heuresSup',
                seuilMensuel: CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES ?? 34.67
            }
        }
    ];
}

/**
 * Définitions des forfaits cadres prévus par la CCN.
 * @returns {import('../core/RemunerationTypes.js').ElementDef[]}
 */
export function getConventionForfaitDefs() {
    return [
        {
            id: 'forfaitHeures',
            semanticId: SEMANTIC_ID.FORFAIT_HEURES,
            kind: ELEMENT_KIND_FORFAIT,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_POURCENTAGE,
            label: `Forfait Heures (+${Math.round((CONFIG.FORFAITS.heures ?? 0.15) * 100)}%)`,
            config: {
                forfaitKey: 'heures',
                taux: CONFIG.FORFAITS.heures
            }
        },
        {
            id: 'forfaitJours',
            semanticId: SEMANTIC_ID.FORFAIT_JOURS,
            kind: ELEMENT_KIND_FORFAIT,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_POURCENTAGE,
            label: `Forfait Jours (+${Math.round((CONFIG.FORFAITS.jours ?? 0.30) * 100)}%)`,
            config: {
                forfaitKey: 'jours',
                taux: CONFIG.FORFAITS.jours
            }
        }
    ];
}
