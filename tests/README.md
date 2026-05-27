# Guide des tests

Tests **Vitest** (unitaires / intégration domaine), **@vue/test-utils** (composants), **Playwright** (E2E sur l’app Vue).

> **`legacy-archive/tests/**`** : oracle JS **optionnel** (voir `vitest.config.js`). L’app Vue se valide avec **`src/**`** + **`tests/**`\*\* seuls.

## Structure (référence)

```
src/domain/**/__tests__/     # moteur (engine, smh, agreements, pdf, hints…)
src/domain/**/*.test.ts      # colocalisés (ex. tooltip/builders.test.ts)

tests/
├── setup.js
├── unit/stores/             # Pinia
├── components/              # Vue SFC
├── composables/
├── domain/                  # suites miroir domaine
├── fixtures/
│   └── profils-remuneration.json
├── invariants/
├── parity/                  # optionnel : compare legacy vs TS si archive présente
└── utils/

e2e/                         # Playwright — app Vue (port 5173)
├── baseline.spec.ts
├── wizard-ui-coverage.spec.ts
├── accord-kuhn.spec.ts
├── parite-visuelle*.spec.ts # opt-in : nécessite legacy-archive + dual
└── helpers/
```

Les fichiers `tests/integration/*.test.js` à la racine ne sont **pas** exécutés par Vitest (préférer `tests/domain/` et `legacy-archive/tests/integration/` si oracle conservé).

## Exécution

```bash
npm install
npm run test:run    # CI
npm test            # watch
npm run e2e         # Playwright Vue
npm run lint
npm run build
```

### Fichier précis

```bash
npm run test:run -- src/domain/remuneration/__tests__/engine.test.ts
npm run test:run -- tests/unit/stores/agreement.test.ts
```

## E2E Playwright (Vue)

`npm run e2e` — `playwright.config.ts` démarre Vite sur **5173** (`CI=true` en runner).

Principaux specs : `baseline`, `wizard-ui-coverage`, `a11y-wizard`, `remuneration-values`, `accord-kuhn`, `arretees-curve`, `tooltips`.

### CI (`.github/workflows/ci.yml`)

`npm ci` → `lint` → `build` → `test:run` → Playwright.

Job **`dual-parity`** (label PR ou manuel) : **optionnel**, `DUAL_PARITE_E2E=1` + `legacy-archive/` servi en 5174 — voir `docs/LEGACY_RUN.md`.

## Parité chiffrée (optionnelle)

**`tests/parity/remuneration-oracle.test.ts`** : compare le calculateur JS (`legacy-archive/`) au moteur `computeAnnualRemunerationFromWizardStores` pour les profils de **`tests/fixtures/profils-remuneration.json`**.

Supprimable avec `legacy-archive/` : retirer ce fichier ou le remplacer par des snapshots de montants figés.

## Ajouter un accord — tests utiles

```bash
npm run test:run -- src/domain/agreements
npm run test:run -- tests/unit/stores/agreement.test.ts
npx playwright test e2e/accord-kuhn.spec.ts
```

## Documentation

- Architecture : **`README_TECHNIQUE.md`**
- Matrice migration : **`docs/PARITE_MATRIX.md`**
- Oracle JS : **`docs/LEGACY_RUN.md`**
