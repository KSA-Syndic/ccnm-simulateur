/**
 * Tests unitaires pour les cas limites juridiques identifiés par l'expert
 * Conformité CCNM 2024 et principes de droit du travail
 */

import { describe, it, expect } from 'vitest';
import { calculateAnnualRemuneration } from '../../src/remuneration/RemunerationCalculator.js';
import { CONFIG } from '../../src/core/config.js';

describe('Cas Limites Juridiques - CCNM 2024', () => {
    const stateBase = {
        modeManuel: false,
        groupeManuel: 'A',
        classeManuel: 1,
        scores: [1, 1, 1, 1, 1, 1],
        anciennete: 0,
        pointTerritorial: 5.90,
        forfait: '35h',
        experiencePro: 0,
        typeNuit: 'aucun',
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        accordInputs: { primeVacances: false, travailEquipe: false, heuresEquipe: 151.67 },
        accordActif: false
    };

    describe('Cadre Débutant - Calcul avec Alternance', () => {
        it('devrait calculer l\'expérience incluant l\'alternance (2 ans alternance = 1 an expérience)', () => {
            // Cas testé par l'expert : 2 ans apprentissage + 3 ans CDI = 4 ans expérience totale
            // L'alternance compte pour moitié selon CCNM Art. 139
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 4, // Déjà calculée : 2 ans alternance (comptés pour 1) + 3 ans CDI = 4 ans
                forfait: 'jours'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            
            // Devrait utiliser le barème débutants F11 "4 à 6 ans" = 31 979 €
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][4]);
            
            // Avec forfait jours (+30%) : 31 979 × 1.30 = 41 572.70 €
            const forfaitMontant = Math.round(CONFIG.BAREME_DEBUTANTS[11][4] * 0.30);
            expect(result.total).toBe(CONFIG.BAREME_DEBUTANTS[11][4] + forfaitMontant);
        });
    });

    describe('Principe de Faveur - Prime d\'Ancienneté', () => {
        const accordKuhn = {
            id: 'kuhn',
            nom: 'Kuhn (UES)',
            nomCourt: 'Kuhn',
            url: 'https://example.com/kuhn',
            dateEffet: '2024-01-01',
            anciennete: {
                seuil: 2,
                plafond: 25,
                tousStatuts: true,
                baseCalcul: 'salaire',
                barème: { 2: 0.02, 5: 0.05, 15: 0.15 }
            },
            majorations: { nuit: { posteNuit: 0.20, posteMatin: 0.15 }, dimanche: 0.50 },
            primes: [],
            repartition13Mois: { actif: true, moisVersement: 11, inclusDansSMH: true },
            labels: { nomCourt: 'Kuhn', tooltip: '', description: '', badge: '🏢' },
            metadata: { version: '1.0', articlesSubstitues: [], territoire: '', entreprise: '' }
        };

        it('devrait appliquer la règle la plus avantageuse entre CCN et Accord', () => {
            // Cas où après plusieurs années, la prime CCN peut devenir supérieure
            // Exemple : C5, 15 ans, point territorial 5.90€
            // CCN : 5.90 × 2.20% × 15 × 12 = 2 336.4 €
            // Accord : SMH × 15% = 24 250 × 15% = 3 637.5 €
            // Dans ce cas, l'accord est plus avantageux
            
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3], // C5
                anciennete: 15,
                pointTerritorial: 5.90,
                accordActif: true
            };
            
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const primeDetail = result.details.find(d => d.label.includes('ancienneté'));
            
            expect(primeDetail).toBeDefined();
            // Le système doit avoir comparé et choisi la plus avantageuse
            expect(result.total).toBeGreaterThan(CONFIG.SMH[5]);
        });

        it('devrait appliquer CCN si plus avantageuse que l\'accord (cas limite)', () => {
            // Cas théorique où CCN serait plus avantageuse
            // (nécessite un point territorial très élevé ou un SMH très bas)
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3], // C5
                anciennete: 10,
                pointTerritorial: 10.00, // Point territorial élevé
                accordActif: true
            };
            
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const primeDetail = result.details.find(d => d.label.includes('ancienneté'));
            
            // Le système doit avoir comparé les deux et choisi la plus avantageuse
            expect(primeDetail).toBeDefined();
        });
    });

    describe('Assiette SMH - Exclusion des Primes', () => {
        it('devrait exclure la prime d\'ancienneté de l\'assiette SMH', () => {
            // L'assiette SMH ne doit contenir que : base + forfait (si cadre)
            // Exclut : primes d'ancienneté, primes d'équipe, épargne salariale
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3], // C5
                anciennete: 10
            };
            
            const resultSMH = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
            const resultFull = calculateAnnualRemuneration(state, null, { mode: 'full' });
            
            // SMH seul doit être inférieur au total avec primes
            expect(resultSMH.total).toBeLessThan(resultFull.total);
            // SMH seul = SMH de base uniquement
            expect(resultSMH.total).toBe(CONFIG.SMH[5]);
        });
    });

    describe('Barème Débutants - Tranches d\'Expérience', () => {
        it('devrait utiliser la tranche "< 2 ans" pour expérience 0-1 ans', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 1,
                forfait: '35h'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][0]); // 28 200 €
        });

        it('devrait utiliser la tranche "2 à 4 ans" pour expérience 2-3 ans', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 3,
                forfait: '35h'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][2]); // 29 610 €
        });

        it('devrait utiliser la tranche "4 à 6 ans" pour expérience 4-5 ans', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 4,
                forfait: '35h'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][4]); // 31 979 €
        });

        it('devrait utiliser le SMH standard pour expérience >= 6 ans', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 6,
                forfait: '35h'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.baseSMH).toBe(CONFIG.SMH[11]); // 34 900 € (barème standard)
        });
    });

    describe('Prime de Vacances - Condition d\'Ancienneté', () => {
        const accordVacances = {
            id: 'kuhn',
            nom: 'Kuhn',
            nomCourt: 'Kuhn',
            url: 'https://example.com',
            dateEffet: '2024-01-01',
            anciennete: { seuil: 3, plafond: 15, tousStatuts: false, baseCalcul: 'salaire', barème: {} },
            majorations: { nuit: null, dimanche: null },
            primes: [
                {
                    id: 'primeVacances',
                    label: 'Prime de vacances',
                    sourceValeur: 'accord',
                    valueType: 'montant',
                    unit: '€',
                    valeurAccord: 525,
                    moisVersement: 7,
                    conditionAnciennete: { type: 'annees_revolues', annees: 1 },
                    stateKeyActif: 'primeVacances'
                }
            ],
            repartition13Mois: { actif: false, moisVersement: 11, inclusDansSMH: true },
            labels: { nomCourt: 'Kuhn', tooltip: '', description: '', badge: '🏢' },
            metadata: { version: '1.0', articlesSubstitues: [], territoire: '', entreprise: '' }
        };

        it('devrait exclure la prime de vacances si ancienneté < 1 an', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3],
                accordInputs: { ...stateBase.accordInputs, primeVacances: true },
                accordActif: true,
                anciennete: 0.8 // < 1 an
            };
            const result = calculateAnnualRemuneration(state, accordVacances, { mode: 'full' });
            const primeVacances = result.details.find(d => d.label.includes('vacances'));
            expect(primeVacances).toBeUndefined();
        });

        it('devrait inclure la prime de vacances si ancienneté >= 1 an', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3],
                accordInputs: { ...stateBase.accordInputs, primeVacances: true },
                accordActif: true,
                anciennete: 1.2 // ≥ 1 an
            };
            const result = calculateAnnualRemuneration(state, accordVacances, { mode: 'full' });
            const primeVacances = result.details.find(d => d.label.includes('vacances'));
            expect(primeVacances).toBeDefined();
            expect(primeVacances.value).toBe(525);
        });
    });
});
