# README technique — Simulateur Métallurgie (Vue 3 / TypeScript)

Application **Vue 3**, **Pinia**, moteur métier sous **`src/domain/`**. Point d'entrée : **`src/main.ts`** (import `./accords` pour enregistrer les accords d'entreprise).

## Cartographie rapide

| Domaine                           | Emplacement                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Wizard (4 étapes)                 | `src/features/wizard/`, `src/components/SimulatorLayout.vue`, `WizardShell.vue`                          |
| Classification                    | `src/domain/classification/engine.ts`                                                                    |
| Convention / modalités nationales | `src/domain/convention/catalog.ts`, `nationalModalityRegistry.ts`                                        |
| Rémunération                      | `src/domain/remuneration/` (`engine.ts`, `compute.ts`, `aggregate.ts`, `smh.ts`, `smhAssiettePolicy.ts`) |
| Accords d'entreprise              | `src/accords/*.ts`, `src/domain/agreements/`                                                             |
| Arriérés                          | `src/domain/arretees/`, `src/composables/useTimeline.ts`, `src/stores/arretees.ts`                       |
| Évolution / inflation             | `src/domain/evolution/inflationFetch.ts`, `projection.ts`                                                |
| Tooltips & libellés               | `src/domain/tooltip/`, `src/domain/ui/labels.ts`, `glossary.ts`                                          |
| PDF / Word / post-export          | `src/composables/usePdfGeneration.ts`, `src/domain/pdf/`, `src/features/pdf/`                            |
| État global                       | `src/stores/*.ts`, `useWizardRemunerationInput.ts`                                                       |
| Tests                             | `src/**/__tests__`, `tests/**`, `e2e/**`                                                                 |

**PDF annexe arriérés** : jspdf-autotable **v5** — `importPdfAutoTable()` / `drawPdfAutoTable()` dans `src/domain/pdf/jsPdfHelpers.ts` (un simple `import 'jspdf-autotable'` ne branche plus `doc.autoTable` en ESM).

## Design tokens — modales

Les fenêtres modales (composant **`AppModal`** / `<dialog>`, overlay **`.modal`**, carte **`.celebration-card`**) s’alignent sur des variables **`:root`** dans **`src/assets/styles/main.css`** :

- **`--modal-radius`** — angles (aligné sur les tooltips : `var(--radius-md)`)
- **`--modal-border-width`**, **`--modal-border-color`**
- **`--modal-padding`** — marge intérieure du contenu (`AppModal` : `.app-modal__inner`)
- **`--modal-shadow`**, **`--modal-backdrop-bg`**

Pour faire évoluer tout le style modale d’un coup, modifier ces tokens plutôt que les composants individuels.

## Conformité juridique

- **CCNM (IDCC 3248)** : grilles et paramètres dans `src/domain/config/`
- **Assiette SMH** : distinction indicative « rémunération du travail » / « sujétion » (CCNM art. 140, jurisprudence déc. 2025 à contextualiser) centralisée dans `src/domain/remuneration/smhAssiettePolicy.ts` ; le moteur la matérialise via `inclusDansSMH` sur chaque `ElementDef` (agrégats, PDF, encarts « Inclus / Exclus »).
- **Accords d'entreprise** : `src/accords/` (ex. `kuhn.ts`)

Les montants par défaut sont des **paramètres de simulation** ; les métadonnées juridiques (`sourceArticle`, `conditionTexte`, tooltips) doivent être conservées ou complétées lors des évolutions catalogue / accord.

## Moteur — assiette horaire (SMH)

Les formules catalogue et nationales en **`heuresXtaux`** (nuit, dimanche, intervention astreinte, déplacement, HS, etc.) s’appuient uniquement sur **`tauxHoraireBase`** dans `ComputeContext` : même fondement que le **taux horaire affiché** sous le total (SMH annuel grille ÷ 12 ÷ durée légale mensuelle).

## Architecture (structure cible)

