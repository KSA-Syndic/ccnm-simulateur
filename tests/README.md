# Guide des tests

Ce dépôt combine des tests **Vitest** (unitaires et d'intégration), des tests **par propriétés** (fast-check), et des tests **E2E Playwright**.

## Structure

```
tests/
├── setup.js                 # Configuration globale Vitest (jsdom)
└── integration/
    └── wizard.test.js       # Parcours wizard (DOM)

src/domain/**/__tests__/     # Tests colocalisés au domaine (TypeScript)
├── remuneration/
│   ├── engine.test.ts           # 15 tests moteur paramétrique
│   └── engine.property.test.ts  # 8 tests fast-check
└── agreements/
    └── mock-agreement.ts        # Pattern d'accord factice pour les tests moteur

e2e/
└── baseline.spec.ts         # 14+ scénarios E2E Playwright
```

## Exécution

### Dépendances

```bash
npm install
```

### Tests unitaires et d'intégration (Vitest)

```bash
npm run test:run    # une passe (CI, scripts)
npm test            # mode watch
npm run test:ui     # interface Vitest
npm run test:coverage
```

### Test d'un fichier précis

```bash
npm run test:run -- src/domain/remuneration/__tests__/engine.test.ts
npm run test:run -- tests/integration/wizard.test.js
```

### Tests E2E (Playwright)

```bash
npm run e2e
```

Fichier principal : **`e2e/baseline.spec.ts`**. Il contient **14 scénarios** de capture d'écran (régression visuelle) couvrant les **4 étapes** du wizard et des variantes :

- **Étape 1** : choix du mode, saisie directe (ex. groupe C), estimation par critères, roulettes modifiées
- **Étape 2** : page vierge, modalités non-cadre, cadre avec forfait
- **Étape 3** : résultats (non-cadre, cadre), bascule 12 / 13 mois
- **Étape 4** : formulaire arriérés, courbe après date, saisie via bloc flottant
- **En-tête** : bannière du simulateur

## Types de tests

### Vitest (unitaires / intégration)

- **Moteur de rémunération** : `computeElement`, `resolveBySubstitution`, `buildComputeContext`, `aggregateRemunerationDetails`
- **Classification** : critères → groupe / classe
- **Wizard** : parcours DOM (jsdom)

### Tests par propriétés (fast-check)

Fichier **`src/domain/remuneration/__tests__/engine.property.test.ts`** : invariantes sur le moteur de rémunération paramétrique (génération de données aléatoires contraintes, propriétés à vérifier sur les sorties).

### E2E Playwright

Parcours réels dans le navigateur, principalement **snapshots** pour détecter les régressions d'interface sur l'app Vue déployée ou servie en preview.

### Accord factice pour le domaine

Pour tester le moteur sans dépendre d'un accord d'entreprise réel, utiliser **`createMockAgreement`** depuis **`src/domain/agreements/__tests__/mock-agreement.ts`** (objet **`Agreement`** complet et minimal).

## Ajouter des tests

### Exemple Vitest (TypeScript)

```typescript
import { describe, it, expect } from 'vitest';
import { maFonction } from '../mon-module';

describe('MonModule', () => {
  it('devrait …', () => {
    expect(maFonction()).toBe(valeurAttendue);
  });
});
```

### Bonnes pratiques

1. **Un test = une intention principale** claire
2. **Noms explicites** (comportement attendu)
3. **Isolation** : pas de dépendance entre tests
4. **Données réalistes** pour les cas métallurgie lorsque c'est pertinent
5. Après changement du **moteur** ou des **formules** : **`npm run test:run`** obligatoire ; viser aussi un passage **`npm run e2e`** avant release

## Débogage

```bash
npm run test:run -- --reporter=verbose src/domain/remuneration/__tests__/engine.test.ts
```

Ou `console.log` / breakpoints sous Vitest / Playwright selon l'outil utilisé.
