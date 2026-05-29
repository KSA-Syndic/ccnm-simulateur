# Matrice de parité — migration JS → Vue 3 / TS

> **Source de vérité** pour l’avancement passe 1 (parité iso) et passe 2 (uniformisation — gated par `docs/GATE_PASSE2.md`).
> Dernière mise à jour : 2026-05-27 — documentation alignée sur `src/` (Vue 3) ; archive JS historique retirée du dépôt.

## Lecture de la matrice

| Colonne                  | Sens                                                 |
| ------------------------ | ---------------------------------------------------- |
| **Périmètre historique** | Référence historique (ancien bundle JS, hors dépôt). |
| **Cible Vue / TS**       | **Code et chemins actifs** sous `src/`.              |
| **Preuve / tests**       | Tests : `src/**/__tests__`, `tests/**`, `e2e/**`.    |

## Légende

| Statut        | Signification                                      |
| ------------- | -------------------------------------------------- |
| `completed`   | Port Vue + tests `src/` / `tests/` associés verts. |
| `in_progress` | Travail actif / PR ouvert.                         |
| `pending`     | Non démarré ou bloqué par dépendance.              |
| `deferred`    | Volontairement après gate.                         |

---

## D1 — Utils & socle monétaire

| ID    | Périmètre historique          | Cible Vue / TS                            | Preuve / tests                                                                 | Statut      |
| ----- | ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ | ----------- |
| D1.01 | `utils/rounding.js` (archive) | `src/domain/utils/rounding.ts`            | `tests/domain/utils/rounding.test.ts` (ou `src/domain/utils/rounding.test.ts`) | `completed` |
| D1.02 | formatters historiques        | `src/domain/utils/format.ts`              | Usage moteur + `tests/domain/utils/date.test.ts`, etc.                         | `completed` |
| D1.03 | Dates / URL / sanitize        | `date.ts`, `url-params.ts`, `sanitize.ts` | `tests/utils/url-params.test.ts`, couverture moteur                            | `completed` |

---

## D2 — Config & types

| ID    | Périmètre historique     | Cible Vue / TS                   | Preuve                                                                 | Statut      |
| ----- | ------------------------ | -------------------------------- | ---------------------------------------------------------------------- | ----------- |
| D2.01 | `config.js` + CONFIG     | `src/domain/config/index.ts`     | `tests/domain/remuneration/registreModalitesCoherence.test.ts`, moteur | `completed` |
| D2.02 | Constantes SMH / barèmes | `src/domain/config/constants.ts` | Intégration moteur                                                     | `completed` |
| D2.03 | Types sémantiques        | `src/domain/types/index.ts`      | `labels.test.ts` couvre IDs                                            | `completed` |

---

## D3 — Classification, convention, tooltips

| ID    | Périmètre historique                    | Cible Vue / TS                                                   | Preuve                                                                                 | Statut      |
| ----- | --------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- |
| D3.01 | classification (archive)                | `src/domain/classification/engine.ts`                            | Tests domaine + E2E wizard                                                             | `completed` |
| D3.02 | convention (archive)                    | `src/domain/convention/catalog.ts`                               | `tests/domain/convention/catalogModalites.test.ts`, `nationalModalityRegistry.test.ts` | `completed` |
| D3.03 | Tooltips inline `app.js` (blocs légaux) | `src/domain/tooltip/builders.ts`                                 | `src/domain/tooltip/builders.test.ts`                                                  | `completed` |
| D3.04 | tooltips primes équipe (archive)        | `buildPrimeConditionTooltip` + `builders.ts`, définitions accord | `src/domain/tooltip/builders.test.ts`, `accord-element-defs.test.ts`                   | `completed` |

---

## D4 — Moteur rémunération & accords

