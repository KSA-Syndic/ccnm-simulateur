/**
 * Tests unitaires pour ForfaitCalculator
 * - computeForfait : convention (forfait heures +15%, jours +30%), accord (extension)
 */

import { describe, it, expect } from 'vitest';
import { computeForfait } from '../../src/remuneration/ForfaitCalculator.js';
import { getConventionForfaitDefs } from '../../src/convention/ConventionCatalog.js';
import { CONFIG } from '../../src/core/config.js';
import { SOURCE_CONVENTION, SOURCE_ACCORD } from '../../src/core/RemunerationTypes.js';

describe('ForfaitCalculator - computeForfait', () => {
    it('devrait retourner amount 0 et label vide si def invalide', () => {
        expect(computeForfait(null, {})).toEqual({ amount: 0, label: '', source: '' });
        expect(computeForfait({ kind: 'prime' }, {})).toEqual({ amount: 0, label: '', source: '' });
    });

    describe('Convention (CCN)', () => {
        const defs = getConventionForfaitDefs();
        const defHeures = defs.find(d => d.config?.forfaitKey === 'heures');
        const defJours = defs.find(d => d.config?.forfaitKey === 'jours');

        it('devrait appliquer forfait heures (+15%) quand state.forfait === "heures"', () => {
            const state = { forfait: 'heures' };
            const baseSMH = 40000;
            const ctx = { state, baseSMH };
            const result = computeForfait(defHeures, ctx);
            expect(result.source).toBe(SOURCE_CONVENTION);
            expect(result.amount).toBe(Math.round(40000 * 0.15));
            expect(result.amount).toBe(6000);
        });

        it('devrait appliquer forfait jours (+30%) quand state.forfait === "jours"', () => {
            const state = { forfait: 'jours' };
            const baseSMH = 40000;
            const ctx = { state, baseSMH };
            const result = computeForfait(defJours, ctx);
            expect(result.source).toBe(SOURCE_CONVENTION);
            expect(result.amount).toBe(Math.round(40000 * 0.30));
            expect(result.amount).toBe(12000);
        });

        it('devrait retourner 0 pour forfait heures si state.forfait !== "heures"', () => {
            const state = { forfait: '35h' };
            const ctx = { state, baseSMH: 40000 };
            const result = computeForfait(defHeures, ctx);
            expect(result.amount).toBe(0);
        });

        it('devrait retourner 0 pour forfait jours si state.forfait !== "jours"', () => {
            const state = { forfait: 'heures' };
            const ctx = { state, baseSMH: 40000 };
            const result = computeForfait(defJours, ctx);
            expect(result.amount).toBe(0);
        });
    });

    describe('Accord (extension)', () => {
        const defAccord = {
            kind: 'forfait',
            source: SOURCE_ACCORD,
            semanticId: 'forfaitAccord',
            label: 'Forfait accord',
            config: { taux: 0.10 }
        };

        it('devrait calculer forfait accord selon config.taux', () => {
            const ctx = { state: {}, baseSMH: 35000 };
            const result = computeForfait(defAccord, ctx);
            expect(result.source).toBe(SOURCE_ACCORD);
            expect(result.amount).toBe(Math.round(35000 * 0.10));
            expect(result.amount).toBe(3500);
        });

        it('devrait retourner 0 si config.taux === 0', () => {
            const def = { ...defAccord, config: { taux: 0 } };
            const result = computeForfait(def, { state: {}, baseSMH: 40000 });
            expect(result.amount).toBe(0);
        });
    });
});
