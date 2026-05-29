# Migration JS → Vue 3 / TS — synthèse de clôture technique

Document **indicatif** : état du dépôt après consolidation passe 1. **Code actif = `src/`** (Vue 3, Pinia, domaine TS). Détail ligne à ligne : **`docs/PARITE_MATRIX.md`**.

## Périmètre considéré comme « porté »

- **Moteur** : `src/domain/remuneration/**`, convention, classification, arriérés, accords (`src/accords/`, `registry`, `accord-element-defs`, etc.).
- **UI wizard** : `src/features/wizard/**`, `SimulatorLayout`, résultats, options accord, PDF / Word / flux post-PDF (`PostPdfFlow.vue`, `CelebrationOverlay.vue`).
- **Arriérés (Vue)** : frise `useTimeline.ts` + dû mensuel accord (`mensuelDue.ts`), saisie `FloatingBlock` / `SalaryModal`, courbe `SalaryCurveView.vue`.
- **PDF annexe arriérés** : `usePdfGeneration.ts` + `domain/pdf/jsPdfHelpers.ts` (jspdf-autotable **v5** : `autoTable(doc, options)`, pas `doc.autoTable` après import ESM).
- **Stores** : `src/stores/*.ts` avec tests **`tests/unit/stores/*.test.ts`** et correctif **`resetAll`** (réinitialisation explicite des stores + `sessionStorage`).
- **Qualification** : E2E Playwright (`baseline`, `wizard-ui-coverage`, `a11y-wizard`, `remuneration-values`, …), Vitest composants **`tests/components/*.spec.ts`**.

## Preuves (commandes)

| Domaine         | Commande / artefact                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Vitest (global) | `npm run test:run`                                                                                    |
| Parité chiffrée | `tests/fixtures/profils-remuneration.json` + `e2e/remuneration-values.spec.ts`, `tests/invariants/**` |
| E2E Vue (CI)    | `npm run e2e` (voir **`playwright.config.ts`**, `webServer` Vite 5173 ; `CI=true` en runner)          |
| Accessibilité   | `npx playwright test e2e/a11y-wizard.spec.ts`                                                         |
| Lint + build    | **`npm run lint`**, **`npm run build`** (`VITE_BASE=/` dans le workflow CI et le déploiement Pages)   |

## Déploiement

- **GitHub Pages** : **`.github/workflows/deploy.yml`** — build Vue avec **`VITE_BASE=/`**, publication du contenu de **`dist/`** à la racine du site. Voir **`docs/DEPLOIEMENT_PAGES.md`**.

### Bascule « v2 » → racine (production)

- L’URL officielle du simulateur est la **racine** du domaine.
- Le dépôt ne contient plus l’archive JavaScript historique : le moteur de référence est **`src/domain/`** (tests **`npm run test:run`**, E2E **`npm run e2e`**).

## Hors périmètre / différé (documenté ailleurs)

| Sujet                                            | Référence                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Passe 2 uniformisation L1–L5 sur toutes surfaces | **`docs/LACUNES_UI_CIBLES.md`**, **`docs/GATE_PASSE2.md`**, ligne **D7.02** matrice |

## Fichiers clés de traçabilité

- **`docs/PARITE_MATRIX.md`** — statuts D1–D7 et jalons J0–J10
- **`docs/GATE_PASSE2.md`** — conditions avant passe 2
- **`tests/README.md`** — cartographie tests + CI
- **`.github/workflows/ci.yml`** — CI pull request / `main`

---

_Pour toute évolution CCNM / accord : ne pas confondre ce document avec une analyse juridique ; utiliser les sources primaires et les agents métier prévus dans `.cursor/`._
