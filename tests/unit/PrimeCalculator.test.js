/**
 * Tests unitaires pour PrimeCalculator
 * Vérification juridique conforme CCNM 2024 - API générique computePrime(def, context)
 */

import { describe, it, expect } from 'vitest';
import { computePrime } from '../../src/remuneration/PrimeCalculator.js';
import { getConventionPrimeDefs } from '../../src/convention/ConventionCatalog.js';
import { CONFIG } from '../../src/core/config.js';
import { SEMANTIC_ID, SOURCE_ACCORD, SOURCE_CONVENTION } from '../../src/core/RemunerationTypes.js';

describe('PrimeCalculator', () => {
    describe('computePrime - prime ancienneté accord', () => {
        const accordKuhn = {
            id: 'kuhn',
            nom: 'Kuhn',
            anciennete: {
                seuil: 2,
                plafond: 25,
                barème: {
                    2: 0.02,
                    3: 0.03,
                    5: 0.05,
                    15: 0.15,
                    25: 0.16
                }
            }
        };

        const defAccordAnciennete = {
            id: 'primeAnciennete',
            semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
            kind: 'prime',
            source: SOURCE_ACCORD,
            valueKind: 'pourcentage',
            label: 'Prime ancienneté',
            config: { barème: accordKuhn.anciennete.barème }
        };

        it('devrait retourner 0 si ancienneté < seuil', () => {
            const r = computePrime(defAccordAnciennete, { state: { anciennete: 1 }, salaireBase: 30000, agreement: accordKuhn });
            expect(r.amount).toBe(0);
        });

        it('devrait calculer la prime pour 5 ans d\'ancienneté', () => {
            const r = computePrime(defAccordAnciennete, { state: { anciennete: 5 }, salaireBase: 30000, agreement: accordKuhn });
            expect(r.amount).toBe(1500); // 30000 * 0.05
            expect(r.meta?.taux).toBe(5);
            expect(r.meta?.annees).toBe(5);
        });

        it('devrait plafonner à 25 ans', () => {
            const r = computePrime(defAccordAnciennete, { state: { anciennete: 30 }, salaireBase: 30000, agreement: accordKuhn });
            expect(r.amount).toBe(4800); // 30000 * 0.16
            expect(r.meta?.annees).toBe(25);
        });

        it('devrait retourner 0 si accord invalide', () => {
            const r = computePrime(defAccordAnciennete, { state: { anciennete: 5 }, salaireBase: 30000, agreement: null });
            expect(r.amount).toBe(0);
        });
    });

    describe('computePrime - prime ancienneté CCN', () => {
        const defCCN = getConventionPrimeDefs().find(d => d.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE) || {
            semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
            kind: 'prime',
            source: SOURCE_CONVENTION,
            label: 'Prime ancienneté CCN',
            config: {}
        };

        it('devrait retourner 0 si ancienneté < seuil (3 ans)', () => {
            const r = computePrime(defCCN, { state: { anciennete: 2 }, pointTerritorial: 5.90, classe: 5 });
            expect(r.amount).toBe(0);
        });

        it('devrait calculer la prime CCN pour classe C5, 10 ans', () => {
            const r = computePrime(defCCN, { state: { anciennete: 10 }, pointTerritorial: 5.90, classe: 5 });
            expect(r.amount).toBeGreaterThan(1500);
            expect(r.amount).toBeLessThan(1600);
            expect(r.meta?.annees).toBe(10);
        });

        it('devrait plafonner à 15 ans pour la CCN', () => {
            const r = computePrime(defCCN, { state: { anciennete: 20 }, pointTerritorial: 5.90, classe: 5 });
            expect(r.meta?.annees).toBe(15);
        });
    });

    describe('computePrime - prime équipe (horaire)', () => {
        const accordKuhn = {
            id: 'kuhn',
            primes: [
                {
                    id: 'primeEquipe',
                    sourceValeur: 'accord',
                    valueType: 'horaire',
                    valeurAccord: 0.82,
                    stateKeyActif: 'travailEquipe',
                    stateKeyHeures: 'heuresEquipe'
                }
            ]
        };

        const defEquipe = {
            id: 'primeEquipe',
            kind: 'prime',
            source: SOURCE_ACCORD,
            valueKind: 'horaire',
            label: 'Prime équipe',
            config: { stateKeyActif: 'travailEquipe', stateKeyHeures: 'heuresEquipe', autoHeures: true }
        };

        it('devrait calculer la prime d\'équipe mensuelle', () => {
            const r = computePrime(defEquipe, { state: { travailEquipe: true, heuresEquipe: 151.67 }, agreement: accordKuhn });
            expect(Math.round(r.amount / 12)).toBeCloseTo(124, 0);
            expect(r.amount).toBe(1492);
            expect(r.meta?.tauxHoraire).toBe(0.82);
        });

        it('devrait retourner 0 si pas d\'accord', () => {
            const r = computePrime(defEquipe, { state: { heuresEquipe: 151.67 }, agreement: null });
            expect(r.amount).toBe(0);
        });

        it('devrait calculer automatiquement sur 151,67h (sans inclusion HS)', () => {
            const r = computePrime(defEquipe, {
                state: { travailEquipe: true, travailHeuresSup: true, heuresSup: 20, heuresEquipe: 10 },
                agreement: accordKuhn
            });
            // 151.67 * 0.82 * 12
            expect(r.amount).toBe(1492);
            expect(r.meta?.heures).toBe(151.67);
        });
    });

    describe('computePrime - prime équipe CCN (30 min SMH horaire)', () => {
        const defEquipeCCN = getConventionPrimeDefs().find(d => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE);

        it('devrait calculer la prime équipe CCN si active', () => {
            const r = computePrime(defEquipeCCN, {
                state: { accordInputs: { travailEquipe: true, heuresEquipe: 151.67 } },
                tauxHoraire: 12
            });
            expect(r.amount).toBe(792); // 22 postes/mois * (30min -> 0.5h) * (12 * 0.5)
            expect(r.meta?.tauxHoraire).toBe(6);
            expect(r.meta?.heures).toBe(11);
            expect(r.meta?.postesMensuels).toBe(22);
        });

        it('devrait retourner 0 si la prime équipe CCN est inactive', () => {
            const r = computePrime(defEquipeCCN, {
                state: { accordInputs: { travailEquipe: false, heuresEquipe: 151.67 } },
                tauxHoraire: 12
            });
            expect(r.amount).toBe(0);
        });
    });

    describe('computePrime - prime vacances (montant)', () => {
        const accordKuhn = {
            id: 'kuhn',
            primes: [
                {
                    id: 'primeVacances',
                    sourceValeur: 'accord',
                    valueType: 'montant',
                    valeurAccord: 525,
                    conditions: ['Ancienneté ≥ 1 an au 1er juin'],
                    stateKeyActif: 'primeVacances'
                }
            ]
        };

        const defVacances = {
            id: 'primeVacances',
            kind: 'prime',
            source: SOURCE_ACCORD,
            valueKind: 'montant',
            label: 'Prime vacances',
            config: { stateKeyActif: 'primeVacances', conditionAnciennete: { type: 'annees_revolues', annees: 1 } }
        };

        it('devrait retourner le montant si active et ancienneté >= 1 an', () => {
            const r = computePrime(defVacances, {
                state: { accordInputs: { primeVacances: true }, anciennete: 1.5 },
                agreement: accordKuhn
            });
            expect(r.amount).toBe(525);
        });

        it('devrait retourner 0 si ancienneté < 1 an', () => {
            const r = computePrime(defVacances, {
                state: { accordInputs: { primeVacances: true }, anciennete: 0.5 },
                agreement: accordKuhn
            });
            expect(r.amount).toBe(0);
        });

        it('devrait retourner 0 si inactive', () => {
            const r = computePrime(defVacances, {
                state: { accordInputs: { primeVacances: false }, anciennete: 2 },
                agreement: accordKuhn
            });
            expect(r.amount).toBe(0);
        });

        it('devrait retourner 0 si pas d\'accord', () => {
            const r = computePrime(defVacances, {
                state: { accordInputs: { primeVacances: true }, anciennete: 2 },
                agreement: null
            });
            expect(r.amount).toBe(0);
        });
    });

    describe('computePrime - modalités nationales astreinte', () => {
        it('calcule l’astreinte disponibilité en mode horaire', () => {
            const previous = JSON.parse(JSON.stringify(CONFIG.MODALITES_NATIONALES.astreinteDisponibilite));
            CONFIG.MODALITES_NATIONALES.astreinteDisponibilite.modeCalcul = 'horaire';
            CONFIG.MODALITES_NATIONALES.astreinteDisponibilite.valeurHoraire = 4;
            try {
                const def = getConventionPrimeDefs().find(d => d.semanticId === SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE);
                const r = computePrime(def, {
                    state: { accordInputs: { primeAstreinteDisponibilite: true, heuresAstreinteDisponibilite: 10 } }
                });
                expect(r.amount).toBe(480); // 10h * 4€ * 12
                expect(r.meta?.modeCalcul).toBe('horaire');
            } finally {
                CONFIG.MODALITES_NATIONALES.astreinteDisponibilite = previous;
            }
        });

        it('calcule l’astreinte disponibilité en mode forfait par période', () => {
            const previous = JSON.parse(JSON.stringify(CONFIG.MODALITES_NATIONALES.astreinteDisponibilite));
            CONFIG.MODALITES_NATIONALES.astreinteDisponibilite.modeCalcul = 'forfaitPeriode';
            CONFIG.MODALITES_NATIONALES.astreinteDisponibilite.valeurForfaitPeriode = 35;
            try {
                const def = getConventionPrimeDefs().find(d => d.semanticId === SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE);
                const r = computePrime(def, {
                    state: { accordInputs: { primeAstreinteDisponibilite: true, heuresAstreinteDisponibilite: 4 } }
                });
                expect(r.amount).toBe(1680); // 4 périodes * 35€ * 12
                expect(r.meta?.modeCalcul).toBe('forfaitPeriode');
            } finally {
                CONFIG.MODALITES_NATIONALES.astreinteDisponibilite = previous;
            }
        });

        it('calcule l’intervention d’astreinte avec base horaire incluse', () => {
            const previous = JSON.parse(JSON.stringify(CONFIG.MODALITES_NATIONALES.interventionAstreinte));
            CONFIG.MODALITES_NATIONALES.interventionAstreinte.tauxMajoration = 0.5;
            CONFIG.MODALITES_NATIONALES.interventionAstreinte.inclureBaseHoraire = true;
            try {
                const def = getConventionPrimeDefs().find(d => d.semanticId === SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE);
                const r = computePrime(def, {
                    state: {
                        accordInputs: {
                            primeAstreinteDisponibilite: true,
                            majorationInterventionAstreinte: true,
                            heuresInterventionAstreinte: 10
                        }
                    },
                    tauxHoraire: 20
                });
                expect(r.amount).toBe(3600); // 10h * 20€ * (1+50%) * 12
                expect(r.meta?.inclureBaseHoraire).toBe(true);
            } finally {
                CONFIG.MODALITES_NATIONALES.interventionAstreinte = previous;
            }
        });
    });
});
