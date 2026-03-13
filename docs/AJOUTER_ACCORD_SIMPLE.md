# Guide Simple : Ajouter un Accord d'Entreprise

Ce guide est destiné aux non-développeurs (syndicats, salariés) qui souhaitent ajouter un accord d'entreprise au simulateur.

## Qu'est-ce qu'un Accord d'Entreprise ?

Un accord d'entreprise peut modifier certains aspects de la Convention Collective Nationale (CCN) :
- Prime d'ancienneté (seuil, plafond, taux)
- Majorations (nuit, dimanche)
- Primes spécifiques (équipe, vacances)
- Répartition mensuelle (13e mois)

Règle importante :
- **Ne fournir que ce qui diffère de la CCN.**
- Si une règle est identique à la CCN, ne pas la remonter comme "spécifique accord".

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
Pour chaque prime, nous avons besoin de :
- Nom de la prime (ex: prime d'équipe, prime de vacances, prime de Noël)
- Montant ou taux (ex: 0,82 €/h, 525 €/an, +15%)
- Mois de versement (ex: juillet pour vacances, décembre pour Noël)
- Conditions (ancienneté requise, catégorie de personnel, etc.)
- **Inclusion dans le SMH** : cette prime est-elle un complément de salaire (oui) ou une contrepartie de conditions de travail (non) ? Cela détermine si l'employeur peut l'utiliser pour atteindre le minimum conventionnel. En cas de doute, l'équipe analysera la CCN.

Note pratique (prime d'équipe) :
- Dans l'outil, la prime d'équipe peut être calculée automatiquement sur `151,67 h/mois` (base 35h), sans saisir d'heures manuellement.

### Répartition Mensuelle
- Répartition sur 13 mois ? (oui/non)
- Mois du versement du 13e mois (précisé dans votre accord)

## Exemple

**Exemple d'accord** :
- Seuil ancienneté : 2 ans (au lieu de 3 ans CCN)
- Plafond : 25 ans (au lieu de 15 ans CCN)
- Majoration nuit : +20%
- Majoration dimanche : +50%
- Prime équipe : 0,82 €/h (exclue du SMH — condition de travail)
- Prime vacances : 525 €/an versée en juillet (incluse dans le SMH — complément salarial)
- 13e mois : versé en novembre

## Questions ?

Pour toute question, contactez **ksa.syndic@gmail.com**.
