/**
 * Tests unitaires pour AgreementLoader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    loadAgreement,
    getActiveAgreement,
    hasActiveAgreement,
    resetActiveAgreement,
    loadAgreementFromURL,
    getAvailableAgreements
} from '../../src/agreements/AgreementLoader.js';
import { getAgreement } from '../../src/agreements/AgreementRegistry.js';

describe('AgreementLoader', () => {
    beforeEach(() => {
        resetActiveAgreement();
    });

    describe('loadAgreement', () => {
        it('devrait charger l\'accord Kuhn par son ID', () => {
            const agreement = loadAgreement('kuhn');
            expect(agreement).toBeDefined();
            expect(agreement.id).toBe('kuhn');
        });

        it('devrait retourner null pour un ID inexistant', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const agreement = loadAgreement('inexistant');
            expect(agreement).toBeNull();
            spy.mockRestore();
        });

        it('devrait définir l\'accord comme actif après chargement', () => {
            loadAgreement('kuhn');
            expect(hasActiveAgreement()).toBe(true);
            expect(getActiveAgreement()?.id).toBe('kuhn');
        });
    });

    describe('getActiveAgreement', () => {
        it('devrait retourner null si aucun accord actif', () => {
            expect(getActiveAgreement()).toBeNull();
        });

        it('devrait retourner l\'accord actif après chargement', () => {
            loadAgreement('kuhn');
            const active = getActiveAgreement();
            expect(active).toBeDefined();
            expect(active.id).toBe('kuhn');
        });
    });

    describe('hasActiveAgreement', () => {
        it('devrait retourner false si aucun accord actif', () => {
            expect(hasActiveAgreement()).toBe(false);
        });

        it('devrait retourner true après chargement d\'un accord', () => {
            loadAgreement('kuhn');
            expect(hasActiveAgreement()).toBe(true);
        });
    });

    describe('resetActiveAgreement', () => {
        it('devrait réinitialiser l\'accord actif', () => {
            loadAgreement('kuhn');
            expect(hasActiveAgreement()).toBe(true);
            
            resetActiveAgreement();
            expect(hasActiveAgreement()).toBe(false);
            expect(getActiveAgreement()).toBeNull();
        });
    });

    describe('loadAgreementFromURL', () => {
        it('devrait charger l\'accord depuis les paramètres URL', () => {
            const urlParams = new URLSearchParams('?accord=kuhn');
            const agreement = loadAgreementFromURL(urlParams);
            
            expect(agreement).toBeDefined();
            expect(agreement.id).toBe('kuhn');
        });

        it('devrait retourner null si pas de paramètre accord', () => {
            const urlParams = new URLSearchParams('');
            const agreement = loadAgreementFromURL(urlParams);
            
            expect(agreement).toBeNull();
        });
    });

    describe('getAvailableAgreements', () => {
        it('devrait retourner la liste des accords disponibles', () => {
            const agreements = getAvailableAgreements();
            
            expect(Array.isArray(agreements)).toBe(true);
            expect(agreements.length).toBeGreaterThan(0);
            expect(agreements.some(a => a.id === 'kuhn')).toBe(true);
        });

        it('devrait retourner les informations essentielles de chaque accord', () => {
            const agreements = getAvailableAgreements();
            const kuhn = agreements.find(a => a.id === 'kuhn');
            
            expect(kuhn).toBeDefined();
            expect(kuhn).toHaveProperty('id');
            expect(kuhn).toHaveProperty('nom');
            expect(kuhn).toHaveProperty('nomCourt');
            expect(kuhn).toHaveProperty('url');
        });
    });
});
