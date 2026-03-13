/**
 * Tests unitaires pour MajorationCalculator
 * Vérification juridique conforme CCNM 2024 - API générique computeMajoration(def, context)
 */

import { describe, it, expect } from 'vitest';
import { computeMajoration } from '../../src/remuneration/MajorationCalculator.js';
import { getConventionMajorationDefs } from '../../src/convention/ConventionCatalog.js';
import { SEMANTIC_ID, SOURCE_ACCORD, SOURCE_CONVENTION } from '../../src/core/RemunerationTypes.js';

function sourceLabel(r, agreement) {
    if (r.source === SOURCE_ACCORD) return agreement?.nomCourt ?? 'Accord';
    return 'CCN';
}

describe('MajorationCalculator', () => {
    describe('computeMajoration - nuit', () => {
        const accordKuhn = {
            id: 'kuhn',
            nomCourt: 'Kuhn',
            majorations: {
                nuit: { posteNuit: 0.20 }
            }
        };

        const defNuitCCN = getConventionMajorationDefs().find(d => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT);
        const defNuitAccord = {
            semanticId: SEMANTIC_ID.MAJORATION_NUIT,
            kind: 'majoration',
            source: SOURCE_ACCORD,
            label: 'Majoration nuit',
            config: {}
        };

        it('devrait retourner 0 si aucun travail de nuit', () => {
            const r = computeMajoration(defNuitCCN, { state: { typeNuit: 'aucun', heuresNuit: 0 }, tauxHoraire: 20, agreement: null });
            expect(r.amount).toBe(0);
        });

        it('devrait calculer la majoration nuit CCN (15%)', () => {
            const r = computeMajoration(defNuitCCN, { state: { typeNuit: 'poste-matin', heuresNuit: 10 }, tauxHoraire: 20, agreement: null });
            expect(r.amount).toBeCloseTo(360, 0);
            expect(r.meta?.taux).toBe(15);
            expect(sourceLabel(r, null)).toBe('CCN');
        });

        it('devrait calculer la majoration nuit accord Kuhn (20%)', () => {
            const r = computeMajoration(defNuitAccord, { state: { typeNuit: 'poste-nuit', heuresNuit: 10 }, tauxHoraire: 20, agreement: accordKuhn });
            expect(r.amount).toBeCloseTo(480, 0);
            expect(r.meta?.taux).toBe(20);
            expect(['Kuhn', 'Accord']).toContain(sourceLabel(r, accordKuhn));
        });

        it('devrait appliquer le taux accord (poste nuit) quand typeNuit non aucun', () => {
            const r = computeMajoration(defNuitAccord, { state: { typeNuit: 'poste-nuit', heuresNuit: 10 }, tauxHoraire: 20, agreement: accordKuhn });
            expect(r.amount).toBeCloseTo(480, 0);
            expect(r.meta?.taux).toBe(20);
        });
    });

    describe('computeMajoration - dimanche', () => {
        const accordKuhn = {
            id: 'kuhn',
            nomCourt: 'Kuhn',
            majorations: {
                dimanche: 0.50
            }
        };

        const defDimCCN = getConventionMajorationDefs().find(d => d.semanticId === SEMANTIC_ID.MAJORATION_DIMANCHE);
        const defDimAccord = {
            semanticId: SEMANTIC_ID.MAJORATION_DIMANCHE,
            kind: 'majoration',
            source: SOURCE_ACCORD,
            label: 'Majoration dimanche',
            config: {}
        };

        it('devrait retourner 0 si pas de travail dimanche', () => {
            const r = computeMajoration(defDimCCN, { state: { heuresDimanche: 0 }, tauxHoraire: 20, agreement: null });
            expect(r.amount).toBe(0);
        });

        it('devrait calculer la majoration dimanche CCN (100%)', () => {
            const r = computeMajoration(defDimCCN, { state: { heuresDimanche: 8 }, tauxHoraire: 20, agreement: null });
            expect(r.amount).toBeCloseTo(1920, 0);
            expect(r.meta?.taux).toBe(100);
            expect(sourceLabel(r, null)).toBe('CCN');
        });

        it('devrait calculer la majoration dimanche accord Kuhn (50%)', () => {
            const r = computeMajoration(defDimAccord, { state: { heuresDimanche: 8 }, tauxHoraire: 20, agreement: accordKuhn });
            expect(r.amount).toBeCloseTo(960, 0);
            expect(r.meta?.taux).toBe(50);
            expect(['Kuhn', 'Accord']).toContain(sourceLabel(r, accordKuhn));
        });
    });

    describe('computeMajoration - heures supplémentaires', () => {
        const defHs25CCN = getConventionMajorationDefs().find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25);
        const defHs50CCN = getConventionMajorationDefs().find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50);
        const accordKuhn = {
            id: 'kuhn',
            nomCourt: 'Kuhn',
            majorations: {
                heuresSupplementaires: { majoration25: 0.25, majoration50: 0.50, contingent: 370 }
            }
        };
        const defHs25Accord = {
            semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
            kind: 'majoration',
            source: SOURCE_ACCORD,
            label: 'Majoration HS 25',
            config: { stateKeyActif: 'travailHeuresSup', stateKeyHeures: 'heuresSup' }
        };
        const defHs50Accord = {
            semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
            kind: 'majoration',
            source: SOURCE_ACCORD,
            label: 'Majoration HS 50',
            config: { stateKeyActif: 'travailHeuresSup', stateKeyHeures: 'heuresSup' }
        };

        it('devrait découper les heures sup entre tranche 25% et 50% en CCN', () => {
            const state = { travailHeuresSup: true, heuresSup: 40 };
            const r25 = computeMajoration(defHs25CCN, { state, tauxHoraire: 20, agreement: null });
            const r50 = computeMajoration(defHs50CCN, { state, tauxHoraire: 20, agreement: null });
            expect(r25.meta?.heures).toBeCloseTo(34.67, 1);
            expect(r50.meta?.heures).toBeCloseTo(5.33, 1);
            expect(r25.amount).toBeGreaterThan(0);
            expect(r50.amount).toBeGreaterThan(0);
        });

        it('devrait retourner 0 si heures sup inactives', () => {
            const state = { travailHeuresSup: false, heuresSup: 40 };
            const r25 = computeMajoration(defHs25CCN, { state, tauxHoraire: 20, agreement: null });
            expect(r25.amount).toBe(0);
        });

        it('devrait utiliser les taux accord pour les heures sup', () => {
            const state = { travailHeuresSup: true, heuresSup: 20 };
            const r25 = computeMajoration(defHs25Accord, { state, tauxHoraire: 20, agreement: accordKuhn });
            const r50 = computeMajoration(defHs50Accord, { state, tauxHoraire: 20, agreement: accordKuhn });
            expect(r25.meta?.taux).toBe(25);
            expect(r50.amount).toBe(0);
        });
    });
});
