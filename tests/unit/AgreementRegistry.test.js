/**
 * Tests unitaires pour AgreementRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    registerAgreement,
    getAgreement,
    getAllAgreements,
    hasAgreement,
    getAgreementIds
} from '../../src/agreements/AgreementRegistry.js';
import { KuhnAgreement } from '../../accords/KuhnAgreement.js';

describe('AgreementRegistry', () => {
    beforeEach(() => {
        // Le registre est initialisé avec Kuhn au chargement
        // On peut tester avec des accords supplémentaires
    });

    describe('getAgreement', () => {
        it('devrait retourner l\'accord Kuhn par son ID', () => {
            const accord = getAgreement('kuhn');
            expect(accord).toBeDefined();
            expect(accord.id).toBe('kuhn');
            expect(accord.nom).toContain('Kuhn');
        });

        it('devrait retourner null pour un ID inexistant', () => {
            const accord = getAgreement('inexistant');
            expect(accord).toBeNull();
        });

        it('devrait retourner null pour un ID null', () => {
            const accord = getAgreement(null);
            expect(accord).toBeNull();
        });
    });

    describe('hasAgreement', () => {
        it('devrait retourner true pour l\'accord Kuhn', () => {
            expect(hasAgreement('kuhn')).toBe(true);
        });

        it('devrait retourner false pour un ID inexistant', () => {
            expect(hasAgreement('inexistant')).toBe(false);
        });
    });

    describe('getAllAgreements', () => {
        it('devrait retourner au moins l\'accord Kuhn', () => {
            const accords = getAllAgreements();
            expect(accords.length).toBeGreaterThan(0);
            expect(accords.some(a => a.id === 'kuhn')).toBe(true);
        });
    });

    describe('getAgreementIds', () => {
        it('devrait retourner au moins l\'ID de l\'accord Kuhn', () => {
            const ids = getAgreementIds();
            expect(ids).toContain('kuhn');
        });
    });

    describe('registerAgreement', () => {
        it('devrait enregistrer un nouvel accord valide', () => {
            const nouvelAccord = {
                id: 'test-accord',
                nom: 'Test Accord',
                nomCourt: 'Test',
                url: 'https://example.com',
                dateEffet: '2024-01-01',
                anciennete: {
                    seuil: 3,
                    plafond: 15,
                    tousStatuts: false,
                    baseCalcul: 'salaire',
                    barème: { 3: 0.03 }
                },
                majorations: {
                    nuit: {
                        posteNuit: 0.15,
                        posteMatin: 0.15,
                        plageDebut: 20,
                        plageFin: 6,
                        seuilHeuresPosteNuit: 2
                    },
                    dimanche: 1.00
                },
                primes: [],
                repartition13Mois: {
                    actif: false,
                    moisVersement: 12,
                    inclusDansSMH: false
                },
                labels: {
                    nomCourt: 'Test',
                    tooltip: 'Test',
                    description: 'Test'
                },
                metadata: {
                    version: '1.0',
                    articlesSubstitues: [],
                    entreprise: 'Test'
                }
            };

            const success = registerAgreement(nouvelAccord);
            expect(success).toBe(true);
            expect(hasAgreement('test-accord')).toBe(true);
        });

        it('devrait refuser un accord invalide', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const accordInvalide = {
                id: 'invalide'
                // Manque des champs requis
            };

            const success = registerAgreement(accordInvalide);
            expect(success).toBe(false);
            warnSpy.mockRestore();
            errorSpy.mockRestore();
        });
    });
});
