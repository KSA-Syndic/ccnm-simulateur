# Registre des artefacts Cursor / migration

## Agents (`.cursor/agents/`)

| Fichier                              | Rôle court                               |
| ------------------------------------ | ---------------------------------------- |
| `architecte-migration.mdc`           | Matrice, dépendances, pas de code        |
| `parite-worker.mdc`                  | Port JS→TS iso-fonctionnel               |
| `qa-parite.mdc`                      | Tests, preuves, mise à jour matrice      |
| `juriste-uniformisation.mdc`         | Passe 2, `labels.ts`, lacunes UI         |
| `juriste-social.mdc`                 | Analyse juridique CCNM / Code du travail |
| `integrateur-retours-juridiques.mdc` | Intégration retours experts              |

## Règles (`.cursor/rules/`)

- `simulateur-migration.mdc` — discipline migration double passe.
- `droit-social-simulateur.mdc` — garde-fous données / sources.

## Documents projet

| Document                     | Usage                              |
| ---------------------------- | ---------------------------------- |
| `docs/PARITE_MATRIX.md`      | Avancement D1–D7 + liens preuves   |
| `docs/LACUNES_UI_CIBLES.md`  | Liste fermée passe 2               |
| `docs/GATE_PASSE2.md`        | Critères avant uniformisation      |
| `docs/LEGACY_RUN.md`         | Lancement oracle `legacy-archive/` |
| `docs/DEPLOIEMENT_PAGES.md`  | GitHub Pages legacy + `/v2/` Vue   |
| `docs/MIGRATION_COMPLETE.md` | Synthèse clôture passe 1 + preuves |

## Fichiers applicatifs récents (référence rapide)

| Zone              | Fichiers                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| PDF arriérés      | `src/composables/usePdfGeneration.ts`, `src/domain/pdf/jsPdfHelpers.ts`, `src/domain/pdf/syndicatMail.ts` |
| Post-export       | `src/features/pdf/PostPdfFlow.vue`, `CelebrationOverlay.vue`, `PdfInfosModal.vue`                         |
| Arriérés UI       | `StepArretees.vue`, `FloatingBlock.vue`, `SalaryModal.vue`, `SalaryCurveView.vue`                         |
| Arriérés moteur   | `src/domain/arretees/mensuelDue.ts`, `useTimeline.ts`, `stores/arretees.ts`                               |
| Hint assiette SMH | `src/domain/hints/engine.ts` `buildSmhAssietteHintBlocks`                                                 |

## `legacy-archive/` — statut

**Conservation obligatoire** tant que la gate `docs/GATE_PASSE2.md` n’est pas validée : dual-run, référence DOM/HTML, réexécution des tests oracle.

Le jalon plan « suppression de l’oracle fichier + tag v2.0 » est **reporté** après :

- gate passe 2 validée ;
- stratégie d’hébergement du seul bundle Vue validée ;
- tag / merge documentés hors agent (ops).

## Orchestration multi-agents (gates)

Vagues typiques : **V0** (fixtures + parité oracle + E2E ciblés + snapshots), **V1** (moteur domaine sans régression oracle), **V2** (URL / accords / bootstrap), **V3** (UI étapes verbatim + E2E gate), **V4** (arriérés / timeline), **V5** (PDF + matrice finale).

- Chaque vague a une **gate** explicite (tests verts listés dans la matrice ou dans `tests/README.md`).
- Ne pas fusionner une vague **N+1** si la gate **N** n’est pas documentée comme passée.
- Les agents `parite-worker` / `qa-parite` mettent à jour **`docs/PARITE_MATRIX.md`** avec les preuves (chemins des fichiers de tests).
