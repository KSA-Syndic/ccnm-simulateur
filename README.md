# 🏭 Simulateur de Classification et Rémunération - Métallurgie 2026

> **Un outil simple et gratuit** pour connaître votre classification et vérifier votre salaire minimum conventionnel selon la Convention Collective Nationale de la Métallurgie (CCNM) (grilles à jour 2026, avec historique annuel pour les arriérés).

## 🎯 À quoi sert cet outil ?

Cet outil vous permet de :

- ✅ **Déterminer votre classification** (Groupe/Classe) selon les 6 critères de la CCNM 2024
- ✅ **Calculer votre salaire minimum** (SMH) selon votre classification
- ✅ **Vérifier vos arriérés de salaire** mois par mois si vous êtes sous-payé
- ✅ **Comparer avec/sans accord d'entreprise** pour voir les avantages de votre accord
- ✅ **Générer un rapport PDF** professionnel pour vos démarches

**💡 C'est gratuit, anonyme et sans inscription !**

## 🚀 Comment l'utiliser ?

### Étape 1 : Classification 📊

**Vous connaissez déjà votre classification ?**
- Cliquez sur "Oui, je la connais"
- Sélectionnez votre Groupe (A à I) et votre Classe (1 à 18)

**Vous voulez l'estimer ?**
- Cliquez sur "Non, je veux l'estimer"
- Répondez aux 6 critères classants avec les carrousels
- L'outil calcule automatiquement votre classification

### Étape 2 : Votre Situation 👤

Renseignez vos informations :
- **Ancienneté** dans l'entreprise (en années)
- **Point Territorial** (valeur par défaut : 5,90 € pour le Bas-Rhin)
- **Type de forfait** (si vous êtes cadre : 35h, heures ou jours)
- **Conditions de travail** (travail de nuit, dimanche, équipes postées)

### Étape 3 : Résultat 💰

Découvrez votre rémunération annuelle et mensuelle :
- **Salaire Minimum Hiérarchique (SMH)** selon votre classification
- **Détail du calcul** (primes, majorations, etc.)
- **Comparaison avec/sans accord d'entreprise** (si disponible)
- **Évolution vs inflation** (projection sur plusieurs années)

### Étape 4 : Arriérés de Salaire 📅 (optionnel)

Si votre salaire actuel est inférieur au SMH :
- **Saisissez vos salaires** mois par mois sur la frise chronologique
- **Calculez vos arriérés** automatiquement
- **Générez un rapport PDF** professionnel pour vos démarches

## 🏢 Accords d'Entreprise

L'outil supporte les **accords d'entreprise** qui peuvent améliorer votre rémunération :

- ✅ **Prime d'ancienneté** améliorée (seuil plus bas, plafond plus haut)
- ✅ **Majorations** avantageuses (nuit, dimanche)
- ✅ **Primes spécifiques** (équipe, vacances, etc.)
- ✅ **Répartition sur 13 mois** au lieu de 12

**Exemple : accord d'entreprise** (défini dans le dossier `accords/`, ex. Kuhn)
- Ancienneté dès 2 ans (au lieu de 3 ans)
- Plafond à 25 ans (au lieu de 15 ans)
- Majoration nuit +20% (au lieu de +15%)
- Majoration dimanche +50% (au lieu de +100%)
- Prime d'équipe : taux accord, avec base horaire calculée automatiquement (151,67h)
- Prime de vacances : 525 € en juillet

### Comment utiliser un accord ?

1. **Via l'URL** : Ajoutez `?accord=<id>` dans l'adresse (ex. `?accord=kuhn` si un accord avec cet id est chargé)
2. **Dans l'application** : Cochez "Appliquer l'accord d'entreprise" dans l'étape 3
3. **Comparaison** : Décochez pour comparer avec/sans accord

## 📚 Documentation

### Pour les Utilisateurs

