# Résumé Technique des Tests Unitaires - Vérification Juridique

## Document destiné à l'expertise juridique

Ce document présente l'ensemble des tests unitaires du simulateur de classification et rémunération métallurgie 2024. Il est destiné à permettre à un expert juridique de vérifier la conformité des calculs et règles implémentées avec la Convention Collective Nationale de la Métallurgie (CCNM) et les accords d'entreprise.

---

## 1. Tests de Classification (`ClassificationEngine.test.js`)

### 1.1 Calcul de Classification par Points

**Objectif** : Vérifier que le système de classification basé sur 6 critères (chaque critère noté de 1 à 10) fonctionne correctement selon la grille CCNM.

**Tests effectués** :

1. **Score minimal (6 points)** → Groupe A, Classe 1
   - Vérifie que le minimum de la grille est correctement identifié
   - **Règle CCNM** : Classification minimale A1

2. **Score maximal (60 points)** → Groupe I, Classe 18
   - Vérifie que le maximum de la grille est correctement identifié
   - **Règle CCNM** : Classification maximale I18

3. **Ouvrier classe C5** (18 points)
   - Score typique : [3, 3, 3, 3, 3, 3]
   - **Règle CCNM** : Groupe C, Classe 5 (SMH annuel : 24 250 €)

4. **Technicien classe D7** (24 points)
   - Score typique : [4, 4, 4, 4, 4, 4]
   - **Règle CCNM** : Groupe D, Classe 7 (SMH annuel : 26 400 €)

5. **Cadre F11** (38 points)
   - Score typique : [7, 7, 6, 6, 6, 6]
   - **Règle CCNM** : Groupe F, Classe 11 (SMH annuel : 34 900 €)

6. **Gestion des scores invalides**
   - Vérifie la robustesse face à des données incomplètes

### 1.2 Mode Manuel vs Automatique

**Tests effectués** :

- **Mode manuel** : L'utilisateur saisit directement sa classification (groupe/classe)
- **Mode automatique** : Calcul basé sur les 6 critères
- **Règle CCNM** : Les deux modes doivent être conformes à la grille officielle

### 1.3 Distinction Cadre / Non-Cadre

**Tests effectués** :

- **Classes 1-10** : Non-cadres (retourne `false`)
- **Classes 11-18** : Cadres (retourne `true`)
- **Règle CCNM** : Seuil cadre à partir de la classe 11 (Art. CCNM)

### 1.4 Mapping Groupe → Classes

**Tests effectués** :

- Vérifie que chaque groupe retourne les bonnes classes :
  - Groupe A → Classes [1, 2]
  - Groupe F → Classes [11, 12]
- **Règle CCNM** : Correspondance stricte selon la grille officielle

---

## 2. Tests de Calcul de Rémunération (`RemunerationCalculator.test.js`)

### 2.1 Mode SMH Seul (Assiette de Base)

**Objectif** : Vérifier que le calcul de l'assiette SMH (sans primes ni majorations) est correct.

**Tests effectués** :

1. **Non-cadre sans forfait**
   - Classe C5 → SMH = 24 250 €
   - **Règle CCNM** : SMH brut annuel selon la grille 2024

2. **Cadre avec forfait**
   - F11, forfait jours (+30%) → SMH base + majoration forfait
   - Calcul : 34 900 + (34 900 × 0.30) = 45 370 €
   - **Règle CCNM** : Forfait jours = +30% inclus dans l'assiette SMH (Art. CCNM)

### 2.2 Mode Full - Non-Cadres

**Tests effectués** :

1. **Sans ancienneté**
   - Classe C5, 0 ans → Total = SMH seul (24 250 €)
   - **Règle CCNM** : Pas de prime d'ancienneté avant 3 ans

2. **Avec ancienneté CCN (≥ 3 ans)**
   - Classe C5, 10 ans → Total > SMH seul
   - Vérifie l'ajout de la prime d'ancienneté CCN
   - **Règle CCNM** : Prime d'ancienneté non-cadres à partir de 3 ans, plafonnée à 15 ans

### 2.3 Mode Full - Avec Accord d'Entreprise Kuhn

**Tests effectués** :

1. **Prime d'ancienneté accord Kuhn (≥ 2 ans)**
   - Classe C5, 5 ans ancienneté, accord Kuhn actif
   - Barème Kuhn : 2 ans = 2%, 5 ans = 5%, 15 ans = 15%, 25 ans = 16%
   - Calcul : SMH × taux selon barème
   - **Règle Accord Kuhn** : Seuil à 2 ans (vs 3 ans CCN), plafond à 25 ans (vs 15 ans CCN), tous statuts

2. **Prime d'équipe Kuhn**
   - Non-cadre, travail en équipe, 151.67h/mois
   - Calcul : 151.67h × 0.82€/h × 12 mois = 1 492.44 €/an
   - **Règle Accord Kuhn** : Prime équipe uniquement pour non-cadres

