import { describe, it, expect } from 'vitest';
import { getConventionPrimeDefs } from '../../src/convention/ConventionCatalog.js';
import { SEMANTIC_ID } from '../../src/core/RemunerationTypes.js';

describe('ConventionCatalog - modalités nationales génériques', () => {
    it('expose les primes/majorations nationales avec semanticId attendus', () => {
        const defs = getConventionPrimeDefs();
        const semanticIds = defs.map(d => d.semanticId);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE);
        expect(semanticIds).toContain(SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_PANIER_NUIT);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE);
        expect(semanticIds).toContain(SEMANTIC_ID.PRIME_DEPLACEMENT_PRO);
    });

    it('porte les métadonnées juridiques minimales sur les modalités nationales', () => {
        const defs = getConventionPrimeDefs();
        const astreinte = defs.find(d => d.semanticId === SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE);
        const habillage = defs.find(d => d.semanticId === SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE);
        const deplacement = defs.find(d => d.semanticId === SEMANTIC_ID.PRIME_DEPLACEMENT_PRO);
        expect(astreinte?.config?.sourceArticle).toContain('L3121-9');
        expect(habillage?.config?.sourceArticle).toContain('L3121-3');
        expect(deplacement?.config?.sourceArticle).toContain('L3121-4');
    });
});
