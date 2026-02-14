# Intégrer un accord d'entreprise via texte complet et prompt IA

Ce guide permet d’intégrer un accord d’entreprise dans le simulateur à partir du **texte intégral** de l’accord (PDF, site officiel, etc.) en utilisant un **assistant IA** (Cursor, ChatGPT, Claude, etc.) pour produire le fichier JavaScript attendu par l’application.

## Objectif

1. Vous fournissez le **texte complet** (ou les extraits pertinents) de l’accord d’entreprise.
2. Vous utilisez le **prompt IA** ci-dessous en y collant ce texte.
3. L’IA produit le **contenu du fichier** `accords/NomAccord.js` conforme au schéma du simulateur.
4. Vous créez le fichier, vous l’enregistrez dans le registre, puis vous testez.

## Prérequis

- **Texte de l’accord** : intégral ou au minimum les parties sur primes d’ancienneté, majorations (nuit, dimanche), primes spécifiques (équipe, vacances, Noël, etc.), répartition mensuelle (13e mois), dates et métadonnées.
- **Assistant IA** : Cursor, ChatGPT, Claude ou autre, capable de générer du code à partir d’instructions et d’un texte.

## Étapes

### 1. Récupérer le texte de l’accord

- **PDF** : copier-coller le texte depuis le PDF, ou utiliser un outil d’extraction (OCR si nécessaire).
- **Site officiel** : copier les articles ou paragraphes concernant rémunération, primes, majorations, 13e mois.
- **Document Word / autre** : copier les sections pertinentes.

Organisez le texte de façon lisible (titres d’articles, paragraphes). Vous pouvez ajouter en tête : nom de l’entreprise, nom de l’accord, date de signature, date d’entrée en vigueur, lien vers le texte officiel.

### 2. Copier le prompt IA

Copiez **intégralement** le bloc « Prompt IA à utiliser » ci-dessous (tout le contenu entre les marqueurs).

### 3. Soumettre à l’IA

1. Ouvrez une conversation avec l’assistant IA (Cursor Composer, ChatGPT, Claude, etc.).
2. Collez d’abord le **prompt IA** (voir section suivante).
3. Dans le même message ou juste après, collez le **texte de l’accord** (ou indiquez « Voici le texte de l’accord : » puis le texte).

Demandez explicitement : *« Produis uniquement le contenu du fichier JavaScript pour cet accord, prêt à être enregistré dans le dossier `accords/` du projet, avec l’import de `validateAgreement` et l’appel de validation en fin de fichier. »*

### 4. Récupérer le fichier généré

- L’IA doit retourner un **seul fichier JavaScript** : le contenu de `accords/NomAccord.js`.
- Le fichier doit commencer par :  
  `import { validateAgreement } from '../src/agreements/AgreementInterface.js';`  
  et se terminer par un appel du type :  
  `if (!validateAgreement(NomAccord)) { ... }`
- Vérifiez que l’**identifiant** `id` de l’accord est en **kebab-case** (ex. `mon-accord`) et cohérent avec le nom du fichier (ex. `MonAccord.js`).

### 5. Créer le fichier dans le projet

1. À la **racine du projet**, dans le dossier **`accords/`**, créez un fichier nommé par exemple `MonAccord.js` (ou le nom choisi pour l’accord).
2. Collez le code généré par l’IA dans ce fichier.
3. Enregistrez.

### 6. Enregistrer l’accord dans le registre

Ouvrez **`src/agreements/AgreementRegistry.js`** et :

1. Ajoutez l’import :  
   `import { MonAccord } from '../../accords/MonAccord.js';`
2. Dans `initializeRegistry()`, ajoutez :  
   `registerAgreement(MonAccord);`

### 7. Déclarer les entrées d’accord si besoin

Si l’accord introduit de **nouvelles** clés (ex. prime Noël avec `stateKeyActif: 'primeNoel'`) :

