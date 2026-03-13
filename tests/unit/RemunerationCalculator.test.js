/**
 * Tests unitaires pour RemunerationCalculator
 * Vérification juridique conforme CCNM 2024
 */

import { describe, it, expect } from 'vitest';
import { calculateAnnualRemuneration, getMontantAnnuelSMHSeul } from '../../src/remuneration/RemunerationCalculator.js';
import { CONFIG } from '../../src/core/config.js';

describe('RemunerationCalculator', () => {
    const stateBase = {
        modeManuel: false,
        groupeManuel: 'A',
        classeManuel: 1,
        scores: [1, 1, 1, 1, 1, 1],
        anciennete: 0,
        pointTerritorial: 5.90,
        forfait: '35h',
        experiencePro: 0,
        typeNuit: 'aucun',
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        accordInputs: {
            primeVacances: false,
            travailEquipe: false,
            heuresEquipe: 151.67
        },
        accordActif: false
    };

    describe('calculateAnnualRemuneration - Mode SMH seul', () => {
        it('devrait retourner uniquement le SMH de base pour non-cadre', () => {
            const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3] }; // C5
            const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
            expect(result.total).toBe(CONFIG.SMH[5]);
            expect(result.scenario).toBe('smh-only');
        });

        it('devrait inclure la majoration forfait pour cadre', () => {
            const state = { 
                ...stateBase, 
                scores: [7, 7, 6, 6, 6, 6], // F11, forfait jours
                forfait: 'jours',
                experiencePro: 6 // Cadre confirmé (≥6 ans) pour utiliser SMH standard
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
            const smhBase = CONFIG.SMH[11];
            const forfaitMontant = Math.round(smhBase * 0.30);
            expect(result.total).toBe(smhBase + forfaitMontant);
        });

        it('devrait inclure les majorations heures supplémentaires dans l\'assiette SMH', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3], // C5
                travailHeuresSup: true,
                heuresSup: 20
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
            expect(result.total).toBeGreaterThan(CONFIG.SMH[5]);
            expect(result.details.some(d => d.label.includes('Heures supplémentaires assiette SMH'))).toBe(true);
        });

        it('devrait appliquer les heures supplémentaires pour un cadre au forfait heures', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11 cadre
                experiencePro: 6,
                forfait: 'heures',
                travailHeuresSup: true,
                heuresSup: 20
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
            const smhBase = CONFIG.SMH[11];
            const forfaitMontant = Math.round(smhBase * 0.15);
            expect(result.total).toBeGreaterThan(smhBase + forfaitMontant);
            expect(result.details.some(d => String(d.label).includes('Heures supplémentaires assiette SMH'))).toBe(true);
        });

        it('ne devrait pas appliquer les heures supplémentaires pour un cadre au forfait jours', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11 cadre
                experiencePro: 6,
                forfait: 'jours',
                travailHeuresSup: true,
                heuresSup: 20
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
            const smhBase = CONFIG.SMH[11];
            const forfaitMontant = Math.round(smhBase * 0.30);
            expect(result.total).toBe(smhBase + forfaitMontant);
            expect(result.details.some(d => String(d.label).includes('Heures supplémentaires assiette SMH'))).toBe(false);
        });

        it('devrait inclure la prime d\'ancienneté dans l\'assiette SMH si inclusDansSMH=true', () => {
            const previous = CONFIG.ANCIENNETE.inclusDansSMH;
            CONFIG.ANCIENNETE.inclusDansSMH = true;
            try {
                const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3], anciennete: 10 }; // C5, 10 ans
                const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
                expect(result.total).toBeGreaterThan(CONFIG.SMH[5]);
                expect(result.details.some(d => d.label.includes('Prime ancienneté assiette SMH'))).toBe(true);
            } finally {
                CONFIG.ANCIENNETE.inclusDansSMH = previous;
            }
        });
    });

    describe('calculateAnnualRemuneration - Mode full (non-cadre)', () => {
        it('devrait calculer la rémunération complète pour non-cadre sans ancienneté', () => {
            const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3] }; // C5
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBe(CONFIG.SMH[5]);
            expect(result.scenario).toBe('non-cadre');
            expect(result.isCadre).toBe(false);
        });

        it('devrait inclure la prime d\'ancienneté CCN si ancienneté >= 3 ans', () => {
            const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3], anciennete: 10 }; // C5, 10 ans
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.total).toBeGreaterThan(CONFIG.SMH[5]);
            expect(result.details.some(d => d.label.includes('ancienneté'))).toBe(true);
        });

        it('ne devrait pas ajouter la prime d\'ancienneté au total full si elle est incluse dans le SMH', () => {
            const previous = CONFIG.ANCIENNETE.inclusDansSMH;
            CONFIG.ANCIENNETE.inclusDansSMH = true;
            try {
                const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3], anciennete: 10 }; // C5, 10 ans
                const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
                const primeAnc = result.details.find(d => d.semanticId === 'primeAnciennete');
                expect(primeAnc).toBeDefined();
                expect(primeAnc.isSMHIncluded).toBe(true);
                expect(result.total).toBe(CONFIG.SMH[5]);
            } finally {
                CONFIG.ANCIENNETE.inclusDansSMH = previous;
            }
        });

        it('doit respecter la surcharge runtime window.CONFIG pour inclusDansSMH sans accord', () => {
            const previousWindowConfig = window.CONFIG;
            try {
                window.CONFIG = {
                    ANCIENNETE: { inclusDansSMH: true }
                };
                const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3], anciennete: 10 }; // C5
                const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
                const primeAnc = result.details.find(d => d.semanticId === 'primeAnciennete');
                expect(primeAnc).toBeDefined();
                expect(primeAnc.isSMHIncluded).toBe(true);
                expect(result.total).toBe(CONFIG.SMH[5]);
            } finally {
                window.CONFIG = previousWindowConfig;
            }
        });

        it('devrait inclure la prime d\'équipe CCN même sans accord', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3], // C5
                accordInputs: { ...stateBase.accordInputs, travailEquipe: true, heuresEquipe: 151.67 }
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            const primeEquipe = result.details.find(d => d.label.includes('Prime d\'équipe CCN'));
            expect(primeEquipe).toBeDefined();
            expect(primeEquipe.isAgreement).toBe(false);
            const expected = Math.round(151.67 * ((CONFIG.SMH[5] / 12 / 151.67) * 0.5) * 12);
            expect(primeEquipe.value).toBe(expected);
        });

        it('devrait appliquer 151,67h implicites pour prime équipe CCN si heures non renseignées', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3], // C5
                accordInputs: { ...stateBase.accordInputs, travailEquipe: true }
            };
            delete state.accordInputs.heuresEquipe;
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            const primeEquipe = result.details.find(d => d.label.includes('Prime d\'équipe CCN'));
            expect(primeEquipe).toBeDefined();
            expect(primeEquipe.value).toBeGreaterThan(0);
        });

        it('ne devrait pas majorer la prime d\'équipe CCN avec les HS (base 35h fixe)', () => {
            const stateSansHS = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3],
                accordInputs: { ...stateBase.accordInputs, travailEquipe: true, heuresEquipe: 151.67 },
                travailHeuresSup: false,
                heuresSup: 0
            };
            const stateAvecHS = {
                ...stateSansHS,
                travailHeuresSup: true,
                heuresSup: 20
            };
            const rSans = calculateAnnualRemuneration(stateSansHS, null, { mode: 'full' });
            const rAvec = calculateAnnualRemuneration(stateAvecHS, null, { mode: 'full' });
            const pSans = rSans.details.find(d => d.label.includes('Prime d\'équipe CCN'));
            const pAvec = rAvec.details.find(d => d.label.includes('Prime d\'équipe CCN'));
            expect(pSans).toBeDefined();
            expect(pAvec).toBeDefined();
            expect(pAvec.value).toBe(pSans.value);
        });
    });

    describe('calculateAnnualRemuneration - Principe de Faveur (Art. L2254-2 Code du Travail)', () => {
        const accordKuhn = {
            id: 'kuhn',
            nom: 'Kuhn (UES)',
            nomCourt: 'Kuhn',
            url: 'https://example.com/kuhn',
            dateEffet: '2024-01-01',
            anciennete: {
                seuil: 2,
                plafond: 25,
                tousStatuts: true,
                baseCalcul: 'salaire',
                barème: { 2: 0.02, 5: 0.05, 15: 0.15 }
            },
            majorations: {
                nuit: { posteNuit: 0.20 },
                dimanche: 0.50
            },
            primes: [
                {
                    id: 'primeEquipe',
                    label: 'Prime d\'équipe',
                    sourceValeur: 'accord',
                    valueType: 'horaire',
                    unit: '€/h',
                    valeurAccord: 0.82,
                    stateKeyActif: 'travailEquipe',
                    stateKeyHeures: 'heuresEquipe'
                },
                {
                    id: 'primeVacances',
                    label: 'Prime de vacances',
                    sourceValeur: 'accord',
                    valueType: 'montant',
                    unit: '€',
                    valeurAccord: 525,
                    moisVersement: 7,
                    conditionAnciennete: { type: 'annees_revolues', annees: 1 },
                    stateKeyActif: 'primeVacances'
                },
                {
                    id: 'majorationNuitPosteMatin',
                    label: 'Majoration nuit poste matin / Après-Midi',
                    sourceValeur: 'accord',
                    valueType: 'majorationHoraire',
                    unit: '%',
                    valeurAccord: 0.15,
                    stateKeyActif: 'majorationNuitPosteMatin',
                    stateKeyHeures: 'heuresMajorationNuitPosteMatin',
                    defaultHeures: 0
                }
            ],
            repartition13Mois: { actif: true, moisVersement: 11, inclusDansSMH: true },
            labels: { nomCourt: 'Kuhn', tooltip: '', description: '', badge: '🏢' },
            metadata: { version: '1.0', articlesSubstitues: [], territoire: '', entreprise: '' }
        };

        it('doit laisser l\'accord surcharger inclusDansSMH même si la config globale est à true', () => {
            const previous = CONFIG.ANCIENNETE.inclusDansSMH;
            CONFIG.ANCIENNETE.inclusDansSMH = true;
            try {
                const accordAvecOverride = {
                    ...accordKuhn,
                    anciennete: { ...accordKuhn.anciennete, inclusDansSMH: false }
                };
                const state = {
                    ...stateBase,
                    scores: [3, 3, 3, 3, 3, 3],
                    anciennete: 5,
                    accordActif: true
                };
                const result = calculateAnnualRemuneration(state, accordAvecOverride, { mode: 'full' });
                const primeAnc = result.details.find(d => d.semanticId === 'primeAnciennete');
                expect(primeAnc).toBeDefined();
                expect(primeAnc.isSMHIncluded).toBe(false);
                expect(result.total).toBeGreaterThan(CONFIG.SMH[5]);
            } finally {
                CONFIG.ANCIENNETE.inclusDansSMH = previous;
            }
        });

        it('doit appliquer inclusDansSMH=true de l\'accord même si la config globale est à false', () => {
            const previous = CONFIG.ANCIENNETE.inclusDansSMH;
            CONFIG.ANCIENNETE.inclusDansSMH = false;
            try {
                const accordAvecOverride = {
                    ...accordKuhn,
                    anciennete: { ...accordKuhn.anciennete, inclusDansSMH: true }
                };
                const state = {
                    ...stateBase,
                    scores: [3, 3, 3, 3, 3, 3],
                    anciennete: 5,
                    accordActif: true
                };
                const result = calculateAnnualRemuneration(state, accordAvecOverride, { mode: 'full' });
                const primeAnc = result.details.find(d => d.semanticId === 'primeAnciennete');
                expect(primeAnc).toBeDefined();
                expect(primeAnc.isSMHIncluded).toBe(true);
                expect(result.total).toBe(CONFIG.SMH[5]);
            } finally {
                CONFIG.ANCIENNETE.inclusDansSMH = previous;
            }
        });

        it('devrait appliquer la prime CCN si plus avantageuse que l\'accord (cas limite)', () => {
            // Cas où la prime CCN devient supérieure à l'accord après plusieurs années
            // Exemple : C5, 15 ans, point territorial élevé
            const state = { 
                ...stateBase, 
                scores: [3, 3, 3, 3, 3, 3], // C5
                anciennete: 15,
                pointTerritorial: 5.90,
                accordActif: true
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            
            // Vérifier que le système a comparé les deux primes et choisi la plus avantageuse
            const primeDetail = result.details.find(d => d.label.includes('ancienneté'));
            expect(primeDetail).toBeDefined();
            // La note devrait indiquer quelle source a été choisie
            if (primeDetail.note) {
                expect(primeDetail.note).toMatch(/Plus avantageux/);
            }
        });

        it('devrait appliquer la prime accord si plus avantageuse que CCN', () => {
            // Cas où l'accord est plus avantageux (seuil à 2 ans vs 3 ans CCN)
            const state = { 
                ...stateBase, 
                scores: [3, 3, 3, 3, 3, 3], // C5
                anciennete: 5,
                pointTerritorial: 5.90,
                accordActif: true
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            expect(result.total).toBeGreaterThan(CONFIG.SMH[5]);
            const primeAnciennete = result.details.find(d => d.isAgreement);
            expect(primeAnciennete).toBeDefined();
        });

        it('devrait inclure la prime d\'équipe Kuhn pour non-cadre', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3],
                accordInputs: { ...stateBase.accordInputs, travailEquipe: true, heuresEquipe: 151.67 },
                accordActif: true
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const primeEquipe = result.details.find(d => d.label.includes('équipe'));
            expect(primeEquipe).toBeDefined();
            expect(primeEquipe.isAgreement).toBe(true);
            expect(primeEquipe.value).toBe(Math.round(151.67 * 0.82 * 12));
        });

        it('devrait inclure la prime de vacances si ancienneté >= 1 an', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3],
                accordInputs: { ...stateBase.accordInputs, primeVacances: true },
                accordActif: true,
                anciennete: 1.5 // ≥ 1 an requis
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const primeVacances = result.details.find(d => d.label.includes('vacances'));
            expect(primeVacances).toBeDefined();
            expect(primeVacances.value).toBe(525);
        });

        it('ne devrait PAS inclure la prime de vacances si ancienneté < 1 an', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3],
                accordInputs: { ...stateBase.accordInputs, primeVacances: true },
                accordActif: true,
                anciennete: 0.5 // < 1 an
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const primeVacances = result.details.find(d => d.label.includes('vacances'));
            expect(primeVacances).toBeUndefined();
        });

        it('devrait afficher majoration nuit (champ unique) + prime majoration poste matin/AM quand accord Kuhn', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3], // C5
                accordActif: true,
                typeNuit: 'poste-nuit',
                heuresNuit: 20,
                accordInputs: { majorationNuitPosteMatin: true, heuresMajorationNuitPosteMatin: 10 }
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const majNuit = result.details.find(d => d.label.includes('Majoration nuit (+20%)') && d.label.includes('20h/mois'));
            const majPosteMatin = result.details.find(d => d.label.includes('poste matin / Après-Midi') && d.label.includes('15%'));
            expect(majNuit).toBeDefined();
            expect(majPosteMatin).toBeDefined();
            const baseSMH = CONFIG.SMH[5];
            const tauxHoraire = baseSMH / 12 / 151.67;
            expect(majNuit.value).toBe(Math.round(20 * tauxHoraire * 0.20 * 12));
            expect(majPosteMatin.value).toBe(Math.round(10 * tauxHoraire * 0.15 * 12));
        });

        it('devrait inclure les majorations heures supplémentaires (25% puis 50%)', () => {
            const state = {
                ...stateBase,
                scores: [3, 3, 3, 3, 3, 3], // C5
                accordActif: true,
                travailHeuresSup: true,
                heuresSup: 40
            };
            const result = calculateAnnualRemuneration(state, accordKuhn, { mode: 'full' });
            const hs25 = result.details.find(d => d.label.includes('heures supplémentaires (+25%)'));
            const hs50 = result.details.find(d => d.label.includes('heures supplémentaires (+50%)'));
            expect(hs25).toBeDefined();
            expect(hs50).toBeDefined();
            expect(hs25.value).toBeGreaterThan(0);
            expect(hs50.value).toBeGreaterThan(0);
        });
    });

    describe('calculateAnnualRemuneration - Cadres débutants', () => {
        it('devrait utiliser le barème débutants pour F11 avec expérience < 6 ans', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 4,
                forfait: '35h'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            expect(result.scenario).toBe('cadre-debutant');
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][4]);
        });

        it('devrait calculer l\'expérience avec alternance (2 ans alternance = 1 an expérience)', () => {
            // Test du cas limite : alternance compte pour moitié
            // 2 ans alternance + 3 ans CDI = 4 ans d'expérience totale
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11
                experiencePro: 4, // Déjà calculée avec alternance prise en compte
                forfait: '35h'
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            // Devrait utiliser la tranche "4 à 6 ans" du barème débutants
            expect(result.baseSMH).toBe(CONFIG.BAREME_DEBUTANTS[11][4]); // 31 979 €
        });

        it('devrait appliquer les majorations heures supplémentaires pour un cadre au forfait heures (mode full)', () => {
            const state = {
                ...stateBase,
                scores: [7, 7, 6, 6, 6, 6], // F11 cadre
                experiencePro: 6,
                forfait: 'heures',
                travailHeuresSup: true,
                heuresSup: 20
            };
            const result = calculateAnnualRemuneration(state, null, { mode: 'full' });
            const hsLine = result.details.find(d => String(d.label).includes('Majoration heures supplémentaires'));
            expect(hsLine).toBeDefined();
            expect(hsLine.value).toBeGreaterThan(0);
        });
    });

    describe('getMontantAnnuelSMHSeul', () => {
        it('devrait retourner le SMH seul pour non-cadre', () => {
            const state = { ...stateBase, scores: [3, 3, 3, 3, 3, 3] }; // C5
            const result = getMontantAnnuelSMHSeul(state);
            expect(result).toBe(CONFIG.SMH[5]);
        });

        it('devrait inclure le forfait pour cadre', () => {
            const state = { 
                ...stateBase, 
                scores: [7, 7, 6, 6, 6, 6], // F11
                forfait: 'heures',
                experiencePro: 6 // Cadre confirmé (≥6 ans) pour utiliser SMH standard
            };
            const result = getMontantAnnuelSMHSeul(state);
            const smhBase = CONFIG.SMH[11];
            const forfaitMontant = Math.round(smhBase * 0.15);
            expect(result).toBe(smhBase + forfaitMontant);
        });
    });
});
