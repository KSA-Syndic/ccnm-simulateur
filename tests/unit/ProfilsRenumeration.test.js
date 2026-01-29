/**
 * Tests unitaires : profils de rémunération multi-classes (CCN)
 * Vérifie que chaque type de profil (A1 à I18, non-cadres, cadres, cadres débutants)
 * produit les montants attendus selon la convention (SMH, prime ancienneté, forfaits).
 */

import { describe, it, expect } from 'vitest';
import { calculateAnnualRemuneration, getMontantAnnuelSMHSeul } from '../../src/remuneration/RemunerationCalculator.js';
import { CONFIG } from '../../src/core/config.js';

/** State minimal sans accord, pour forcer la CCN */
function stateCCN(overrides = {}) {
    return {
        modeManuel: false,
        groupeManuel: 'A',
        classeManuel: 1,
        scores: [1, 1, 1, 1, 1, 1],
        anciennete: 0,
        pointTerritorial: CONFIG.POINT_TERRITORIAL_DEFAUT ?? 5.90,
        forfait: '35h',
        experiencePro: 0,
        typeNuit: 'aucun',
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        accordInputs: { primeVacances: false, travailEquipe: false, heuresEquipe: 151.67 },
        accordActif: false,
        ...overrides
    };
}

/** Score total pour obtenir une classe donnée (milieu de plage) */
function scoresForClasse(classe) {
    const mapping = CONFIG.MAPPING_POINTS.find(([, , , c]) => c === classe);
    if (!mapping) return [1, 1, 1, 1, 1, 1];
    const [min, max] = mapping;
    const total = Math.floor((min + max) / 2);
    const base = Math.floor(total / 6);
    const rest = total - base * 6;
    const scores = Array(6).fill(base);
    for (let i = 0; i < rest; i++) scores[i]++;
    return scores;
}

