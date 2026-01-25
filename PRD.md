# 📑 PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Simulateur de Classification et Rémunération - Métallurgie 2024

### 1. Vision et Objectifs

* **Objectif Principal :** Fournir aux salariés de la métallurgie un outil autonome, simple et juridiquement fiable pour déterminer leur classification (Groupe/Classe) et leur salaire minimum conventionnel.
* **Contexte :** La nouvelle Convention Collective Nationale de la Métallurgie (CCNM), entrée en vigueur au 01/01/2024, introduit un système de cotation par critères classants complexe. L'outil doit vulgariser cette complexité sans perdre en rigueur.
* **Cible Technique :** Module web intégrable nativement dans un site de documentation statique (Hugo avec thème "Book").
* **Territoire cible :** Bas-Rhin (67) - valeur du point territorial configurée en conséquence.

---

### 2. Parcours Utilisateur (User Flow)

1. **Cotation (Le Diagnostic) :** L'utilisateur évalue son poste sur 6 critères via une interface ludique ("Carrousel").
2. **Confirmation & Ajustement :** L'outil propose une classification (ex: F11). L'utilisateur peut valider ou "débrayer" pour saisir manuellement sa classe s'il la connaît déjà.
3. **Modalités de Paie :** Selon la classe déterminée (Cadre ou Non-Cadre), l'outil demande les variables spécifiques (Ancienneté, Forfaits).
4. **Résultat (Le Bilan) :** Affichage du Salaire Minimum Hiérarchique (SMH) annuel brut, détaillant la base et les majorations.

---

### 3. Spécifications Fonctionnelles et Métier

#### 3.1. Moteur de Classification (Cœur)

Le système calcule la classe d'emploi (1 à 18) basée sur la somme des points de 6 critères.

* **Entrées :** 6 Critères × 10 Degrés (Voir Annexe pour les textes).
* **Calcul :** Somme des points (Min 6, Max 60).
* **Table de Transposition (Juin 2024) :**
  * **A1** (6-8) | **A2** (9-11) | **B3** (12-14) | **B4** (15-17)
  * **C5** (18-20) | **C6** (21-23) | **D7** (24-26) | **D8** (27-29)
  * **E9** (30-33) | **E10** (34-37)
  * **F11** (38-41) | **F12** (42-45)
  * **G13** (46-49) | **G14** (50-52)
  * **H15** (53-55) | **H16** (56-57)
  * **I17** (58-59) | **I18** (60)

* **Fonctionnalité "Débrayage" :** L'utilisateur doit pouvoir forcer manuellement le couple Groupe/Classe via un bouton "Ajuster manuellement".

#### 3.2. Moteur de Rémunération (Le Calculateur Financier)

Le simulateur doit gérer **3 profils distincts** avec des règles de paie radicalement différentes.

##### PROFIL A : OUVRIERS & ETAM (Non-Cadres - Cl. 1 à 10)

* **Salaire Base :** SMH de la classe (Voir Annexe).
* **Prime d'Ancienneté (Spécifique Métallurgie) :**
  * *Condition :* Ancienneté ≥ 3 ans.
  * *Formule 2024 :* `[[Point × Taux%] × 100] × Années` = montant **mensuel**. Annuel = mensuel × 12.
  * *Exemple :* `[[5,90 × 2,20%] × 100] × 10 = 129,80 €/mois` soit `1 558 €/an`.
  * *Plafond :* 15 ans.
  * *Contrainte UX :* Le simulateur doit demander la **"Valeur du Point (Territorial)"** (ex: 5.90€).

* **Majorations Conditions de Travail :**
  * **Travail de nuit (21h-6h) :** +15% (Art. 145 CCN)
  * **Travail du dimanche :** +100% (Art. 146 CCN)
  * Ces majorations sont calculables dans le simulateur si l'utilisateur renseigne ses heures.

##### PROFIL B : CADRES CONFIRMÉS (Cl. 11 à 18, hors débutants)

