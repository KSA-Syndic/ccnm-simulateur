/**
 * Tests unitaires pour textHelpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    formatAcronym,
    resetAcronymsRegistry,
    getAcronymFullForm,
    formatWithUnit
} from '../../src/utils/textHelpers.js';

describe('textHelpers', () => {
    beforeEach(() => {
        resetAcronymsRegistry();
    });

    describe('formatAcronym', () => {
        it('devrait formater un acronyme à la première occurrence', () => {
            const result = formatAcronym('CCN');
            expect(result).toContain('Convention Collective Nationale');
            expect(result).toContain('CCN');
        });

        it('devrait utiliser seulement l\'acronyme aux occurrences suivantes', () => {
            formatAcronym('CCN'); // Première occurrence
            const result = formatAcronym('CCN'); // Deuxième occurrence
            expect(result).toBe('CCN');
        });

        it('devrait forcer l\'explication si demandé', () => {
            formatAcronym('CCN');
            const result = formatAcronym('CCN', true);
            expect(result).toContain('Convention Collective Nationale');
        });

        it('devrait retourner l\'acronyme tel quel si inconnu', () => {
            const result = formatAcronym('XYZ');
            expect(result).toBe('XYZ');
        });
    });

    describe('getAcronymFullForm', () => {
        it('devrait retourner la forme complète d\'un acronyme connu', () => {
            const result = getAcronymFullForm('CCN');
            expect(result).toBe('Convention Collective Nationale');
        });

        it('devrait retourner null pour un acronyme inconnu', () => {
            const result = getAcronymFullForm('XYZ');
            expect(result).toBeNull();
        });
    });

    describe('formatWithUnit', () => {
        it('devrait formater une valeur avec son unité', () => {
            const result = formatWithUnit(5, 'ans');
            expect(result).toBe('5 ans');
        });

        it('devrait formater un nombre décimal', () => {
            const result = formatWithUnit(5.5, 'ans');
            expect(result).toContain('5');
            expect(result).toContain('ans');
        });

        it('devrait gérer les valeurs null', () => {
            const result = formatWithUnit(null, 'ans');
            expect(result).toBe('-');
        });

        it('devrait gérer les valeurs undefined', () => {
            const result = formatWithUnit(undefined, 'ans');
            expect(result).toBe('-');
        });
    });

    describe('resetAcronymsRegistry', () => {
        it('devrait réinitialiser le registre des acronymes', () => {
            formatAcronym('CCN'); // Première occurrence
            resetAcronymsRegistry();
            const result = formatAcronym('CCN'); // Devrait être considéré comme première occurrence
            expect(result).toContain('Convention Collective Nationale');
        });
    });
});
