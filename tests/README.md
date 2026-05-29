# Guide des tests

Tests **Vitest** (unitaires / intégration domaine), **@vue/test-utils** (composants), **Playwright** (E2E sur l’app Vue).

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
└── utils/

e2e/                         # Playwright — app Vue (port 5173)
├── baseline.spec.ts
├── wizard-ui-coverage.spec.ts
├── accord-kuhn.spec.ts
├── remuneration-values.spec.ts
└── helpers/
```

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

`npm ci` → `lint` → `build` (`VITE_BASE=/`) → `test:run` → Playwright.

## Parité chiffrée (fixtures)

**`tests/fixtures/profils-remuneration.json`** alimente les attentes du moteur **`computeAnnualRemunerationFromWizardStores`** dans **`e2e/remuneration-values.spec.ts`** et les invariants sous **`tests/invariants/`**.

## Ajouter un accord — tests utiles

```bash
npm run test:run -- src/domain/agreements
npm run test:run -- tests/unit/stores/agreement.test.ts
npx playwright test e2e/accord-kuhn.spec.ts
```

## Documentation

- Architecture : **`README_TECHNIQUE.md`**
- Matrice migration : **`docs/PARITE_MATRIX.md`**
- Déploiement : **`docs/DEPLOIEMENT_PAGES.md`**