| ID    | Périmètre historique          | Cible Vue / TS                                               | Preuve                                                                                | Statut      |
| ----- | ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ----------- |
| D4.01 | moteur rémunération (archive) | `engine.ts`, `compute.ts`, `aggregate.ts`, `smh.ts`          | `src/domain/remuneration/__tests__/engine.test.ts`, `e2e/remuneration-values.spec.ts` | `completed` |
| D4.02 | accords (archive)             | `registry.ts`, `loader.ts`, `src/accords/kuhn.ts`            | `src/domain/agreements/__tests__/*.test.ts`, `tests/unit/stores/agreement.test.ts`    | `completed` |
| D4.03 | Arriérés                      | `calculator.ts`, `mensuelDue.ts`, `aggregateFromPeriodes.ts` | `tests/domain/arretees/*`, `tests/composables/useTimeline.test.ts`                    | `completed` |
| D4.04 | Inflation Eurostat            | `inflationFetch.ts`, `projection.ts`, `inflation.ts`         | `tests/domain/evolution/inflationFetch.test.ts`, `projection.test.ts`                 | `completed` |

---

## D5 — Stores, navigation, bootstrap

| ID    | Périmètre historique | Cible Vue / TS                                                                                            | Preuve                                                                             | Statut      |
| ----- | -------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------- |
| D5.01 | `state` / wizard     | `src/stores/wizard.ts`, `situation.ts`, `agreement.ts`, `arretees.ts`, `ui.ts`                            | `tests/unit/stores/*.test.ts`, smoke Playwright, `e2e/remuneration-values.spec.ts` | `completed` |
| D5.02 | Hash / URL iframe    | `router/`, `useWizardNavigation`, `mergeLocationSearchAndHashSearch` (`url-params.ts`), `useUrlBootstrap` | E2E `baseline.spec.ts`, `accord-kuhn.spec.ts`, `tests/utils/url-params.test.ts`    | `completed` |

---

## D6 — UI étapes & PDF

| ID    | Périmètre historique                  | Cible Vue / TS                                                                                             | Preuve                                                                                                                                                                         | Statut      |
| ----- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| D6.01 | Étapes 1–4 (HTML)                     | `src/features/wizard/*.vue`, `SimulatorLayout`                                                             | Playwright `baseline`, `wizard-ui-coverage`, `a11y-wizard`, `remuneration-values`, `dom-critical-elements`, `tooltips`, `arretees-curve` ; Vitest `tests/components/*.spec.ts` | `completed` |
| D6.02 | PDF (archive)                         | `usePdfGeneration.ts`, `domain/pdf/jsPdfHelpers.ts` (v5), `syndicatMail.ts`, Word `miseEnDemeureLetter.ts` | `tests/domain/pdf/jsPdfHelpers.test.ts`, `syndicatMail.test.ts` ; `useWizardRemunerationInput`                                                                                 | `completed` |
| D6.03 | Parité dual legacy ↔ Vue (historique) | _(retiré)_ — l’app Vue est seule référence.                                                                | —                                                                                                                                                                              | `completed` |
| D6.04 | Parité visuelle pixel (historique)    | _(retiré)_                                                                                                 | —                                                                                                                                                                              | `completed` |

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

## Tests Vitest

`vitest.config.js` inclut :

- `src/**/*.test.ts`, `src/**/*.spec.ts`
- `tests/**/*.test.ts`, `tests/**/*.spec.ts`

Commande : `npm run test:run`.

---

## Jalons plan ↔ ce dépôt

| Jalon plan  | État synthétique                                                                       |
| ----------- | -------------------------------------------------------------------------------------- |
| J0          | Lacunes + agents + règle migration                                                     |
| J1.0–1.2    | Scaffold, CI deploy                                                                    |
| J1.5 pilote | D1.01 rounding + tests + source                                                        |
| J2          | Tests Vitest `src/` + `tests/` + smoke Vue                                             |
| J3–J7       | Domain largement porté ; PDF/UI raffinage continu                                      |
| J8          | E2E rémunération fixtures, accessibilité axe (`a11y-wizard`), CI PR `ci.yml`           |
| J8.1        | Tests Pinia `tests/unit/stores`, tests composants `tests/components`                   |
| J9          | `labels.ts` + disclaimer L4 résultat                                                   |
| J10         | Production : bundle Vue à la racine (`VITE_BASE=/`) — **`docs/DEPLOIEMENT_PAGES.md`**. |

Synthèse de clôture technique (preuves, commandes, différés) : **`docs/MIGRATION_COMPLETE.md`**.
