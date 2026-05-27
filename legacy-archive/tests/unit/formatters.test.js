/**
 * Tests unitaires pour formatters
 */

import { describe, it, expect } from 'vitest';
import {
    formatMoney,
    formatMoneyPDF,
    escapeHTML,
    formatEurosDetail,
    formatHeuresDetail
} from '../../utils/formatters.js';

describe('formatters', () => {
    describe('formatMoney', () => {
        it('devrait formater un montant en euros', () => {
            const result = formatMoney(21500);
            expect(result).toContain('21');
            expect(result).toContain('500');
            expect(result).toContain('€');
        });

        it('devrait arrondir les montants', () => {
            const result = formatMoney(21500.7);
            expect(result).toContain('21 501');
        });

        it('devrait gérer les grands montants', () => {
            const result = formatMoney(68000);
            expect(result).toContain('68');
            expect(result).toContain('000');
        });

        it('devrait gérer les petits montants', () => {
            const result = formatMoney(525);
            expect(result).toContain('525');
        });
    });

    describe('formatMoneyPDF', () => {
        it('devrait formater un montant pour PDF', () => {
            const result = formatMoneyPDF(21500);
            expect(result).toContain('21');
            expect(result).toContain('500');
            expect(result).toContain('€');
        });

        it('devrait avoir le même format que formatMoney', () => {
            const montant = 21500;
            const result1 = formatMoney(montant);
            const result2 = formatMoneyPDF(montant);
            expect(result1).toBe(result2);
        });
    });

    describe('formatEurosDetail', () => {
        it('devrait arrondir à 2 décimales (affichage détail libellés)', () => {
            expect(formatEurosDetail(12.076657655875696)).toBe('12,08');
            expect(formatEurosDetail(300)).toBe('300,00');
        });
    });

    describe('formatHeuresDetail', () => {
        it('devrait arrondir les heures à 2 décimales max', () => {
            expect(formatHeuresDetail(2.166666666)).toBe('2,17');
            expect(formatHeuresDetail(20)).toBe('20');
        });
    });

    describe('escapeHTML', () => {
        it('devrait échapper les caractères HTML', () => {
            const result = escapeHTML('<script>alert("xss")</script>');
            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;');
        });

        it('devrait gérer les chaînes normales', () => {
            const result = escapeHTML('Texte normal');
            expect(result).toBe('Texte normal');
        });

        it('devrait convertir les non-string en string', () => {
            const result = escapeHTML(123);
            expect(result).toBe('123');
        });
    });
});
