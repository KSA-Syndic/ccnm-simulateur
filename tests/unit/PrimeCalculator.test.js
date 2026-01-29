/**
 * Tests unitaires pour PrimeCalculator
 * Vérification juridique conforme CCNM 2024
 */

import { describe, it, expect } from 'vitest';
import {
    calculatePrimeAncienneteAccord,
    calculatePrimeAncienneteCCN,
    calculatePrimeEquipe,
    getPrimeVacances
} from '../../src/remuneration/PrimeCalculator.js';

describe('PrimeCalculator', () => {
    describe('calculatePrimeAncienneteAccord', () => {
        const accordKuhn = {
            id: 'kuhn',
            nom: 'Kuhn',
            anciennete: {
                seuil: 2,
                plafond: 25,
                barème: {
                    2: 0.02,
                    3: 0.03,
                    5: 0.05,
                    15: 0.15,
                    25: 0.16
                }
            }
        };

        it('devrait retourner 0 si ancienneté < seuil', () => {
            const result = calculatePrimeAncienneteAccord(accordKuhn, 30000, 1);
            expect(result.montant).toBe(0);
        });

        it('devrait calculer la prime pour 5 ans d\'ancienneté', () => {
            const result = calculatePrimeAncienneteAccord(accordKuhn, 30000, 5);
            expect(result.montant).toBe(1500); // 30000 * 0.05
            expect(result.taux).toBe(5);
            expect(result.annees).toBe(5);
        });

        it('devrait plafonner à 25 ans', () => {
            const result = calculatePrimeAncienneteAccord(accordKuhn, 30000, 30);
            expect(result.montant).toBe(4800); // 30000 * 0.16
            expect(result.annees).toBe(25);
        });

        it('devrait retourner 0 si accord invalide', () => {
            const result = calculatePrimeAncienneteAccord(null, 30000, 5);
            expect(result.montant).toBe(0);
        });
    });

    describe('calculatePrimeAncienneteCCN', () => {
        it('devrait retourner 0 si ancienneté < seuil (3 ans)', () => {
            const result = calculatePrimeAncienneteCCN(5.90, 5, 2);
            expect(result.montant).toBe(0);
        });

        it('devrait calculer la prime CCN pour classe C5, 10 ans', () => {
            // Formule : Point × Taux × Années × 12
            // 5.90 × 2.20 × 10 × 12 = 1557.6 ≈ 1558
            const result = calculatePrimeAncienneteCCN(5.90, 5, 10);
            expect(result.montant).toBeGreaterThan(1500);
            expect(result.montant).toBeLessThan(1600);
            expect(result.annees).toBe(10);
        });

        it('devrait plafonner à 15 ans pour la CCN', () => {
            const result = calculatePrimeAncienneteCCN(5.90, 5, 20);
            expect(result.annees).toBe(15);
        });
    });

    describe('calculatePrimeEquipe', () => {
        const accordKuhn = {
            id: 'kuhn',
            primes: {
                equipe: {
                    montantHoraire: 0.82,
                    calculMensuel: true
                }
            }
        };

        it('devrait calculer la prime d\'équipe mensuelle', () => {
            const result = calculatePrimeEquipe(accordKuhn, 151.67);
            expect(result.montantMensuel).toBeCloseTo(124.37, 1);
            // Arrondi annuel : 124.37 * 12 = 1492.44, arrondi = 1492
            expect(result.montantAnnuel).toBe(1492);
            expect(result.tauxHoraire).toBe(0.82);
        });

        it('devrait retourner 0 si pas d\'accord', () => {
            const result = calculatePrimeEquipe(null, 151.67);
            expect(result.montantAnnuel).toBe(0);
        });
    });

    describe('getPrimeVacances', () => {
        const accordKuhn = {
            id: 'kuhn',
            primes: {
                vacances: {
                    montant: 525,
                    conditions: ['Ancienneté ≥ 1 an au 1er juin']
                }
            }
        };

        it('devrait retourner le montant si active et ancienneté >= 1 an', () => {
            const result = getPrimeVacances(accordKuhn, true, 1.5);
            expect(result).toBe(525);
        });

        it('devrait retourner 0 si ancienneté < 1 an', () => {
            const result = getPrimeVacances(accordKuhn, true, 0.5);
            expect(result).toBe(0);
        });

        it('devrait retourner 0 si inactive', () => {
            const result = getPrimeVacances(accordKuhn, false, 2);
            expect(result).toBe(0);
        });

        it('devrait retourner 0 si pas d\'accord', () => {
            const result = getPrimeVacances(null, true, 2);
            expect(result).toBe(0);
        });
    });
});