describe('Profils rémunération - CCN (multi-classes)', () => {
    describe('Non-cadres : SMH de base par classe (sans ancienneté)', () => {
        const nonCadreClasses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        nonCadreClasses.forEach(classe => {
            it(`classe ${classe} : total = SMH[${classe}] sans prime ancienneté`, () => {
                const state = stateCCN({ scores: scoresForClasse(classe), anciennete: 0 });
                const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
                expect(result.classe).toBe(classe);
                expect(result.isCadre).toBe(false);
                expect(result.scenario).toBe('non-cadre');
                expect(result.total).toBe(CONFIG.SMH[classe]);
                expect(result.baseSMH).toBe(CONFIG.SMH[classe]);
            });
        });
    });

    describe('Non-cadres : prime d\'ancienneté CCN (seuil 3 ans, plafond 15 ans)', () => {
        it('A1, 0 an : pas de prime ancienneté', () => {
            const state = stateCCN({ scores: scoresForClasse(1), anciennete: 0 });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBe(CONFIG.SMH[1]);
            expect(result.details.some(d => d.label.includes('ancienneté'))).toBe(false);
        });

        it('A1, 2 ans : pas de prime ancienneté (< 3 ans)', () => {
            const state = stateCCN({ scores: scoresForClasse(1), anciennete: 2 });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBe(CONFIG.SMH[1]);
        });

        it('C5, 10 ans : SMH + prime ancienneté CCN (point × taux × 10 × 12)', () => {
            const point = 5.90;
            const state = stateCCN({ scores: scoresForClasse(5), anciennete: 10, pointTerritorial: point });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            const taux = CONFIG.TAUX_ANCIENNETE[5]; // 2.20
            const primeAttendue = Math.round(point * taux * 10 * 12);
            expect(result.total).toBe(CONFIG.SMH[5] + primeAttendue);
            expect(result.details.some(d => d.label.includes('ancienneté'))).toBe(true);
        });

        it('C5, 20 ans : prime plafonnée à 15 ans CCN', () => {
            const point = 5.90;
            const state = stateCCN({ scores: scoresForClasse(5), anciennete: 20, pointTerritorial: point });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            const taux = CONFIG.TAUX_ANCIENNETE[5];
            const primeAttendue = Math.round(point * taux * 15 * 12); // plafond 15
            expect(result.total).toBe(CONFIG.SMH[5] + primeAttendue);
        });

        it('E10, 5 ans : prime ancienneté avec taux E10', () => {
            const point = 5.90;
            const state = stateCCN({ scores: scoresForClasse(10), anciennete: 5, pointTerritorial: point });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            const taux = CONFIG.TAUX_ANCIENNETE[10]; // 3.80
            const primeAttendue = Math.round(point * taux * 5 * 12);
            expect(result.total).toBe(CONFIG.SMH[10] + primeAttendue);
        });
    });

    describe('Cadres : SMH + forfait (35h, heures +15%, jours +30%)', () => {
        it('F11, 6 ans exp, forfait 35h : total = SMH F11', () => {
            const state = stateCCN({
                scores: scoresForClasse(11),
                experiencePro: 6,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.classe).toBe(11);
            expect(result.isCadre).toBe(true);
            expect(result.scenario).toBe('cadre');
            expect(result.total).toBe(CONFIG.SMH[11]);
        });

        it('F11, 6 ans exp, forfait heures : total = SMH F11 + 15%', () => {
            const state = stateCCN({
                scores: scoresForClasse(11),
                experiencePro: 6,
                forfait: 'heures'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            const forfaitMontant = Math.round(CONFIG.SMH[11] * 0.15);
            expect(result.total).toBe(CONFIG.SMH[11] + forfaitMontant);
        });

        it('F11, 6 ans exp, forfait jours : total = SMH F11 + 30%', () => {
            const state = stateCCN({
                scores: scoresForClasse(11),
                experiencePro: 6,
                forfait: 'jours'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            const forfaitMontant = Math.round(CONFIG.SMH[11] * 0.30);
            expect(result.total).toBe(CONFIG.SMH[11] + forfaitMontant);
        });

        it('F12, 6 ans exp : total = SMH F12', () => {
            const state = stateCCN({
                scores: scoresForClasse(12),
                experiencePro: 6,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBe(CONFIG.SMH[12]);
        });

        it('G13, 6 ans exp : total = SMH G13 (cadre hors F)', () => {
            const state = stateCCN({
                scores: scoresForClasse(13),
                experiencePro: 6,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.classe).toBe(13);
            expect(result.total).toBe(CONFIG.SMH[13]);
        });
    });

    describe('Cadres débutants F11/F12 : barème débutants', () => {
        it('F11, 0 an exp : base = barème débutants F11 tranche 0', () => {
            const state = stateCCN({
                scores: scoresForClasse(11),
                experiencePro: 0,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.scenario).toBe('cadre-debutant');
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][0]);
            expect(result.total).toBe(CONFIG.BAREME_DEBUTANTS[11][0]);
        });

        it('F11, 2 an exp : base = barème débutants F11 tranche 2', () => {
            const state = stateCCN({
                scores: scoresForClasse(11),
                experiencePro: 2,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][2]);
        });

        it('F11, 4 an exp : base = barème débutants F11 tranche 4', () => {
            const state = stateCCN({
                scores: scoresForClasse(11),
                experiencePro: 4,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][4]);
        });

        it('F11, 6 an exp : base = SMH F11 standard (plus barème débutants)', () => {
            const state = stateCCN({
                scores: scoresForClasse(11),
                experiencePro: 6,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.scenario).toBe('cadre');
            expect(result.baseSMH).toBe(CONFIG.SMH[11]);
        });

        it('F12, 1 an exp : base = barème débutants F12 tranche 0', () => {
            const state = stateCCN({
                scores: scoresForClasse(12),
                experiencePro: 1,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[12][0]);
        });
    });

    describe('Mode SMH seul : cohérence avec mode full (hors primes)', () => {
        it('Non-cadre C5 : SMH seul = SMH base', () => {
            const state = stateCCN({ scores: scoresForClasse(5), anciennete: 10 });
            const smhSeul = getMontantAnnuelSMHSeul(state);
            expect(smhSeul).toBe(CONFIG.SMH[5]);
        });

        it('Cadre F11 forfait heures : SMH seul = base + forfait', () => {
            const state = stateCCN({
                scores: scoresForClasse(11),
                experiencePro: 6,
                forfait: 'heures'
            });
            const smhSeul = getMontantAnnuelSMHSeul(state);
            const expected = CONFIG.SMH[11] + Math.round(CONFIG.SMH[11] * 0.15);
            expect(smhSeul).toBe(expected);
        });
    });

    describe('Classes extrêmes : A1 et I18', () => {
        it('A1 : SMH minimum', () => {
            const state = stateCCN({ scores: scoresForClasse(1) });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBe(CONFIG.SMH[1]);
            expect(result.total).toBe(21700);
        });

        it('I18 : SMH maximum (cadre)', () => {
            const state = stateCCN({
                scores: scoresForClasse(18),
                experiencePro: 6,
                forfait: '35h'
            });
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBe(CONFIG.SMH[18]);
            expect(result.total).toBe(68000);
        });
    });
});