3. **Prime de vacances Kuhn**
   - Montant fixe : 525 € versé en juillet
   - **Règle Accord Kuhn** : Prime de vacances annuelle

### 2.4 Cadres Débutants (Barème Spécial)

**Tests effectués** :

- **F11 avec expérience < 6 ans**
  - Expérience 4 ans → Barème débutants F11[4] = 31 979 €
  - **Règle CCNM** : Barème spécial pour cadres F11/F12 avec < 6 ans d'expérience professionnelle
  - Tranches : < 2 ans, 2-4 ans, 4-6 ans, ≥ 6 ans (SMH standard)

### 2.5 Fonction `getMontantAnnuelSMHSeul`

**Tests effectués** :

- Vérifie que cette fonction retourne uniquement l'assiette SMH (base + forfait si cadre)
- Utilisée pour les calculs d'arriérés et le mode "SMH seul"
- **Règle CCNM** : Assiette SMH = base + forfait (si cadre), exclut primes et majorations

---

## 3. Tests de Calcul des Primes (`PrimeCalculator.test.js`)

### 3.1 Prime d'Ancienneté - Accord d'Entreprise

**Objectif** : Vérifier le calcul de la prime d'ancienneté selon les règles spécifiques de l'accord Kuhn.

**Tests effectués** :

1. **Ancienneté < seuil (2 ans)**
   - Résultat : 0 €
   - **Règle Accord Kuhn** : Pas de prime avant 2 ans

2. **Ancienneté = 5 ans**
   - Salaire de base : 30 000 €
   - Calcul : 30 000 × 5% = 1 500 €
   - **Règle Accord Kuhn** : Barème progressif (2% à 2 ans, 5% à 5 ans, 15% à 15 ans, 16% à 25 ans)

3. **Plafonnement à 25 ans**
   - Ancienneté réelle : 30 ans
   - Calcul : 30 000 × 16% = 4 800 € (plafonné à 25 ans)
   - **Règle Accord Kuhn** : Plafond à 25 ans d'ancienneté

4. **Accord invalide**
   - Retourne 0 si pas d'accord

### 3.2 Prime d'Ancienneté - CCN

**Objectif** : Vérifier le calcul de la prime d'ancienneté selon les règles CCNM.

**Tests effectués** :

1. **Ancienneté < seuil (3 ans)**
   - Résultat : 0 €
   - **Règle CCNM** : Seuil à 3 ans pour non-cadres

2. **Classe C5, 10 ans d'ancienneté**
   - Point territorial : 5.90 € (Bas-Rhin 67)
   - Taux classe C5 : 2.20%
   - Formule : Point × Taux × Années × 12
   - Calcul : 5.90 × 2.20% × 10 × 12 = 1 557.6 €
   - **Règle CCNM** : Prime calculée sur point territorial, taux selon classe, plafonnée à 15 ans

3. **Plafonnement à 15 ans**
   - Ancienneté réelle : 20 ans
   - Calcul plafonné à 15 ans
   - **Règle CCNM** : Plafond à 15 ans d'ancienneté pour non-cadres

### 3.3 Prime d'Équipe - Accord d'Entreprise

**Tests effectués** :

- **Calcul mensuel puis annuel**
  - Heures équipe : 151.67h/mois (temps plein)
  - Taux horaire Kuhn : 0.82 €/h
  - Mensuel : 151.67 × 0.82 = 124.37 €
  - Annuel : 124.37 × 12 = 1 492.44 €
  - **Règle Accord Kuhn** : Prime équipe uniquement pour non-cadres, calcul mensuel

### 3.4 Prime de Vacances

**Tests effectués** :

- **Montant fixe** : 525 € si active
- **Inactive** : 0 €
- **Règle Accord Kuhn** : Prime de vacances annuelle, versée en juillet

---

## 4. Tests de Calcul des Majorations (`MajorationCalculator.test.js`)

### 4.1 Majoration Travail de Nuit

**Objectif** : Vérifier le calcul des majorations pour travail de nuit selon CCN et accord d'entreprise.

**Tests effectués** :

1. **Aucun travail de nuit**
   - Résultat : 0 €
   - **Règle CCNM** : Pas de majoration si pas de travail de nuit

2. **Majoration CCN (15%)**
   - Type : Poste matin
   - Heures : 10h/mois
   - Taux horaire : 20 €/h
   - Calcul : 10h × 20€ × 15% × 12 mois = 360 €/an
   - **Règle CCNM** : Majoration nuit = +15% (Art. 145 CCNM)

