# GATE — Passe 2 (uniformisation sémantique)

Conditions **avant** d’appliquer massivement `docs/LACUNES_UI_CIBLES.md` et les changements de libellés/jargon :

1. **`docs/PARITE_MATRIX.md`** : lignes **D1–D6** en `completed` (sauf `deferred` justifié).
2. **Vitest** : `npm run test:run` — 100 % vert sur **`src/**`** et **`tests/**`** (sans exiger `legacy-archive/` si vous l’avez retiré de `vitest.config.js`).
3. **E2E Vue** :
   - CI **`.github/workflows/ci.yml`** : `npm run e2e` (Playwright + Vite 5173) ;
   - en local : `npm run e2e`.
4. **Parité dual** (`npm run dual`, `dual:parity`, job `dual-parity`) : **optionnelle** — utile tant que `legacy-archive/` existe ; **non bloquante** pour cette gate.
5. **Revue humaine** : échantillon PDF, arriérés, accord Kuhn (`src/accords/kuhn.ts`).

Tant que la gate n’est pas validée :

- Ne pas traiter L1–L5 comme obligatoires sur toutes les surfaces (PDF détaillé ligne à ligne, etc.).
- La suppression de **`legacy-archive/`** est un choix ops indépendant : documenter dans `vitest.config.js` et `tests/parity/` si vous retirez l’oracle chiffré.
