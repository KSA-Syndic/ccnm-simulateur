# Guide des Tests

Ce dossier contient tous les tests de l'application Simulateur Métallurgie.

## Structure

```
tests/
├── setup.js              # Configuration globale Vitest
├── unit/                 # Tests unitaires par module
│   ├── ClassificationEngine.test.js
│   ├── RemunerationCalculator.test.js
│   ├── PrimeCalculator.test.js
│   ├── MajorationCalculator.test.js
│   ├── AgreementRegistry.test.js
│   ├── formatters.test.js
│   └── textHelpers.test.js
└── integration/          # Tests fonctionnels
    ├── wizard.test.js
    ├── arretees.test.js
    └── pdf.test.js
```

## Exécution des Tests

### Installation des dépendances

```bash
npm install
```

### Exécuter tous les tests

```bash
npm test
```

### Exécuter avec interface graphique

```bash
npm run test:ui
```

### Exécuter avec couverture de code

```bash
npm run test:coverage
```

### Exécuter un fichier spécifique

```bash
npm test tests/unit/ClassificationEngine.test.js
```

## Types de Tests

### Tests Unitaires

Testent chaque module de manière isolée :
- **ClassificationEngine** : Calcul de classification, mapping points → groupe/classe
- **RemunerationCalculator** : Calculs de rémunération (full et SMH seul)
- **PrimeCalculator** : Calculs des primes (ancienneté, équipe, vacances)
- **MajorationCalculator** : Calculs des majorations (nuit, dimanche)
- **AgreementRegistry** : Gestion du registre des accords
- **formatters** : Formatage des montants et échappement HTML
- **textHelpers** : Gestion des acronymes et formatage avec unités

### Tests Fonctionnels

Testent les parcours utilisateur complets :
- **Wizard** : Navigation entre les étapes, validation des données
- **Arriérés** : Calculs mois par mois, gestion de la timeline, prescription
- **PDF** : Génération du PDF, formatage, gestion des dépassements

## Cas de Test Types Métallurgie

Les tests incluent des cas typiques pour :
- Ouvrier classe C5, 10 ans ancienneté
- Technicien classe D7, 5 ans ancienneté
- Cadre F11 débutant, 4 ans expérience
- Cadre G13 confirmé, forfait jours
- Non-cadre avec accord Kuhn, prime équipe, travail nuit

## Ajouter de Nouveaux Tests

### Test Unitaire

```javascript
import { describe, it, expect } from 'vitest';
import { maFonction } from '../../src/mon-module/MonModule.js';

describe('MonModule', () => {
    it('devrait faire quelque chose', () => {
        const result = maFonction();
        expect(result).toBe(expectedValue);
    });
});
```

### Test Fonctionnel

```javascript
import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/dom';

describe('MonParcours', () => {
    it('devrait permettre à l\'utilisateur de...', () => {
        // Setup DOM
        // Simuler interaction
        // Vérifier résultat
    });
});
```

## Bonnes Pratiques

1. **Un test = une assertion principale** : Un test doit vérifier une seule chose
2. **Noms descriptifs** : Les noms de tests doivent décrire ce qui est testé
3. **Isolation** : Chaque test doit être indépendant
4. **Données de test réalistes** : Utiliser des valeurs réalistes pour la métallurgie
5. **Coverage** : Viser une couverture de code élevée (> 80%)

## Debugging

Pour déboguer un test spécifique :

```bash
npm test -- --reporter=verbose tests/unit/MonTest.test.js
```

Ou utiliser `console.log` dans les tests pour inspecter les valeurs.
