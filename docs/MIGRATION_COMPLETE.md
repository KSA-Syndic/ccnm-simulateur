# Migration JS → Vue 3 / TS — synthèse de clôture technique

Document **indicatif** : état du dépôt après consolidation passe 1. **Code actif = `src/`** (Vue 3, Pinia, domaine TS). **`legacy-archive/`** n’est plus une spec d’architecture : archive optionnelle supprimable (voir **`docs/LEGACY_RUN.md`**). Détail ligne à ligne : **`docs/PARITE_MATRIX.md`**.

## Périmètre considéré comme « porté »

- **Moteur** : `src/domain/remuneration/**`, convention, classification, arriérés, accords (`src/accords/`, `registry`, `accord-element-defs`, etc.).
- **UI wizard** : `src/features/wizard/**`, `SimulatorLayout`, résultats, options accord, PDF / Word / flux post-PDF (`PostPdfFlow.vue`, `CelebrationOverlay.vue`).
- **Arriérés (Vue)** : frise `useTimeline.ts` + dû mensuel accord (`mensuelDue.ts`), saisie `FloatingBlock` / `SalaryModal`, courbe `SalaryCurveView.vue`.
- **PDF annexe arriérés** : `usePdfGeneration.ts` + `domain/pdf/jsPdfHelpers.ts` (jspdf-autotable **v5** : `autoTable(doc, options)`, pas `doc.autoTable` après import ESM).
- **Stores** : `src/stores/*.ts` avec tests **`tests/unit/stores/*.test.ts`** et correctif **`resetAll`** (réinitialisation explicite des stores + `sessionStorage`).
- **Qualification** : E2E Playwright (`baseline`, `wizard-ui-coverage`, `a11y-wizard`, `remuneration-values`, …), Vitest composants **`tests/components/*.spec.ts`**. Parité dual / pixel : **opt-in** si `legacy-archive/` encore présent.

## Preuves (commandes)

| Domaine                | Commande / artefact                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Vitest (global)        | `npm run test:run`                                                                                                     |
| Parité chiffrée        | `tests/parity/remuneration-oracle.test.ts` + `tests/fixtures/profils-remuneration.json`                                |
| E2E Vue (CI)           | `npm run e2e` (voir **`playwright.config.ts`**, `webServer` Vite 5173 ; `CI=true` en runner)                           |
| Accessibilité          | `npx playwright test e2e/a11y-wizard.spec.ts`                                                                          |
| Dual serveurs (opt-in) | **`npm run dual`** + **`npm run dual:parity`** — nécessite `legacy-archive/` ; non requis pour valider la gate passe 2 |
| Lint + build (CI)      | **`npm run lint`**, **`npm run build`** (avec `VITE_BASE` Pages dans le workflow CI)                                   |

## Déploiement

- **GitHub Pages** : **`.github/workflows/deploy.yml`** — Vue sous **`/v2/`** (branche migration) ; racine peut encore servir l’ancien bundle le temps de la bascule (**`docs/DEPLOIEMENT_PAGES.md`**).

## Hors périmètre / différé (documenté ailleurs)

| Sujet                                            | Référence                                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Suppression de `legacy-archive/`                 | Retirer l’include Vitest + adapter `tests/parity/` ; les tests `src/**` et `tests/**` restent la référence. |
| Passe 2 uniformisation L1–L5 sur toutes surfaces | **`docs/LACUNES_UI_CIBLES.md`**, **`docs/GATE_PASSE2.md`**, ligne **D7.02** matrice                         |

## Fichiers clés de traçabilité

- **`docs/PARITE_MATRIX.md`** — statuts D1–D7 et jalons J0–J10
- **`docs/GATE_PASSE2.md`** — conditions avant passe 2
- **`tests/README.md`** — cartographie tests + CI
- **`.github/workflows/ci.yml`** — CI pull request / `main`

---

_Pour toute évolution CCNM / accord : ne pas confondre ce document avec une analyse juridique ; utiliser les sources primaires et les agents métier prévus dans `.cursor/`._