- Dans **`src/core/state.js`**, dans `accordInputs`, ajoutez la clé avec une valeur par défaut (ex. `primeNoel: false`).
- Adaptez l’UI (étape 3 du wizard) si nécessaire pour afficher les options liées à ces clés (voir `src/app-integration.js` et la construction dynamique des options à partir de `getPrimes(agreement)`).

### 8. Tester

1. Lancez l’application avec **`?accord=mon-accord`** (ou l’`id` choisi) dans l’URL.
2. Vérifiez que l’accord se charge, que les primes/majorations s’affichent et que les calculs sont cohérents avec le texte de l’accord.

---

## Prompt IA à utiliser

**Copiez tout le bloc ci-dessous**, puis collez le texte de l’accord après la ligne « TEXTE DE L'ACCORD : ».

```
Tu es un expert en droit du travail et en modélisation de données pour une application de simulation de rémunération (Convention collective métallurgie, accords d'entreprise).

═══════════════════════════════════════════════════════════════
CONTEXTE APPLICATION
═══════════════════════════════════════════════════════════════
- Simulateur de rémunération CCN Métallurgie (IDCC 3248) avec possibilité d'appliquer un accord d'entreprise.
- Les accords sont définis dans des fichiers JavaScript placés dans le dossier `accords/` à la racine du projet.
- Chaque fichier exporte un seul objet accord et appelle `validateAgreement(accord)` en fin de fichier.
- L'import utilisé en tête de fichier est : `import { validateAgreement } from '../src/agreements/AgreementInterface.js';`

═══════════════════════════════════════════════════════════════
MÉTHODOLOGIE D'ANALYSE DE LA CCN — LOGIQUE DE LECTURE
═══════════════════════════════════════════════════════════════
Tu dois TOUJOURS te référer à la version en vigueur de la CCN Métallurgie (IDCC 3248) pour appliquer les règles ci-dessous. La CCN évolue ; les articles mentionnés ici le sont à titre de repère logique, pas de référence figée. En cas de doute, relis le texte source de la convention plutôt que de te fier à un numéro d'article isolé.

ASSIETTE DU SMH (Salaire Minimum Hiérarchique) — LOGIQUE D'INCLUSION/EXCLUSION
La CCN définit ce qui entre dans l'assiette de vérification du SMH. La logique à appliquer :

1. LIRE l'article de la CCN en vigueur relatif à l'assiette des SMH (historiquement Art. 140 CCNM, mais le numéro peut changer lors de mises à jour). Cet article détermine quels éléments de rémunération sont pris en compte pour vérifier si l'employeur atteint le minimum.

2. ANALYSER chaque élément de rémunération de l'accord en se posant la question :
   « Cet élément est-il un complément salarial annuel (modalité de versement du salaire) ou une contrepartie de conditions de travail / sujétion particulière ? »

3. APPLIQUER la règle :
   - INCLUS dans le SMH (inclusDansSMH: true) : éléments qui constituent un complément salarial annuel, c'est-à-dire une modalité de versement du salaire de base. Exemples typiques : prime de vacances (complément annuel versé en été), 13e mois (répartition du salaire sur 13 versements), prime de fin d'année. L'employeur peut les utiliser pour atteindre le minimum conventionnel.
   - EXCLUS du SMH (inclusDansSMH: false) : éléments qui compensent des conditions de travail particulières ou des sujétions. Exemples typiques : prime d'ancienneté (exclue par la CCN et la jurisprudence), majorations nuit/dimanche/équipe (contrepartie de conditions de travail), primes de pénibilité, primes de rendement individuelles.

4. EN CAS DE DOUTE : si le texte de l'accord ou de la CCN est ambigu sur l'inclusion d'un élément, mettre inclusDansSMH: false par défaut (plus protecteur pour le salarié) et ajouter un commentaire explicatif.

5. PRIME D'ANCIENNETÉ : toujours inclusDansSMH: false — c'est une règle constante confirmée par le Conseil d'État et la jurisprudence, indépendante des évolutions de la CCN.

SÉMANTIQUE ESSENTIELLE — NE PAS CONFONDRE :
Les primes inclusDansSMH: true NE S'AJOUTENT PAS au SMH. Elles constituent une distribution particulière du salaire permettant d'atteindre le SMH grille, pas un supplément. Le SMH reste le montant défini par la grille CCN. La prime de vacances (par exemple 525 €) est une partie du SMH, pas un montant en plus.
Concrètement dans le simulateur :
- Le total annuel affiché = SMH grille + forfait cadres + éléments EXCLUS du SMH (ancienneté, majorations).
- Les primes inclusDansSMH: true n'augmentent pas ce total ; elles sont affichées en sous-lignes informatives rattachées au SMH (préfixe « dont »).
- Elles sont TOUJOURS actives (pas de checkbox) et influencent uniquement la distribution mensuelle (le mois de leur versement a un montant attendu différent).

MOIS DE VERSEMENT — TOUT EST DYNAMIQUE
Aucun mois ne doit être déduit d'un autre accord ou d'une convention par défaut. Chaque accord définit ses propres mois de versement :
- repartition13Mois.moisVersement : le mois où le 13e mois est versé (déduit du texte de l'accord)
- primes[].moisVersement : le mois où chaque prime annuelle est versée (déduit du texte de l'accord)
Si le texte ne précise pas le mois, ajouter un commentaire et utiliser la convention la plus courante dans le secteur, en indiquant que c'est une hypothèse.

═══════════════════════════════════════════════════════════════
SCHÉMA OBLIGATOIRE DE L'ACCORD (à respecter strictement)
═══════════════════════════════════════════════════════════════
- id (string, kebab-case, ex. 'mon-accord')
- nom (string, nom complet affiché)
- nomCourt (string, court pour badges/tooltips)
- url (string, lien vers texte officiel)
- dateEffet (string ISO 'YYYY-MM-DD')
- dateSignature (string ISO, optionnel)

ANCIENNETE :
- anciennete (object) : seuil (nombre d'années), plafond (nombre d'années), tousStatuts (booléen, true si cadres et non-cadres), baseCalcul ('salaire'), barème (objet { année: taux décimal }, ex. { 2: 0.02, 3: 0.03, ..., 25: 0.16 }), inclusDansSMH (TOUJOURS false — exclue de l'assiette SMH par la CCN et la jurisprudence)

MAJORATIONS :
- majorations (object) : nuit (object avec posteNuit, posteMatin en décimal 0.20 = 20%, plageDebut, plageFin, seuilHeuresPosteNuit), dimanche (nombre décimal 0.50 = 50%)

PRIMES (TABLEAU d'objets) : chaque prime doit avoir au minimum :
  - id (string, ex. 'primeEquipe', 'primeVacances', 'primeNoel')
  - label (string)
  - sourceValeur ('accord' ou 'modalite')
  - valueType ('horaire', 'montant', 'pourcentage', ou 'majorationHoraire')
  - unit ('€/h', '€', '%')
  - valeurAccord (nombre ou null)
  - stateKeyActif (string, ex. 'travailEquipe', 'primeVacances') : clé pour activer/désactiver dans l'UI
  - stateKeyHeures (string, obligatoire si valueType === 'horaire' ou 'majorationHoraire', ex. 'heuresEquipe')
  - defaultActif (booléen, optionnel) : si true, la case est cochée par défaut. Pour les primes inclusDansSMH: true, cette valeur est ignorée car la prime est toujours active.
  - moisVersement (nombre 1-12, OBLIGATOIRE si valueType === 'montant' et prime annuelle versée un mois donné)
  - inclusDansSMH (booléen, OBLIGATOIRE) : déterminé selon la logique d'analyse de la CCN décrite ci-dessus
    → true : distribution du salaire permettant d'atteindre le SMH grille (ne s'ajoute PAS au total, toujours actif)
    → false : élément exclu de l'assiette SMH, s'ajoute AU-DESSUS du SMH (conditions de travail, sujétion, ancienneté)
  - conditionAnciennete (optionnel) : { type: 'aucune'|'annees_revolues'|'proratise', annees?, description? }
  - tooltip (optionnel) : texte d'aide affiché au survol

REPARTITION 13e MOIS :
- repartition13Mois (object) : actif (booléen), moisVersement (1-12, déduit du texte de l'accord), inclusDansSMH (booléen, généralement true car le 13e mois est une modalité de versement du salaire)

LABELS ET METADONNEES :
- labels (object) : nomCourt, tooltip (courte description), description (longue)
- metadata (object) : version, articlesSubstitues (tableau de numéros d'articles CCN), territoire, entreprise

CHAMPS OPTIONNELS (recommandés si présents dans le texte) :
- elements (tableau) : synthèse pour affichage, chaque élément { id, type: 'prime'|'majoration'|'garantie', label, source, conditionAnciennete: { type, annees, description }, dateCle }
- pointsVigilance (tableau de strings)
- exemplesRecrutement (tableau de { date: string, points: string[] })
- conges (object, informatif)

═══════════════════════════════════════════════════════════════
CONVENTIONS DE CODAGE
═══════════════════════════════════════════════════════════════
- Les taux sont en décimaux : 20% → 0.20, 50% → 0.50.
- Les primes avec valueType 'montant' et un mois de versement unique doivent avoir moisVersement (1-12).
- Chaque prime activable par l'utilisateur doit avoir un stateKeyActif unique (camelCase) ; si une nouvelle prime (ex. prime Noël), inventer une clé cohérente (ex. primeNoel) et l'ajouter dans la liste des stateKeyActif à documenter pour le développeur.
- Si le texte ne précise pas une valeur, mettre une valeur par défaut raisonnable ou null et indiquer en commentaire.
- Le flag inclusDansSMH est OBLIGATOIRE pour chaque prime et pour anciennete. Ne l'oublie jamais.
- Chaque moisVersement est déduit du texte de l'accord, jamais copié d'un autre accord.
- Commente chaque inclusDansSMH avec la justification juridique (ex. : « complément salarial annuel Art. 140 » ou « condition de travail, exclu de l'assiette SMH »).

═══════════════════════════════════════════════════════════════
TÂCHE
═══════════════════════════════════════════════════════════════
À partir du texte d'accord d'entreprise fourni ci-dessous, produis le contenu COMPLET d'un fichier JavaScript pour le dossier `accords/` du projet. Le fichier doit :
1. Importer validateAgreement depuis '../src/agreements/AgreementInterface.js'
2. Exporter un objet unique (ex. export const MonAccord = { ... })
3. Contenir TOUTES les propriétés obligatoires listées ci-dessus, en les déduisant du texte
4. Pour chaque prime et pour l'ancienneté : inclure inclusDansSMH avec un commentaire justificatif
5. Pour chaque moisVersement : le déduire du texte de l'accord (ne pas copier d'un autre accord)
6. Terminer par : if (!validateAgreement(NomAccord)) { console.error('...'); }
7. Être prêt à être enregistré tel quel dans accords/NomAccord.js (nom du fichier à déduire du nom de l'accord)

Réponds UNIQUEMENT avec le code JavaScript du fichier, sans commentaire avant/après le code, sauf les commentaires dans le code pour préciser les choix lorsque le texte est ambigu ou pour justifier les flags inclusDansSMH.

TEXTE DE L'ACCORD :
```
*(Collez ici le texte complet ou les extraits de l’accord. Ou joindre le fichier contenant les textes.)*


---

## Après génération

- Vérifiez que le fichier généré ne référence pas d’autres modules que `AgreementInterface.js`.
- Si l’accord utilise des clés d’entrée inédites (`stateKeyActif`), ajoutez-les dans `state.accordInputs` (voir étape 7).
- Pour le détail du schéma et des champs optionnels : `src/agreements/AgreementInterface.js` et exemple `accords/KuhnAgreement.js`.

## Voir aussi

- [Guide : Ajouter un nouvel accord (manuel)](AJOUTER_ACCORD.md)
- [Guide simple (non-développeurs)](AJOUTER_ACCORD_SIMPLE.md)
- [accords/README.md](../accords/README.md) — rôle du dossier `accords/`
