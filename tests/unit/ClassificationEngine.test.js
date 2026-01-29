/**
 * Tests unitaires pour ClassificationEngine
 */

import { describe, it, expect } from 'vitest';
import { calculateClassification, getActiveClassification, isCadre, getClassesForGroupe } from '../../src/classification/ClassificationEngine.js';

describe('ClassificationEngine', () => {
    describe('calculateClassification', () => {
        it('devrait calculer la classification pour un score minimal (6 points)', () => {
            const scores = [1, 1, 1, 1, 1, 1];
            const result = calculateClassification(scores);
            expect(result.totalScore).toBe(6);
            expect(result.groupe).toBe('A');
            expect(result.classe).toBe(1);
        });

        it('devrait calculer la classification pour un score maximal (60 points)', () => {
            const scores = [10, 10, 10, 10, 10, 10];
            const result = calculateClassification(scores);
            expect(result.totalScore).toBe(60);
            expect(result.groupe).toBe('I');
            expect(result.classe).toBe(18);
        });

        it('devrait calculer la classification pour un ouvrier classe C5', () => {
            // Score typique pour classe C5 : environ 18-20 points
            const scores = [3, 3, 3, 3, 3, 3]; // 18 points
            const result = calculateClassification(scores);
            expect(result.groupe).toBe('C');
            expect(result.classe).toBe(5);
        });

        it('devrait calculer la classification pour un technicien classe D7', () => {
            // Score typique pour classe D7 : environ 24-26 points
            const scores = [4, 4, 4, 4, 4, 4]; // 24 points
            const result = calculateClassification(scores);
            expect(result.groupe).toBe('D');
            expect(result.classe).toBe(7);
        });

        it('devrait calculer la classification pour un cadre F11', () => {
            // Score typique pour classe F11 : environ 38-41 points
            const scores = [7, 7, 6, 6, 6, 6]; // 38 points
            const result = calculateClassification(scores);
            expect(result.groupe).toBe('F');
            expect(result.classe).toBe(11);
        });

        it('devrait gérer les scores invalides', () => {
            const result = calculateClassification([1, 2, 3]); // Pas assez de scores
            expect(result.groupe).toBe('A');
            expect(result.classe).toBe(1);
        });
    });

    describe('getActiveClassification', () => {
        it('devrait retourner la classification manuelle si modeManuel est true', () => {
            const state = {
                modeManuel: true,
                groupeManuel: 'C',
                classeManuel: 5,
                scores: [1, 1, 1, 1, 1, 1]
            };
            const result = getActiveClassification(state);
            expect(result.groupe).toBe('C');
            expect(result.classe).toBe(5);
        });

        it('devrait calculer la classification automatique si modeManuel est false', () => {
            const state = {
                modeManuel: false,
                groupeManuel: 'A',
                classeManuel: 1,
                scores: [3, 3, 3, 3, 3, 3] // 18 points -> C5
            };
            const result = getActiveClassification(state);
            expect(result.groupe).toBe('C');
            expect(result.classe).toBe(5);
        });
    });

    describe('isCadre', () => {
        it('devrait retourner false pour les classes non-cadres (1-10)', () => {
            expect(isCadre(1)).toBe(false);
            expect(isCadre(5)).toBe(false);
            expect(isCadre(10)).toBe(false);
        });

        it('devrait retourner true pour les classes cadres (11-18)', () => {
            expect(isCadre(11)).toBe(true);
            expect(isCadre(13)).toBe(true);
            expect(isCadre(18)).toBe(true);
        });
    });

    describe('getClassesForGroupe', () => {
        it('devrait retourner les classes pour le groupe A', () => {
            const classes = getClassesForGroupe('A');
            expect(classes).toEqual([1, 2]);
        });

        it('devrait retourner les classes pour le groupe F', () => {
            const classes = getClassesForGroupe('F');
            expect(classes).toEqual([11, 12]);
        });

        it('devrait retourner un tableau vide pour un groupe invalide', () => {
            const classes = getClassesForGroupe('Z');
            expect(classes).toEqual([]);
        });
    });
});