- **[Guide d'utilisation](README.md)** (ce fichier) : Présentation simple de l'outil
- **[Guide pour ajouter un accord](docs/AJOUTER_ACCORD_SIMPLE.md)** : Comment contribuer si vous avez un accord d'entreprise à ajouter

### Pour les Développeurs et Syndicats

- **[Documentation technique](README_TECHNIQUE.md)** : Architecture, modules, flux de données
- **[Guide technique pour ajouter un accord](docs/AJOUTER_ACCORD.md)** : Instructions détaillées pour développeurs
- **[Intégrer un accord via texte complet + prompt IA](docs/INTEGRER_ACCORD_TEXTE_ET_IA.md)** : Fournir le texte de l'accord et un prompt pour générer le fichier JS avec un assistant IA
- **[PRD (Product Requirements Document)](PRD.md)** : Spécifications complètes de l'application

## 🔧 Installation (pour développeurs)

```bash
# Cloner le repository
git clone https://github.com/votre-repo/simulateur-metallurgie.git

# Installer les dépendances
npm install

# Lancer les tests
npm test

# Ouvrir dans un navigateur
# Ouvrir index.html directement ou utiliser un serveur local
```

## 📖 Fonctionnalités Détaillées

### Classification Automatique

L'outil utilise les **6 critères classants** de la CCNM 2024 :
1. **Complexité** : Difficulté et technicité du travail
2. **Connaissances** : Savoirs requis (formation, expérience)
3. **Autonomie** : Latitude d'action et niveau de contrôle
4. **Contribution** : Impact sur l'organisation
5. **Encadrement** : Dimension managériale ou appui technique
6. **Communication** : Nature et complexité des échanges

Chaque critère est noté de 1 à 10. Le total (6 à 60 points) détermine votre classification.

### Calcul de Rémunération

L'outil calcule automatiquement :
- **SMH de base** selon votre classification
- **Prime d'ancienneté** (CCN ou accord d'entreprise)
- **Majorations** (nuit, dimanche, heures supplémentaires)
- **Primes spécifiques** (équipe, vacances selon accord)
- **Forfaits cadres** (+15% heures, +30% jours)

### Arriérés de Salaire

Si vous êtes sous-payé, l'outil vous permet de :
- **Saisir vos salaires** mois par mois sur une frise chronologique interactive
- **Calculer précisément** les arriérés avec l'ancienneté progressive
- **Respecter la prescription** (3 ans en arrière)
- **Générer un PDF** professionnel avec tous les détails

## 🎨 Intégration dans un Site Web

L'outil peut être intégré dans n'importe quel site via **iframe** :

```html
<iframe 
    src="https://simulateur.cfdt-kuhn.fr?accord=kuhn&iframe=true&bgcolor=#ffffff" 
    width="100%" 
    height="800px"
    frameborder="0">
</iframe>
```

**Paramètres URL disponibles :**
- `?accord=<id>` : Sélectionner un accord d'entreprise (id défini dans le fichier d'accord, ex. kuhn)
- `?bgcolor=#ffffff` : Couleur de fond autour du simulateur
- `?iframe=true` : Mode iframe (détection automatique)

## ⚖️ Avertissement Légal

⚠️ **Cet outil est indicatif** et ne remplace pas un conseil juridique professionnel.

- Les calculs sont basés sur la CCNM 2024 et les accords d'entreprise disponibles
- Les résultats peuvent varier selon votre situation spécifique
- **Consultez un avocat ou votre syndicat** avant toute démarche juridique

## 🤝 Contribuer

### Ajouter un Accord d'Entreprise

Vous avez un accord d'entreprise à ajouter ? C'est simple !

**Option 1 : Via Email** 📧
Envoyez un email à **ksa.syndic@gmail.com** avec :
- Le nom de votre entreprise
- Le nom de l'accord
- Le fichier PDF ou lien vers le texte officiel
- Les dates importantes (signature, entrée en vigueur)

**Option 2 : Via GitHub** 💻
1. Créez une Pull Request avec le fichier de l'accord
2. Suivez le [guide technique](docs/AJOUTER_ACCORD.md)
3. L'équipe validera et intégrera votre contribution

Voir le [guide simple](docs/AJOUTER_ACCORD_SIMPLE.md) pour plus de détails.

### Signaler un Bug ou Suggérer une Amélioration

- Ouvrez une [Issue sur GitHub](https://github.com/votre-repo/issues)
- Ou contactez **ksa.syndic@gmail.com**

## 📝 Mise à Jour Annuelle

L'outil est mis à jour chaque année avec :
- ✅ Les nouveaux SMH de la CCNM
- ✅ Les nouveaux accords d'entreprise
- ✅ Les nouvelles valeurs du Point Territorial

**Dernière mise à jour** : 2026 (SMH + historique annuel)

## 🌐 Liens Utiles

- **Textes conventionnels** : [UIMM - La Fabrique de l'Avenir](https://uimm.lafabriquedelavenir.fr/textes-conventionnels-metallurgie/)
- **Convention Collective** : CCNM 2024 (IDCC 3248)
- **Point Territorial** : [Code du Travail](https://code.travail.gouv.fr/contribution/3248-quand-le-salarie-a-t-il-droit-a-une-prime-danciennete-quel-est-son-montant)

## 📧 Contact

Pour toute question ou contribution :
- **Email** : ksa.syndic@gmail.com
- **GitHub** : [Repository du projet](https://github.com/votre-repo)

---

**Réalisé par CFDT Kuhn** | [cfdt-kuhn.fr](https://cfdt-kuhn.fr)

*Outil développé pour aider les salariés de la métallurgie à connaître leurs droits et à vérifier leur rémunération.*