* **Salaire Base :** SMH de la classe.
* **Prime d'Ancienneté :** 0€ (Incluse dans le salaire de base des cadres).
* **Majorations Forfaits (Art. 102 & 103) :**
  * Forfait Heures (Annuel) : Majoration **+15%**.
  * Forfait Jours : Majoration **+30%**.

* **Contrôle RAG :** Vérifier que le total est supérieur au SMH + Majoration.

##### PROFIL C : CADRES DÉBUTANTS (Classes F11 et F12)

* **Déclencheur :** Si Classe = 11 ou 12, demander "Expérience professionnelle".
* **Logique :** Si expérience < 6 ans, le SMH n'est PAS le standard mais suit une grille progressive (Voir Annexe).
* **Note :** Le barème inclut les majorations de 5% (2 ans) ou 8% (4 ans) prévues par l'Article 139.

#### 3.3. Accord d'Entreprise Kuhn (UES KUHN SAS/KUHN MGM SAS)

*Source : Accord du 6 mars 2024 - Se substitue aux articles 142, 143, 144, 145, 146, 153-1 de la CCN*

L'utilisateur peut activer l'accord d'entreprise Kuhn via une **checkbox**. Une fois activé, des options supplémentaires apparaissent pour configurer les différents éléments de rémunération.

##### 3.3.1. Prime d'Ancienneté (Art. 2.1)

| Règle | Convention Collective | Accord Kuhn |
| --- | --- | --- |
| **Seuil** | 3 ans | 2 ans |
| **Classes éligibles** | Non-Cadres (A-E) | Toutes (A-I) |
| **Base de calcul** | Point × Taux × 100 × Années | % du Salaire Brut |
| **Plafond** | 15 ans | 25 ans (16% max) |

**Barème :**

| Années | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 25+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Taux** | 2% | 3% | 4% | 5% | 6% | 7% | 8% | 9% | 10% | 11% | 12% | 13% | 14% | 15% | 16% |

*Note : Le taux reste à 15% de 15 à 24 ans.*

##### 3.3.2. Prime d'Équipe (Art. 2.2)

* **Champ :** Non-cadres en équipes successives
* **Conditions :** Pause 20 min, ≥6h/poste, horaire collectif posté
* **Montant :** 0.82 €/heure (au 01/01/2024)

##### 3.3.3. Majorations Nuit (Art. 2.4)

* **Poste de nuit** (≥2h entre 20h-6h) : **+20%** (CCN: +15%)
* **Poste matin/après-midi** (heures entre 20h-6h) : **+15%**

##### 3.3.4. Majoration Dimanche (Art. 2.3)

* **Taux :** **+50%** (CCN: +100%)
* Personnel en forfait jour : contrepartie en repos

##### 3.3.5. Prime de Vacances (Art. 2.5)

* **Montant :** 525 € bruts (versé en juillet)
* **Conditions :** Ancienneté ≥ 1 an au 1er juin, contrat ≥ 50% temps légal

##### UX Simulateur

**Étape 3 - Modalités de Paie :**
* **Ancienneté dans l'entreprise** (champ commun à tous)
* Valeur du Point Territorial (non-cadres)
* Type de forfait (cadres)
* Expérience professionnelle (cadres débutants F11/F12)
* **Conditions de travail particulières :**
  * Type de nuit (poste nuit / poste matin-AM) + heures mensuelles
  * Travail le dimanche + heures mensuelles
  * Travail en équipes postées + heures mensuelles (Kuhn, non-cadres)
  * **Note** : Cadres au forfait jours → majorations = repos (non simulable)

**Étape 4 - Résultat :**
* **Checkbox** "Appliquer l'accord d'entreprise Kuhn"
  * Ajuste automatiquement les taux des majorations (nuit +20%, dimanche +50%)
  * Active la prime d'ancienneté pour tous (y compris cadres, dès 2 ans)
  * Active la prime de vacances (525€, pré-cochée)
  * Active la prime d'équipe (non-cadres)

