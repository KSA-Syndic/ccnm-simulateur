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
    SEMANTIC_ID
} from '../core/RemunerationTypes.js';

/**
 * Définitions des primes prévues par la CCN.
 * @returns {import('../core/RemunerationTypes.js').ElementDef[]}
 */
export function getConventionPrimeDefs() {
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
                ratioSMHHoraire: 0.5,
                formule: 'Nombre de postes/mois × (30 min × SMH horaire de base 35h) × 12'
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
