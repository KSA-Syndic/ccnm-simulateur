# Simulateur de Classification et Rémunération - Métallurgie 2024

Application web permettant aux salariés de la métallurgie de déterminer leur classification (Groupe/Classe) et leur salaire minimum conventionnel selon la nouvelle Convention Collective Nationale de la Métallurgie (CCNM 2024).

## Fonctionnalités

### 1. Cotation par Roulette
- Évaluation intuitive sur 6 critères classants (de 1 à 10)
- Interface "tambour" avec navigation par clic, scroll ou swipe tactile
- Tooltips explicatifs pour chaque critère et degré

### 2. Classification Automatique/Manuelle
- Calcul automatique basé sur le score total (6 à 60 points)
- Mode manuel pour saisir directement sa classification connue
- Basculement facile entre les deux modes

### 3. Calcul de Rémunération
Trois scénarios gérés automatiquement :

| Scénario | Classes | Spécificités |
|----------|---------|--------------|
| Non-Cadres | 1 à 10 (Groupes A-E) | Prime d'ancienneté (+1%/an, plafond 15%) |
| Cadres Confirmés | 11 à 18 (Groupes F-I) | Majorations forfaits (+15% heures, +30% jours) |
| Cadres Débutants | 11 uniquement | Barème salariés débutants si ancienneté < 6 ans |

## Installation

### Utilisation Standalone
Ouvrez simplement `index.html` dans un navigateur web moderne.

### Intégration Hugo (Thème Book)
1. Copiez les fichiers dans votre dossier de contenu Hugo
2. Incluez le HTML dans une page Markdown avec le shortcode `rawhtml` ou similaire
3. Les styles sont compatibles avec les variables CSS du thème Book

## Structure des Fichiers

```
├── index.html      # Page principale
├── styles.css      # Styles CSS (compatible Hugo Book)
├── config.js       # Données métier centralisées (SMH, grilles)
├── app.js          # Logique applicative
├── PRD.md          # Spécifications fonctionnelles
└── README.md       # Cette documentation
```

## Mise à Jour Annuelle

Pour mettre à jour les salaires (révision annuelle), modifiez uniquement le fichier `config.js` :

```javascript
// Dans CONFIG.SMH, mettez à jour les montants
SMH: {
    1: 21500,   // A1 - Nouveau montant
    2: 22000,   // A2
    // ...
}
```

## Dépendances

- **Popper.js** (CDN) - Positionnement des tooltips
- **Tippy.js** (CDN) - Gestion des tooltips

Aucun framework lourd (React/Vue) pour garantir la portabilité.

## Tests de Cohérence

| Test | Entrée | Résultat Attendu |
|------|--------|------------------|
| Score minimum | 6 points | Classe A1 |
| Score maximum | 60 points | Classe I18 |
| Prime ancienneté | Classe 5, 10 ans | SMH + 10% |
| Forfait jours | Classe F11 | SMH × 1.30 |

## Licence

Usage interne - Convention Collective Nationale de la Métallurgie 2024