#### 3.4. Graphique d'Évolution Salaire vs Inflation

Fonctionnalité permettant de visualiser l'évolution projetée du salaire comparée à l'inflation.

##### 3.4.1. Fonctionnalités

* **Bouton "Comparer à l'inflation"** : Affiche/masque le panneau du graphique
* **Projection temporelle** : 5, 10, 15, 20, 25, 30 ans ou jusqu'à la retraite
* **Option "Jusqu'à la retraite"** : 
  * Affiche un champ pour saisir l'âge actuel
  * Calcule automatiquement les années restantes (retraite à 64 ans)
* **Augmentation générale annuelle** : Taux moyen d'augmentation appliqué dans l'entreprise (0% à 10%)
* **Synchronisation automatique** : Le graphique se met à jour en temps réel avec le simulateur

##### 3.4.2. Sources de Données Inflation

Ordre de priorité avec fallback automatique :
1. **API Banque Mondiale** (source internationale officielle)
2. **INSEE** (source officielle France - mise à jour manuellement)

L'affichage indique la source utilisée et la période des données (ex: "Banque Mondiale (1975-2024)").
Plus la période récupérée sera longue, mieux ce sera.

##### 3.4.3. Calcul de l'Évolution

* **Réutilise le moteur `calculateRemuneration()`** : Garantit 100% de cohérence avec le simulateur
* **Variables projetées** : Ancienneté et expérience professionnelle incrémentées chaque année
* **Augmentation générale** : Appliquée sur la partie variable (hors prime vacances fixe)
* **Inflation cumulée** : Calcul basé sur la moyenne historique des données récupérées

##### 3.4.4. Affichage du Graphique

