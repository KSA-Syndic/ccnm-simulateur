/**
 * Tests unitaires pour MajorationCalculator
 * Vérification juridique conforme CCNM 2024
 */

import { describe, it, expect } from 'vitest';
import {
    calculateMajorationNuit,
    calculateMajorationDimanche
} from '../../src/remuneration/MajorationCalculator.js';

describe('MajorationCalculator', () => {
    describe('calculateMajorationNuit', () => {
        const accordKuhn = {
            id: 'kuhn',
            nomCourt: 'Kuhn',
            majorations: {
                nuit: {
                    posteNuit: 0.20,
                    posteMatin: 0.15
                }
            }
        };

        it('devrait retourner 0 si aucun travail de nuit', () => {
            const result = calculateMajorationNuit('aucun', 0, 20, null);
            expect(result.montantAnnuel).toBe(0);
        });

        it('devrait calculer la majoration nuit CCN (15%)', () => {
            // Taux horaire : 20€/h, 10h de nuit/mois
            // 10h × 20€ × 0.15 × 12 = 360€/an
            const result = calculateMajorationNuit('poste-matin', 10, 20, null);
            expect(result.montantAnnuel).toBeCloseTo(360, 0);
            expect(result.taux).toBe(15);
            expect(result.source).toBe('CCN');
        });

        it('devrait calculer la majoration nuit accord Kuhn (20%)', () => {
            // Taux horaire : 20€/h, 10h de nuit/mois
            // 10h × 20€ × 0.20 × 12 = 480€/an
            const result = calculateMajorationNuit('poste-nuit', 10, 20, accordKuhn);
            expect(result.montantAnnuel).toBeCloseTo(480, 0);
            expect(result.taux).toBe(20);
            // Note : Le source peut être 'Kuhn' ou 'Accord' selon l'implémentation
            expect(['Kuhn', 'Accord']).toContain(result.source);
        });

        it('devrait calculer la majoration poste matin Kuhn (15%)', () => {
            const result = calculateMajorationNuit('poste-matin', 10, 20, accordKuhn);
            expect(result.montantAnnuel).toBeCloseTo(360, 0);
            expect(result.taux).toBe(15);
        });
    });

    describe('calculateMajorationDimanche', () => {
        const accordKuhn = {
            id: 'kuhn',
            nomCourt: 'Kuhn',
            majorations: {
                dimanche: 0.50
            }
        };

        it('devrait retourner 0 si pas de travail dimanche', () => {
            const result = calculateMajorationDimanche(0, 20, null);
            expect(result.montantAnnuel).toBe(0);
        });

        it('devrait calculer la majoration dimanche CCN (100%)', () => {
            // Taux horaire : 20€/h, 8h dimanche/mois
            // 8h × 20€ × 1.00 × 12 = 1920€/an
            const result = calculateMajorationDimanche(8, 20, null);
            expect(result.montantAnnuel).toBeCloseTo(1920, 0);
            expect(result.taux).toBe(100);
            expect(result.source).toBe('CCN');
        });

        it('devrait calculer la majoration dimanche accord Kuhn (50%)', () => {
            // Taux horaire : 20€/h, 8h dimanche/mois
            // 8h × 20€ × 0.50 × 12 = 960€/an
            const result = calculateMajorationDimanche(8, 20, accordKuhn);
            expect(result.montantAnnuel).toBeCloseTo(960, 0);
            expect(result.taux).toBe(50);
            // Note : Le source peut être 'Kuhn' ou 'Accord' selon l'implémentation
            expect(['Kuhn', 'Accord']).toContain(result.source);
        });
    });
});
