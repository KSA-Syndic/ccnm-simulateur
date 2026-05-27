# Matrice de parité — migration JS → Vue 3 / TS

> **Source de vérité** pour l’avancement passe 1 (parité iso) et passe 2 (uniformisation — gated par `docs/GATE_PASSE2.md`).
> Dernière mise à jour : 2026-05-27 — lot arriérés/PDF Vue (jspdf-autotable v5, assiette SMH frise, UI saisie, post-PDF).

## Légende

| Statut        | Signification                                       |
| ------------- | --------------------------------------------------- |
| `completed`   | Port + tests associés verts (ou oracle legacy OK).  |
| `in_progress` | Travail actif / PR ouvert.                          |
| `pending`     | Non démarré ou bloqué par dépendance.               |
| `deferred`    | Volontairement après gate (ex. suppression legacy). |

---

## D1 — Utils & socle monétaire

| ID    | Périmètre legacy                         | Cible Vue / TS                            | Preuve / tests                                                          | Statut      |
| ----- | ---------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- | ----------- |
| D1.01 | `legacy-archive/utils/rounding.js`       | `src/domain/utils/rounding.ts`            | `src/domain/utils/rounding.test.ts`, commentaire `Source:` dans fichier | `completed` |
| D1.02 | `formatMoney`, `formatNumberFr` (app.js) | `src/domain/utils/format.ts`              | Usage moteur + tests legacy formatters                                  | `completed` |
| D1.03 | Dates / URL / sanitize                   | `date.ts`, `url-params.ts`, `sanitize.ts` | Couverture indirecte moteur + legacy tests                              | `completed` |

---

## D2 — Config & types

| ID    | Périmètre legacy         | Cible Vue / TS                   | Preuve                      | Statut      |
| ----- | ------------------------ | -------------------------------- | --------------------------- | ----------- |
| D2.01 | `config.js` + CONFIG     | `src/domain/config/index.ts`     | `ConfigConsistency.test.js` | `completed` |
| D2.02 | Constantes SMH / barèmes | `src/domain/config/constants.ts` | Intégration moteur          | `completed` |
| D2.03 | Types sémantiques        | `src/domain/types/index.ts`      | `labels.test.ts` couvre IDs | `completed` |

---

## D3 — Classification, convention, tooltips

| ID    | Périmètre legacy                                      | Cible Vue / TS                                                                                      | Preuve                                                                                                         | Statut      |
| ----- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- |
| D3.01 | `legacy-archive/classification/**`                    | `src/domain/classification/engine.ts`                                                               | `ClassificationEngine.test.js` + TS                                                                            | `completed` |
| D3.02 | `legacy-archive/convention/**`                        | `src/domain/convention/catalog.ts`                                                                  | `ConventionModalites.test.js`                                                                                  | `completed` |
| D3.03 | Tooltips inline `app.js` (blocs légaux)               | `src/domain/tooltip/builders.ts`                                                                    | `src/domain/tooltip/builders.test.ts`                                                                          | `completed` |
| D3.04 | `buildPrimeEquipeTooltip` + taux dynamique (`app.js`) | `buildPrimeConditionTooltip` + tooltips structurés primes / CCN (`builders.ts`, définitions accord) | `src/domain/tooltip/builders.test.ts`, `accord-element-defs.test.ts`, parité oracle (profil prime équipe Kuhn) | `completed` |

---

## D4 — Moteur rémunération & accords

| ID    | Périmètre legacy                | Cible Vue / TS                                                       | Preuve                                                                       | Statut      |
| ----- | ------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| D4.01 | `remuneration/**`               | `engine.ts`, `aggregate.ts`, `rates.ts`, `smh.ts`, `primes-fixes.ts` | `engine.test.ts`, `engine.property.test.ts`, legacy `RemunerationCalculator` | `completed` |
| D4.02 | `agreements/**`, `accords/Kuhn` | `registry.ts`, `loader.ts`, `src/accords/kuhn.ts`                    | `Accords.test.js`, `AgreementRegistry.test.js`                               | `completed` |
| D4.03 | Arriérés                        | `src/domain/arretees/calculator.ts`                                  | `arretees.test.js`                                                           | `completed` |
| D4.04 | Inflation Eurostat              | `src/domain/evolution/inflation.ts`                                  | Intégration / mocks legacy si présents                                       | `completed` |

