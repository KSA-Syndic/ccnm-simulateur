# Guide : Ajouter un Nouvel Accord d'Entreprise

Ce guide explique comment ajouter un nouvel accord d'entreprise au simulateur. Le schéma détaillé est défini dans `src/agreements/AgreementInterface.js`.

## Référentiel métier (obligatoire)

Cette section est la base de décision pour transformer un texte juridique en attributs techniques.

| Concept | Définition opérationnelle | Impact de modélisation |
|---|---|---|
| `Salaire` | Contrepartie directe du travail effectif | Composante salariale de base |
| `Rémunération` | Ensemble des éléments bruts versés au titre du travail | Agrégat global affiché dans l'app |
| `Contrepartie directe` | Élément lié à la performance/poste sans contrainte particulière | Candidat `inclusDansSMH: true` |
| `Sujétion` | Compensation d'une contrainte d'organisation/conditions de travail | `inclusDansSMH: false` |
| `Indemnisation` | Compensation de frais ou d'une situation hors travail effectif | `inclusDansSMH: false` (hors complément salarial) |

### Règle d'assiette SMH (Art. 140 CCNM)

- `inclusDansSMH: true` uniquement pour les composantes salariales / contreparties directes.
- `inclusDansSMH: false` pour sujétions et indemnisations.
- Le contrôle porte sur la **réalité de l'élément**, pas son intitulé.
- Doctrine projet : **prime d'ancienneté exclue du SMH par défaut** ; inclusion possible uniquement avec justification juridique explicite.

## Règle prioritaire : modéliser uniquement les écarts à la CCN

Ne mettez dans l'accord que ce qui change réellement la règle CCN.

- Si un taux/une prime/une condition est identique à la CCN, ne pas le dupliquer dans l'accord.
- Éviter les "copier-coller CCN" dans `primes` et `majorations` : cela crée des faux écarts et complexifie la maintenance.
- Si un point est utile uniquement en commentaire juridique, placez-le dans `elements` (informatif), pas dans la logique de calcul.

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
| `anciennete` | object | **Prime d'ancienneté** : seuil, plafond, barème, `tousStatuts`, `baseCalcul`, `inclusDansSMH` (paramétrable selon position juridique retenue). Entièrement piloté par l'instance d'accord. |
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
- **`valueType`** : `'horaire'` (€/h ; période mensuelle), `'montant'` (€ annuel), `'pourcentage'`, ou `'majorationHoraire'` (majoration en % du taux horaire)
- **`unit`** : `'€/h'`, `'€'`, `'%'`
- **`valeurAccord`** : nombre (ou `null` si modalité)
- **`stateKeyActif`** : clé dans `state.accordInputs` pour activer/désactiver (ex. `'travailEquipe'`, `'primeVacances'`)
- **`stateKeyHeures`** : (si horaire/majorationHoraire) clé pour les heures **mensuelles** (ex. `'heuresEquipe'`)
- **`autoHeures`** : (optionnel) `true` pour utiliser une base horaire calculée automatiquement (sans champ heures côté utilisateur)
- **`moisVersement`** : (si montant) mois 1-12 du versement — **déduit du texte de l'accord**, pas copié d'un autre accord
- **`inclusDansSMH`** : **(OBLIGATOIRE)** `true` si la prime est un complément salarial annuel inclus dans l'assiette SMH (Art. 140 CCNM) ; `false` si c'est une contrepartie de conditions de travail exclue de l'assiette. Voir section « Assiette SMH » ci-dessous.
- **`conditionAnciennete`** : (optionnel) `{ type: 'annees_revolues'|'aucune', annees?, description? }` — condition d'ancienneté pour ouvrir droit
- **`tooltip`** : (optionnel) texte d'aide affiché au survol (?) sur l'option

### Mapping objectif : texte juridique → attributs techniques

| Indice dans le texte | Attribut(s) cible(s) | Règle |
|---|---|---|
| « X € par an », « forfait annuel » | `valueType: 'montant'`, `valeurAccord`, `moisVersement` si versé en un mois | Montant annuel fixe |
| « X €/h », « par heure » | `valueType: 'horaire'`, `valeurAccord`, `stateKeyHeures` | Base horaire mensuelle |
| « +X% du taux horaire », « majoration » | `valueType: 'majorationHoraire'`, `valeurAccord`, `stateKeyHeures` | Majoration sur taux horaire |
| « au 1er juin », « après X ans » | `conditionAnciennete` | Encoder type + seuil |
| « ne se cumule pas avec » | `nonCumulAvec` | Référencer les `stateKeyActif` incompatibles |
| « selon intervention / si activé » | `stateKeyActif` (+ `stateKeyHeures` si besoin) | Activation explicite UI |
| « prime usuelle/commune » | `uiSection: 'basique'` | Affichage hors bloc spécifique accord |

### Grille de validation déterministe (avant intégration)

Une prime est refusée tant que ces règles ne sont pas respectées :

