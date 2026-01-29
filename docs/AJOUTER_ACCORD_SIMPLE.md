# Guide Simple : Ajouter un Accord d'Entreprise

Ce guide est destiné aux non-développeurs (syndicats, salariés) qui souhaitent ajouter un accord d'entreprise au simulateur.

## Qu'est-ce qu'un Accord d'Entreprise ?

Un accord d'entreprise peut modifier certains aspects de la Convention Collective Nationale (CCN) :
- Prime d'ancienneté (seuil, plafond, taux)
- Majorations (nuit, dimanche)
- Primes spécifiques (équipe, vacances)
- Répartition mensuelle (13e mois)

## Comment Contribuer

### Option 1 : Contacter l'Équipe

Envoyer un email à **ksa.syndic@gmail.com** avec :
- Le nom de votre entreprise
- Le nom de l'accord d'entreprise
- Le fichier PDF de l'accord ou un lien vers le texte officiel
- Les dates importantes (signature, entrée en vigueur)

L'équipe se chargera d'ajouter l'accord au simulateur.

### Option 2 : Contribution GitHub (pour les développeurs)

Si vous avez des compétences en développement :

1. Aller sur le repository GitHub du projet
2. Créer une "Pull Request" avec :
   - Un nouveau fichier pour l'accord
   - Les informations de l'accord au format requis

Voir `docs/AJOUTER_ACCORD.md` pour le guide technique complet.

## Informations Nécessaires

Pour ajouter un accord, nous avons besoin de :

### Informations Générales
- Nom de l'accord
- Nom de l'entreprise
- Date de signature
- Date d'entrée en vigueur
- URL vers le texte officiel (si disponible)

### Prime d'Ancienneté
- Seuil d'ancienneté (ex: 2 ans, 3 ans)
- Plafond (ex: 25 ans, 15 ans)
- S'applique aux cadres ? (oui/non)
- Barème des taux par année d'ancienneté

### Majorations
- Taux majoration nuit (ex: +20%)
- Taux majoration dimanche (ex: +50%)

### Primes Spécifiques
- Prime d'équipe : montant horaire, conditions
- Prime de vacances : montant, mois de versement, conditions

### Répartition Mensuelle
- Répartition sur 13 mois ? (oui/non)
- Mois du versement du 13e mois (ex: novembre)

## Exemple

**Accord Kuhn** :
- Seuil ancienneté : 2 ans (au lieu de 3 ans CCN)
- Plafond : 25 ans (au lieu de 15 ans CCN)
- Majoration nuit : +20% (au lieu de +15% CCN)
- Majoration dimanche : +50% (au lieu de +100% CCN)
- Prime équipe : 0,82 €/heure
- Prime vacances : 525 € en juillet
- 13e mois : novembre

## Questions ?

Pour toute question, contactez **ksa.syndic@gmail.com**.
