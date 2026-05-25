/**
 * Normalise l'état des sélections de primes selon les dépendances (`requiresKeys`)
 * et incompatibilités (`nonCumulAvec`).
 *
 * Règles:
 * - Si une prime active requiert une autre prime, la dépendance est activée.
 * - Si une prime est désactivée, toutes les primes qui en dépendent sont désactivées (cascade).
 * - En cas de non-cumul, la prime activée garde priorité sur ses conflits.
 *
 * @param {Object} inputs - Etat courant (map stateKeyActif -> bool)
 * @param {Object} defsByKey - Définitions indexées par stateKeyActif
 * @param {string} changedKey - Clé modifiée par l'utilisateur
 * @param {boolean} isChecked - Nouvelle valeur de la clé modifiée
 * @returns {{ nextInputs: Object, changes: { activated: string[], deactivated: string[] } }}
 */
export function normalizePrimeSelectionState(inputs, defsByKey, changedKey, isChecked) {
    const nextInputs = { ...(inputs || {}) };
    const byKey = defsByKey && typeof defsByKey === 'object' ? defsByKey : {};
    const activated = [];
    const deactivated = [];

    if (changedKey) {
        nextInputs[changedKey] = isChecked === true;
    }
    const blockedActivationKeys = new Set();
    if (changedKey && isChecked !== true) {
        blockedActivationKeys.add(changedKey);
    }

    const setState = (key, value) => {
        if (!key) return false;
        const boolValue = value === true;
        if (nextInputs[key] === boolValue) return false;
        nextInputs[key] = boolValue;
        if (boolValue) activated.push(key);
        else deactivated.push(key);
        return true;
    };

    let changed = true;
    let guard = 0;
    while (changed && guard < 20) {
        changed = false;
        guard += 1;

        // Passe 1 : activation des dépendances + résolution non-cumul.
        for (const [key, def] of Object.entries(byKey)) {
            const isActive = nextInputs[key] === true;
            const requires = Array.isArray(def?.requiresKeys) ? def.requiresKeys : [];
            const nonCumulAvec = Array.isArray(def?.nonCumulAvec) ? def.nonCumulAvec : [];

            if (isActive) {
                for (const req of requires) {
                    if (blockedActivationKeys.has(req)) continue;
                    if (setState(req, true)) changed = true;
                }
                for (const conflict of nonCumulAvec) {
                    if (setState(conflict, false)) changed = true;
                }
            }
        }

        // Passe 2 : désactivation en cascade des dépendants dont un parent requis est absent.
        for (const [childKey, childDef] of Object.entries(byKey)) {
            if (nextInputs[childKey] !== true) continue;
            const childRequires = Array.isArray(childDef?.requiresKeys) ? childDef.requiresKeys : [];
            const missingRequired = childRequires.some((reqKey) => nextInputs[reqKey] !== true);
            if (missingRequired && setState(childKey, false)) changed = true;
        }
    }

    return {
        nextInputs,
        changes: {
            activated,
            deactivated
        }
    };
}
