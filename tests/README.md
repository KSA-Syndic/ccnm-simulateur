# Guide des tests

Ce dépôt combine des tests **Vitest** (unitaires et d'intégration), des tests **par propriétés** (fast-check), et des tests **E2E Playwright**.

## Structure

```
tests/
├── setup.js
├── unit/stores/              # Pinia (wizard, situation, agreement, arretees, ui)
├── components/               # @vue/test-utils (étapes, tooltips, header…)
├── composables/
│   └── useTimeline.test.ts
├── domain/
│   ├── arretees/             # mensuelDue Kuhn, agrégats
│   ├── pdf/                  # jsPdfHelpers, syndicatMail
│   ├── hints/                # buildSmhAssietteHintBlocks
│   ├── remuneration/         # barèmes 2026, formules, registre modalités
│   ├── evolution/, legal/, convention/, tooltip/, ui/, utils/, input/
│   └── features/arretees/    # chartPointCoords
├── fixtures/
│   └── profils-remuneration.json
├── invariants/
│   └── remuneration-sanity.test.ts
├── parity/
│   ├── remuneration-oracle.test.ts
│   └── remunerationParityHelpers.ts
├── utils/
│   └── url-params.test.ts
└── integration/
    └── wizard.test.js

src/domain/**/__tests__/       # moteur (engine, smh, builders, agreements…)
legacy-archive/tests/**        # oracle JS (import Vitest racine)

e2e/
├── baseline.spec.ts          # smoke + 14 captures d’écran
├── wizard-helpers.ts
├── wizard-ui-coverage.spec.ts # P5.2 : situation / header accord / footer / hints / évolution / carrousel / export PDF
├── remuneration-values.spec.ts
├── dom-critical-elements.spec.ts
├── accord-kuhn.spec.ts
├── tooltips.spec.ts
├── arretees-curve.spec.ts
├── a11y-wizard.spec.ts       # P5.5 : axe-core sur les 4 étapes (hors contraste couleur)
├── parite-visuelle.spec.ts   # dual : sondes HTTP (opt-in)
├── parite-visuelle-pixels.spec.ts # D6.04 : 12 comparaisons pixel legacy vs Vue (opt-in)
├── legacy-parity-nav.ts
└── helpers/
    └── comparePng.ts         # pixelmatch
```

## Exécution

### Dépendances

```bash
npm install
```

### Tests unitaires et d'intégration (Vitest)

```bash
npm run test:run    # une passe (CI, scripts)
npm test            # mode watch
npm run test:ui     # interface Vitest
npm run test:coverage
```

### Test d'un fichier précis

```bash
npm run test:run -- src/domain/remuneration/__tests__/engine.test.ts
npm run test:run -- tests/integration/wizard.test.js
```

### Tests E2E (Playwright)

```bash
npm run e2e
```

Fichiers principaux : **`e2e/baseline.spec.ts`** (smoke + **14** captures `toHaveScreenshot`), **`e2e/wizard-ui-coverage.spec.ts`** (étapes 2–4 : modalités, en-tête accord URL, pied de page, hints, graphique évolution, carrousel juridique, modale export PDF), **`e2e/a11y-wizard.spec.ts`** (violations axe `critical` / `serious`, règle `color-contrast` désactivée), **`e2e/remuneration-values.spec.ts`**, **`e2e/dom-critical-elements.spec.ts`**, **`e2e/accord-kuhn.spec.ts`**, **`e2e/tooltips.spec.ts`**, **`e2e/arretees-curve.spec.ts`**.

#### CI GitHub Actions

- Fichier **`.github/workflows/ci.yml`** : sur chaque PR / push `main` → `npm ci`, **`npm run lint`**, **`npm run build`** (avec `VITE_BASE` Pages), **`npm run test:run`**, puis **Playwright** (Chromium installé dans le job ; `CI=true` pour forcer un `webServer` Vite propre, sans réutiliser un serveur local — le port **5173** doit être libre dans le runner).
- **Parité dual serveurs** : job **`dual-parity`** (label PR `dual-parity` ou _workflow_dispatch_) lance **`DUAL_PARITE_E2E=1 npm run e2e:parite-dual`** (équivalent local après `npm run dual` : **`npm run dual:parity`**, définit `DUAL_PARITE_E2E=1` via `cross-env`) : sondes **`e2e/parite-visuelle.spec.ts`** (dont `GET …/legacy-archive/index.html`) + **12 comparaisons pixel** legacy vs Vue **`e2e/parite-visuelle-pixels.spec.ts`** (`pixelmatch`, bandes en-tête + corps). Seuil global : variable **`PW_PARITE_MAX_DIFF_RATIO`** (défaut **0,82**). Le `webServer` Playwright est désactivé quand `DUAL_PARITE_E2E=1` pour libérer le port 5173.

#### Parité dual en local

1. **`npm run dual`** (Vue **5173** + static legacy **5174** via `serve .`).
2. Dans un second terminal : **`npm run dual:parity`** (`cross-env` définit `DUAL_PARITE_E2E=1` pour activer les sondes + **12** comparaisons pixel).
   - Alternative manuelle : `npm run legacy` + `npx vite --port 5173 --strictPort`, puis `DUAL_PARITE_E2E=1 npm run e2e:parite-dual` (PowerShell : `$env:DUAL_PARITE_E2E='1'; npm run e2e:parite-dual`).
   - Optionnel : `PW_PARITE_MAX_DIFF_RATIO=0.75` pour un contrôle plus strict des différences visuelles.

### Parité chiffrée (Vitest)

- **`tests/parity/remuneration-oracle.test.ts`** : pour chaque entrée de **`tests/fixtures/profils-remuneration.json`**, comparaison oracle legacy (`calculateAnnualRemuneration` avec accord **`getAgreement`** si `accordActif` + `accordId`) et moteur domaine (`wizardStoresInputFromLegacyState` → `computeAnnualRemunerationFromWizardStores`), puis **montants agrégés par `semanticId`** (hors ligne `isBase`) et **lissage 12 / 13 mois** via `aggregateRemunerationDetails`.
- **`tests/parity/remunerationParityHelpers.ts`** : construction des cartes `semanticId → montant` pour l’assertion ligne à ligne (somme si plusieurs lignes legacy, ex. ancienneté SMH incluse / exclue).
- **`tests/invariants/remuneration-sanity.test.ts`** : bornes / cohérence mensuelle sur l’oracle.

Les captures **`baseline.spec.ts`** couvrent notamment : étapes 1–4 (variantes groupe C, estimation, cadre F forfait jours, résultat 12/13 mois, arriérés avec courbe), plus l’en-tête.

## Types de tests

### Vitest (unitaires / intégration)

- **Moteur de rémunération** : `computeElement`, `resolveBySubstitution`, `buildComputeContext`, `aggregateRemunerationDetails`
- **Classification** : critères → groupe / classe
- **Stores Pinia** : `tests/unit/stores/*.test.ts` (`createFreshPinia` + `pinia-plugin-persistedstate`, pas de collision d’`activePinia` entre fichiers)
- **Composants Vue** : `tests/components/*.spec.ts` (`@vue/test-utils` + Pinia quand nécessaire ; stubs ciblés : `AppTooltip`, `HourlyPrimesList`, `PrivacyModal`)
- **Wizard** : parcours DOM (jsdom)

### Tests par propriétés (fast-check)

Fichier **`src/domain/remuneration/__tests__/engine.property.test.ts`** : invariantes sur le moteur de rémunération paramétrique (génération de données aléatoires contraintes, propriétés à vérifier sur les sorties).

### E2E Playwright

Parcours réels dans le navigateur, principalement **snapshots** pour détecter les régressions d'interface sur l'app Vue déployée ou servie en preview.

### Accord factice pour le domaine

Pour tester le moteur sans dépendre d'un accord d'entreprise réel, utiliser **`createMockAgreement`** depuis **`src/domain/agreements/__tests__/mock-agreement.ts`** (objet **`Agreement`** complet et minimal).

## Ajouter des tests

### Exemple Vitest (TypeScript)

```typescript
import { describe, it, expect } from 'vitest';
import { maFonction } from '../mon-module';

describe('MonModule', () => {
  it('devrait …', () => {
    expect(maFonction()).toBe(valeurAttendue);
  });
});
```

### Bonnes pratiques

1. **Un test = une intention principale** claire
2. **Noms explicites** (comportement attendu)
3. **Isolation** : pas de dépendance entre tests
4. **Données réalistes** pour les cas métallurgie lorsque c'est pertinent
5. Après changement du **moteur** ou des **formules** : **`npm run test:run`** obligatoire ; viser aussi un passage **`npm run e2e`** avant release

## Débogage

```bash
npm run test:run -- --reporter=verbose src/domain/remuneration/__tests__/engine.test.ts
```

Ou `console.log` / breakpoints sous Vitest / Playwright selon l'outil utilisé.
