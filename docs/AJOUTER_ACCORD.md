# Guide : Ajouter un Nouvel Accord d'Entreprise

Ce guide explique comment ajouter un nouvel accord d'entreprise au simulateur. Le schéma détaillé est défini dans `src/agreements/AgreementInterface.js`.

## Emplacement des accords

Les **définitions** des accords se trouvent dans le répertoire **`accords/`** à la racine du projet (séparé du code applicatif `src/`). Le moteur (registre, chargement, schéma) est dans `src/agreements/`.

## Structure d'un accord

Un accord doit respecter le schéma validé par `validateAgreement()` dans `AgreementInterface.js`. Résumé des champs principaux :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (ex. `'mon-accord'`) |
| `nom` | string | Nom complet affiché |
| `nomCourt` | string | Nom court (badges, tooltips) |
| `url` | string | Lien vers le texte officiel |
| `dateEffet` | string | Date d'entrée en vigueur (ISO `YYYY-MM-DD`) |
| `anciennete` | object | **Prime d'ancienneté** : seuil, plafond, barème, `tousStatuts`, `baseCalcul`. Entièrement piloté par l'instance d'accord : modifier cet objet dans le fichier (ex. `accords/KuhnAgreement.js`) suffit pour adapter le calcul. |
| `majorations` | object | `nuit` (posteNuit, posteMatin, plage…), `dimanche` (taux) |
| `primes` | **array** | Liste de primes (voir ci-dessous) |
| `repartition13Mois` | object | `actif`, `moisVersement` (1-12), `inclusDansSMH` |
| `labels` | object | `nomCourt`, `tooltip`, `description` |
| `metadata` | object | `version`, `articlesSubstitues`, `territoire`, `entreprise` |

### Primes (tableau)

Chaque prime est un objet avec au minimum :

- **`id`** : identifiant unique (ex. `'primeEquipe'`, `'primeVacances'`, `'primeNoel'`)
- **`label`** : libellé affiché
- **`sourceValeur`** : `'accord'` (valeur fixe) ou `'modalite'` (saisie utilisateur)
- **`valueType`** : `'horaire'` (€/h ; période mensuelle), `'montant'` (€ annuel), ou `'pourcentage'`
- **`unit`** : `'€/h'`, `'€'`, `'%'`
- **`valeurAccord`** : nombre (ou `null` si modalité)
- **`stateKeyActif`** : clé dans `state.accordInputs` pour activer/désactiver (ex. `'travailEquipe'`, `'primeVacances'`)
- **`stateKeyHeures`** : (si horaire) clé pour les heures **mensuelles** (ex. `'heuresEquipe'`)
- **`moisVersement`** : (si montant) mois 1-12 du versement (ex. 7 = juillet, 12 = décembre)
- **`conditionAnciennete`** : (optionnel) `{ type: 'annees_revolues'|'aucune', annees?, description? }` — condition d'ancienneté pour ouvrir droit (ex. prime vacances : 1 an)
- **`tooltip`** : (optionnel) texte d'aide affiché au survol (?) sur l'option

Exemple minimal pour deux primes :

```javascript
primes: [
    {
        id: 'primeEquipe',
        label: 'Prime d\'équipe',
        sourceValeur: 'accord',
        valueType: 'horaire',
        unit: '€/h',
        valeurAccord: 0.82,
        stateKeyActif: 'travailEquipe',
        stateKeyHeures: 'heuresEquipe',
        defaultHeures: 151.67,
        conditionAnciennete: { type: 'aucune', description: 'Aucune' }
    },
    {
        id: 'primeVacances',
        label: 'Prime de vacances',
        sourceValeur: 'accord',
        valueType: 'montant',
        unit: '€',
        valeurAccord: 525,
        stateKeyActif: 'primeVacances',
        defaultActif: true,       // optionnel : case cochée par défaut (évite de coder des ids dans l'app)
        moisVersement: 7,
        conditionAnciennete: { type: 'annees_revolues', annees: 1, description: '1 an au 1er juin' }
    }
]
```

L'app affiche les primes de type **annuel** (`valueType === 'montant'`) dynamiquement ; elle ne doit pas contenir de condition sur un `id` de prime (voir PRD § 3.3).

Référence complète : `src/agreements/AgreementInterface.js` (JSDoc `PrimeDef`, `Agreement`) et exemple : `accords/KuhnAgreement.js`.

## Étapes pour ajouter un accord

### 1. Créer le fichier dans `accords/`

Créer **`accords/MonAccord.js`** (à la racine du projet, pas dans `src/`) :

```javascript
import { validateAgreement } from '../src/agreements/AgreementInterface.js';

export const MonAccord = {
    id: 'mon-accord',
    nom: 'Mon Accord d\'Entreprise',
    nomCourt: 'Mon Accord',
    url: 'https://example.com/accord.pdf',
    dateEffet: '2024-01-01',
    dateSignature: '2023-12-15',
    anciennete: { seuil: 2, plafond: 25, tousStatuts: true, baseCalcul: 'salaire', barème: { 2: 0.02 } },
    majorations: { nuit: { posteNuit: 0.20, posteMatin: 0.15 }, dimanche: 0.50 },
    primes: [ /* tableau PrimeDef */ ],
    repartition13Mois: { actif: false, moisVersement: 11, inclusDansSMH: true },
    labels: { nomCourt: 'Mon Accord', tooltip: '...', description: '...' },
    metadata: { version: '1.0', articlesSubstitues: [], territoire: '', entreprise: '' }
};

if (!validateAgreement(MonAccord)) {
    console.error('L\'accord MonAccord n\'est pas valide');
}
```

### 2. Enregistrer l'accord

Dans **`src/agreements/AgreementRegistry.js`** :

```javascript
import { KuhnAgreement } from '../../accords/KuhnAgreement.js'; // Exemple : remplacer par votre accord
import { MonAccord } from '../../accords/MonAccord.js';

function initializeRegistry() {
    registerAgreement(KuhnAgreement);
    registerAgreement(MonAccord);
}
```

### 3. Déclarer les entrées d'accord (optionnel)

Si l'accord utilise de nouvelles clés (ex. `primeNoel`), ajouter les valeurs par défaut dans **`src/core/state.js`** et **`app.js`** dans `state.accordInputs` (ex. `primeNoel: false`), et prévoir les champs/options dans l'UI (étape 3 du wizard).

### 4. Tester

1. Lancer l'application avec **`?accord=mon-accord`** dans l'URL.
2. Vérifier le chargement et les calculs avec l'accord activé.

## Intégration à partir du texte complet + IA

Pour générer un fichier d'accord à partir du **texte intégral** de l'accord (PDF, site officiel, etc.) en s'appuyant sur un assistant IA, voir le guide dédié :

- **[Intégrer un accord via texte et prompt IA](INTEGRER_ACCORD_TEXTE_ET_IA.md)**

## Contribution

- **GitHub** : fork, branche `feature/accord-xxx`, fichier dans `accords/`, mise à jour de `AgreementRegistry.js`, Pull Request.
- **Email** : envoyer à ksa.syndic@gmail.com le nom de l'accord, un lien ou PDF du texte, et les infos nécessaires pour remplir le schéma.

## Schéma complet

Voir `src/agreements/AgreementInterface.js` pour les types JSDoc complets (`Agreement`, `PrimeDef`, `ElementDroit`, etc.) et la liste des champs optionnels (`elements`, `pointsVigilance`, `exemplesRecrutement`, `conges`).
