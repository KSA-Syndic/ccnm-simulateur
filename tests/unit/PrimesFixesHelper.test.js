/**
 * Tests unitaires pour PrimesFixesHelper
 * - getMontantPrimesFixesAnnuel : montant annuel des primes à versement unique (type montant) actives
 * - getMontantPrimesVerseesCeMois : montant versé un mois donné (moisVersement)
 */

import { describe, it, expect } from 'vitest';
import { getMontantPrimesFixesAnnuel, getMontantPrimesVerseesCeMois } from '../../src/remuneration/PrimesFixesHelper.js';
import { KuhnAgreement } from '../../accords/KuhnAgreement.js';

/** Accord avec une prime montant (vacances) et une prime horaire (équipe) */
const accordKuhn = KuhnAgreement;

describe('PrimesFixesHelper - getMontantPrimesFixesAnnuel', () => {
    it('devrait retourner 0 sans accord', () => {
        expect(getMontantPrimesFixesAnnuel({}, null)).toBe(0);
    });

    it('devrait retourner 0 si prime vacances non activée', () => {
        const state = { accordInputs: { primeVacances: false } };
        expect(getMontantPrimesFixesAnnuel(state, accordKuhn)).toBe(0);
    });

    it('devrait inclure la prime vacances (525 €) si activée', () => {
        const state = { accordInputs: { primeVacances: true }, anciennete: 2 };
        expect(getMontantPrimesFixesAnnuel(state, accordKuhn)).toBe(525);
    });

    it('ne doit pas inclure les primes horaires (équipe)', () => {
        const state = {
            accordInputs: { primeVacances: false, travailEquipe: true, heuresEquipe: 151.67 }
        };
        expect(getMontantPrimesFixesAnnuel(state, accordKuhn)).toBe(0);
    });
});

describe('PrimesFixesHelper - getMontantPrimesVerseesCeMois', () => {
    it('devrait retourner 0 sans accord ou mois invalide', () => {
        expect(getMontantPrimesVerseesCeMois({}, null, 7)).toBe(0);
        expect(getMontantPrimesVerseesCeMois({}, accordKuhn, 0)).toBe(0);
        expect(getMontantPrimesVerseesCeMois({}, accordKuhn, 13)).toBe(0);
    });

    it('devrait retourner 525 en juillet (moisVersement 7 pour prime vacances Kuhn)', () => {
        const state = { accordInputs: { primeVacances: true }, anciennete: 2 };
        expect(getMontantPrimesVerseesCeMois(state, accordKuhn, 7)).toBe(525);
    });

    it('devrait retourner 0 en août pour prime vacances (versée en juillet)', () => {
        const state = { accordInputs: { primeVacances: true } };
        expect(getMontantPrimesVerseesCeMois(state, accordKuhn, 8)).toBe(0);
    });

    it('devrait retourner 0 en juillet si prime vacances non activée', () => {
        const state = { accordInputs: { primeVacances: false } };
        expect(getMontantPrimesVerseesCeMois(state, accordKuhn, 7)).toBe(0);
    });
});
