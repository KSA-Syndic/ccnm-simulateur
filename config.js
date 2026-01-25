/**
 * ============================================
 * CONFIG - Données Métier Centralisées
 * ============================================
 * 
 * Ce fichier centralise toutes les données pour faciliter
 * la maintenance annuelle (mise à jour des SMH).
 * 
 * STRUCTURE :
 * - CCN : Données Convention Collective Nationale Métallurgie 2024
 * - ACCORD_ENTREPRISE : Données spécifiques Accord Kuhn
 */

const CONFIG = {

    // ╔════════════════════════════════════════════════════════════════╗
    // ║         CONVENTION COLLECTIVE NATIONALE (CCN) 2024             ║
    // ╚════════════════════════════════════════════════════════════════╝

    // Salaires Minimum Hiérarchiques (annuels bruts) - Grille 2024
    SMH: {
        1: 21700,   // A1
        2: 21850,   // A2
        3: 22450,   // B3
        4: 23400,   // B4
        5: 24250,   // C5
        6: 25550,   // C6
        7: 26400,   // D7
        8: 28450,   // D8
        9: 30500,   // E9
        10: 33700,  // E10
        11: 34900,  // F11
        12: 36700,  // F12
        13: 40000,  // G13
        14: 43900,  // G14
        15: 47000,  // H15
        16: 52000,  // H16
        17: 59300,  // I17
        18: 68000   // I18
    },

    // Barème salariés débutants (Groupe F : Classes 11 et 12)
    // Barème progressif selon l'expérience professionnelle
    // Tranches : < 2 ans, 2-4 ans, 4-6 ans, ≥ 6 ans
    // Inclut les majorations de 5% (2 ans) ou 8% (4 ans) prévues par l'Art. 139
    BAREME_DEBUTANTS: {
        11: {   // F11
            0: 28200,   // < 2 ans
            2: 29610,   // 2 à < 4 ans
            4: 31979,   // 4 à 6 ans
            6: 34900    // ≥ 6 ans = SMH F11 standard
        },
        12: {   // F12
            0: 29700,   // < 2 ans
            2: 31185,   // 2 à < 4 ans
            4: 33680,   // 4 à 6 ans
            6: 36700    // ≥ 6 ans = SMH F12 standard
        }
    },

    // Taux pour calcul Prime d'Ancienneté (Non-Cadres uniquement)
    // Formule : Point Territorial × Taux × 100 × Années d'ancienneté
    TAUX_ANCIENNETE: {
        1: 1.45,    // A1
        2: 1.60,    // A2
        3: 1.75,    // B3
        4: 1.95,    // B4
        5: 2.20,    // C5
        6: 2.45,    // C6
        7: 2.60,    // D7
        8: 2.90,    // D8
        9: 3.30,    // E9
        10: 3.80    // E10
    },

    // Valeur du Point Territorial - BAS-RHIN (67)
    // Source : Accord territorial du 17 avril 2025 (valeur 2025)
    // Ref : https://code.travail.gouv.fr/contribution/3248-quand-le-salarie-a-t-il-droit-a-une-prime-danciennete-quel-est-son-montant
    // IMPORTANT : Mettre à jour lorsque la valeur 2026 sera publiée
    POINT_TERRITORIAL_DEFAUT: 5.90,
    TERRITOIRE: 'Bas-Rhin (67)',

    // Mapping Points -> Classification
    // Format: [minPoints, maxPoints, groupe, classe]
    MAPPING_POINTS: [
        [6, 8, 'A', 1],
        [9, 11, 'A', 2],
        [12, 14, 'B', 3],
        [15, 17, 'B', 4],
        [18, 20, 'C', 5],
        [21, 23, 'C', 6],
        [24, 26, 'D', 7],
        [27, 29, 'D', 8],
        [30, 33, 'E', 9],
        [34, 37, 'E', 10],
        [38, 41, 'F', 11],
        [42, 45, 'F', 12],
        [46, 49, 'G', 13],
        [50, 52, 'G', 14],
        [53, 55, 'H', 15],
        [56, 57, 'H', 16],
        [58, 59, 'I', 17],
        [60, 60, 'I', 18]
    ],

    // Correspondance Groupe -> Classes possibles
    GROUPE_CLASSES: {
        'A': [1, 2],
        'B': [3, 4],
        'C': [5, 6],
        'D': [7, 8],
        'E': [9, 10],
        'F': [11, 12],
        'G': [13, 14],
        'H': [15, 16],
        'I': [17, 18]
    },

    // Seuil Cadre (à partir de la classe 11)
    SEUIL_CADRE: 11,

    // Prime d'ancienneté Non-Cadres
    // Formule : Point Territorial × Taux Classe × 100 × Années
    ANCIENNETE: {
        seuil: 3,       // Déclenchement à 3 ans
        plafond: 15     // Plafonné à 15 ans
    },

    // Majorations Forfaits Cadres
    FORFAITS: {
        '35h': 0,       // Pas de majoration
        'heures': 0.15, // +15%
        'jours': 0.30   // +30%
    },

    // Majorations CCN (Art. 145, 146)
    MAJORATIONS_CCN: {
        nuit: 0.15,         // +15% travail de nuit
        dimanche: 1.00,     // +100% travail dimanche
        heuresSup25: 0.25,  // +25% (8 premières HS)
        heuresSup50: 0.50   // +50% (HS suivantes)
    },

    // ╔════════════════════════════════════════════════════════════════╗
    // ║              ACCORD D'ENTREPRISE KUHN (2024)                   ║
    // ║  Se substitue aux articles 142, 143, 144, 145, 146, 153-1 CCN  ║
    // ╚════════════════════════════════════════════════════════════════╝
    
    ACCORD_ENTREPRISE: {
        nom: 'Kuhn (UES KUHN SAS/KUHN MGM SAS)',
        dateEffet: '2024-01-01',
        
        // ─────────────────────────────────────────────────────────────
        // PRIME D'ANCIENNETÉ (Art. 2.1 Accord)
        // Remplace articles 142, 143, 153-1 de la CCN
        // ─────────────────────────────────────────────────────────────
        anciennete: {
            seuil: 2,           // Dès 2 ans (CCN: 3 ans)
            plafond: 25,        // Plafonné à 25 ans (CCN: 15 ans)
            tousStatuts: true,  // Cadres ET Non-Cadres (CCN: Non-Cadres seuls)
            // Base de calcul = Rémunération de base
            // (+ heures nuit/sup/dimanche/prime équipe si applicable)
            barème: {
                2: 0.02, 3: 0.03, 4: 0.04, 5: 0.05, 6: 0.06,
                7: 0.07, 8: 0.08, 9: 0.09, 10: 0.10, 11: 0.11,
                12: 0.12, 13: 0.13, 14: 0.14, 15: 0.15,
                // 16 à 24 ans : reste à 15%
                25: 0.16  // 16% à partir de 25 ans
            }
        },

        // ─────────────────────────────────────────────────────────────
        // PRIME D'ÉQUIPE (Art. 2.2 Accord)
        // Remplace article 144 de la CCN
        // ─────────────────────────────────────────────────────────────
        primeEquipe: {
            montantHoraire: 0.82,   // €/heure (01/01/2024)
            conditions: [
                'Horaire avec pause 20 min',
                'Durée effective ≥ 6h/poste',
                'Horaire collectif posté (équipes successives)'
            ],
            champApplication: 'Non-cadres à l\'horaire collectif'
        },

        // ─────────────────────────────────────────────────────────────
        // MAJORATIONS TRAVAIL DE NUIT (Art. 2.4 Accord)
        // Remplace articles 145, 146 de la CCN
        // Plage horaire : 20h00 - 6h00
        // ─────────────────────────────────────────────────────────────
        majorationsNuit: {
            posteNuit: 0.20,        // +20% si poste de nuit (≥2h entre 20h-6h)
            posteMatin: 0.15,       // +15% heures entre 20h-6h (poste matin/AM)
            plageDebut: 20,         // 20h00
            plageFin: 6,            // 6h00
            seuilHeuresPosteNuit: 2 // Min 2h dans la plage pour être "poste nuit"
        },

        // ─────────────────────────────────────────────────────────────
        // MAJORATION DIMANCHE (Art. 2.3 Accord)
        // Remplace article 146 de la CCN
        // ─────────────────────────────────────────────────────────────
        majorationDimanche: 0.50,   // +50% (CCN: +100%)

        // ─────────────────────────────────────────────────────────────
        // PRIME DE VACANCES (Art. 2.5 Accord)
        // Spécifique Kuhn (non prévu CCN)
        // ─────────────────────────────────────────────────────────────
        primeVacances: {
            montant: 525,           // € bruts (versé en juillet)
            conditions: [
                'Ancienneté ≥ 1 an au 1er juin',
                'Contrat ≥ 50% temps légal',
                'Contrat non suspendu sur période de référence'
            ]
        },

        // ─────────────────────────────────────────────────────────────
        // HEURES SUPPLÉMENTAIRES (Art. 5.1 Accord)
        // Conforme à la CCN (Art. 99.2)
        // ─────────────────────────────────────────────────────────────
        heuresSupplementaires: {
            contingent: 370,        // heures/an
            majoration25: 0.25,     // 8 premières heures
            majoration50: 0.50      // heures suivantes
        },

        // ─────────────────────────────────────────────────────────────
        // CONGÉS D'ANCIENNETÉ (Art. 3.1 Accord) - Pour information
        // ─────────────────────────────────────────────────────────────
        congesAnciennete: {
            nonCadres: [
                { anciennete: 5, jours: 1 },
                { anciennete: 14, jours: 2 },
                { anciennete: 19, jours: 3 }
            ],
            cadres: [
                { age: 30, anciennete: 1, jours: 2 },
                { age: 35, anciennete: 2, jours: 3 }
            ]
        }
    },

    // Définitions des 6 critères classants
    CRITERES: [
        {
            id: 'complexite',
            nom: 'Complexité',
            description: 'Technicité et diversité des tâches à accomplir',
            labels: {
                1: "Tâches simples et répétitives",
                2: "Tâches simples et variées",
                3: "Tâches diversifiées avec analyse",
                4: "Analyse et interprétation",
                5: "Recherche de solutions",
                6: "Définition de solutions",
                7: "Définition de stratégies",
                8: "Méthodes complexes",
                9: "Orientations stratégiques",
                10: "Plus haut niveau stratégique"
            },
            degres: {
                1: "Réalisation d'activités simples et répétitives, avec des modes opératoires précis.",
                2: "Réalisation d'activités simples et variées nécessitant de combiner des modes opératoires connus.",
                3: "Réalisation d'activités diversifiées nécessitant de combiner des modes opératoires connus et d'analyser les situations.",
                4: "Réalisation d'activités diversifiées nécessitant une analyse, une interprétation et une comparaison d'informations variées.",
                5: "Réalisation d'activités impliquant l'analyse de situations variées et la recherche de solutions dans un cadre prédéfini.",
                6: "Réalisation d'activités impliquant la définition de solutions dans un cadre général partiellement défini.",
                7: "Réalisation d'activités impliquant la définition de stratégies ou de politiques dans un cadre général.",
                8: "Réalisation d'activités nécessitant des concepts ou des méthodes complexes non formalisés.",
                9: "Réalisation d'activités impliquant la définition des orientations stratégiques majeures de l'entreprise.",
                10: "Réalisation d'activités impliquant la définition des orientations stratégiques au plus haut niveau de l'entreprise."
            }
        },
        {
            id: 'connaissances',
            nom: 'Connaissances',
            description: 'Savoirs requis pour le poste (diplôme, expérience équivalente)',
            labels: {
                1: "Connaissances de base",
                2: "Compréhension d'un environnement",
                3: "Maîtrise d'un environnement",
                4: "Maîtrise d'une spécialité",
                5: "Spécialité complexe",
                6: "Multi-spécialités ou expertise",
                7: "Interconnexion de domaines",
                8: "Expertise reconnue",
                9: "Expertise stratégique",
                10: "Expertise au plus haut niveau"
            },
            degres: {
                1: "Connaissances générales ou professionnelles de base.",
                2: "Connaissances générales et professionnelles permettant de comprendre le fonctionnement d'un environnement donné.",
                3: "Connaissances générales et professionnelles permettant de maîtriser le fonctionnement d'un environnement donné.",
                4: "Connaissances professionnelles permettant de maîtriser les techniques d'une spécialité.",
                5: "Connaissances professionnelles approfondies permettant de maîtriser les techniques d'une spécialité complexe.",
                6: "Connaissances professionnelles permettant de maîtriser plusieurs spécialités ou une expertise dans une spécialité.",
                7: "Connaissances professionnelles approfondies permettant d'interconnecter plusieurs domaines d'expertise.",
                8: "Expertise reconnue dans un domaine spécifique ou maîtrise de plusieurs domaines complexes.",
                9: "Expertise de haut niveau reconnue dans plusieurs domaines stratégiques.",
                10: "Expertise au plus haut niveau, reconnue au-delà de l'entreprise."
            }
        },
        {
            id: 'autonomie',
            nom: 'Autonomie',
            description: 'Latitude décisionnelle et niveau de contrôle',
            labels: {
                1: "Consignes précises, contrôle permanent",
                2: "Consignes générales, contrôle fréquent",
                3: "Instructions précises, contrôle ponctuel",
                4: "Instructions générales, auto-contrôle",
                5: "Organisation de son travail",
                6: "Organisation du travail d'autres",
                7: "Définition d'objectifs de domaine",
                8: "Définition d'objectifs d'entité",
                9: "Orientations d'une fonction majeure",
                10: "Orientations générales de l'entreprise"
            },
            degres: {
                1: "Exécution de travaux à partir de consignes précises. Contrôle permanent.",
                2: "Exécution de travaux à partir de consignes générales. Contrôle fréquent.",
                3: "Exécution de travaux à partir d'instructions de travail précises. Contrôle ponctuel.",
                4: "Exécution de travaux à partir d'instructions générales. Auto-contrôle et compte-rendu.",
                5: "Organisation de son travail dans un cadre défini. Contrôle sur les résultats.",
                6: "Organisation de son travail et de celui d'autres dans un cadre défini. Contrôle sur les résultats et méthodes.",
                7: "Définition des objectifs de son domaine et des moyens à mettre en œuvre. Contrôle sur les objectifs.",
                8: "Définition des objectifs et des moyens d'une entité. Responsabilité des résultats.",
                9: "Définition des orientations d'une fonction majeure. Responsabilité des résultats stratégiques.",
                10: "Définition des orientations générales de l'entreprise. Responsabilité globale des résultats."
            }
        },
        {
            id: 'contribution',
            nom: 'Contribution',
            description: 'Impact du poste sur l\'organisation et les résultats',
            labels: {
                1: "Impact sur son poste",
                2: "Impact sur l'équipe proche",
                3: "Impact sur le service",
                4: "Impact sur plusieurs équipes",
                5: "Impact sur un département",
                6: "Impact majeur sur département",
                7: "Impact sur une fonction",
                8: "Impact stratégique fonctions",
                9: "Impact stratégique global",
                10: "Impact sur la pérennité"
            },
            degres: {
                1: "Impact limité à son poste de travail.",
                2: "Impact sur la qualité des résultats de son équipe proche.",
                3: "Impact significatif sur les résultats de son équipe ou service.",
                4: "Impact significatif sur les résultats de plusieurs équipes ou d'un service.",
                5: "Impact significatif sur les résultats d'un département ou d'une entité.",
                6: "Impact majeur sur les résultats d'un département ou de plusieurs services.",
                7: "Impact majeur sur les résultats d'une fonction ou d'un établissement.",
                8: "Impact stratégique sur les résultats d'une ou plusieurs fonctions majeures.",
                9: "Impact stratégique sur les résultats globaux de l'entreprise.",
                10: "Impact déterminant sur les orientations et la pérennité de l'entreprise."
            }
        },
        {
            id: 'encadrement',
            nom: 'Encadrement / Coopération',
            description: 'Dimension managériale ou appui technique aux autres',
            labels: {
                1: "Aucun encadrement",
                2: "Transmission ponctuelle",
                3: "Animation ponctuelle",
                4: "Animation régulière",
                5: "Coordination d'équipe",
                6: "Encadrement d'équipe",
                7: "Encadrement de service",
                8: "Encadrement de département",
                9: "Direction de fonction",
                10: "Direction générale"
            },
            degres: {
                1: "Pas de responsabilité d'animation, de coordination ou d'encadrement.",
                2: "Transmission ponctuelle de son savoir-faire à un collègue.",
                3: "Animation fonctionnelle ou technique ponctuelle de collègues.",
                4: "Animation fonctionnelle ou technique régulière de collègues.",
                5: "Coordination technique d'une équipe ou appui technique reconnu.",
                6: "Encadrement d'une équipe avec responsabilité de l'organisation du travail.",
                7: "Encadrement d'un service ou d'une équipe avec responsabilité des résultats.",
                8: "Encadrement d'un département ou d'encadrants, avec responsabilité des objectifs.",
                9: "Direction d'une fonction majeure avec encadrement de managers.",
                10: "Direction générale ou membre du comité de direction."
            }
        },
        {
            id: 'communication',
            nom: 'Communication',
            description: 'Nature et complexité des échanges professionnels',
            labels: {
                1: "Échanges simples",
                2: "Échanges techniques élargis",
                3: "Adaptation du discours",
                4: "Explication et argumentation",
                5: "Influence sur décisions",
                6: "Négociation significative",
                7: "Négociation majeure",
                8: "Communication stratégique",
                9: "Représentation haut niveau",
                10: "Engagement global entreprise"
            },
            degres: {
                1: "Échanges d'informations simples avec son environnement immédiat.",
                2: "Échanges d'informations techniques ou pratiques dans un cercle élargi.",
                3: "Échanges d'informations variées nécessitant une adaptation du discours.",
                4: "Échanges d'informations complexes nécessitant explication et argumentation.",
                5: "Communication influençant les décisions ou comportements de tiers.",
                6: "Négociation avec des interlocuteurs variés sur des sujets significatifs.",
                7: "Négociation complexe engageant l'entreprise sur des sujets majeurs.",
                8: "Communication stratégique influençant les orientations d'une fonction.",
                9: "Communication à fort enjeu représentant l'entreprise à haut niveau.",
                10: "Communication au plus haut niveau engageant l'entreprise dans sa globalité."
            }
        }
    ]
};

// Export pour utilisation dans d'autres modules (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
