# Guide : Ajouter un Nouvel Accord d'Entreprise

Ce guide explique comment ajouter un nouvel accord d'entreprise au simulateur.

## Structure d'un Accord

Un accord d'entreprise doit respecter le schéma défini dans `src/agreements/AgreementInterface.js`. Voici un exemple complet :

```javascript
export const MonAccord = {
    id: 'mon-accord',
    nom: 'Mon Accord d\'Entreprise',
    nomCourt: 'Mon Accord',
    url: 'https://example.com/accord.pdf',
    dateEffet: '2024-01-01',
    dateSignature: '2023-12-15',
    
    anciennete: {
        seuil: 2,
        plafond: 25,
        tousStatuts: true,
        baseCalcul: 'salaire',
        barème: {
            2: 0.02,
            3: 0.03,
            // ...
        }
    },
    
    majorations: {
        nuit: {
            posteNuit: 0.20,
            posteMatin: 0.15,
            plageDebut: 20,
            plageFin: 6,
            seuilHeuresPosteNuit: 2
        },
        dimanche: 0.50
    },
    
    primes: {
        equipe: {
            montantHoraire: 0.82,
            conditions: ['Condition 1', 'Condition 2'],
            champApplication: 'Non-cadres',
            calculMensuel: true
        },
        vacances: {
            montant: 525,
            moisVersement: 7,
            conditions: ['Ancienneté ≥ 1 an'],
            etalement: false
        }
    },
    
    repartition13Mois: {
        actif: true,
        moisVersement: 11,
        inclusDansSMH: true
    },
    
    labels: {
        nomCourt: 'Mon Accord',
        tooltip: 'Description courte',
        description: 'Description complète',
        badge: '🏢'
    },
    
    metadata: {
        version: '1.0',
        articlesSubstitues: ['142', '143'],
        territoire: 'Bas-Rhin (67)',
        entreprise: 'Mon Entreprise'
    }
};
```

## Étapes pour Ajouter un Accord

### 1. Créer le Fichier de l'Accord

Créer un nouveau fichier dans `src/agreements/` :

```javascript
// src/agreements/MonAccord.js
import { validateAgreement } from './AgreementInterface.js';

export const MonAccord = {
    // ... structure complète de l'accord
};

// Validation
if (!validateAgreement(MonAccord)) {
    console.error('L\'accord MonAccord n\'est pas valide');
}
```

### 2. Enregistrer l'Accord

Modifier `src/agreements/AgreementRegistry.js` :

```javascript
import { MonAccord } from './MonAccord.js';

function initializeRegistry() {
    registerAgreement(KuhnAgreement);
    registerAgreement(MonAccord); // Ajouter ici
}
```

### 3. Tester l'Accord

1. Lancer l'application avec `?accord=mon-accord` dans l'URL
2. Vérifier que l'accord est chargé correctement
3. Tester les calculs avec l'accord activé

## Contribution

### Via GitHub

1. Fork le repository
2. Créer une branche `feature/accord-mon-accord`
3. Ajouter le fichier de l'accord
4. Mettre à jour `AgreementRegistry.js`
5. Créer une Pull Request

### Via Email

Envoyer un email à `ksa.syndic@gmail.com` avec :
- Le nom de l'accord d'entreprise
- Le fichier PDF ou lien vers le texte de l'accord
- Les informations nécessaires pour remplir le schéma

## Schéma Complet

Voir `src/agreements/AgreementInterface.js` pour la documentation complète du schéma avec tous les champs possibles.
