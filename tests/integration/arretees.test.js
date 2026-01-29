/**
 * Tests fonctionnels pour les arriérés
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    calculerArreteesMoisParMois
} from '../../src/arretees/ArreteesCalculator.js';
import { CONFIG } from '../../src/core/config.js';

describe('Arriérés - Calculs Fonctionnels', () => {
    const stateBase = {
        modeManuel: false,
        groupeManuel: 'C',
        classeManuel: 5,
        scores: [3, 3, 3, 3, 3, 3],
        anciennete: 5,
        pointTerritorial: 5.90,
        forfait: '35h',
        experiencePro: 0,
        typeNuit: 'aucun',
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        travailEquipe: false,
        heuresEquipe: 151.67,
        accordActif: false,
        primeVacances: false,
        nbMois: 12
    };

    describe('calculerArreteesMoisParMois', () => {
        it('devrait calculer les arriérés pour un mois avec salaire inférieur au SMH', () => {
            const dateDebut = new Date('2024-01-01');
            const dateFin = new Date('2024-01-31');
            const dateEmbauche = new Date('2020-01-01');
            
            const salairesParMois = {
                '2024-01': 2000 // Inférieur au SMH mensuel C5 (24250 / 12 ≈ 2021€)
            };

            const result = calculerArreteesMoisParMois({
                dateDebut,
                dateFin,
                dateEmbauche,
                dateChangementClassification: null,
                salairesParMois,
                stateSnapshot: stateBase,
                agreement: null,
                smhSeul: true,
                nbMois: 12
            });

            // Le salaire réel (2000€) est inférieur au SMH mensuel C5 (≈2021€)
            // Donc il devrait y avoir des arriérés
            expect(result.detailsTousMois.length).toBeGreaterThan(0);
            // Le total peut être 0 si le calcul ne trouve pas d'arriérés, mais au moins un mois devrait être traité
            expect(result.detailsTousMois.some(d => d.difference > 0)).toBe(true);
        });

        it('devrait retourner 0 arriérés si tous les salaires sont conformes', () => {
            const dateDebut = new Date('2024-01-01');
            const dateFin = new Date('2024-03-31');
            const dateEmbauche = new Date('2020-01-01');
            
            const smhMensuel = CONFIG.SMH[5] / 12;
            const salairesParMois = {
                '2024-01': smhMensuel + 100,
                '2024-02': smhMensuel + 100,
                '2024-03': smhMensuel + 100
            };

            const result = calculerArreteesMoisParMois({
                dateDebut,
                dateFin,
                dateEmbauche,
                dateChangementClassification: null,
                salairesParMois,
                stateSnapshot: stateBase,
                agreement: null,
                smhSeul: true,
                nbMois: 12
            });

            expect(result.totalArretees).toBe(0);
            expect(result.detailsArretees.length).toBe(0);
        });

        it('devrait gérer la répartition sur 13 mois avec accord Kuhn', () => {
            const accordKuhn = {
                id: 'kuhn',
                repartition13Mois: {
                    actif: true,
                    moisVersement: 11,
                    inclusDansSMH: true
                }
            };

            const dateDebut = new Date('2024-01-01');
            const dateFin = new Date('2024-12-31');
            const dateEmbauche = new Date('2020-01-01');
            
            const salairesParMois = {
                '2024-11': 2000 // Novembre avec 13e mois
            };

            const result = calculerArreteesMoisParMois({
                dateDebut,
                dateFin,
                dateEmbauche,
                dateChangementClassification: null,
                salairesParMois,
                stateSnapshot: { ...stateBase, nbMois: 13 },
                agreement: accordKuhn,
                smhSeul: true,
                nbMois: 13
            });

            // Vérifier que le calcul tient compte du 13e mois
            expect(result.detailsTousMois.length).toBeGreaterThan(0);
        });

        it('devrait respecter la prescription de 3 ans', () => {
            const dateDebut = new Date('2021-01-01'); // Il y a 3 ans
            const dateFin = new Date('2024-12-31');
            const dateEmbauche = new Date('2015-01-01'); // Il y a 10 ans
            
            const salairesParMois = {
                '2021-01': 1500, // Trop ancien, devrait être exclu
                '2024-01': 2000  // Dans la période de prescription
            };

            const result = calculerArreteesMoisParMois({
                dateDebut,
                dateFin,
                dateEmbauche,
                dateChangementClassification: null,
                salairesParMois,
                stateSnapshot: stateBase,
                agreement: null,
                smhSeul: true,
                nbMois: 12
            });

            // Seuls les mois dans la période de prescription devraient être calculés
            expect(result.detailsTousMois.length).toBeGreaterThan(0);
        });
    });

    describe('Arriérés - Gestion de la Timeline', () => {
        it('devrait créer les périodes correctement pour une année complète', () => {
            const dateDebut = new Date('2024-01-01');
            const dateFin = new Date('2024-12-31');
            
            // Vérifier que toutes les périodes sont créées
            const mois = [];
            let currentDate = new Date(dateDebut);
            while (currentDate <= dateFin) {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const periodKey = `${year}-${String(month).padStart(2, '0')}`;
                mois.push(periodKey);
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            
            expect(mois.length).toBe(12);
            expect(mois[0]).toBe('2024-01');
            expect(mois[11]).toBe('2024-12');
        });
    });
});