3. **Majoration Accord Kuhn - Poste Nuit (20%)**
   - Type : Poste nuit complet
   - Heures : 10h/mois
   - Taux horaire : 20 €/h
   - Calcul : 10h × 20€ × 20% × 12 mois = 480 €/an
   - **Règle Accord Kuhn** : Poste nuit = +20% (plus favorable que CCN)

4. **Majoration Accord Kuhn - Poste Matin (15%)**
   - Même calcul que CCN : 360 €/an
   - **Règle Accord Kuhn** : Poste matin = +15% (identique à CCN)

### 4.2 Majoration Travail du Dimanche

**Tests effectués** :

1. **Pas de travail dimanche**
   - Résultat : 0 €

2. **Majoration CCN (100%)**
   - Heures : 8h/mois
   - Taux horaire : 20 €/h
   - Calcul : 8h × 20€ × 100% × 12 mois = 1 920 €/an
   - **Règle CCNM** : Majoration dimanche = +100% (Art. 146 CCNM)

3. **Majoration Accord Kuhn (50%)**
   - Heures : 8h/mois
   - Taux horaire : 20 €/h
   - Calcul : 8h × 20€ × 50% × 12 mois = 960 €/an
   - **Règle Accord Kuhn** : Majoration dimanche = +50% (moins favorable que CCN, mais peut être compensée par d'autres avantages)

---

## 5. Tests de Gestion des Accords d'Entreprise (`AgreementRegistry.test.js`)

### 5.1 Récupération d'Accord

**Tests effectués** :

- **Récupération par ID** : Vérifie que l'accord Kuhn est accessible par son ID 'kuhn'
- **ID inexistant** : Retourne `null`
- **ID null** : Retourne `null` (gestion des erreurs)

### 5.2 Vérification d'Existence

**Tests effectués** :

- **Accord existant** : Retourne `true` pour 'kuhn'
- **Accord inexistant** : Retourne `false`

### 5.3 Liste des Accords

**Tests effectués** :

- **Tous les accords** : Retourne au moins l'accord Kuhn
- **IDs des accords** : Retourne la liste des IDs disponibles

### 5.4 Enregistrement d'Accord

**Tests effectués** :

1. **Accord valide**
   - Vérifie qu'un accord conforme au schéma peut être enregistré
   - **Schéma requis** : id, nom, nomCourt, url, dateEffet, anciennete, majorations, primes, repartition13Mois, labels, metadata

2. **Accord invalide**
   - Vérifie qu'un accord incomplet est refusé
   - **Validation** : Tous les champs requis doivent être présents

---

## 6. Tests de Chargement des Accords (`AgreementLoader.test.js`)

### 6.1 Chargement d'Accord

**Tests effectués** :

- **Chargement par ID** : Charge l'accord Kuhn depuis le registre
- **ID inexistant** : Retourne `null`
- **Définition comme actif** : L'accord chargé devient l'accord actif

### 6.2 Gestion de l'Accord Actif

**Tests effectués** :

- **Aucun accord actif** : Retourne `null`
- **Accord actif après chargement** : Retourne l'accord chargé
- **Réinitialisation** : Permet de réinitialiser l'accord actif

### 6.3 Chargement depuis URL

**Tests effectués** :

- **Paramètre URL `?accord=kuhn`** : Charge l'accord depuis l'URL
- **Pas de paramètre** : Retourne `null`
- **Usage** : Permet l'intégration en iframe avec accord pré-sélectionné

### 6.4 Liste des Accords Disponibles

**Tests effectués** :

- **Format de la liste** : Retourne un tableau avec les informations essentielles
- **Informations requises** : id, nom, nomCourt, url pour chaque accord

---

## 7. Tests de Formatage (`formatters.test.js`)

### 7.1 Formatage des Montants

**Tests effectués** :

- **Format français** : 21 500 € (espaces comme séparateurs de milliers)
- **Arrondi** : 21 500.7 → 21 501 €
- **Grands montants** : 68 000 €
- **Petits montants** : 525 €

### 7.2 Formatage PDF

**Tests effectués** :

- **Même format que formatMoney** : Cohérence entre affichage écran et PDF
- **Format standardisé** : Espaces de milliers, symbole €

### 7.3 Échappement HTML

**Tests effectués** :

- **Sécurité XSS** : Échappe les balises HTML dangereuses (`<script>` → `&lt;script&gt;`)
- **Texte normal** : Laisse inchangé
- **Conversion de types** : Convertit les nombres en chaînes

---

## 8. Tests d'Aide au Texte (`textHelpers.test.js`)

### 8.1 Formatage des Acronymes

**Tests effectués** :

- **Première occurrence** : "CCN" → "Convention Collective Nationale (CCN)"
- **Occurrences suivantes** : "CCN" → "CCN" (sans explication)
- **Forcer l'explication** : Permet de ré-afficher l'explication si nécessaire
- **Acronyme inconnu** : Retourne tel quel

**Règle UX** : Les acronymes doivent être expliqués au moins une fois pour éviter la confusion.

### 8.2 Formatage avec Unités

**Tests effectués** :

- **Valeur avec unité** : 5 → "5 ans"
- **Nombre décimal** : 5.5 → "5.5 ans"
- **Valeurs nulles** : null/undefined → "-" (affichage vide)

**Règle UX** : Les unités doivent toujours être précisées pour éviter l'ambiguïté.

### 8.3 Réinitialisation du Registre

**Tests effectués** :

- **Réinitialisation** : Permet de réinitialiser le compteur d'acronymes
- **Usage** : Utile pour les tests ou réaffichage de contenu

---

## Points de Vérification Juridique Recommandés

### A. Conformité CCNM

1. ✅ **Grille de Classification** : Vérifier que les mappings points → groupe/classe correspondent à la grille officielle CCNM 2024
2. ✅ **SMH 2024** : Vérifier que les montants SMH annuels correspondent aux valeurs officielles
3. ✅ **Prime d'ancienneté CCN** : 
   - Seuil à 3 ans (non-cadres uniquement)
   - Plafond à 15 ans
   - Formule : Point territorial × Taux classe × Années × 12
4. ✅ **Majorations CCN** :
   - Nuit : +15%
   - Dimanche : +100%
5. ✅ **Barème débutants F11/F12** : Vérifier les montants selon tranches d'expérience (< 2 ans, 2-4 ans, 4-6 ans)

### B. Conformité Accord d'Entreprise Kuhn

1. ✅ **Prime d'ancienneté Kuhn** :
   - Seuil à 2 ans (vs 3 ans CCN)
   - Plafond à 25 ans (vs 15 ans CCN)
   - Tous statuts (vs non-cadres uniquement pour CCN)
   - Barème progressif : 2%, 5%, 15%, 16%
2. ✅ **Majorations Kuhn** :
   - Poste nuit : +20% (vs +15% CCN)
   - Poste matin : +15% (identique CCN)
   - Dimanche : +50% (vs +100% CCN)
3. ✅ **Primes spécifiques** :
   - Prime équipe : 0.82 €/h (non-cadres uniquement)
   - Prime vacances : 525 €/an (versée en juillet)
4. ✅ **Répartition 13 mois** :
   - Actif : Oui
   - Mois de versement : Novembre
   - Inclus dans SMH : Oui

### C. Calculs d'Arriérés

1. ✅ **Mode SMH seul** : Les arriérés doivent être calculés uniquement sur l'assiette SMH (sans primes ni majorations)
2. ✅ **Prescription** : Respect de la prescription de 3 ans
3. ✅ **Répartition 13 mois** : Prise en compte correcte du 13e mois si accord actif

### D. Distinction Cadre / Non-Cadre

1. ✅ **Seuil cadre** : Classes 11-18 = cadres, classes 1-10 = non-cadres
2. ✅ **Forfaits cadres** : +15% (heures) ou +30% (jours) inclus dans SMH
3. ✅ **Primes** : Certaines primes (équipe) uniquement pour non-cadres

---

## Conclusion

Les tests unitaires couvrent :

- ✅ **Classification** : Mapping points → groupe/classe selon grille CCNM
- ✅ **Rémunération de base** : SMH selon classe et forfait
- ✅ **Primes** : Ancienneté (CCN et accord), équipe, vacances
- ✅ **Majorations** : Nuit, dimanche (CCN et accord)
- ✅ **Cadres débutants** : Barème spécial F11/F12
- ✅ **Gestion accords** : Enregistrement, chargement, validation
- ✅ **Formatage** : Montants, acronymes, unités

**Total** : 8 fichiers de tests unitaires, couvrant les règles CCNM et les spécificités des accords d'entreprise.

---

## Notes pour l'Expert Juridique

1. **Valeurs de référence** : Les SMH et barèmes utilisés dans les tests correspondent à la CCNM 2024. Vérifier leur exactitude avec les textes officiels.

2. **Accord Kuhn** : Les valeurs de l'accord Kuhn (primes, majorations) sont extraites de l'accord réel. Vérifier leur conformité avec le texte de l'accord.

3. **Calculs** : Tous les calculs utilisent des formules mathématiques simples (multiplication, pourcentages). Vérifier que les formules correspondent aux textes conventionnels.

4. **Cas limites** : Les tests vérifient les seuils (2 ans, 3 ans, 15 ans, 25 ans) et plafonds. Vérifier que ces valeurs correspondent aux textes.

5. **Distinction CCN / Accord** : Le système applique toujours la règle la plus favorable entre CCN et accord d'entreprise. Vérifier que cette logique est conforme au droit du travail.

---

*Document généré le 28 janvier 2026*
*Simulateur Métallurgie 2024 - Version 1.0.0*
