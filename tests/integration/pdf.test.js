/**
 * Tests fonctionnels pour la génération PDF
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { genererPDFArretees, genererPDFAnnexeTechnique } from '../../src/arretees/PDFGenerator.js';
import { CONFIG } from '../../src/core/config.js';
import { getMontantAnnuelSMHSeul } from '../../src/remuneration/RemunerationCalculator.js';

describe('PDF - Génération', () => {
    beforeEach(() => {
        // Mock jsPDF
        global.jsPDF = vi.fn().mockImplementation(() => ({
            internal: {
                pageSize: {
                    getWidth: () => 210,
                    getHeight: () => 297
                },
                getNumberOfPages: () => 1
            },
            setFontSize: vi.fn().mockReturnThis(),
            setFont: vi.fn().mockReturnThis(),
            setTextColor: vi.fn().mockReturnThis(),
            text: vi.fn().mockReturnThis(),
            line: vi.fn().mockReturnThis(),
            addPage: vi.fn().mockReturnThis(),
            splitTextToSize: vi.fn((text) => [text]),
            save: vi.fn(),
            setDrawColor: vi.fn().mockReturnThis(),
            setPage: vi.fn().mockReturnThis()
        }));
    });

    describe('genererPDFArretees', () => {
        it('devrait générer un PDF avec les données de base', () => {
            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => [text]),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis()
            };
            
            global.jsPDF = vi.fn(() => mockDoc);
            global.window = { 
                jsPDF: global.jsPDF,
                jspdf: { jsPDF: global.jsPDF }
            };
            
            const data = {
                dateDebut: new Date('2024-01-01'),
                dateFin: new Date('2024-12-31'),
                dateEmbauche: '2020-01-01',
                salaireDu: CONFIG.SMH[5],
                totalArretees: 1000,
                detailsArretees: [
                    {
                        periode: 'janvier 2024',
                        periodeKey: '2024-01',
                        salaireMensuelReel: 2000,
                        salaireMensuelDu: 2021,
                        difference: 21
                    }
                ],
                detailsTousMois: [],
                ruptureContrat: false,
                accordEcrit: false
            };

            expect(() => {
                genererPDFArretees(data, {}, false);
            }).not.toThrow();
            
            expect(global.jsPDF).toHaveBeenCalled();
        });

        it('devrait utiliser splitTextToSize pour éviter les dépassements', () => {
            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => [text]),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis()
            };
            
            global.jsPDF = vi.fn(() => mockDoc);
            global.window = { 
                jsPDF: global.jsPDF,
                jspdf: { jsPDF: global.jsPDF }
            };
            
            const data = {
                dateDebut: new Date('2024-01-01'),
                dateFin: new Date('2024-12-31'),
                dateEmbauche: '2020-01-01',
                salaireDu: CONFIG.SMH[5],
                totalArretees: 1000,
                detailsArretees: [],
                detailsTousMois: [],
                ruptureContrat: false,
                accordEcrit: false
            };

            const infosPersonnelles = {
                nomPrenom: 'Jean Dupont',
                poste: 'Ouvrier spécialisé',
                employeur: 'Entreprise Test',
                observations: 'Observation très longue qui devrait être découpée en plusieurs lignes pour éviter les dépassements dans le PDF'
            };

            genererPDFArretees(data, infosPersonnelles, false);
            
            // Vérifier que splitTextToSize a été appelé pour les textes longs
            expect(mockDoc.splitTextToSize).toHaveBeenCalled();
        });

        it('devrait générer le PDF lorsque le mode SMH seul est activé', () => {
            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => [text]),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis()
            };

            global.jsPDF = vi.fn(() => mockDoc);
            global.window = {
                jsPDF: global.jsPDF,
                jspdf: { jsPDF: global.jsPDF }
            };

            const data = {
                dateDebut: new Date('2024-01-01'),
                dateFin: new Date('2024-12-31'),
                dateEmbauche: '2020-01-01',
                salaireDu: CONFIG.SMH[5],
                totalArretees: 1000,
                detailsArretees: [],
                detailsTousMois: [],
                ruptureContrat: false,
                accordEcrit: false
            };

            expect(() => {
                genererPDFArretees(data, {}, false);
            }).not.toThrow();
            expect(global.jsPDF).toHaveBeenCalled();
        });

        it('devrait générer le PDF même en mode complet explicite', () => {
            const stateSansSMHSeul = {
                arretesSurSMHSeul: false,
                modeManuel: false,
                groupeManuel: 'A',
                classeManuel: 5,
                scores: [1, 1, 1, 1, 1, 1],
                anciennete: 0,
                pointTerritorial: 5.90,
                forfait: '35h',
                experiencePro: 0,
                accordActif: false,
                nbMois: 12
            };
            const data = {
                dateDebut: new Date('2024-01-01'),
                dateFin: new Date('2024-12-31'),
                dateEmbauche: '2020-01-01',
                salaireDu: CONFIG.SMH[5],
                totalArretees: 1000,
                detailsArretees: [],
                detailsTousMois: [],
                ruptureContrat: false,
                accordEcrit: false
            };

            expect(() => {
                genererPDFArretees(data, {}, false, stateSansSMHSeul);
            }).not.toThrow();
        });

        it('devrait utiliser le barème débutants pour F11 avec 4 ans d\'expérience et forfait jours', () => {
            const autoTableCalls = [];
            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => {
                    // Simuler le découpage pour les textes longs
                    if (text && text.length > 80) {
                        return [text.substring(0, 80), text.substring(80)];
                    }
                    return [text];
                }),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis(),
                autoTable: vi.fn((cfg) => {
                    autoTableCalls.push(cfg);
                    mockDoc.lastAutoTable = { finalY: (cfg.startY || 20) + 10 };
                    return mockDoc;
                }),
                lastAutoTable: { finalY: 30 }
            };
            
            global.jsPDF = vi.fn(() => mockDoc);
            global.window = { 
                jsPDF: global.jsPDF,
                jspdf: { jsPDF: global.jsPDF }
            };
            
            // État F11, forfait jours, 4 ans d'expérience
            const stateF11Debutant = {
                modeManuel: false,
                groupeManuel: 'F',
                classeManuel: 11,
                scores: [7, 7, 6, 6, 6, 6],
                anciennete: 0,
                pointTerritorial: 5.90,
                forfait: 'jours',
                experiencePro: 4,
                typeNuit: 'aucun',
                heuresNuit: 0,
                travailDimanche: false,
                heuresDimanche: 0,
                travailEquipe: false,
                heuresEquipe: 151.67,
                accordActif: false,
                primeVacances: false,
                nbMois: 12,
                arretesSurSMHSeul: true
            };
            
            // Calculer le SMH attendu : barème débutants 4 ans + forfait jours 30%
            const smhBase = CONFIG.BAREME_DEBUTANTS[11][4]; // 31 979
            const forfaitMontant = Math.round(smhBase * 0.30); // +30%
            const smhAttendu = smhBase + forfaitMontant; // 41 572.70
            
            const data = {
                dateDebut: new Date('2024-01-01'),
                dateFin: new Date('2024-12-31'),
                dateEmbauche: '2020-01-01',
                salaireDu: smhAttendu,
                totalArretees: 1000,
                detailsArretees: [],
                detailsTousMois: [],
                ruptureContrat: false,
                accordEcrit: false
            };

            genererPDFArretees(data, {}, false, stateF11Debutant);
            
            // Vérifier que le tableau paramètres contient bien la tranche "4 à 6 ans"
            const allRows = autoTableCalls.map(c => c.body || []).flat();
            const hasBareme = allRows.some(row => Array.isArray(row) && row.join(' ').includes('SMH barème débutants (4 à 6 ans)'));
            expect(hasBareme).toBe(true);
        });

        it('devrait gérer les informations personnelles optionnelles', () => {
            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => [text]),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis()
            };
            
            global.jsPDF = vi.fn(() => mockDoc);
            global.window = { 
                jsPDF: global.jsPDF,
                jspdf: { jsPDF: global.jsPDF }
            };
            
            const data = {
                dateDebut: new Date('2024-01-01'),
                dateFin: new Date('2024-12-31'),
                dateEmbauche: '2020-01-01',
                salaireDu: CONFIG.SMH[5],
                totalArretees: 1000,
                detailsArretees: [],
                detailsTousMois: [],
                ruptureContrat: false,
                accordEcrit: false
            };

            const infosCompletes = {
                nomPrenom: 'Marie Martin',
                poste: 'Technicienne',
                employeur: 'Société ABC',
                matricule: '12345',
                observations: 'Aucune observation particulière'
            };

            expect(() => {
                genererPDFArretees(data, infosCompletes, false);
            }).not.toThrow();
        });

        it('devrait gérer la rupture de contrat', () => {
            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => [text]),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis()
            };
            
            global.jsPDF = vi.fn(() => mockDoc);
            global.window = { 
                jsPDF: global.jsPDF,
                jspdf: { jsPDF: global.jsPDF }
            };
            
            const data = {
                dateDebut: new Date('2024-01-01'),
                dateFin: new Date('2024-06-30'),
                dateEmbauche: '2020-01-01',
                salaireDu: CONFIG.SMH[5],
                totalArretees: 500,
                detailsArretees: [],
                detailsTousMois: [],
                ruptureContrat: true,
                dateRuptureInput: '2024-06-30',
                accordEcrit: false
            };

            expect(() => {
                genererPDFArretees(data, {}, false);
            }).not.toThrow();
        });
    });

    describe('PDF - Structure et Formatage', () => {
        it('doit mentionner la prime d\'équipe CCN active sans accord dans l\'annexe', () => {
            const autoTableCalls = [];
            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => [text]),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis(),
                autoTable: vi.fn((cfg) => {
                    autoTableCalls.push(cfg);
                    mockDoc.lastAutoTable = { finalY: (cfg.startY || 20) + 10 };
                    return mockDoc;
                }),
                lastAutoTable: { finalY: 30 }
            };
            global.window = {
                jsPDF: vi.fn(() => mockDoc),
                jspdf: { jsPDF: vi.fn(() => mockDoc) }
            };

            const stateSansAccord = {
                modeManuel: false,
                groupeManuel: 'C',
                classeManuel: 5,
                scores: [3, 3, 3, 3, 3, 3],
                anciennete: 0,
                pointTerritorial: 5.90,
                forfait: '35h',
                experiencePro: 0,
                typeNuit: 'aucun',
                heuresNuit: 0,
                travailDimanche: false,
                heuresDimanche: 0,
                accordActif: false,
                accordInputs: { travailEquipe: true, heuresEquipe: 151.67 },
                nbMois: 12,
                arretesSurSMHSeul: true
            };
            const data = {
                detailsParAnnee: [],
                detailsTousMois: [],
                totalArretees: 0
            };

            genererPDFAnnexeTechnique(data, {}, stateSansAccord);
            const bodies = autoTableCalls.map(c => c.body || []).flat();
            const hasPrimeEquipeCCN = bodies.some(row => Array.isArray(row) && row.join(' ').includes('Prime d\'équipe conventionnelle'));
            expect(hasPrimeEquipeCCN).toBe(true);
        });

        it('doit afficher le périmètre retenu dans l\'annexe selon le mode', () => {
            const autoTableCalls = [];
            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => [text]),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis(),
                autoTable: vi.fn((cfg) => {
                    autoTableCalls.push(cfg);
                    mockDoc.lastAutoTable = { finalY: (cfg.startY || 20) + 10 };
                    return mockDoc;
                }),
                lastAutoTable: { finalY: 30 }
            };
            global.window = {
                jsPDF: vi.fn(() => mockDoc),
                jspdf: { jsPDF: vi.fn(() => mockDoc) }
            };
            const data = {
                detailsParAnnee: [],
                detailsTousMois: [],
                totalArretees: 0,
                scopeMode: 'full'
            };
            const stateModeComplet = {
                modeManuel: false,
                groupeManuel: 'C',
                classeManuel: 5,
                scores: [3, 3, 3, 3, 3, 3],
                anciennete: 0,
                pointTerritorial: 5.90,
                forfait: '35h',
                experiencePro: 0,
                accordActif: false,
                accordInputs: {},
                nbMois: 12,
                arretesSurSMHSeul: false
            };
            genererPDFAnnexeTechnique(data, {}, stateModeComplet);
            const bodyRows = autoTableCalls.map(c => c.body || []).flat();
            const hasScopeRow = bodyRows.some(row => Array.isArray(row) && row.join(' ').includes('Périmètre retenu'));
            expect(hasScopeRow).toBe(true);
        });

        it('devrait créer les sections principales du PDF', () => {
            const data = {
                dateDebut: new Date('2024-01-01'),
                dateFin: new Date('2024-12-31'),
                dateEmbauche: '2020-01-01',
                salaireDu: CONFIG.SMH[5],
                totalArretees: 1000,
                detailsArretees: [
                    {
                        periode: 'janvier 2024',
                        periodeKey: '2024-01',
                        salaireMensuelReel: 2000,
                        salaireMensuelDu: 2021,
                        difference: 21
                    }
                ],
                detailsTousMois: [],
                ruptureContrat: false,
                accordEcrit: false
            };

            const mockDoc = {
                internal: {
                    pageSize: { getWidth: () => 210, getHeight: () => 297 },
                    getNumberOfPages: () => 1
                },
                setFontSize: vi.fn().mockReturnThis(),
                setFont: vi.fn().mockReturnThis(),
                setTextColor: vi.fn().mockReturnThis(),
                text: vi.fn().mockReturnThis(),
                line: vi.fn().mockReturnThis(),
                addPage: vi.fn().mockReturnThis(),
                splitTextToSize: vi.fn((text) => [text]),
                save: vi.fn(),
                setDrawColor: vi.fn().mockReturnThis(),
                setPage: vi.fn().mockReturnThis()
            };
            
            global.jsPDF = vi.fn(() => mockDoc);
            global.window = {
                jsPDF: global.jsPDF,
                jspdf: { jsPDF: global.jsPDF }
            };
            
            genererPDFArretees(data, {}, false);
            
            // Vérifier que les méthodes de formatage ont été appelées
            expect(mockDoc.setFontSize).toHaveBeenCalled();
            expect(mockDoc.text).toHaveBeenCalled();
        });

        it('devrait formater correctement les montants', () => {
            const montant = 21500;
            // Format attendu : "21 500 €"
            const formatted = montant.toLocaleString('fr-FR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
                useGrouping: true
            }) + ' €';
            
            expect(formatted).toContain('21');
            expect(formatted).toContain('500');
            expect(formatted).toContain('€');
        });

        it('devrait utiliser le bon SMH pour toutes les tranches de barème débutants F11', () => {
            // Tester chaque tranche d'expérience
            const tranches = [
                { experiencePro: 0, expectedSMH: CONFIG.BAREME_DEBUTANTS[11][0], label: '< 2 ans' }, // 28 200
                { experiencePro: 2, expectedSMH: CONFIG.BAREME_DEBUTANTS[11][2], label: '2 à 4 ans' }, // 29 610
                { experiencePro: 4, expectedSMH: CONFIG.BAREME_DEBUTANTS[11][4], label: '4 à 6 ans' }, // 31 979
                { experiencePro: 6, expectedSMH: CONFIG.SMH[11], label: '≥ 6 ans' } // 34 900 (barème standard)
            ];
            
            tranches.forEach(({ experiencePro, expectedSMH, label }) => {
                const mockDoc = {
                    internal: {
                        pageSize: { getWidth: () => 210, getHeight: () => 297 },
                        getNumberOfPages: () => 1
                    },
                    setFontSize: vi.fn().mockReturnThis(),
                    setFont: vi.fn().mockReturnThis(),
                    setTextColor: vi.fn().mockReturnThis(),
                    text: vi.fn().mockReturnThis(),
                    line: vi.fn().mockReturnThis(),
                    addPage: vi.fn().mockReturnThis(),
                    splitTextToSize: vi.fn((text) => {
                        if (text && text.length > 80) {
                            return [text.substring(0, 80), text.substring(80)];
                        }
                        return [text];
                    }),
                    save: vi.fn(),
                    setDrawColor: vi.fn().mockReturnThis(),
                    setPage: vi.fn().mockReturnThis(),
                    autoTable: vi.fn((cfg) => {
                        mockDoc._tables = mockDoc._tables || [];
                        mockDoc._tables.push(cfg);
                        mockDoc.lastAutoTable = { finalY: (cfg.startY || 20) + 10 };
                        return mockDoc;
                    }),
                    lastAutoTable: { finalY: 30 }
                };
                
                global.jsPDF = vi.fn(() => mockDoc);
                global.window = { 
                    jsPDF: global.jsPDF,
                    jspdf: { jsPDF: global.jsPDF }
                };
                
                const stateF11 = {
                    modeManuel: false,
                    groupeManuel: 'F',
                    classeManuel: 11,
                    scores: [7, 7, 6, 6, 6, 6],
                    anciennete: 0,
                    pointTerritorial: 5.90,
                    forfait: '35h',
                    experiencePro: experiencePro,
                    typeNuit: 'aucun',
                    heuresNuit: 0,
                    travailDimanche: false,
                    heuresDimanche: 0,
                    travailEquipe: false,
                    heuresEquipe: 151.67,
                    accordActif: false,
                    primeVacances: false,
                    nbMois: 12,
                    arretesSurSMHSeul: true
                };
                
                const data = {
                    dateDebut: new Date('2024-01-01'),
                    dateFin: new Date('2024-12-31'),
                    dateEmbauche: '2020-01-01',
                    salaireDu: expectedSMH,
                    totalArretees: 0,
                    detailsArretees: [],
                    detailsTousMois: [],
                    ruptureContrat: false,
                    accordEcrit: false
                };

                genererPDFArretees(data, {}, false, stateF11);
                
                // Vérifier que la table "Paramètres de calcul du SMH" contient la bonne tranche/libellé
                const rows = (mockDoc._tables || []).map(t => t.body || []).flat();
                const hasExpectedLabel = rows.some(row => Array.isArray(row) && row.join(' ').includes(label))
                    || (experiencePro >= 6 && rows.some(row => Array.isArray(row) && row.join(' ').includes('SMH annuel grille')));
                expect(hasExpectedLabel).toBe(true);
            });
        });
    });
});
