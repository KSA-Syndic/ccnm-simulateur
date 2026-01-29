/**
 * ============================================
 * KUHN AGREEMENT - Accord d'Entreprise Kuhn
 * ============================================
 *
 * Accord du 6 mars 2024
 * UES KUHN SAS/KUHN MGM SAS
 * Se substitue aux articles 142, 143, 144, 145, 146, 153-1 de la CCN
 *
 * Fichier dans accords/ : définitions d'accords séparées du code applicatif.
 */

import { validateAgreement } from '../src/agreements/AgreementInterface.js';

/**
 * Accord d'entreprise Kuhn
 */
export const KuhnAgreement = {
    id: 'kuhn',
    nom: 'Kuhn (UES KUHN SAS/KUHN MGM SAS)',
    nomCourt: 'Kuhn',
    url: 'https://www.maitredata.com/app/accords-entreprise/kuhn-sas/300633',
    dateEffet: '2024-01-01',
    dateSignature: '2024-03-06',

    // ─────────────────────────────────────────────────────────────
    // PRIME D'ANCIENNETÉ (Art. 2.1 Accord)
    // Remplace articles 142, 143, 153-1 de la CCN
    // Assiette : rémunération de base brute du salarié (Kuhn) ; CCNM Art. 142 : prime supporte les majorations durée du travail (forfait).
    // CCNM Art. 139 : majoration forfait jours = +30 % sur le montant de la prime.
    // ─────────────────────────────────────────────────────────────
    anciennete: {
        seuil: 2,           // Dès 2 ans (CCN: 3 ans)
        plafond: 25,        // Plafonné à 25 ans (CCN: 15 ans)
        tousStatuts: true,  // Cadres ET Non-Cadres (CCN: Non-Cadres seuls)
        baseCalcul: 'salaire', // Base = rémunération de base brute (salaire réel, pas valeur du point)
        majorationForfaitJours: 0.30, // CCNM Art. 139 : +30 % sur le montant de la prime si forfait jours
        sourceMajorationForfait: 'CCNM Art. 139',
        barème: {
            2: 0.02, 3: 0.03, 4: 0.04, 5: 0.05, 6: 0.06,
            7: 0.07, 8: 0.08, 9: 0.09, 10: 0.10, 11: 0.11,
            12: 0.12, 13: 0.13, 14: 0.14, 15: 0.15,
            // 16 à 24 ans : reste à 15%
            25: 0.16  // 16% à partir de 25 ans
        },
        formule: 'Prime = (Salaire de base brut × Taux%) × 1,30 si forfait jours'
    },

    // ─────────────────────────────────────────────────────────────
    // MAJORATIONS CONDITIONS DE TRAVAIL
    // ─────────────────────────────────────────────────────────────
    majorations: {
        nuit: {
            posteNuit: 0.20,        // +20% si poste de nuit (≥2h entre 20h-6h)
            posteMatin: 0.15,       // +15% heures entre 20h-6h (poste matin/AM)
            plageDebut: 20,         // 20h00
            plageFin: 6,            // 6h00
            seuilHeuresPosteNuit: 2 // Min 2h dans la plage pour être "poste nuit"
        },
        dimanche: 0.50,            // +50% (CCN: +100%)
        heuresSupplementaires: {
            majoration25: 0.25,     // 8 premières heures (+25%)
            majoration50: 0.50,     // heures suivantes (+50%)
            contingent: 370         // heures/an
        }
    },

    // ─────────────────────────────────────────────────────────────
    // PRIMES SPÉCIFIQUES (schéma générique : type, unité, valeur accord ou modalité)
    // ─────────────────────────────────────────────────────────────
    primes: [
        {
            id: 'primeEquipe',
            label: 'Prime d\'équipe',
            sourceValeur: 'accord',
            valueType: 'horaire',
            unit: '€/h',
            valeurAccord: 0.82,     // €/heure (01/01/2024)
            stateKeyActif: 'travailEquipe',
            stateKeyHeures: 'heuresEquipe',
            defaultHeures: 151.67, // Heures mensuelles par défaut (défini par l'accord)
            conditionAnciennete: { type: 'aucune', description: 'Aucune' },
            tooltip: 'Horaire avec pause 20 min, durée effective ≥ 6 h/poste, horaire collectif posté (équipes successives).'
        },
        {
            id: 'primeVacances',
            label: 'Prime de vacances',
            sourceValeur: 'accord',
            valueType: 'montant',
            unit: '€',
            valeurAccord: 525,      // € bruts / an
            stateKeyActif: 'primeVacances',
            defaultActif: true,     // Coché par défaut (défini par l'accord)
            moisVersement: 7,       // Juillet
            conditionAnciennete: { type: 'annees_revolues', annees: 1, description: '1 an au 1er juin' },
            tooltip: 'Contrat ≥ 50 % temps légal. Non versée si contrat suspendu sur toute la période de référence (1er juin N-1 au 31 mai N).'
        }
    ],

    // ─────────────────────────────────────────────────────────────
    // RÉPARTITION MENSUELLE (13e MOIS)
    // ─────────────────────────────────────────────────────────────
    repartition13Mois: {
        actif: true,                // Répartition sur 13 mois
        moisVersement: 11,          // Novembre
        inclusDansSMH: true         // Fait partie du SMH
    },

    // ─────────────────────────────────────────────────────────────
    // CONGÉS D'ANCIENNETÉ (Art. 3.1 Accord) - Pour information
    // ─────────────────────────────────────────────────────────────
    conges: {
        nonCadres: [
            { anciennete: 5, jours: 1 },
            { anciennete: 14, jours: 2 },
            { anciennete: 19, jours: 3 }
        ],
        cadres: [
            { age: 30, anciennete: 1, jours: 2 },
            { age: 35, anciennete: 2, jours: 3 }
        ]
    },

    // ─────────────────────────────────────────────────────────────
    // ÉLÉMENTS DE DROIT (synthèse pour affichage dynamique)
    // Condition d'ancienneté réutilisable pour chaque élément
    // ─────────────────────────────────────────────────────────────
    elements: [
        {
            id: 'primeVacances',
            type: 'prime',
            label: 'Prime de Vacances',
            source: 'Accord Kuhn Art. 2.5',
            conditionAnciennete: { type: 'annees_revolues', annees: 1, description: '1 an révolu' },
            dateCle: 'Au 1er juin de l\'année'
        },
        {
            id: 'primeAnciennete',
            type: 'prime',
            label: 'Prime d\'Ancienneté',
            source: 'Accord Kuhn Art. 2.1',
            conditionAnciennete: { type: 'annees_revolues', annees: 2, description: '2 ans révolus' },
            dateCle: 'Mois suivant l\'anniversaire',
            note: 'Assiette : rémunération de base brute. CCNM Art. 142 : majorations durée du travail (forfait). CCNM Art. 139 : +30 % sur le montant de la prime si forfait jours.'
        },
        {
            id: 'garantie13eMois',
            type: 'garantie',
            label: '13e mois (Garantie SMH)',
            source: 'CCNM Art. 139',
            conditionAnciennete: { type: 'proratise', description: 'Aucune (Proratisé)' },
            dateCle: 'Versement selon usage entreprise'
        },
        {
            id: 'primeEquipe',
            type: 'prime',
            label: 'Prime d\'Équipe',
            source: 'Accord Kuhn Art. 2.2',
            conditionAnciennete: { type: 'aucune', description: 'Aucune' },
            dateCle: 'Dès le premier poste effectué'
        }
    ],

    exemplesRecrutement: [
        {
            date: '1er janvier 2024',
            points: [
                'Prime de Vacances : Pas en juillet 2024 (pas 1 an au 1er juin 2024). Premier versement juillet 2025.',
                'Prime d\'Ancienneté : Début en février 2026 (mois suivant 2 ans d\'ancienneté).',
                'Garantie SMH : Minimum annuel garanti calculé au prorata du temps de présence sur l\'année 2024.'
            ]
        },
        {
            date: '1er mai 2023',
            points: [
                'Prime de Vacances : Perçue dès juillet 2024 (1 an révolu au 1er juin 2024).',
                'Prime d\'Ancienneté : Déclenchement en juin 2025 (2 ans d\'ancienneté).'
            ]
        }
    ],

    // ─────────────────────────────────────────────────────────────
    // LABELS ET MÉTADONNÉES UI
    // ─────────────────────────────────────────────────────────────
    labels: {
        nomCourt: 'Kuhn',
        description: 'Accord d\'entreprise qui améliore la convention : prime d\'ancienneté dès 2 ans (au lieu de 3), prime vacances, prime équipe, 13e mois et majorations (nuit, dimanche).',
        badge: '🏢'
    },

    // ─────────────────────────────────────────────────────────────
    // MÉTADONNÉES TECHNIQUES
    // ─────────────────────────────────────────────────────────────
    metadata: {
        version: '1.0',
        articlesSubstitues: ['142', '143', '144', '145', '146', '153-1'],
        territoire: 'Bas-Rhin (67)',
        entreprise: 'UES KUHN SAS/KUHN MGM SAS'
    }
};

// Validation de l'accord au chargement
if (!validateAgreement(KuhnAgreement)) {
    console.error('L\'accord Kuhn n\'est pas valide selon le schéma standard');
}
