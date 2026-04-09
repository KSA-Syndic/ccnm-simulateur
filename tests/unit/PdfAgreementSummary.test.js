/**
 * Résumé « accord » pour PDF : texte lisible, pas de dump JSON / clés state.
 */
import { describe, it, expect } from 'vitest';
import { buildAgreementSummaryRows } from '../../src/arretees/PDFGenerator.js';
import { KuhnAgreement } from '../../accords/KuhnAgreement.js';

describe('buildAgreementSummaryRows (PDF accord)', () => {
    it('ne doit pas exposer de clés techniques type stateKey ou chemins JS', () => {
        const state = {
            accordInputs: {
                travailEquipe: true,
                heuresEquipe: 151.67,
                primeVacances: true,
                majorationNuitPosteMatin: false,
                heuresMajorationNuitPosteMatin: 0
            }
        };
        const rows = buildAgreementSummaryRows(KuhnAgreement, state);
        const flat = rows.map((r) => r.join(' ')).join('\n');
        expect(flat).toContain('Prime de vacances');
        expect(flat).toContain('Valeur fixée par l\'accord');
        expect(flat).not.toMatch(/stateKeyActif|stateKeyHeures|primes\[\d+\]|\.valueType\b/);
    });

    it('doit inclure identification et 13e mois en langage courant', () => {
        const rows = buildAgreementSummaryRows(KuhnAgreement, { accordInputs: {} });
        const flat = rows.map((r) => r.join(' ')).join('\n');
        expect(flat).toMatch(/13e mois|douzièmes/i);
        expect(flat).toContain('UES KUHN');
        expect(flat).toContain('Référence dans le simulateur : kuhn');
    });
});