---

## D5 — Stores, navigation, bootstrap

| ID    | Périmètre legacy  | Cible Vue / TS                                                                                            | Preuve                                                                                      | Statut      |
| ----- | ----------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------- |
| D5.01 | `state` / wizard  | `src/stores/wizard.ts`, `situation.ts`, `agreement.ts`, `arretees.ts`, `ui.ts`                            | `tests/unit/stores/*.test.ts`, smoke Playwright, `tests/parity/remuneration-oracle.test.ts` | `completed` |
| D5.02 | Hash / URL iframe | `router/`, `useWizardNavigation`, `mergeLocationSearchAndHashSearch` (`url-params.ts`), `useUrlBootstrap` | E2E `baseline.spec.ts`, `accord-kuhn.spec.ts`, `tests/utils/url-params.test.ts`             | `completed` |

---

## D6 — UI étapes & PDF

| ID    | Périmètre legacy                                             | Cible Vue / TS                                                                                                                                                  | Preuve                                                                                                                                                                                        | Statut      |
| ----- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| D6.01 | Étapes 1–4 (HTML)                                            | `src/features/wizard/*.vue`, `SimulatorLayout`                                                                                                                  | Playwright `baseline`, `wizard-ui-coverage`, `a11y-wizard`, `remuneration-values`, `dom-critical-elements`, `tooltips`, `arretees-curve` ; Vitest `tests/components/*.spec.ts`                | `completed` |
| D6.02 | PDF `PDFGenerator.js`                                        | `usePdfGeneration.ts`, `domain/pdf/jsPdfHelpers.ts` (`drawPdfAutoTable` / `importPdfAutoTable` v5), `domain/pdf/syndicatMail.ts`, Word `miseEnDemeureLetter.ts` | `legacy-archive/tests/integration/pdf.test.js` ; `tests/domain/pdf/jsPdfHelpers.test.ts`, `syndicatMail.test.ts` ; entrée moteur unifiée `useWizardRemunerationInput` (incl. `modalityState`) | `completed` |
| D6.03 | Parité dual 5174 / 5173 (disponibilité)                      | `e2e/parite-visuelle.spec.ts`, `playwright.config.ts` (`DUAL_PARITE_E2E`), **CI** job `dual-parity`                                                             | Local : `npm run dual` puis `npm run dual:parity` ; ou `DUAL_PARITE_E2E=1 npm run e2e:parite-dual` ; CI : label PR `dual-parity` ou _workflow_dispatch_                                       | `completed` |
| D6.04 | Parité visuelle **pixel** (captures comparées legacy vs Vue) | `e2e/parite-visuelle-pixels.spec.ts` + `e2e/helpers/comparePng.ts` (pixelmatch) — **6 parcours × 2 bandes** (12 comparaisons)                                   | Idem D6.03 (`dual:parity` fixe `DUAL_PARITE_E2E=1`) ; seuil `PW_PARITE_MAX_DIFF_RATIO` (défaut 0,82)                                                                                          | `completed` |

### D6-bis — Régressions parité étapes 2 / 3 / 4 (lot 2026-05)

