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

## Déploiement GitHub Pages

L'application est automatiquement déployée sur GitHub Pages à chaque push sur la branche `main`.

### Configuration initiale

1. **Créer le repository GitHub** et pousser le code :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
   git push -u origin main
   ```

2. **Activer GitHub Pages** :
   - Allez dans les **Settings** du repository
   - Dans la section **Pages** (menu latéral)
   - Source : sélectionnez **GitHub Actions**

3. Le workflow se déclenchera automatiquement et votre site sera disponible à :
   `https://VOTRE_USERNAME.github.io/VOTRE_REPO/`

### Déploiement manuel

Vous pouvez aussi déclencher un déploiement manuellement :
1. Allez dans l'onglet **Actions** du repository
2. Sélectionnez le workflow **Deploy to GitHub Pages**
3. Cliquez sur **Run workflow**

## Licence

Usage interne - Convention Collective Nationale de la Métallurgie 2024
