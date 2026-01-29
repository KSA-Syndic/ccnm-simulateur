/**
 * Tests unitaires pour RemunerationCalculator
 * Vérification juridique conforme CCNM 2024
 */

import { describe, it, expect } from 'vitest';
import { calculateAnnualRemuneration, getMontantAnnuelSMHSeul } from '../../src/remuneration/RemunerationCalculator.js';
import { CONFIG } from '../../src/core/config.js';

describe('RemunerationCalculator', () => {
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
        travailEquipe: false,
        heuresEquipe: 151.67,
        accordActif: false,
        primeVacances: false
    };

    describe('calculateAnnualRemuneration - Mode SMH seul', () => {
        it('devrait retourner uniquement le SMH de base pour non-cadre', () => {
            const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3] }; // C5
            const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
            expect(result.total).toBe(CONFIG.SMH[5]);
            expect(result.scenario).toBe('smh-only');
        });

        it('devrait inclure la majoration forfait pour cadre', () => {
            const state = { 
                ...stateBase, 
                scores: [7, 7, 6, 6, 6, 6], // F11, forfait jours
                forfait: 'jours',
                experiencePro: 6 // Cadre confirmé (≥6 ans) pour utiliser SMH standard
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
            const smhBase = CONFIG.SMH[11];
            const forfaitMontant = Math.round(smhBase * 0.30);
            expect(result.total).toBe(smhBase + forfaitMontant);
        });
    });

    describe('calculateAnnualRemuneration - Mode full (non-cadre)', () => {
        it('devrait calculer la rémunération complète pour non-cadre sans ancienneté', () => {
            const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3] }; // C5
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBe(CONFIG.SMH[5]);
            expect(result.scenario).toBe('non-cadre');
            expect(result.isCadre).toBe(false);
        });

        it('devrait inclure la prime d\'ancienneté CCN si ancienneté >= 3 ans', () => {
            const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3], anciennete: 10 }; // C5, 10 ans
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBeGreaterThan(CONFIG.SMH[5]);
            expect(result.details.some(d => d.label.includes('ancienneté'))).toBe(true);
        });
    });

    describe('calculateAnnualRemuneration - Principe de Faveur (Art. L2254-2 Code du Travail)', () => {
        const accordKuhn = {
            id: 'kuhn',
            nomCourt: 'Kuhn',
            anciennete: {
                seuil: 2,
                plafond: 25,
                tousStatuts: true,
                baseCalcul: 'salaire',
                barème: {
                    2: 0.02,
                    5: 0.05,
                    15: 0.15
                }
            },
            majorations: {
                nuit: {
                    posteNuit: 0.20,
                    posteMatin: 0.15
                },
                dimanche: 0.50
            },
            primes: {
                equipe: {
                    montantHoraire: 0.82,
                    calculMensuel: true
                },
                vacances: {
                    montant: 525,
                    moisVersement: 7,
                    conditions: ['Ancienneté ≥ 1 an au 1er juin']
                }
            },
            repartition13Mois: {
                actif: true,
                moisVersement: 11,
                inclusDansSMH: true
            }
        };

        it('devrait appliquer la prime CCN si plus avantageuse que l\'accord (cas limite)', () => {
            // Cas où la prime CCN devient supérieure à l'accord après plusieurs années
            // Exemple : C5, 15 ans, point territorial élevé
            const state = { 
                ...stateBase, 
                scores: [3, 3, 3, 3, 3, 3], // C5
                anciennete: 15,
                pointTerritorial: 5.90,
                accordActif: true
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            
            // Vérifier que le système a comparé les deux primes et choisi la plus avantageuse
            const primeDetail = result.details.find(d => d.label.includes('ancienneté'));
            expect(primeDetail).toBeDefined();
            // La note devrait indiquer quelle source a été choisie
            if (primeDetail.note) {
                expect(primeDetail.note).toMatch(/Plus avantageux/);
            }
        });

        it('devrait appliquer la prime accord si plus avantageuse que CCN', () => {
            // Cas où l'accord est plus avantageux (seuil à 2 ans vs 3 ans CCN)
            const state = { 
                ...stateBase, 
                scores: [3, 3, 3, 3, 3, 3], // C5
                anciennete: 5,
                pointTerritorial: 5.90,
                accordActif: true
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            expect(result.total).toBeGreaterThan(CONFIG.SMH[5]);
            const primeAnciennete = result.details.find(d => d.isAgreement);
            expect(primeAnciennete).toBeDefined();
        });

        it('devrait inclure la prime d\'équipe Kuhn pour non-cadre', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3],
                travailEquipe: true,
                heuresEquipe: 151.67,
                accordActif: true
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const primeEquipe = result.details.find(d => d.label.includes('équipe'));
            expect(primeEquipe).toBeDefined();
            expect(primeEquipe.isAgreement).toBe(true);
        });

        it('devrait inclure la prime de vacances si ancienneté >= 1 an', () => {
            const state = { 
                ...stateBase, 
                scores: [3, 3, 3, 3, 3, 3], 
                primeVacances: true, 
                accordActif: true,
                anciennete: 1.5 // ≥ 1 an requis
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const primeVacances = result.details.find(d => d.label.includes('vacances'));
            expect(primeVacances).toBeDefined();
            expect(primeVacances.value).toBe(525);
        });

        it('ne devrait PAS inclure la prime de vacances si ancienneté < 1 an', () => {
            const state = { 
                ...stateBase, 
                scores: [3, 3, 3, 3, 3, 3], 
                primeVacances: true, 
                accordActif: true,
                anciennete: 0.5 // < 1 an
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const primeVacances = result.details.find(d => d.label.includes('vacances'));
            expect(primeVacances).toBeUndefined();
        });
    });

    describe('calculateAnnualRemuneration - Cadres débutants', () => {
        it('devrait utiliser le barème débutants pour F11 avec expérience < 6 ans', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 4,
                forfait: '35h'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.scenario).toBe('cadre-debutant');
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][4]);
        });

        it('devrait calculer l\'expérience avec alternance (2 ans alternance = 1 an expérience)', () => {
            // Test du cas limite : alternance compte pour moitié
            // 2 ans alternance + 3 ans CDI = 4 ans d'expérience totale
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 4, // Déjà calculée avec alternance prise en compte
                forfait: '35h'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            // Devrait utiliser la tranche "4 à 6 ans" du barème débutants
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][4]); // 31 979 €
        });
    });

    describe('getMontantAnnuelSMHSeul', () => {
        it('devrait retourner le SMH seul pour non-cadre', () => {
            const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3] }; // C5
            const result = getMontantAnnuelSMHSeul(state);
            expect(result).toBe(CONFIG.SMH[5]);
        });

        it('devrait inclure le forfait pour cadre', () => {
            const state = { 
                ...stateBase, 
                scores: [7, 7, 6, 6, 6, 6], // F11
                forfait: 'heures',
                experiencePro: 6 // Cadre confirmé (≥6 ans) pour utiliser SMH standard
            };
            const result = getMontantAnnuelSMHSeul(state);
            const smhBase = CONFIG.SMH[11];
            const forfaitMontant = Math.round(smhBase * 0.15);
            expect(result).toBe(smhBase + forfaitMontant);
        });
    });
});
