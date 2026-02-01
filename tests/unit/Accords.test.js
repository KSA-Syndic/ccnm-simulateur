/**
 * Tests unitaires pour les accords d'entreprise
 * - Interface (validateAgreement, getPrimes, getAccordInput, getPrimeValue, etc.)
 * - Accord Kuhn : structure, calculs spécifiques (prime équipe, prime vacances)
 * - Accord générique minimal pour futurs ajouts
 */

import { describe, it, expect, vi } from 'vitest';
import {
    validateAgreement,
    getPrimes,
    getPrimeById,
    getElements,
    getAccordInput,
    getPrimeValue,
    getPrimeHeures,
    isPrimeActive,
    primeDefToElementDef,
    getAccordPrimeDefsAsElements
} from '../../src/agreements/AgreementInterface.js';
import { KuhnAgreement } from '../../accords/KuhnAgreement.js';
import { computePrime } from '../../src/remuneration/PrimeCalculator.js';
import { SOURCE_ACCORD } from '../../src/core/RemunerationTypes.js';

/** Accord minimal valide pour tests génériques */
function accordMinimal(primes = []) {
    return {
        id: 'test-minimal',
        nom: 'Accord test minimal',
        nomCourt: 'Test',
        url: 'https://example.com',
        dateEffet: '2024-01-01',
        anciennete: { seuil: 3, plafond: 15, tousStatuts: false, baseCalcul: 'salaire', barème: {} },
        majorations: {
            nuit: { posteNuit: 0.15, posteMatin: 0.15, plageDebut: 20, plageFin: 6, seuilHeuresPosteNuit: 2 },
            dimanche: 1.00
        },
        primes,
        repartition13Mois: { actif: false, moisVersement: 12, inclusDansSMH: false },
        labels: { nomCourt: 'Test', tooltip: '', description: '' },
        metadata: { version: '1.0', articlesSubstitues: [], entreprise: 'Test' }
    };
}

describe('Accords - Interface (validateAgreement)', () => {
    it('devrait valider un accord complet (Kuhn)', () => {
        expect(validateAgreement(KuhnAgreement)).toBe(true);
    });

    it('devrait valider un accord minimal avec primes tableau vide', () => {
        expect(validateAgreement(accordMinimal())).toBe(true);
    });

    it('devrait rejeter null ou non-objet', () => {
        expect(validateAgreement(null)).toBe(false);
        expect(validateAgreement(undefined)).toBe(false);
        expect(validateAgreement('string')).toBe(false);
    });

    it('devrait rejeter si un champ requis est manquant', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const sansNom = { ...accordMinimal(), nom: undefined };
        delete sansNom.nom;
        expect(validateAgreement(sansNom)).toBe(false);
        spy.mockRestore();
    });

    it('devrait rejeter si primes n\'est pas un tableau', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const accord = accordMinimal();
        accord.primes = { primeEquipe: {} };
        expect(validateAgreement(accord)).toBe(false);
        spy.mockRestore();
    });
});

describe('Accords - Interface (getPrimes, getPrimeById, getElements)', () => {
    it('devrait retourner la liste des primes Kuhn', () => {
        const primes = getPrimes(KuhnAgreement);
        expect(Array.isArray(primes)).toBe(true);
        expect(primes.length).toBe(3);
        expect(primes.some(p => p.id === 'primeEquipe')).toBe(true);
        expect(primes.some(p => p.id === 'primeVacances')).toBe(true);
        expect(primes.some(p => p.id === 'majorationNuitPosteMatin')).toBe(true);
    });

    it('devrait retourner une prime par id', () => {
        expect(getPrimeById(KuhnAgreement, 'primeEquipe')).toBeDefined();
        expect(getPrimeById(KuhnAgreement, 'primeEquipe').valueType).toBe('horaire');
        expect(getPrimeById(KuhnAgreement, 'primeVacances').valueType).toBe('montant');
        expect(getPrimeById(KuhnAgreement, 'inexistant')).toBeNull();
    });

    it('devrait retourner [] pour accord null ou sans primes', () => {
        expect(getPrimes(null)).toEqual([]);
        expect(getPrimes(accordMinimal())).toEqual([]);
    });

    it('devrait retourner les elements de droit Kuhn', () => {
        const elements = getElements(KuhnAgreement);
        expect(Array.isArray(elements)).toBe(true);
        expect(elements.some(e => e.id === 'primeVacances' && e.type === 'prime')).toBe(true);
    });
});

describe('Accords - Interface (getAccordInput)', () => {
    it('devrait lire depuis accordInputs en priorité', () => {
        const state = {
            accordInputs: { travailEquipe: true, heuresEquipe: 100 },
            travailEquipe: false,
            heuresEquipe: 50
        };
        expect(getAccordInput(state, 'travailEquipe')).toBe(true);
        expect(getAccordInput(state, 'heuresEquipe')).toBe(100);
    });

    it('devrait fallback sur state[key] si pas dans accordInputs', () => {
        const state = { primeVacances: true };
        expect(getAccordInput(state, 'primeVacances')).toBe(true);
    });

    it('devrait retourner undefined pour state null ou clé absente', () => {
        expect(getAccordInput(null, 'x')).toBeUndefined();
        expect(getAccordInput({}, 'x')).toBeUndefined();
    });
});

