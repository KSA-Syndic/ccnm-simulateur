# Migration JS → Vue 3 / TS — synthèse de clôture technique

Document **indicatif** (non contractuel juridiquement) : il résume l’état du dépôt au moment de la consolidation P5–P6 et les **preuves** reproductibles pour audit interne. Pour la hiérarchie des tâches et le statut ligne à ligne, la source de vérité reste **`docs/PARITE_MATRIX.md`**.

## Périmètre considéré comme « porté »

- **Moteur** : `src/domain/remuneration/**`, convention, classification, arriérés, accords (`src/accords/`, `registry`, `accord-element-defs`, etc.).
- **UI wizard** : `src/features/wizard/**`, `SimulatorLayout`, résultats, options accord, PDF / Word / flux post-PDF (`PostPdfFlow.vue`, `CelebrationOverlay.vue`).
- **Arriérés (Vue)** : frise `useTimeline.ts` + dû mensuel accord (`mensuelDue.ts`), saisie `FloatingBlock` / `SalaryModal`, courbe `SalaryCurveView.vue`.
- **PDF annexe arriérés** : `usePdfGeneration.ts` + `domain/pdf/jsPdfHelpers.ts` (jspdf-autotable **v5** : `autoTable(doc, options)`, pas `doc.autoTable` après import ESM).
- **Stores** : `src/stores/*.ts` avec tests **`tests/unit/stores/*.test.ts`** et correctif **`resetAll`** (réinitialisation explicite des stores + `sessionStorage`).
- **Qualification** : E2E Playwright (dont `baseline`, `wizard-ui-coverage`, `a11y-wizard`, valeurs vs oracle), tests composants **`tests/components/*.spec.ts`**, parité pixel dual **`e2e/parite-visuelle-pixels.spec.ts`** (12 comparaisons, seuil pilotable).

## Preuves (commandes)

| Domaine                   | Commande / artefact                                                                                                                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest (global)           | `npm run test:run`                                                                                                                                                                                                                                                                      |
| Parité chiffrée           | `tests/parity/remuneration-oracle.test.ts` + `tests/fixtures/profils-remuneration.json`                                                                                                                                                                                                 |
| E2E Vue (CI)              | `npm run e2e` (voir **`playwright.config.ts`**, `webServer` Vite 5173 ; `CI=true` en runner)                                                                                                                                                                                            |
| Accessibilité             | `npx playwright test e2e/a11y-wizard.spec.ts`                                                                                                                                                                                                                                           |
| Dual serveurs (optionnel) | **`npm run dual`** puis **`npm run dual:parity`** (Playwright avec `DUAL_PARITE_E2E=1` via `cross-env`) : sondes HTTP + **12 comparaisons pixel** `e2e/parite-visuelle-pixels.spec.ts`, seuil `PW_PARITE_MAX_DIFF_RATIO` ; ou job **`dual-parity`** dans **`.github/workflows/ci.yml`** |
| Lint + build (CI)         | **`npm run lint`**, **`npm run build`** (avec `VITE_BASE` Pages dans le workflow CI)                                                                                                                                                                                                    |

## Déploiement

- **GitHub Pages** : **`.github/workflows/deploy.yml`** — `main` → legacy à la racine ; **`experiment/vue-migration-3`** → Vue sous **`/v2/`** (voir **`docs/DEPLOIEMENT_PAGES.md`**).

## Hors périmètre / différé (documenté ailleurs)

| Sujet                                                             | Référence                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Retrait complet de l’oracle fichier (supprimer `legacy-archive/`) | Remplacement par snapshots figés ou autre stratégie — **hors scope** tant que la parité Vitest dépend du calculateur JS. |
| Passe 2 uniformisation L1–L5 sur toutes surfaces                  | **`docs/LACUNES_UI_CIBLES.md`**, **`docs/GATE_PASSE2.md`**, ligne **D7.02** matrice                                      |

## Fichiers clés de traçabilité

- **`docs/PARITE_MATRIX.md`** — statuts D1–D7 et jalons J0–J10
- **`docs/GATE_PASSE2.md`** — conditions avant passe 2
- **`tests/README.md`** — cartographie tests + CI
- **`.github/workflows/ci.yml`** — CI pull request / `main`

---

_Pour toute évolution CCNM / accord : ne pas confondre ce document avec une analyse juridique ; utiliser les sources primaires et les agents métier prévus dans `.cursor/`._
