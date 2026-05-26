import { describe, it, expect } from 'vitest';
import { normalizePrimeSelectionState } from '../../src/ui/PrimeDependencies.js';

describe('PrimeDependencies - normalizePrimeSelectionState', () => {
    const defsByKey = {
        parentA: { requiresKeys: [], nonCumulAvec: [] },
        childB: { requiresKeys: ['parentA'], nonCumulAvec: [] },
        conflictC: { requiresKeys: [], nonCumulAvec: ['childB'] }
    };

    it('active une dépendance requise', () => {
        const result = normalizePrimeSelectionState({}, defsByKey, 'childB', true);
        expect(result.nextInputs.childB).toBe(true);
        expect(result.nextInputs.parentA).toBe(true);
        expect(result.changes.activated).toContain('parentA');
    });

    it('désactive en cascade les dépendants si le parent est retiré', () => {
        const initial = { parentA: true, childB: true };
        const result = normalizePrimeSelectionState(initial, defsByKey, 'parentA', false);
        expect(result.nextInputs.parentA).toBe(false);
        expect(result.nextInputs.childB).toBe(false);
        expect(result.changes.deactivated).toContain('childB');
    });

    it('applique les règles de non-cumul', () => {
        const initial = { childB: true, parentA: true, conflictC: false };
        const result = normalizePrimeSelectionState(initial, defsByKey, 'conflictC', true);
        expect(result.nextInputs.conflictC).toBe(true);
        expect(result.nextInputs.childB).toBe(false);
    });
});
