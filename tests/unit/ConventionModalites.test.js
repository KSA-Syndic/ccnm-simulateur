import { describe, it, expect } from 'vitest';
import {
    getConventionPrimeDefs,
    isModaliteVisiblePourProfil,
    UI_VISIBLE_MODALITE
} from '../../src/convention/ConventionCatalog.js';
import { SEMANTIC_ID } from '../../src/core/RemunerationTypes.js';

describe('ConventionCatalog - modalités nationales génériques', () => {
    it('expose les primes/majorations nationales avec semanticId attendus', () => {
        const defs = getConventionPrimeDefs();
        const semanticIds = defs.map(d => d.semanticId);
        expect(semanticIds).toContain(SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_PANIER_NUIT);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_DEPLACEMENT_PRO);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_INVENTION_BREVETABLE);
    });

    it('porte les métadonnées juridiques minimales sur les modalités nationales', () => {
        const defs = getConventionPrimeDefs();
        const interventionAstreinte = defs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE);
        const habillage = defs.find(d => d.semanticId === SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE);
        const deplacement = defs.find(d => d.semanticId === SEMANTIC_ID.PRIME_DEPLACEMENT_PRO);
        expect(interventionAstreinte?.config?.sourceArticle).toContain('L3121-9');
        expect(habillage?.config?.sourceArticle).toContain('L3121-3');
        expect(deplacement?.config?.sourceArticle).toContain('L3121-4');
    });

    it('masque les astreintes en comptage horaire pour le cadre au forfait-jours, pas les autres modalités', () => {
        const defs = getConventionPrimeDefs();
        const intervention = defs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE);
        const panier = defs.find(d => d.semanticId === SEMANTIC_ID.PRIME_PANIER_NUIT);
        expect(intervention?.config?.uiVisibleQuand).toBe(UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL);
        expect(panier?.config?.uiVisibleQuand).toBe(UI_VISIBLE_MODALITE.TOUJOURS);

        expect(isModaliteVisiblePourProfil(intervention?.config?.uiVisibleQuand, { isCadre: true, forfait: 'jours' })).toBe(false);
        expect(isModaliteVisiblePourProfil(intervention?.config?.uiVisibleQuand, { isCadre: true, forfait: 'heures' })).toBe(true);
        expect(isModaliteVisiblePourProfil(intervention?.config?.uiVisibleQuand, { isCadre: false, forfait: '35h' })).toBe(true);
        expect(isModaliteVisiblePourProfil(panier?.config?.uiVisibleQuand, { isCadre: true, forfait: 'jours' })).toBe(true);
    });
});
