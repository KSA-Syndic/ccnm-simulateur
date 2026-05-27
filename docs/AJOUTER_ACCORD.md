# Guide : ajouter un nouvel accord d'entreprise (Vue 3 / TypeScript)

Ce guide décrit l'application **Vue 3** (`src/`). Le schéma métier est défini dans **`src/domain/agreements/interface.ts`** (validation Zod via `validateAgreement`).

> Le dossier **`legacy-archive/`** (ancien simulateur JS) peut être supprimé à tout moment : il n'est pas une dépendance du code actif. Les preuves de non-régression sont les tests **`src/**`** et **`tests/**`** (voir `tests/README.md`).

## Référentiel métier (obligatoire)

| Concept                | Définition opérationnelle                                          | Impact de modélisation                            |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `Salaire`              | Contrepartie directe du travail effectif                           | Composante salariale de base                      |
| `Rémunération`         | Ensemble des éléments bruts versés au titre du travail             | Agrégat global affiché dans l'app                 |
| `Contrepartie directe` | Élément lié à la performance/poste sans contrainte particulière    | Candidat `inclusDansSMH: true`                    |
| `Sujétion`             | Compensation d'une contrainte d'organisation/conditions de travail | `inclusDansSMH: false`                            |
| `Indemnisation`        | Compensation de frais ou d'une situation hors travail effectif     | `inclusDansSMH: false` (hors complément salarial) |

### Règle d'assiette SMH (Art. 140 CCNM)

- `inclusDansSMH: true` uniquement pour les composantes salariales / contreparties directes.
- `inclusDansSMH: false` pour sujétions et indemnisations.
- Le contrôle porte sur la **réalité de l'élément**, pas son intitulé.
- Doctrine projet : **prime d'ancienneté exclue du SMH par défaut** ; inclusion possible uniquement avec justification juridique explicite (`inclusDansSMH: true` ou `'ifSuperiorToConvention'` sur `anciennete`).

## Règle prioritaire : modéliser uniquement les écarts à la CCN

- Si un taux/une prime/une condition est identique à la CCN, ne pas le dupliquer dans l'accord.
- Éviter les « copier-coller CCN » dans `primes` et `majorations`.
- Si un point est utile uniquement en commentaire juridique, placez-le dans `elements` (informatif), pas dans la logique de calcul.

## Emplacement dans le dépôt

| Zone                        | Chemin                                                                          |
| --------------------------- | ------------------------------------------------------------------------------- |
| Définition de l'accord      | **`src/accords/<id>.ts`**                                                       |
| Enregistrement au démarrage | **`src/accords/index.ts`** (import du module)                                   |
| Schéma / validation         | `src/domain/agreements/interface.ts`                                            |
| Registre runtime            | `src/domain/agreements/registry.ts`                                             |
| Conversion calcul           | `src/domain/agreements/accord-element-defs.ts`, `accord-majoration-defs.ts`     |
| État saisie utilisateur     | `src/stores/agreement.ts` → `inputs`                                            |
| UI étape 3                  | `src/features/agreement-options/` (`AccordOptionsPanel`, `HourlyPrimesList`, …) |

## Structure d'un accord (`Agreement`)

Champs principaux (détail complet dans `AgreementSchema` / `interface.ts`) :

| Champ               | Type      | Description                                                 |
| ------------------- | --------- | ----------------------------------------------------------- |
| `id`                | string    | Identifiant unique kebab-case (ex. `'mon-accord'`)          |
| `nom`               | string    | Nom complet affiché                                         |
| `nomCourt`          | string    | Nom court (badges, tooltips)                                |
| `url`               | string    | Lien vers le texte officiel                                 |
| `dateEffet`         | string    | ISO `YYYY-MM-DD`                                            |
| `anciennete`        | object    | Seuil, plafond, barème, `inclusDansSMH`, …                  |
| `majorations`       | object    | Nuit, dimanche, HS optionnelles, forfait jours              |
| `primes`            | **array** | Liste `PrimeDef`                                            |
| `repartition13Mois` | object    | `actif`, `moisVersement`, `inclusDansSMH`                   |
| `labels`            | object    | `nomCourt`, `tooltip`, `description`                        |
| `metadata`          | object    | `version`, `articlesSubstitues`, `territoire`, `entreprise` |

### Primes (`PrimeDef`)

Chaque prime comporte au minimum : `id`, `label`, `sourceValeur`, `valueType`, `unit`, `stateKeyActif`, **`inclusDansSMH`**.

Voir le tableau « Assiette SMH » et l'exemple dans **`src/accords/kuhn.ts`**.

**Comportement dans l'app :**

- `inclusDansSMH: true` → prime **toujours active** (pas de case à cocher). Distribution du salaire pour atteindre le SMH, **pas un supplément** au total annuel. Affichage en sous-ligne « dont … ».
- `inclusDansSMH: false` → prime **activable** ; **s'ajoute** au-dessus du SMH garanti.

L'affichage des primes annuelles (`valueType === 'montant'`) est **dynamique** (pas de condition sur un `id` fixe dans l'UI).

## Étapes pour ajouter un accord