* **Courbe bleue** : Évolution du salaire (ancienneté + augmentation générale)
* **Courbe rouge pointillée** : Inflation cumulée (pouvoir d'achat à maintenir)
* **Résumé** : Écart final en % par rapport à l'inflation
* **Bibliothèque** : Chart.js

#### 3.5. Contraintes de Cohérence des Données

##### 3.5.1. Expérience Professionnelle ≥ Ancienneté

L'expérience professionnelle totale ne peut pas être inférieure à l'ancienneté dans l'entreprise :
* **Si ancienneté augmente** : L'expérience pro est automatiquement ajustée si elle était inférieure
* **Si expérience pro est modifiée** : Elle ne peut pas descendre en dessous de l'ancienneté

---

### 4. Spécifications Techniques & UI (Design System Hugo Book)

#### A. Stack Technique

* **Langages :** HTML5, CSS3, JavaScript (ES6+).
* **Dépendances Externes :**
  * `Popper.js` (Core positionnement).
  * `Tippy.js` (Gestion des tooltips).
  * `Chart.js` (Graphiques d'évolution).
  * *Aucun framework lourd (React/Vue) pour garantir la portabilité.*
* **APIs Externes :**
  * API Banque Mondiale (données inflation France) - avec fallback local

#### B. Interface Utilisateur (UI)

* **Intégration Thème :**
  * Utilisation des variables CSS natives : `var(--color-link)`, `var(--body-background)`, `var(--gray-200)`.
  * Composants natifs : Boutons `.book-btn`, Alertes `.book-hint`.

* **Le Composant "Carrousel" (Tambour horizontal) :**
  * Affichage horizontal des options (1 à 10) avec labels synthétiques.
  * Chevrons indicateurs (Gauche/Droite).
  * **Masques d'opacité :** Dégradés CSS gauche/droite pour focaliser sur la sélection centrale.
  * **Interactivité :** Clic, Scroll ou Swipe tactile pour changer la valeur.
  * **Description complète :** Affichée sous le carrousel (hint).

* **Gestion des Contenus (Textes) :**
  * **Titres :** Vulgarisés (ex: "Autonomie").
  * **Labels Carrousel :** Textes synthétiques courts.
  * **Hint :** Description complète du degré sélectionné.
  * **Tooltips (?) :** Définition globale du critère.

#### C. Structure des Données (`CONFIG`)

Le code doit centraliser toutes les données métier dans un objet constant pour faciliter la maintenance annuelle (mise à jour des SMH).

```javascript
const CONFIG = {
    SMH: { 1: 21700, ... 18: 68000 }, // Valeurs annuelles
    BAREME_DEBUTANTS: { 11: {...}, 12: {...} }, // Grille F11/F12 par tranche d'expérience
    TAUX_ANCIENNETE: { 1: 1.45, ... 10: 3.80 }, // Taux par classe pour prime ancienneté CCN
    MAPPING_POINTS: [ ... ], // Logique 6-60 pts → Groupe/Classe
    CRITERES: [ ... ], // Textes et définitions des 6 critères
    SEUIL_CADRE: 11, // Classe à partir de laquelle on est cadre
    FORFAITS: { '35h': 0, 'heures': 0.15, 'jours': 0.30 },
    ANCIENNETE: { seuil: 3, plafond: 15 }, // CCN non-cadres
    POINT_TERRITORIAL_DEFAUT: 5.90, // Bas-Rhin 2025
    ACCORD_ENTREPRISE: {
        anciennete: { seuil: 2, plafond: 25, barème: {...} },
        primeEquipe: { tauxHoraire: 0.82 },
        majorations: { nuit: 0.20, nuitMatin: 0.15, dimanche: 0.50 },
        primeVacances: { montant: 525 }
    },
    CCN: {
        majorations: { nuit: 0.15, dimanche: 1.00 }
    }
};
```

#### D. Architecture du Code (`app.js`)

Le code est organisé en modules fonctionnels :

* **État global (`state`)** : Centralise toutes les valeurs saisies par l'utilisateur
* **Moteur de classification** : `calculateClassification()`, `getActiveClassification()`
* **Moteur de rémunération** : `calculateRemuneration()` - source unique de vérité
* **Fonctions d'affichage** : `updateAll()`, `updateRemunerationDisplay()`, `updateHintDisplay()`
* **Graphique d'évolution** : `calculateSalaryEvolution()` - **réutilise `calculateRemuneration()`**
* **Utilitaires** : `formatMoney()`, `calculatePrimeKuhn()`, `calculateMajorationNuit()`, etc.

**Principe de factorisation** : Le graphique d'évolution ne duplique pas la logique de calcul. Il modifie temporairement l'état, appelle `calculateRemuneration()`, puis restaure l'état original.

---

### 5. Critères d'Acceptation (Definition of Done)

#### 5.1. Tests de Classification
1. **Score minimal :** 6 points → Classe A1
2. **Score maximal :** 60 points → Classe I18
3. **Débrayage manuel :** Possibilité de forcer n'importe quelle combinaison Groupe/Classe

#### 5.2. Tests de Rémunération CCN
4. **Non-Cadre avec ancienneté :** Classe C5, 10 ans d'ancienneté, Point 5.90€ → Prime = `5.90 × 2.20 × 10 × 12 = 1 558€/an`
5. **Cadre forfait jours :** F11 → SMH × 1.30
6. **Cadre débutant :** F11, 4 ans d'expérience, forfait jours → 31 979€ × 1.30

#### 5.3. Tests Accord Kuhn
7. **Prime ancienneté Kuhn :** Classe F11, 5 ans ancienneté, Kuhn activé → Prime = SMH × 5%
8. **Cadres éligibles :** Avec Kuhn activé, les cadres ont droit à la prime d'ancienneté
9. **Majorations Kuhn :** Nuit = +20% (vs +15% CCN), Dimanche = +50% (vs +100% CCN)
10. **Prime vacances :** 525€ ajoutés si Kuhn activé et option cochée

#### 5.4. Tests de Cohérence des Données
11. **Expérience ≥ Ancienneté :** Si ancienneté = 5, expérience pro ne peut pas être < 5
12. **Synchronisation :** Modifier l'ancienneté met à jour l'expérience pro si nécessaire

#### 5.5. Tests Graphique d'Évolution
13. **Cohérence simulateur :** Le salaire année 0 du graphique = total affiché dans le simulateur
14. **Évolution ancienneté :** L'ancienneté augmente de 1 par année projetée
15. **Augmentation générale :** Avec 2%/an sur 10 ans, le salaire variable augmente d'environ 22%
16. **Source inflation :** Affichage de la source (Banque Mondiale ou INSEE) et de la période

#### 5.6. Tests UI/UX
17. **Responsive :** Carrousel et graphique utilisables sur mobile
19. **Tooltips :** Informations contextuelles sur tous les champs avec "?"
20. **Intégration Hugo :** Le code s'intègre sans casser le style du thème Book

---

### 6. Annexe Technique : Données Brutes

*À inclure dans l'objet `CONFIG` du script.*

#### 6.1. Grille SMH 2024 (Base 35h)

| Classe | Montant Annuel |
| --- | --- |
| **A1** | 21 700 € |
| **A2** | 21 850 € |
| **B3** | 22 450 € |
| **B4** | 23 400 € |
| **C5** | 24 250 € |
| **C6** | 25 550 € |
| **D7** | 26 400 € |
| **D8** | 28 450 € |
| **E9** | 30 500 € |
| **E10** | 33 700 € |
| **F11** | 34 900 € |
| **F12** | 36 700 € |
| **G13** | 40 000 € |
| **G14** | 43 900 € |
| **H15** | 47 000 € |
| **H16** | 52 000 € |
| **I17** | 59 300 € |
| **I18** | 68 000 € |

#### 6.2. Barème Cadres Débutants (Groupe F : F11 et F12)

*Base 35h, mensualisée 151,66h. Inclut les majorations de 5% (2 ans) ou 8% (4 ans) prévues par l'Art. 139.*

| Expérience professionnelle | F11 | F12 |
| --- | --- | --- |
| **< 2 ans** | 28 200 € | 29 700 € |
| **2 à < 4 ans** | 29 610 € | 31 185 € |
| **4 à 6 ans** | 31 979 € | 33 680 € |
| **≥ 6 ans** | 34 900 € (standard) | 36 700 € (standard) |

#### 6.3. Valeur du Point Territorial (Bas-Rhin)

| Territoire | Valeur 2025 | Source |
| --- | --- | --- |
| **Bas-Rhin (67)** | 5.90 € | Accord du 17 avril 2025 |

*Source officielle : [code.travail.gouv.fr](https://code.travail.gouv.fr/contribution/3248-quand-le-salarie-a-t-il-droit-a-une-prime-danciennete-quel-est-son-montant)*

#### 6.4. Taux pour Prime d'Ancienneté (Non-Cadres)

*Formule : `Point Territorial × Taux × 100 × Années`*

| Classe | Taux (%) | Classe | Taux (%) |
| :--- | :--- | :--- | :--- |
| **A1** | 1.45 | **C6** | 2.45 |
| **A2** | 1.60 | **D7** | 2.60 |
| **B3** | 1.75 | **D8** | 2.90 |
| **B4** | 1.95 | **E9** | 3.30 |
| **C5** | 2.20 | **E10** | 3.80 |

#### 6.5. Textes des 6 Critères (Pour les Tooltips)

1. **Complexité :** Difficulté / technicité et diversité du travail, solutions à mettre en œuvre, problèmes à traiter.
2. **Connaissances :** Savoirs et savoir-faire requis dans l'emploi, acquis par la formation initiale/continue ou l'expérience.
3. **Autonomie :** Latitude d'action, d'organisation et de décision dans le cadre de l'emploi ; niveau de contrôle associé.
4. **Contribution :** Effet et influence des actions et décisions sur les activités, l'organisation et son environnement.
5. **Encadrement :** Appui/soutien, accompagnement/transmission, supervision, encadrement hiérarchique ou projet.
6. **Communication :** Nature et importance des échanges relationnels internes et/ou externes.
