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
            label: 'Prime ancienneté CCN',
            config: {
                seuil: CONFIG.ANCIENNETE.seuil,
                plafond: CONFIG.ANCIENNETE.plafond,
                tauxParClasse: CONFIG.TAUX_ANCIENNETE,
                formule: 'Point × Taux × Années × 12'
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
            label: 'Majoration nuit CCN',
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
            label: 'Majoration dimanche CCN',
            config: {
                taux: CONFIG.MAJORATIONS_CCN.dimanche
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
            label: 'Forfait Heures (+15%)',
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
            label: 'Forfait Jours (+30%)',
            config: {
                forfaitKey: 'jours',
                taux: CONFIG.FORFAITS.jours
            }
        }
    ];
}
