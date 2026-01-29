/**
 * ============================================
 * KUHN AGREEMENT - Accord d'Entreprise Kuhn
 * ============================================
 * 
 * Accord du 6 mars 2024
 * UES KUHN SAS/KUHN MGM SAS
 * Se substitue aux articles 142, 143, 144, 145, 146, 153-1 de la CCN
 */

import { validateAgreement } from './AgreementInterface.js';

/**
 * Accord d'entreprise Kuhn
 */
export const KuhnAgreement = {
    id: 'kuhn',
    nom: 'Kuhn (UES KUHN SAS/KUHN MGM SAS)',
    nomCourt: 'Kuhn',
    url: 'https://cfdt-kuhn.fr/droits/convention-collective-metallurgie/',
    dateEffet: '2024-01-01',
    dateSignature: '2024-03-06',
    
    // ─────────────────────────────────────────────────────────────
    // PRIME D'ANCIENNETÉ (Art. 2.1 Accord)
    // Remplace articles 142, 143, 153-1 de la CCN
    // ─────────────────────────────────────────────────────────────
    anciennete: {
        seuil: 2,           // Dès 2 ans (CCN: 3 ans)
        plafond: 25,        // Plafonné à 25 ans (CCN: 15 ans)
        tousStatuts: true,  // Cadres ET Non-Cadres (CCN: Non-Cadres seuls)
        baseCalcul: 'salaire', // Base de calcul = Rémunération de base (% du salaire)
        barème: {
            2: 0.02, 3: 0.03, 4: 0.04, 5: 0.05, 6: 0.06,
            7: 0.07, 8: 0.08, 9: 0.09, 10: 0.10, 11: 0.11,
            12: 0.12, 13: 0.13, 14: 0.14, 15: 0.15,
            // 16 à 24 ans : reste à 15%
            25: 0.16  // 16% à partir de 25 ans
        },
        formule: 'Prime = Salaire brut × Taux% selon ancienneté'
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
    // PRIMES SPÉCIFIQUES
    // ─────────────────────────────────────────────────────────────
    primes: {
        equipe: {
            montantHoraire: 0.82,   // €/heure (01/01/2024)
            conditions: [
                'Horaire avec pause 20 min',
                'Durée effective ≥ 6h/poste',
                'Horaire collectif posté (équipes successives)'
            ],
            champApplication: 'Non-cadres à l\'horaire collectif',
            calculMensuel: true
        },
        vacances: {
            montant: 525,           // € bruts
            moisVersement: 7,       // Juillet
            conditions: [
                'Ancienneté ≥ 1 an au 1er juin',
                'Contrat ≥ 50% temps légal',
                'Contrat non suspendu sur période de référence'
            ],
            etalement: false        // Versée en une fois en juillet
        },
        autres: []
    },
    
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
    // LABELS ET MÉTADONNÉES UI
    // ─────────────────────────────────────────────────────────────
    labels: {
        nomCourt: 'Kuhn',
        tooltip: 'Accord d\'entreprise Kuhn : ancienneté dès 2 ans, nuit +20%, dimanche +50%, prime équipe, vacances 525€.',
        description: 'Accord d\'entreprise Kuhn (UES KUHN SAS/KUHN MGM SAS) du 6 mars 2024. Se substitue aux articles 142, 143, 144, 145, 146, 153-1 de la Convention Collective Nationale (CCN).',
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