1. `id`, `label`, `valueType`, `inclusDansSMH` sont renseignés.
2. `valueType` est dans `horaire | montant | pourcentage | majorationHoraire`.
3. Si `valueType === 'majorationHoraire'`, alors `stateKeyHeures` est obligatoire.
4. Si `valueType === 'horaire'` et `autoHeures !== true`, alors `stateKeyHeures` est obligatoire.
5. Si `inclusDansSMH !== true`, alors `stateKeyActif` est requis.
6. Si `valueType === 'montant'` et versement annuel ponctuel, `moisVersement` doit être défini.
7. Tout choix atypique sur ancienneté/SMH doit être justifié dans le commentaire de l'accord.

### Format de sortie attendu (évite les fragments bruts)

La conversion d'un texte juridique doit produire un objet accord complet, directement utilisable :

- un fichier unique `accords/NomAccord.js`,
- un tableau `primes[]` exploitable sans retouche manuelle de structure,
- des clés UI explicites (`stateKeyActif`, `stateKeyHeures`) pour chaque modalité activable.

#### Assiette SMH (`inclusDansSMH`)

La CCN Métallurgie définit quels éléments entrent dans l'assiette de vérification du SMH. Pour chaque prime, déterminer :

| Critère | `inclusDansSMH` | Exemples |
|---------|-----------------|----------|
| Complément salarial annuel (modalité de versement) | `true` | Prime de vacances, 13e mois, prime de fin d'année |
| Contrepartie conditions de travail / sujétion | `false` | Prime d'équipe, majorations nuit/dimanche, pénibilité |
| Prime d'ancienneté | `false` par défaut, `true` possible si position juridique explicitement retenue | Doit être justifiée (texte conventionnel/jurisprudence/stratégie contentieuse) |

**Comportement dans l'app :**
- `inclusDansSMH: true` → prime **toujours active** (pas de checkbox). C'est une distribution du salaire permettant d'atteindre le SMH grille, **pas un supplément**. Elle **ne s'ajoute pas** au total annuel affiché. Affichée comme sous-ligne informative du SMH (préfixe « dont »). Influence uniquement la distribution mensuelle.
- `inclusDansSMH: false` → prime **activable/désactivable** par l'utilisateur, **s'ajoute** au-dessus du SMH garanti.

#### Spécificité prime d'équipe (recommandé)

La prime d'équipe peut être modélisée avec une base horaire automatique :

- `autoHeures: true`
- assiette horaire automatique = `151,67 h/mois` (base 35h, sans inclusion des HS)
- pas de saisie manuelle `heuresEquipe` nécessaire côté UI (l'information est portée dans le tooltip)

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
        stateKeyHeures: 'heuresEquipe', // conservé pour compatibilité, ignoré si autoHeures=true
        autoHeures: true,
        defaultHeures: 151.67,
        inclusDansSMH: false,   // Condition de travail → exclu de l'assiette SMH
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
        defaultActif: true,
        inclusDansSMH: true,    // Complément salarial annuel → inclus dans l'assiette SMH (Art. 140 CCNM)
        moisVersement: 7,       // Juillet — déduit du texte de l'accord
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
    anciennete: { seuil: 2, plafond: 25, tousStatuts: true, baseCalcul: 'salaire', barème: { 2: 0.02 }, inclusDansSMH: false },
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

Important :
- Pour une prime horaire avec `autoHeures: true`, ne pas ajouter de saisie d'heures en UI.
- Les HS sont traitées dans la logique horaire ; en forfait jours, ne pas tenter d'appliquer les majorations HS de ce flux.

**Note :** les primes avec `inclusDansSMH: true` sont automatiquement forcées à `true` dans `hydrateAccordInputs()` et ne nécessitent pas de checkbox — l'UI les affiche comme label informatif non-togglable.

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

## Check-list anti-régression (obligatoire)

- Ajouter une prime ne doit pas masquer les autres modalités existantes.
- Une sujétion ne doit jamais passer dans le SMH sans justification explicite.
- Le non-cumul doit rester cohérent (UI et calcul final).
- L'ancienneté respecte la doctrine par défaut (`inclusDansSMH: false`) sauf exception motivée.
- Vérifier les scénarios minimaux : nuit, équipe, astreinte, prime d'objectif, avantage en nature.

### Scénarios minimaux à vérifier

| Scénario | Entrée clé | Résultat attendu |
|---|---|---|
| `Nuit + Dimanche` | `heuresNuit > 0`, `heuresDimanche > 0` | Les deux majorations sont présentes, sans suppression mutuelle non prévue |
| `Prime équipe` | `travailEquipe: true` | Prime d'équipe calculée selon base prévue (autoHeures ou saisie) |
| `Astreinte intervention + HS` | prime intervention active + HS actives | Le non-cumul configuré est appliqué (pas de double comptage) |
| `Prime objectif annuelle` | `valueType: montant`, `inclusDansSMH: true` | Affichage en sous-ligne SMH, pas d'ajout au total |
| `Avantage en nature` | modalité salariale explicite | Classé selon règle d'assiette définie, cohérent doc/calcul |

## Réajustement de l'existant (Convention + Kuhn)

- Convention : expliciter l'assiette SMH dans les définitions CCN (`inclusDansSMH`) pour éviter les ambiguïtés entre doc et calcul.
- Kuhn : aligner la prime d'ancienneté avec la doctrine par défaut (`inclusDansSMH: false`) sauf justification juridique contraire.
- UI/Calcul : vérifier que les modalités basiques et spécifiques accord restent séparées, sans disparition de lignes lors des ajouts de primes.
