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

// Source unique des modalités conventionnelles (hors accord d'entreprise).
// Ces valeurs sont modifiables en tests pour vérifier les scénarios de calcul.
// Il faudra à l'avenir mieux interfacer ces valeurs avec les modalités nationales 
// afin de les rendre plus modulaires et intégrables aux autres primes.
export const CONVENTION_MODALITES_PRIMES = {
    astreinteDisponibilite: {
        stateKeyActif: 'primeAstreinteDisponibilite',
        stateKeyHeures: 'heuresAstreinteDisponibilite',
        modeCalcul: 'horaire',            // 'horaire' | 'forfaitPeriode'
        valeurHoraire: 1.2,
        valeurForfaitPeriode: 0,
        unit: '€/h',
        defaultHeures: 0,
        inputUnitLabel: "heures d'astreinte/mois",
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        deriveFrom: null,
        sourceArticle: 'Code du travail L3121-9, L3121-11, L3121-12',
        conditionTexte: 'Contrepartie d’astreinte obligatoire (financière ou repos) selon accord ou règles supplétives.',
        tooltip: 'Astreinte: contrepartie obligatoire de disponibilité (L3121-9). Organisation/compensation par accord (L3121-11) ou dispositif supplétif (L3121-12). Hors assiette SMH.',
        requiresKeys: [],
        nonCumulAvec: []
    },
    interventionAstreinte: {
        stateKeyActif: 'majorationInterventionAstreinte',
        stateKeyHeures: 'heuresInterventionAstreinte',
        tauxMajoration: 0.25,
        inclureBaseHoraire: true,
        unit: '%',
        defaultHeures: 0,
        inputUnitLabel: "heures d'intervention/mois",
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: true,
        deriveFrom: 'majorations.heuresSup25',
        sourceArticle: 'Code du travail L3121-9 et L3121-10',
        conditionTexte: 'Le temps d’intervention est du travail effectif; seule la période de disponibilité est astreinte.',
        tooltip: "Intervention pendant astreinte: temps de travail effectif (L3121-9). Non-cumul recommandé avec HS sur les mêmes heures.",
        requiresKeys: ['primeAstreinteDisponibilite'],
        nonCumulAvec: ['travailHeuresSup']
    },
    panierNuit: {
        stateKeyActif: 'primePanierNuit',
        stateKeyHeures: 'nbPaniersNuit',
        valeurHoraire: Number(CONFIG?.INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR?.[CONFIG.CURRENT_DATA_YEAR]?.surLieuTravail ?? 7.5),
        unit: '€/unité',
        defaultHeures: 0,
        inputUnitLabel: 'unités/mois',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        deriveFrom: null,
        sourceArticle: 'CCNM Art. 147 (indemnité de repas de nuit)',
        conditionTexte: 'Due au travailleur de nuit si au moins 6h sont effectuées entre 21h et 6h, et si les conditions de travail imposent la prise de repas sur le lieu de travail.',
        tooltip: "Remboursement de frais professionnels (pas une majoration salariale). Montant de référence aligné sur le plafond ACOSS/Urssaf annuel pour repas sur lieu de travail ; non due les jours non travaillés ; hors assiette SMH.",
        requiresKeys: [],
        nonCumulAvec: []
    },
    habillageDeshabillage: {
        stateKeyActif: 'primeHabillageDeshabillage',
        stateKeyHeures: 'heuresHabillageDeshabillage',
        valeurHoraire: 0.8,
        unit: '€/h',
        defaultHeures: 0,
        inputUnitLabel: 'heures/mois',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        deriveFrom: null,
        sourceArticle: 'Code du travail L3121-3',
        conditionTexte: 'Contrepartie obligatoire lorsque habillage/déshabillage est imposé et sur le lieu de travail.',
        tooltip: 'Habillage/déshabillage: contrepartie prévue par L3121-3, hors assiette SMH.',
        requiresKeys: [],
        nonCumulAvec: []
    },
    deplacementProfessionnel: {
        stateKeyActif: 'primeDeplacementProfessionnel',
        stateKeyHeures: 'heuresDeplacementCompense',
        valeurHoraire: 1,
        unit: '€/h',
        defaultHeures: 0,
        inputUnitLabel: 'heures/mois',
        inclusDansSMH: false,
        uiSection: 'extra',
        allowUserOverride: false,
        deriveFrom: null,
        sourceArticle: 'Code du travail L3121-4',
        conditionTexte: 'Dépassement du temps normal de trajet: contrepartie obligatoire, sans qualification de temps de travail effectif.',
        tooltip: 'Déplacements/trajets professionnels: contrepartie selon L3121-4 et accord applicable, hors assiette SMH.',
        requiresKeys: [],
        nonCumulAvec: []
    }
};

/**
 * Définitions des primes prévues par la CCN.
 * @returns {import('../core/RemunerationTypes.js').ElementDef[]}
 */
export function getConventionPrimeDefs() {
    const astreinte = CONVENTION_MODALITES_PRIMES.astreinteDisponibilite;
    const interventionAstreinte = CONVENTION_MODALITES_PRIMES.interventionAstreinte;
    const panierNuit = CONVENTION_MODALITES_PRIMES.panierNuit;
    const habillage = CONVENTION_MODALITES_PRIMES.habillageDeshabillage;
    const deplacement = CONVENTION_MODALITES_PRIMES.deplacementProfessionnel;

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
                ratioSMHHoraire: 0.5,
                formule: 'Nombre de postes/mois × (30 min × SMH horaire de base 35h) × 12'
            }
        },
        {
            id: 'primeAstreinteDisponibilite',
            semanticId: SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_HORAIRE,
            label: 'Prime astreinte disponibilité',
            config: {
                stateKeyActif: astreinte.stateKeyActif || 'primeAstreinteDisponibilite',
                stateKeyHeures: astreinte.stateKeyHeures || 'heuresAstreinteDisponibilite',
                modeCalcul: astreinte.modeCalcul || 'horaire',
                tauxHoraire: Number(astreinte.valeurHoraire ?? 0),
                valeurForfaitPeriode: Number(astreinte.valeurForfaitPeriode ?? 0),
                unit: astreinte.unit || '€/h',
                defaultHeures: Number(astreinte.defaultHeures ?? 0),
                inputUnitLabel: astreinte.inputUnitLabel || 'heures/mois',
                inclusDansSMH: astreinte.inclusDansSMH === true,
                uiSection: astreinte.uiSection || 'extra',
                allowUserOverride: astreinte.allowUserOverride === true,
                deriveFrom: astreinte.deriveFrom || null,
                sourceArticle: astreinte.sourceArticle || '',
                conditionTexte: astreinte.conditionTexte || '',
                tooltip: astreinte.tooltip || ''
            }
        },
        {
            id: 'majorationInterventionAstreinte',
            semanticId: SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE,
            kind: ELEMENT_KIND_PRIME,
            source: SOURCE_CONVENTION,
            valueKind: VALUE_KIND_MAJORATION_HORAIRE,
            label: 'Majoration intervention astreinte',
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
                uiSection: panierNuit.uiSection || 'main',
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
                stateKeyHeures: habillage.stateKeyHeures || 'heuresHabillageDeshabillage',
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
                stateKeyHeures: deplacement.stateKeyHeures || 'heuresDeplacementProfessionnel',
                tauxHoraire: Number(deplacement.valeurHoraire ?? 0),
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
