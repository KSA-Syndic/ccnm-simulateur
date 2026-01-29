# README Technique - Simulateur Métallurgie

## Conformité Juridique

**Sources Juridiques de Référence :**
- **CCNM 2024 :** Convention Collective Nationale de la Métallurgie (IDCC 3248) - Entrée en vigueur 01/01/2024
- **Code du Travail :** Art. L2254-2 (Principe de faveur)
- **Accords d'entreprise :** Définis dans le dossier `accords/` (ex. KuhnAgreement.js), chargés à l'exécution

**Principe de Faveur :** Le système applique systématiquement le principe de faveur (Art. L2254-2 Code du Travail) en comparant les règles CCN et Accord et en choisissant la plus avantageuse pour le salarié.

## Architecture

L'application est structurée de manière modulaire pour faciliter la maintenance et l'extension.

### Structure des Modules

```
projet/
├── accords/                 # Définitions des accords (à la racine, hors code app)
│   └── KuhnAgreement.js     # Exemple d'accord d'entreprise (schéma générique)
└── src/                     # Code applicatif
    ├── core/                # Modules fondamentaux
    │   ├── state.js
    │   ├── config.js
    │   ├── constants.js
    │   └── URLParams.js
    ├── agreements/          # Moteur accords (registre, chargement, schéma)
    │   ├── AgreementInterface.js
    │   ├── AgreementRegistry.js   # importe depuis ../../accords/
    │   └── AgreementLoader.js
    ├── classification/      # Moteur de classification
    │   └── ClassificationEngine.js
    ├── remuneration/       # Calculs de rémunération
    │   ├── RemunerationCalculator.js
    │   ├── PrimeCalculator.js
    │   ├── MajorationCalculator.js
    │   └── ForfaitCalculator.js
    ├── arretees/           # Arriérés, timeline, PDF
    ├── ui/                 # Composants UI
    └── utils/
```

## Flux de Données

### 1. Initialisation

1. `app-integration.js` charge les paramètres URL
2. Charge l'accord d'entreprise si présent dans l'URL
3. Applique les styles iframe si nécessaire
4. Met à jour le header avec l'accord sélectionné

### 2. Classification

1. L'utilisateur saisit les scores des 6 critères
2. `ClassificationEngine.calculateClassification()` calcule le score total
3. Mapping vers groupe/classe via `CONFIG.MAPPING_POINTS`
4. Affichage de la classification dans l'UI

### 3. Calcul de Rémunération

1. `RemunerationCalculator.calculateAnnualRemuneration()` est appelé avec :
   - État de l'application (`state`)
   - Accord d'entreprise actif (ou `null` pour CCN seule)
   - Options (`mode: 'full'` ou `'smh-only'`)
2. Le calculateur utilise les modules spécialisés :
   - `PrimeCalculator` pour les primes d'ancienneté
   - `MajorationCalculator` pour nuit/dimanche
   - `ForfaitCalculator` pour les forfaits cadres
3. Retourne un objet avec `total`, `details`, `scenario`

### 4. Arriérés

1. L'utilisateur saisit les dates et salaires mois par mois
2. `TimelineManager` gère la frise chronologique interactive
3. `ArreteesCalculator.calculerArreteesMoisParMois()` calcule les arriérés
4. `SalaryCurve` affiche le graphique Chart.js
5. `PDFGenerator` génère le PDF final

## État du refactoring

Le refactoring est **terminé**. L’architecture actuelle :

- **`app.js`** : orchestre l’UI (wizard, écrans, événements) et délègue tous les calculs aux modules via `src/compat/expose-to-app.js`. Il ne contient plus de formules métier dupliquées.
- **Calculs** : `RemunerationCalculator`, `ArreteesCalculator`, `PDFGenerator`, etc. sont la source unique pour rémunération, arriérés et PDF.
- **Compat** : `expose-to-app.js` expose sur `window` les wrappers qui synchronisent le state puis appellent les modules ; il est chargé avant `app.js` (modules ES6 chargés en premier).

## Principes de Conception

### Source Unique de Vérité

- **Calculs** : `RemunerationCalculator` est la source unique pour tous les calculs
- **État** : `state.js` centralise toutes les valeurs saisies
- **Configuration** : `config.js` contient toutes les données CCN

### Modularité

- Chaque module a une responsabilité unique
- Pas de dépendances circulaires
- Tests unitaires par module

### Extensibilité

- Système d'accords générique : ajout facile de nouveaux accords
- Interface standardisée : `AgreementInterface.js`
- Registre centralisé : `AgreementRegistry.js`

## Guide de Développement

### Ajouter un Nouvel Accord

Voir `docs/AJOUTER_ACCORD.md` pour le guide complet.

### Modifier un Calcul

1. Identifier le module concerné dans `src/remuneration/`
2. Modifier la logique dans le module
3. Mettre à jour les tests unitaires
4. Vérifier la cohérence avec les autres calculs

### Ajouter une Fonctionnalité

1. Créer le module dans le dossier approprié
2. Exporter les fonctions publiques
3. Importer dans `app-integration.js` si nécessaire
4. Ajouter les tests unitaires

## Tests

### Configuration

- Vitest pour les tests unitaires et fonctionnels
- jsdom pour l'environnement DOM
- @testing-library/dom pour les tests DOM

### Exécution

```bash
npm test              # Exécuter tous les tests
npm run test:ui       # Interface graphique
npm run test:coverage # Avec couverture de code
```

### Structure des Tests

```
tests/
├── setup.js              # Configuration globale
├── unit/                 # Tests unitaires par module
│   ├── classification/
│   ├── remuneration/
│   └── agreements/
└── integration/          # Tests fonctionnels
    ├── wizard.test.js
    ├── arretees.test.js
    └── pdf.test.js
```

## Déploiement

L'application est déployée sur GitHub Pages. Voir `.github/workflows/deploy.yml` pour la configuration CI/CD.

## Maintenance Annuelle

### Mise à Jour des SMH

1. Modifier `src/core/config.js`
2. Mettre à jour `CONFIG.SMH` avec les nouvelles valeurs
3. Vérifier les barèmes débutants si nécessaire
4. Tester les calculs avec les nouvelles valeurs

### Ajout d'un Nouvel Accord

1. Créer un nouveau fichier dans `src/agreements/` (ex: `MonAccord.js`)
2. Suivre le schéma défini dans `AgreementInterface.js`
3. Enregistrer l'accord dans `AgreementRegistry.js`
4. Documenter dans `docs/AJOUTER_ACCORD.md`

## Compatibilité

- Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Support ES6 modules
- Chart.js pour les graphiques
- jsPDF pour la génération PDF