### 1. Créer `src/accords/mon-accord.ts`

```typescript
import { CONFIG } from '../domain/config';
import { type Agreement } from '../domain/agreements/interface';
import { registerAgreement } from '../domain/agreements/registry';

const MonAccord = {
  id: 'mon-accord',
  nom: "Mon Accord d'Entreprise",
  nomCourt: 'Mon Accord',
  url: 'https://example.com/accord.pdf',
  dateEffet: '2024-01-01',
  dateSignature: '2023-12-15',
  anciennete: {
    seuil: 2,
    plafond: 25,
    tousStatuts: true,
    baseCalcul: 'salaire',
    barème: { 2: 0.02 },
    inclusDansSMH: false,
  },
  majorations: {
    nuit: {
      posteNuit: 0.2,
      plageDebut: 20,
      plageFin: 6,
      seuilHeuresPosteNuit: 2,
    },
    dimanche: 0.5,
  },
  primes: [
    /* PrimeDef[] — voir kuhn.ts */
  ],
  repartition13Mois: { actif: false, moisVersement: 11, inclusDansSMH: true },
  labels: {
    nomCourt: 'Mon Accord',
    tooltip: '…',
    description: '…',
  },
  metadata: {
    version: '1.0',
    articlesSubstitues: [],
    territoire: '',
    entreprise: '',
  },
} satisfies Agreement;

registerAgreement(MonAccord);
```

`registerAgreement` appelle `validateAgreement` (Zod) : en cas d'échec, l'accord n'est pas enregistré et une erreur est loguée en console.

### 2. Déclarer le module dans `src/accords/index.ts`

```typescript
import './mon-accord';
```

(`src/main.ts` importe déjà `./accords`.)

### 3. Entrées utilisateur (`stateKeyActif` / `stateKeyHeures`)

Les valeurs saisies vivent dans **`useAgreementStore().inputs`** (`src/stores/agreement.ts`), pas dans un `state.js` global.

- Primes **horaires** avec `autoHeures: true` : pas de champ heures en UI (`primeUiDefaults.ts` → `shouldShowPrimeHoursField`).
- Nouvelle clé d'activation (ex. `primeNoel`) : prévoir une valeur par défaut si besoin (ex. dans `AccordOptionsPanel.vue` ou au premier affichage de `HourlyPrimesList.vue` via `seedAgreementPrimeUiDefaults`).
- Primes `inclusDansSMH: true` : toujours actives ; `defaultActif` est ignoré pour l'activation.

### 4. Tester

```bash
npm run dev
# Ouvrir http://localhost:5173/?accord=mon-accord
npm run test:run -- src/domain/agreements
npm run test:run -- tests/parity   # si le profil est ajouté aux fixtures
```

Playwright (accord actif) : `e2e/accord-kuhn.spec.ts` comme modèle.

## Intégration à partir du texte complet + IA

Voir **[Intégrer un accord via texte et prompt IA](INTEGRER_ACCORD_TEXTE_ET_IA.md)** (prompt mis à jour pour TypeScript / `src/accords/`).

## Contribution

- **GitHub** : branche `feature/accord-xxx`, fichier sous `src/accords/`, import dans `index.ts`, PR avec tests (`accord-element-defs`, scénario E2E si pertinent).
- **Email** : ksa.syndic@gmail.com — nom de l'accord, lien ou PDF, éléments qui diffèrent de la CCN.

## Schéma complet

`src/domain/agreements/interface.ts` — types `Agreement`, `PrimeDef`, `ElementDroit`, champs optionnels (`elements`, `pointsVigilance`, `exemplesRecrutement`, `conges`).

## Check-list anti-régression

- Ajouter une prime ne doit pas masquer les autres modalités nationales / accord.
- Une sujétion ne doit jamais passer dans le SMH sans justification explicite.
- Le non-cumul (`nonCumulAvec`) doit rester cohérent UI + calcul.
- Vérifier : nuit, équipe, astreinte, prime objectif, avantage en nature.
- Lancer `npm run test:run` et, si accord Kuhn-like, `tests/domain/arretees/mensuelDueKuhn.test.ts` comme référence.

### Scénarios minimaux

| Scénario                | Entrée clé                       | Résultat attendu                             |
| ----------------------- | -------------------------------- | -------------------------------------------- |
| Nuit + dimanche         | heures nuit / dimanche actives   | Deux majorations présentes                   |
| Prime équipe            | `stateKeyActif` activé           | Montant selon `autoHeures` ou heures saisies |
| Prime objectif annuelle | `montant`, `inclusDansSMH: true` | Sous-ligne SMH, pas d'ajout au total         |
| Astreinte + non-cumul   | primes liées                     | Pas de double comptage                       |

## Réajustement Convention + Kuhn

- Convention : `inclusDansSMH` explicite dans `src/domain/convention/catalog.ts` où pertinent.
- Kuhn : `src/accords/kuhn.ts` — référence pour barèmes, 13e mois, primes à mois fixe.
- UI : séparation modalités **nationales** (`ConditionsTravailPanel`, `AutresPrimesNationalesList`) et **accord** (`HourlyPrimesList`, `AccordOptionsPanel`).
