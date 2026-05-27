# Intégrer un accord d'entreprise via texte complet et prompt IA

Générer un fichier **`src/accords/<id>.ts`** à partir du texte intégral d'un accord (PDF, site officiel, etc.) avec un assistant IA.

> L'application tourne sur **Vue 3 / TypeScript**. Ne pas produire de fichier dans un dossier `accords/` à la racine ni référencer `AgreementInterface.js` : le schéma est **`src/domain/agreements/interface.ts`**.

## Objectif

1. Fournir le **texte complet** (ou extraits pertinents) de l'accord.
2. Utiliser le **prompt IA** ci-dessous.
3. Obtenir un module TypeScript prêt pour **`src/accords/nom-accord.ts`** + une ligne dans **`src/accords/index.ts`**.
4. Tester avec `?accord=<id>`.

## Prérequis

- Texte : ancienneté, majorations, primes, 13e mois, dates, métadonnées.
- Assistant IA capable de générer du TypeScript typé.

## Étapes

### 1. Récupérer le texte

PDF, site officiel ou document interne — sections rémunération, primes, majorations, 13e mois.

### 2. Copier le prompt IA

Bloc « Prompt IA à utiliser » (section suivante).

### 3. Soumettre à l'IA

Coller le prompt, puis le texte de l'accord. Demander explicitement :

_« Produis uniquement le contenu du fichier TypeScript `src/accords/mon-accord.ts` : objet `Agreement`, `satisfies Agreement`, puis `registerAgreement(...)`. Pas de fichier séparé de registre. »_

### 4. Créer le fichier

1. **`src/accords/mon-accord.ts`** — coller le code généré.
2. **`src/accords/index.ts`** — ajouter `import './mon-accord';`

### 5. Entrées utilisateur (`stateKeyActif`)

Les clés vivent dans **`useAgreementStore().inputs`** (`src/stores/agreement.ts`).

- Nouvelle clé (ex. `primeNoel`) : valeur par défaut si besoin (voir `AccordOptionsPanel.vue`, `HourlyPrimesList.vue`, `seedAgreementPrimeUiDefaults` dans `primeUiDefaults.ts`).
- `autoHeures: true` : pas de saisie d'heures en UI.

### 6. Tester

```bash
npm run dev
# http://localhost:5173/?accord=mon-accord
npm run test:run -- src/domain/agreements
```

## Pipeline hybride (recommandé)

1. **Extraction IA** → brouillon structuré `Agreement`.
2. **Validation** → `registerAgreement` (Zod) + check-list `docs/AJOUTER_ACCORD.md`.

### Contrôles bloquants

- Champs critiques : `id`, `label`, `valueType`, `inclusDansSMH`.
- `valueType` ∈ `horaire | montant | pourcentage | majorationHoraire`.
- `majorationHoraire` → `stateKeyHeures` obligatoire.
- `horaire` sans `autoHeures` → `stateKeyHeures` obligatoire.
- `inclusDansSMH: false` → `stateKeyActif` requis.
- Pas de sujétion marquée `inclusDansSMH: true` sans justification.

### Sortie attendue

- Fichier **`src/accords/NomAccord.ts`** complet.
- Import ajouté dans **`src/accords/index.ts`**.

---

## Prompt IA à utiliser

Copiez le bloc ci-dessous, puis collez le texte de l'accord après « TEXTE DE L'ACCORD : ».

````
Tu es un expert en droit du travail et en modélisation de données pour une application de simulation de rémunération (CCN Métallurgie IDCC 3248, accords d'entreprise).

═══════════════════════════════════════════════════════════════
CONTEXTE APPLICATION (Vue 3 / TypeScript)
═══════════════════════════════════════════════════════════════
- Code actif sous src/ ; accords dans src/accords/<id>.ts
- Schéma : src/domain/agreements/interface.ts (types Agreement, PrimeDef ; validation Zod via validateAgreement)
- Enregistrement : import { registerAgreement } from '../domain/agreements/registry';
- Chargement app : src/accords/index.ts importe chaque accord ; src/main.ts importe './accords'
- État saisie : Pinia useAgreementStore().inputs (stateKeyActif, stateKeyHeures)
- Exemple de référence : src/accords/kuhn.ts

Ne pas générer de JavaScript, ni de fichier AgreementRegistry.js, ni de dossier accords/ à la racine du projet.

[Méthodologie SMH, sémantique inclusDansSMH, priorité écarts CCN, mapping texte→attributs : identique au guide docs/AJOUTER_ACCORD.md — appliquer strictement.]

═══════════════════════════════════════════════════════════════
SCHÉMA OBLIGATOIRE (Agreement / PrimeDef)
═══════════════════════════════════════════════════════════════
- id (kebab-case), nom, nomCourt, url, dateEffet, dateSignature?
- anciennete : seuil, plafond, tousStatuts, baseCalcul 'salaire', barème, inclusDansSMH
- majorations.nuit : posteNuit, plageDebut, plageFin, seuilHeuresPosteNuit ; dimanche ; heuresSupplementaires? ; forfaitJours?
- primes[] : id, semanticId?, label, sourceValeur, valueType, unit, valeurAccord, stateKeyActif, stateKeyHeures?, autoHeures?, moisVersement?, inclusDansSMH (obligatoire), conditionAnciennete?, tooltip?, nonCumulAvec?, uiSection?
- repartition13Mois : actif, moisVersement, inclusDansSMH
- labels, metadata ; optionnel : elements, pointsVigilance, exemplesRecrutement, conges

Taux en décimal (20% → 0.20). moisVersement déduit du texte de l'accord, jamais copié d'un autre accord.

═══════════════════════════════════════════════════════════════
TÂCHE
═══════════════════════════════════════════════════════════════
Produire le contenu COMPLET de src/accords/MonAccord.ts :

1. import { type Agreement } from '../domain/agreements/interface';
2. import { registerAgreement } from '../domain/agreements/registry';
3. import { CONFIG } from '../domain/config'; // si besoin constantes
4. const MonAccord = { ... } satisfies Agreement;
5. registerAgreement(MonAccord);

Réponds UNIQUEMENT avec le code TypeScript du fichier (commentaires inline pour choix ambigus ou inclusDansSMH).

TEXTE DE L'ACCORD :
```
*(Collez ici le texte.)*
```
````

---

## Après génération

- Vérifier que seuls les imports `domain/agreements` et `domain/config` sont utilisés.
- Ajouter `import './mon-accord';` dans `src/accords/index.ts`.
- Lancer `npm run test:run` et un passage manuel `?accord=<id>`.

## Voir aussi

- [Guide manuel](AJOUTER_ACCORD.md)
- [Guide simple](AJOUTER_ACCORD_SIMPLE.md)
- [README accords](../src/accords/README.md)
