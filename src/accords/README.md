# Accords d'entreprise (définitions)

Chaque accord est un **module TypeScript** dans ce dossier. Le moteur (registre, validation Zod, conversion en éléments de rémunération) est sous `src/domain/agreements/`.

## Fichiers

| Fichier    | Rôle                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------- |
| `kuhn.ts`  | Exemple de référence (accord Kuhn)                                                        |
| `index.ts` | Barrel : importe chaque accord pour exécuter `registerAgreement()` au chargement de l'app |

## Ajouter un accord

1. Créer `src/accords/mon-accord.ts` (objet typé `Agreement`, puis `registerAgreement(...)`).
2. Ajouter `import './mon-accord';` dans `index.ts`.
3. Tester : `npm run dev` puis `?accord=mon-accord` dans l'URL.

Guide détaillé : **`docs/AJOUTER_ACCORD.md`**.  
Génération depuis un texte juridique + IA : **`docs/INTEGRER_ACCORD_TEXTE_ET_IA.md`**.

## Schéma et validation

- Types et schéma Zod : `src/domain/agreements/interface.ts` (`Agreement`, `PrimeDef`, `validateAgreement`).
- Enregistrement : `src/domain/agreements/registry.ts`.
- Mapping primes → éléments calculables : `src/domain/agreements/accord-element-defs.ts`, `accord-majoration-defs.ts`.
- UI (cases, heures, tooltips) : `src/features/agreement-options/`, store `src/stores/agreement.ts` (`inputs`).

Un dossier d’**archive facultatif** (calculateur JavaScript de référence pour les tests de parité) n’est **pas** requis pour faire tourner ni étendre l’application Vue.