describe('Accords - Interface (getPrimeValue, getPrimeHeures, isPrimeActive)', () => {
    it('devrait retourner la valeur accord pour prime à valeur fixe (prime vacances)', () => {
        const state = { accordInputs: {} };
        expect(getPrimeValue(KuhnAgreement, 'primeVacances', state)).toBe(525);
    });

    it('devrait retourner la valeur accord pour prime horaire (prime équipe)', () => {
        const state = { accordInputs: {} };
        expect(getPrimeValue(KuhnAgreement, 'primeEquipe', state)).toBe(0.82);
    });

    it('devrait retourner 0 pour prime inexistante', () => {
        expect(getPrimeValue(KuhnAgreement, 'inexistant', {})).toBe(0);
    });

    it('devrait retourner les heures mensuelles pour prime équipe', () => {
        const state = { accordInputs: { heuresEquipe: 151.67 } };
        expect(getPrimeHeures(KuhnAgreement, 'primeEquipe', state)).toBe(151.67);
    });

    it('devrait retourner 0 heures si stateKeyHeures absent ou non renseigné', () => {
        expect(getPrimeHeures(KuhnAgreement, 'primeVacances', {})).toBe(0);
        expect(getPrimeHeures(KuhnAgreement, 'primeEquipe', {})).toBe(0);
    });

    it('devrait indiquer si une prime est activée', () => {
        expect(isPrimeActive(KuhnAgreement, 'primeEquipe', { accordInputs: { travailEquipe: true } })).toBe(true);
        expect(isPrimeActive(KuhnAgreement, 'primeEquipe', { accordInputs: { travailEquipe: false } })).toBe(false);
        expect(isPrimeActive(KuhnAgreement, 'primeVacances', { accordInputs: { primeVacances: true } })).toBe(true);
    });
});

describe('Accords - Interface (primeDefToElementDef, getAccordPrimeDefsAsElements)', () => {
    it('devrait convertir une PrimeDef en ElementDef', () => {
        const prime = getPrimeById(KuhnAgreement, 'primeEquipe');
        const el = primeDefToElementDef(prime, KuhnAgreement);
        expect(el.kind).toBe('prime');
        expect(el.source).toBe('accord');
        expect(el.valueKind).toBe('horaire');
        expect(el.semanticId).toBe('primeEquipe');
        expect(el.config?.valeurAccord).toBe(0.82);
    });

    it('devrait retourner toutes les primes accord en ElementDef', () => {
        const elements = getAccordPrimeDefsAsElements(KuhnAgreement);
        expect(elements.length).toBe(3);
        expect(elements.every(e => e.source === SOURCE_ACCORD && e.kind === 'prime')).toBe(true);
    });
});

describe('Accords - Kuhn (calculs spécifiques)', () => {
    it('devrait calculer la prime équipe (horaire) : 0,82 €/h × heures × 12', () => {
        const def = getAccordPrimeDefsAsElements(KuhnAgreement).find(e => e.id === 'primeEquipe');
        const state = { accordInputs: { travailEquipe: true, heuresEquipe: 151.67 } };
        const ctx = { state, agreement: KuhnAgreement };
        const result = computePrime(def, ctx);
        const attendu = Math.round(151.67 * 0.82 * 12);
        expect(result.amount).toBe(attendu);
        expect(result.source).toBe('accord');
    });

    it('devrait calculer la prime vacances (montant fixe) 525 € si activée', () => {
        const def = getAccordPrimeDefsAsElements(KuhnAgreement).find(e => e.id === 'primeVacances');
        const state = { accordInputs: { primeVacances: true }, anciennete: 2 };
        const ctx = { state, agreement: KuhnAgreement };
        const result = computePrime(def, ctx);
        expect(result.amount).toBe(525);
    });

    it('devrait ne pas verser la prime vacances si non activée', () => {
        const def = getAccordPrimeDefsAsElements(KuhnAgreement).find(e => e.id === 'primeVacances');
        const state = { accordInputs: { primeVacances: false } };
        const result = computePrime(def, { state, agreement: KuhnAgreement });
        expect(result.amount).toBe(0);
    });

    it('devrait ne pas verser la prime équipe si travail équipe non coché', () => {
        const def = getAccordPrimeDefsAsElements(KuhnAgreement).find(e => e.id === 'primeEquipe');
        const state = { accordInputs: { travailEquipe: false, heuresEquipe: 151.67 } };
        const result = computePrime(def, { state, agreement: KuhnAgreement });
        expect(result.amount).toBe(0);
    });
});

describe('Accords - Accord générique minimal', () => {
    const accordAvecPrimes = accordMinimal([
        {
            id: 'primeNoel',
            label: 'Prime Noël',
            sourceValeur: 'accord',
            valueType: 'montant',
            unit: '€',
            valeurAccord: 200,
            stateKeyActif: 'primeNoel',
            moisVersement: 12
        },
        {
            id: 'primeHoraire',
            label: 'Prime horaire test',
            sourceValeur: 'accord',
            valueType: 'horaire',
            unit: '€/h',
            valeurAccord: 1.50,
            stateKeyActif: 'primeHoraire',
            stateKeyHeures: 'heuresPrimeHoraire'
        }
    ]);

    it('devrait valider l\'accord avec primes personnalisées', () => {
        expect(validateAgreement(accordAvecPrimes)).toBe(true);
        expect(getPrimes(accordAvecPrimes).length).toBe(2);
    });

    it('devrait retourner getPrimeValue pour prime montant et horaire', () => {
        expect(getPrimeValue(accordAvecPrimes, 'primeNoel', {})).toBe(200);
        expect(getPrimeValue(accordAvecPrimes, 'primeHoraire', {})).toBe(1.50);
    });

    it('devrait convertir les primes en ElementDef pour calcul générique', () => {
        const elements = getAccordPrimeDefsAsElements(accordAvecPrimes);
        expect(elements.length).toBe(2);
        expect(elements.find(e => e.id === 'primeNoel').valueKind).toBe('montant');
        expect(elements.find(e => e.id === 'primeHoraire').valueKind).toBe('horaire');
    });
});