| ID     | Périmètre (plan parité)                                                                                                  | Cible Vue / TS                                                                                                                                                                                                                                                                                                                                                                                 | Preuve / tests                                                                                                                                                                                                                                                                                                                            | Statut                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| D6b.01 | Carrousel juridique HTML + slide `.active`                                                                               | `src/domain/legal/legalCarouselSteps.ts`, `LegalCarousel.vue`                                                                                                                                                                                                                                                                                                                                  | `tests/domain/legal/legalCarouselSteps.test.ts`                                                                                                                                                                                                                                                                                           | `completed`                                                                                                                                        |
| D6b.02 | Hints `book-hint` contextualisés                                                                                         | `domain/hints/engine.ts` `buildResultHintBlocks`, `HintDisplay.vue`, `StepResult`                                                                                                                                                                                                                                                                                                              | `tests/domain/hints/engine.test.ts`, `tests/components/hint-display.spec.ts`                                                                                                                                                                                                                                                              | `completed`                                                                                                                                        |
| D6b.03 | Frise arriérés : toggle reclic, next vide, init                                                                          | `FloatingBlock.vue`, `StepArretees.vue`, `useTimeline.ts`                                                                                                                                                                                                                                                                                                                                      | Vitest `useTimeline.test.ts`, manuel E2E                                                                                                                                                                                                                                                                                                  | `completed`                                                                                                                                        |
| D6b.04 | `salaireDu` mensuel daté (grille SMH)                                                                                    | `enrichPeriodesSalaireDuMensuel`                                                                                                                                                                                                                                                                                                                                                               | `tests/composables/useTimeline.test.ts`                                                                                                                                                                                                                                                                                                   | `completed`                                                                                                                                        |
| D6b.05 | Graphique évolution N ans + inflation                                                                                    | `EvolutionChart.vue`, `domain/evolution/projection.ts`, `inflationFetch.ts`                                                                                                                                                                                                                                                                                                                    | `tests/domain/evolution/projection.test.ts`, `tests/domain/evolution/inflationFetch.test.ts`                                                                                                                                                                                                                                              | `completed` — bug unité Eurostat `RCH_A_AVG` (taux %, pas indice), fenêtre moyenne 20 ans, cascade WB + fallback CONFIG, UI compact + NumericInput |
| D6b.06 | Primes nationales surcharge + catalogue                                                                                  | `nationalOverrides.ts`, `AutresPrimesNationalesList.vue`, `catalog.ts`                                                                                                                                                                                                                                                                                                                         | Build + `conditions-travail-panel.spec.ts`                                                                                                                                                                                                                                                                                                | `completed`                                                                                                                                        |
| D6b.07 | Catalogue `WIZARD_TOOLTIPS` (étape 2 / conditions)                                                                       | `domain/ui/labels.ts` `WIZARD_TOOLTIPS`                                                                                                                                                                                                                                                                                                                                                        | `labels.test.ts`, usage `ConditionsTravailPanel` / `StepSituation`                                                                                                                                                                                                                                                                        | `completed`                                                                                                                                        |
| D6b.08 | Lot UI étapes 1–3 (tooltips, classe, point territorial non-cadre, forfait, accord toggle, primes accord, badge résultat) | `StepClassification.vue`, `StepSituation.vue`, `AccordOptionsPanel.vue`, `HourlyPrimesList.vue`, `RemunerationResult.vue`, `builders.ts`, `AppTooltip.vue`                                                                                                                                                                                                                                     | Vitest : `step-classification.spec.ts`, `step-situation.spec.ts`, `accord-options-panel.spec.ts`, `conditions-travail-panel.spec.ts`, `AppTooltip.spec.ts`, `builders.test.ts` ; Playwright `baseline` : régénérer les snapshots en local (`npx playwright test e2e/baseline.spec.ts --update-snapshots`) si l’environnement E2E est prêt | `completed`                                                                                                                                        |
| D6b.09 | Lot UX étapes 1–4 + sources tooltips + seuil barème débutants centralisé + graphiques Chart.js + assiette SMH arriérés   | `config/index.ts` (`BAREME_DEBUTANTS_SEUIL_EXP_PRO`, `CRITERES[].sourceArticle`), `builders.ts`, `labels.ts`, `aggregate.ts`, `smh.ts`, `compute.ts`, `hints/engine.ts`, `CriteriaRoulette.vue`, `StepSituation.vue`, `StepClassification.vue`, `StepArretees.vue`, `HourlyPrimesList.vue`, `AccordBadge.vue`, `AccordOptionsPanel.vue`, `RemunerationResult.vue`, `infra/adapters/chartjs.ts` | Vitest : `builders.test.ts`, `smh.test.ts`, `engine.test.ts`, `assiette-smh.test.ts`, `aggregate-included-smh.test.ts`, `step-situation.spec.ts` ; E2E : régénérer `baseline` si besoin                                                                                                                                                   | `completed`                                                                                                                                        |
| D6b.10 | Arriérés : dû mensuel accord (13e mois, primes à mois fixe)                                                              | `domain/arretees/mensuelDue.ts`, `salaireDuPourMois.ts`, `useTimeline.ts` (`enrichPeriodesSalaireDuMensuel`), `StepArretees.vue`                                                                                                                                                                                                                                                               | `tests/domain/arretees/mensuelDueKuhn.test.ts`, `tests/composables/useTimeline.test.ts`                                                                                                                                                                                                                                                   | `completed`                                                                                                                                        |
| D6b.11 | UI arriérés : saisie groupée, hint Inclus/Exclus, graphique                                                              | `SalaryModal.vue`, `FloatingBlock.vue` (reset sélection à la fermeture), `CelebrationOverlay.vue`, `PostPdfFlow.vue`, `hints/engine.ts` `buildSmhAssietteHintBlocks`                                                                                                                                                                                                                           | Manuel + E2E `arretees-curve` ; Vitest `assiette-smh.test.ts`                                                                                                                                                                                                                                                                             | `completed`                                                                                                                                        |
| D6b.12 | PDF annexe : tableaux autoTable, glyphes, écarts colorés                                                                 | `jsPdfHelpers.ts` (`sanitizePdfStandardFontText`, `pdfEcartCell`, `PDF_FOOTER_RESERVE_MM`)                                                                                                                                                                                                                                                                                                     | `tests/domain/pdf/jsPdfHelpers.test.ts`                                                                                                                                                                                                                                                                                                   | `completed`                                                                                                                                        |