```
src/
├── main.ts                 # createApp, Pinia, import accords
├── App.vue
├── accords/                # Définitions accords (registerAgreement)
│   ├── index.ts
│   └── kuhn.ts
├── components/             # Layout, header, footer, UI générique
├── composables/            # PDF, timeline, navigation, bootstrap URL
├── domain/                 # Moteur pur (sans Vue)
│   ├── agreements/
│   ├── arretees/
│   ├── classification/
│   ├── config/
│   ├── convention/
│   ├── evolution/
│   ├── hints/
│   ├── pdf/
│   ├── remuneration/
│   ├── tooltip/
│   ├── ui/
│   └── utils/
├── features/               # Écrans métier par zone
│   ├── wizard/
│   ├── agreement-options/
│   ├── arretees/
│   ├── results/
│   └── pdf/
├── infra/                  # Adapters (Chart.js, jsPDF)
└── stores/                 # Pinia (wizard, situation, agreement, arretees, ui)
```

## Flux de données

### 1. Bootstrap

1. `src/main.ts` charge Pinia et **`import './accords'`** (registre rempli).
2. `useUrlBootstrap()` lit `?accord=` et active l'accord via `loadAgreement` (`domain/agreements/loader.ts`).

### 2. Classification (étape 1)

Saisie des 6 critères → `ClassificationEngine` → groupe/classe (`CONFIG.MAPPING_POINTS`).

### 3. Rémunération (étapes 2–3)

1. Stores Pinia (`situation`, `agreement`, `wizard`) + `useWizardRemunerationInput()`.
2. `computeAnnualRemunerationFromWizardStores` (`domain/remuneration/compute.ts`) agrège convention, modalités nationales et accord actif.
3. Affichage : `RemunerationResult.vue`, tooltips via `domain/tooltip/builders.ts`.

### 4. Arriérés (étape 4)

1. `useTimeline.ts` construit les périodes ; `mensuelDue.ts` / `salaireDuPourMois.ts` pour le dû mensuel accord.
2. Saisie : `FloatingBlock.vue`, `SalaryModal.vue` ; courbe : `SalaryCurveView.vue`.
3. Export : `usePdfGeneration.ts`, lettre Word, flux syndicat (`PostPdfFlow.vue`).

## Ajouter un accord d'entreprise

Voir **`docs/AJOUTER_ACCORD.md`** et **`src/accords/README.md`**.

## Modifier un calcul

1. Identifier le module sous `src/domain/` (souvent `remuneration/` ou `convention/`).
2. Ajuster la logique + tests colocalisés (`__tests__` ou `tests/domain/`).
3. Si impact affichage : composant `src/features/` ou `labels.ts` / tooltips.

## Tests

```bash
npm run test:run      # Vitest : src/**, tests/**
npm run e2e           # Playwright sur Vue (port 5173)
npm run lint
npm run build
```

Détail : **`tests/README.md`**, matrice : **`docs/PARITE_MATRIX.md`**.

## Déploiement

GitHub Pages : **`docs/DEPLOIEMENT_PAGES.md`** — app à la racine (`VITE_BASE=/`).

## Maintenance annuelle (SMH / barèmes)

1. `src/domain/config/index.ts` et constantes associées.
2. Grilles `SMH_BY_YEAR`, `BAREME_DEBUTANTS_BY_YEAR`, métadonnées `SMH_UPDATE`.
3. `npm run test:run` + scénarios arriérés / PDF.

## Compatibilité

- Navigateurs modernes (ES modules via Vite).
- Chart.js (`src/infra/adapters/chartjs.ts`), jsPDF + autotable v5.

## Conventions code (agents / contributeurs)

- **`.cursor/rules/ts-vue-code-quality.mdc`** : pas de `delete` sur objets métier ; immutabilité ; `exactOptionalPropertyTypes` ; helper `omitRecordKeys` (`src/domain/utils/record.ts`).

## Documentation associée

| Document                     | Contenu                                 |
| ---------------------------- | --------------------------------------- |
| `docs/PARITE_MATRIX.md`      | Historique migration + preuves tests    |
| `docs/MIGRATION_COMPLETE.md` | Synthèse clôture passe 1                |
| `docs/GATE_PASSE2.md`        | Avant uniformisation libellés (passe 2) |
| `PRD.md`                     | Exigences produit                       |