---

## D7 — Passe 2 (uniformisation)

Gated par `docs/LACUNES_UI_CIBLES.md` + `docs/GATE_PASSE2.md`. Agent : `juriste-uniformisation`.

| ID    | Contenu                                    | Statut      |
| ----- | ------------------------------------------ | ----------- |
| D7.01 | Registre `src/domain/ui/labels.ts` (socle) | `completed` |
| D7.02 | Application L1–L5 sur toutes surfaces      | `pending`   |

---

## Tests oracle legacy (jalon 2)

Les suites **Vitest** du dépôt incluent l’oracle sous `legacy-archive/tests/**`, le domaine TS/Vue sous `src/**` et `tests/**` (parité chiffrée, stores Pinia, composants, etc.). Vérification : `npm run test:run` (ordre de grandeur **390+** tests au vert ; le nombre exact évolue avec les ajouts).

---

## Jalons plan ↔ ce dépôt

| Jalon plan  | État synthétique                                                                            |
| ----------- | ------------------------------------------------------------------------------------------- |
| J0          | Lacunes + agents + règle migration                                                          |
| J1.0–1.2    | Dual-run, scaffold, CI deploy                                                               |
| J1.5 pilote | D1.01 rounding + tests + source                                                             |
| J2          | Oracle Vitest legacy + smoke Vue                                                            |
| J3–J7       | Domain largement porté ; PDF/UI raffinage continu                                           |
| J8          | E2E parité dual (`parite-visuelle` + CI), accessibilité axe (`a11y-wizard`), CI PR `ci.yml` |
| J8.1        | Tests Pinia `tests/unit/stores`, tests composants `tests/components`                        |
| J9          | `labels.ts` + disclaimer L4 résultat                                                        |
| J10         | Voir `docs/CURSOR_ARTIFACT_REGISTRY.md` — oracle **`legacy-archive/`** hors bundle Vite.    |

Synthèse de clôture technique (preuves, commandes, différés) : **`docs/MIGRATION_COMPLETE.md`**.
