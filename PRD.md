# 📑 PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Simulateur de Classification et Rémunération - Métallurgie 2024

### 1. Vision et Objectifs

* **Objectif Principal :** Fournir aux salariés de la métallurgie un outil autonome, simple et juridiquement fiable pour déterminer leur classification (Groupe/Classe) et leur salaire minimum conventionnel.
* **Contexte :** La nouvelle Convention Collective Nationale de la Métallurgie (CCNM), entrée en vigueur au 01/01/2024, introduit un système de cotation par critères classants complexe. L'outil doit vulgariser cette complexité sans perdre en rigueur.
* **Cible Technique :** Module web intégrable nativement dans un site de documentation statique (Hugo avec thème "Book").
* **Territoire cible :** Bas-Rhin (67) - valeur du point territorial configurée en conséquence.

---

### 2. Parcours Utilisateur (User Flow)

Le simulateur utilise une interface de type **wizard** (assistant pas à pas) pour guider l'utilisateur.

#### Étape 1 : Classification
- **Choix initial :** "Connaissez-vous votre classification ?"
  - **Oui** → Saisie directe du Groupe/Classe
  - **Non** → Estimation via les 6 critères classants (Carrousels)
- **Résultat :** Affichage du badge de classification et du statut Cadre/Non-Cadre

#### Étape 2 : Situation
- Récapitulatif de la classification (modifiable)
- Ancienneté dans l'entreprise
- Options spécifiques selon le profil :
  - **Non-Cadres :** Valeur du Point Territorial
  - **Cadres :** Type de forfait (35h, Heures +15%, Jours +30%)
  - **Cadres débutants (F11/F12) :** Expérience professionnelle
- Conditions de travail particulières (panneau dépliable)

#### Étape 3 : Résultat
- Options de calcul (Accord Kuhn, 13e mois)
- Affichage du SMH annuel et mensuel
- Détail du calcul (panneau dépliable)
- **Hints contextuels multiples** (voir 3.6)
- Graphique d'évolution vs inflation (panneau dépliable)
- **Bouton "Vérifier mes arriérés de salaire"** : Apparaît si le salaire actuel est potentiellement inférieur au SMH

#### Étape 4 : Arriérés de salaire (conditionnelle)
- **Déclenchement** : Accessible uniquement depuis l'étape 3 via le bouton dédié
- **Frise chronologique interactive** : Affichage mois par mois de la période réclamable
- **Saisie des salaires** : Clic sur une période → Modal pour saisir le salaire annuel brut
- **Calcul précis** : Arriérés calculés mois par mois avec les salaires réels saisis
- **Instructions juridiques interactives** : Guide pas à pas dans un accordéon
- **Génération PDF** : Rapport professionnel avec tous les détails

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

* **Champ :** Non-cadres en équipes successives uniquement
* **Conditions :** 
  * Pause 20 min obligatoire
  * Durée effective ≥ 6h par poste
  * Horaire collectif posté (équipes successives)
* **Montant :** 0.82 €/heure (au 01/01/2024)
* **Calcul :** Montant horaire × Heures mensuelles en équipe
* **UX Simulateur :**
  * Option visible uniquement pour les non-cadres (classes 1-10)
  * Apparition conditionnelle : visible si accord Kuhn activé, sinon affichage avec hint informatif
  * Activation automatique : Si l'utilisateur coche cette option sans avoir activé l'accord Kuhn, l'accord est automatiquement activé avec notification
  * Désactivation automatique : Si l'accord Kuhn est désactivé alors que la prime d'équipe est cochée, cette dernière est automatiquement décochée avec notification

##### 3.3.3. Majorations Nuit (Art. 2.4)

* **Poste de nuit** (≥2h entre 20h-6h) : **+20%** (CCN: +15%)
* **Poste matin/après-midi** (heures entre 20h-6h) : **+15%**

##### 3.3.4. Majoration Dimanche (Art. 2.3)

* **Taux :** **+50%** (CCN: +100%)
* Personnel en forfait jour : contrepartie en repos

##### 3.3.5. Prime de Vacances (Art. 2.5)

* **Montant :** 525 € bruts
* **Versement :** En juillet uniquement (accord Kuhn)
* **Conditions :** Ancienneté ≥ 1 an au 1er juin, contrat ≥ 50% temps légal

##### UX Simulateur

**Étape 2 - Situation :**
* **Ancienneté dans l'entreprise** (champ commun à tous)
* Valeur du Point Territorial (non-cadres)
* Type de forfait (cadres)
* Expérience professionnelle (cadres débutants F11/F12)
* **Conditions de travail particulières** (panneau accordéon) :
  * Type de nuit (poste nuit / poste matin-AM) + heures mensuelles
  * Travail le dimanche + heures mensuelles
  * **Travail en équipes postées (Kuhn)** :
    * Visible pour tous les non-cadres
    * Si accord Kuhn non activé : Hint informatif visible
    * Si accord Kuhn activé : Option fonctionnelle
    * **Activation automatique** : Cocher cette option active automatiquement l'accord Kuhn (étape 3) avec notification toast
    * **Désactivation automatique** : Désactiver l'accord Kuhn décoche automatiquement cette option avec notification
  * **Note** : Cadres au forfait jours → majorations = repos (non simulable)

**Étape 3 - Résultat :**
* **Checkbox** "Appliquer l'accord d'entreprise Kuhn"
  * Ajuste automatiquement les taux des majorations (nuit +20%, dimanche +50%)
  * Active la prime d'ancienneté pour tous (y compris cadres, dès 2 ans)
  * Active la prime de vacances (525€, pré-cochée)
  * Rend disponible la prime d'équipe pour les non-cadres (voir 3.3.2)
  * **Notification** : Si activé manuellement, notification pour non-cadres que la prime d'équipe est disponible dans l'étape 2

**Étape 2 - Conditions de travail particulières :**
* **Travail de nuit** : Type (poste nuit / poste matin-AM) + heures mensuelles
* **Travail le dimanche** : Checkbox + heures mensuelles
* **Travail en équipes postées (Kuhn)** : 
  * Visible pour tous les non-cadres (même sans accord Kuhn activé)
  * Si accord Kuhn non activé : Hint informatif visible
  * Si accord Kuhn activé : Option fonctionnelle
  * **Activation automatique** : Cocher cette option active automatiquement l'accord Kuhn avec notification
  * **Désactivation automatique** : Désactiver l'accord Kuhn décoche automatiquement cette option avec notification
* **Note forfait jours** : Cadres au forfait jours → majorations = repos compensateur (non simulable)

#### 3.4. Répartition sur 13 Mois

Le 13e mois est une **modalité de versement**, pas un élément de rémunération supplémentaire.

* **Principe :** Le SMH annuel reste identique, seule la répartition mensuelle change
* **Affichage :** Petit sélecteur discret à côté du montant mensuel ("sur 12 mois" / "sur 13 mois")
* **Calcul :**
  * Sur 12 mois : SMH annuel ÷ 12
  * Sur 13 mois : SMH annuel ÷ 13 (avec un mois de "bonus" versé selon l'entreprise)
* **Versement (accord Kuhn) :** Le 13e mois est versé en novembre uniquement (le salaire annuel est réparti sur 13 mois, avec le 13e mois versé en novembre)
* **Note importante :** Le 13e mois est **inclus** dans la vérification du SMH minimum (il fait **partie du SMH**), contrairement à la prime d'ancienneté (non-cadres) ou à la prime de vacances qui en sont exclues. En mode « SMH seul » (étape 4 arriérés), la répartition sur 12 ou 13 mois s'applique donc au SMH : novembre = 2 × (SMH annuel / 13), autres mois = SMH annuel / 13 si accord Kuhn 13 mois, sinon SMH annuel / 12.

#### 3.4.1. Assiette SMH – Ce qui est inclus ou exclu

**Convention de référence :** Convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette.

**INCLUS dans l'assiette SMH :**
* Base SMH (ou barème débutants F11/F12 si &lt; 6 ans)
* **Majorations forfaits cadres** (heures +15 %, jours +30 %) : elles font partie du SMH
* **Majorations heures supplémentaires** : incluses dans l'assiette SMH
* **13e mois** : fait partie du SMH (modalité de versement, répartition 12/13)

**EXCLUS de l'assiette SMH :**
* Primes d'ancienneté (CCN ou Kuhn)
* Prime de vacances
* **Majorations pénibilité**
* Majorations nuit / dimanche / prime d'équipe

Cette règle s'applique à la vérification du minimum conventionnel et au calcul « SMH seul » des arriérés (étape 4).

#### 3.5. Graphique d'Évolution Salaire vs Inflation

Fonctionnalité permettant de visualiser l'évolution projetée du salaire comparée à l'inflation.

##### 3.5.1. Fonctionnalités

* **Bouton "Comparer à l'inflation"** : Affiche/masque le panneau du graphique
* **Projection temporelle** : 5, 10, 15, 20, 25, 30 ans ou jusqu'à la retraite
* **Option "Jusqu'à la retraite"** : 
  * Affiche un champ pour saisir l'âge actuel
  * Calcule automatiquement les années restantes (retraite à 64 ans)
* **Augmentation générale annuelle** : Taux moyen d'augmentation appliqué dans l'entreprise (0% à 10%)
* **Synchronisation automatique** : Le graphique se met à jour en temps réel avec le simulateur

##### 3.5.2. Sources de Données Inflation

Ordre de priorité avec fallback automatique :
1. **API Banque Mondiale** (source internationale officielle)
2. **INSEE** (source officielle France - mise à jour manuellement)

L'affichage indique la source utilisée et la période des données (ex: "Banque Mondiale (1975-2024)").
Plus la période récupérée sera longue, mieux ce sera.

##### 3.5.3. Calcul de l'Évolution

* **Réutilise le moteur `calculateRemuneration()`** : Garantit 100% de cohérence avec le simulateur
* **Variables projetées** : 
  * Ancienneté incrémentée de 1 chaque année
  * Expérience professionnelle incrémentée de 1 chaque année (pour cadres débutants)
  * Toutes les majorations et primes sont recalculées selon les nouvelles valeurs
* **Augmentation générale** : 
  * Taux configurable par l'utilisateur (0% à 10%)
  * Appliquée sur la partie variable du salaire (hors prime vacances fixe de 525€)
  * Cumulée année après année
* **Inflation cumulée** : 
  * Calcul basé sur la moyenne historique des données récupérées (API Banque Mondiale ou INSEE)
  * Application progressive année après année
  * Affichage de la source et de la période des données

##### 3.5.4. Affichage du Graphique

* **Courbe bleue** : Évolution du salaire (ancienneté + augmentation générale + toutes les primes/majorations)
* **Courbe rouge pointillée** : Inflation cumulée (pouvoir d'achat à maintenir)
* **Résumé** : Écart final en % par rapport à l'inflation (positif = gain de pouvoir d'achat, négatif = perte)
* **Bibliothèque** : Chart.js
* **Lazy loading** : Les données d'inflation ne sont chargées que lorsque l'utilisateur ouvre le panneau
* **Responsive** : Adaptation des labels, tailles de points et tooltips pour mobile
* **Synchronisation** : Le graphique se met à jour automatiquement quand les paramètres du simulateur changent

#### 3.6. Système de Notifications Temporaires (Toast)

L'application utilise un système de notifications temporaires pour informer l'utilisateur des actions automatiques.

**Types de notifications :**
* **Success (vert)** : Action réussie (ex: "Accord Kuhn activé automatiquement")
* **Warning (orange)** : Avertissement (ex: "Valeur corrigée")
* **Info (bleu)** : Information (ex: "Option disponible dans l'étape Situation")

**Comportement :**
* Affichage en bas à droite de l'écran
* Disparition automatique après 3-4 secondes
* Animation d'entrée/sortie fluide
* Responsive : Adaptation sur mobile (pleine largeur en bas)

**Cas d'utilisation :**
* Activation automatique de l'accord Kuhn lors de la sélection de la prime d'équipe
* Désactivation automatique de la prime d'équipe lors de la désactivation de l'accord Kuhn
* Correction automatique de l'expérience professionnelle si inférieure à l'ancienneté
* Validation des champs (salaire actuel, dates, etc.)

#### 3.7. Système de Hints Contextuels Multiples

L'interface peut afficher **plusieurs messages informatifs simultanément** selon la situation de l'utilisateur.

##### Types de Hints

| Type | Couleur | Cas d'affichage |
| --- | --- | --- |
| **Warning (orange)** | Barème salariés débutants | Cadre F11/F12 avec < 6 ans d'expérience |
| **Success (vert)** | Accord Kuhn appliqué | Kuhn activé avec éléments calculés |
| **Info (bleu)** | Majorations CCN | Majorations nuit/dimanche sans accord Kuhn |
| **Info (bleu)** | Message par défaut | Minimum conventionnel |

##### Combinaisons Possibles

Plusieurs hints peuvent s'afficher ensemble, par exemple :
- "Barème salariés débutants" + "Accord Kuhn appliqué"
- Permet à l'utilisateur de comprendre précisément ce qui est pris en compte

#### 3.8. Contraintes de Cohérence des Données

##### 3.7.1. Expérience Professionnelle ≥ Ancienneté

L'expérience professionnelle totale ne peut pas être inférieure à l'ancienneté dans l'entreprise :
* **Si ancienneté augmente** : L'expérience pro est automatiquement ajustée si elle était inférieure
* **Si expérience pro est modifiée** : Elle ne peut pas descendre en dessous de l'ancienneté
* **Message d'avertissement** : Si l'utilisateur tente de saisir une valeur inférieure, un message temporaire explique la correction automatique

##### 3.7.2. Amélioration UX des Champs Numériques

* **Sélection automatique au focus** : Tous les champs numériques sélectionnent leur contenu au focus pour faciliter la modification
* **Valeur 0** : Les champs à 0 sont particulièrement faciles à modifier sans avoir à supprimer d'abord

#### 3.9. Rapport d'Arriérés de Salaire

Fonctionnalité permettant de calculer et générer un rapport PDF formel pour réclamer les arriérés de salaire si le salaire actuel est inférieur au SMH calculé.

##### 3.9.1. Déclenchement (Étape 3)

* **Bouton conditionnel** : "Calculer mes arriérés" (texte simplifié et direct)
* **Affichage** : Carte informative avec texte introductif simplifié et compréhensible
* **Texte principal** : "Vous pensez gagner moins que le minimum affiché ?" (vulgarisé, sans jargon)
* **Description** : "Calculez vos arriérés de salaire et générez un rapport PDF pour les réclamer." (terme simple et précis)
* **Action** : Navigation vers l'étape 4 dédiée aux arriérés

##### 3.9.2. Collecte d'Informations (Étape 4)

Le formulaire demande :
* **Date d'embauche** : Pré-remplie automatiquement selon l'ancienneté renseignée
* **Date de changement de classification** : Optionnelle, si la classification a changé
* **Rupture de contrat** : Checkbox avec date de rupture si applicable
* **Accord écrit** : Checkbox indiquant si un accord écrit existe avec l'employeur sur la classification
* **Calculer les arriérés sur le SMH seul** : Option (cochée par défaut) pour l'affichage et le calcul à l'écran. Si coché, le salaire dû = assiette SMH : base + forfait cadres (les majorations forfaits font partie du SMH), sans prime de vacances, prime d'ancienneté, majorations nuit/dimanche/équipe, majorations pénibilité. Les majorations heures sup sont incluses dans l'assiette SMH ; les majorations pénibilité en sont exclues (voir § 3.4.1). **Le 13e mois fait partie du SMH**. L'utilisateur doit saisir les salaires mensuels bruts **hors primes** ; un avertissement et un tooltip le rappellent. **Conformément à la CCN Métallurgie (IDCC 3248), dispositions relatives aux SMH et à leur assiette, le rapport PDF est toujours généré sur la base du SMH** (option forcée, voir § 3.9.5).

##### 3.9.3. Frise Chronologique Interactive

**Principe :** Affichage visuel mois par mois de la période réclamable avec saisie interactive.

**Génération automatique :**
* **Période affichée** : Déterminée par la date la plus récente entre :
  * Date d'embauche
  * Date de changement de classification (si applicable)
  * **1er janvier 2024** (entrée en vigueur CCNM)
  * **Date de prescription** (3 ans en arrière)
* **Date de fin** : Date de rupture du contrat ou date du jour

**Affichage :**
* Chaque période (mois) est représentée par une carte cliquable
* **État "À saisir"** : Carte orange, période non renseignée
* **État "Saisi"** : Carte verte avec le salaire affiché
* **Interaction** : Clic sur une carte → Intéraction pour saisir le salaire mensuel brut

**Mode de saisie :**
* Affichage de la période concernée
* Champ numérique pour le salaire mensuel brut
* Valider avec la touche "Entrée" ou via un bouton "Valider"
* Validation : Montant > 0 requis
* **Modification après complétion** : Une fois tous les salaires saisis, le bloc de saisie reste affiché au centre. L'utilisateur peut **cliquer sur un point** du graphique pour rouvrir le popup sur le mois concerné et modifier le salaire. Le popup ne disparaît plus définitivement après la dernière saisie.

##### 3.9.4. Calcul des Arriérés (Mois par Mois avec Paramètres Complets)

**Option « SMH seul » (état `arretesSurSMHSeul`)**  
Si l'option « Calculer les arriérés sur le SMH seul » est cochée :
* **Salaire dû** = assiette SMH : base + **majorations forfaits** (heures/jours), le cas échéant. Sont **exclus** : prime de vacances, primes d'ancienneté, majorations nuit/dimanche/équipe, **majorations pénibilité**. Les majorations heures sup sont **incluses** dans l'assiette SMH (voir § 3.4.1).
* **Le 13e mois fait partie du SMH** : la répartition sur 12 ou 13 mois (accord Kuhn) s'applique. Si répartition sur 13 mois : novembre = 2 × (SMH annuel / 13), autres mois = SMH annuel / 13 ; sinon SMH annuel / 12. Les salaires saisis par l'utilisateur doivent être **hors primes** pour comparer au SMH.

**Logique de calcul précise et exhaustive :**
* **Pour chaque mois** de la période réclamable :
  * Si un salaire réel a été saisi pour ce mois :
    * **Calcul rétrospectif du SMH dû** : Pour chaque mois, le système recalcule le SMH dû :
      * **En mode SMH seul** : `getMontantAnnuelSMHSeul()` puis répartition mensuelle (12 ou 13 mois ; 13e mois en novembre si accord Kuhn). Le 13e mois fait partie du SMH.
      * **En mode rémunération complète** : ancienneté progressive, expérience pro, forfait, accord Kuhn, conditions de travail, versements spécifiques :
      * **Ancienneté progressive** : L'ancienneté au moment de ce mois précis (depuis la date d'embauche)
      * **Expérience professionnelle** : Utilisée telle quelle (déjà remplie à l'étape 2 du simulateur)
      * **Type de forfait** : Forfait heures, forfait jours, ou horaire collectif (selon l'état actuel)
      * **Accord Kuhn** : Appliqué si activé (impact sur primes d'ancienneté, majorations, etc.)
      * **Conditions de travail** : Majorations nuit/dimanche, prime d'équipe (selon l'état actuel)
      * **Versements mensuels spécifiques (accord Kuhn)** :
        * **Prime de vacances** : Versée **en une fois en juillet** (pas étalée sur l'année). Répartition : salaire mensuel dû en juillet = (salaire annuel hors prime)/12 + prime ; les autres mois = (salaire annuel hors prime)/12. Si 13e mois : idem avec dénominateur 13, et juillet = base/13 + prime.
        * **13e mois** : **Fait partie du SMH** (modalité de versement, pas une prime). Versé **en novembre uniquement** (si répartition sur 13 mois activée). En novembre, salaire mensuel dû = 2 × (salaire annuel / 13) ; les autres mois = salaire annuel / 13. S'applique aussi en mode « SMH seul ».
      * **Toutes les autres primes** : Prime d'ancienneté (CCN ou Kuhn), etc.
    * Le calcul utilise, selon le mode, `getMontantAnnuelSMHSeul()` (SMH seul) ou la fonction `calculateRemuneration()` principale avec les paramètres temporairement ajustés pour ce mois spécifique
    * Salaire mensuel réel = Salaire mensuel saisi
    * Salaire mensuel dû = SMH calculé pour ce mois
    * Différence = Salaire mensuel dû - Salaire mensuel réel
    * Si différence > 0 → Ajout aux arriérés totaux
* **Total** : Somme de toutes les différences mensuelles positives

**Avantages de cette approche :**
* **Précision maximale** : Chaque mois est calculé individuellement avec tous les paramètres pertinents
* **Cohérence** : Réutilise le moteur de calcul principal (`calculateRemuneration()`) pour garantir la cohérence
* **Prise en compte complète** : Tous les éléments de rémunération sont pris en compte (forfait, accord, majorations, primes)
* **Ancienneté progressive** : L'ancienneté augmente naturellement mois par mois, impactant les primes d'ancienneté
* **Respect de la prescription** : Chaque mois est une échéance de paiement distincte (Art. L.3245-1)
* **Transparence** : L'utilisateur voit exactement quels mois génèrent des arriérés et pourquoi
* **Rétrospective précise** : Le calcul rétrospectif reflète fidèlement l'évolution du salaire dû dans le temps

##### 3.9.5. Génération du Rapport PDF

**Règle : PDF uniquement sur la base du SMH**
* **Conformément à la convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette**, le rapport PDF est **toujours** établi sur la base du SMH (assiette conventionnelle hors primes).
* L'option « SMH seul » est **forcée** pour la génération du PDF : les données sont recalculées en mode SMH seul avant ouverture du modal, quel que soit l'état de la case « Calculer les arriérés sur le SMH seul » à l'écran.
* L'utilisateur est **prévenu** :
  * Par un **toast** à l'ouverture du modal : « Le rapport PDF est établi uniquement sur la base du SMH (assiette hors primes). »
  * Par une **notice visible dans le modal** (avant les champs) : « Le rapport PDF est établi uniquement sur la base du SMH (assiette conventionnelle hors primes). L'option « SMH seul » est appliquée automatiquement pour la génération. »

**Contenu exhaustif du PDF :**

**Section 1 : Informations du contrat**
* Date d'embauche (format complet : jour mois année)
* Date de changement de classification (si applicable)
* Date de rupture du contrat (si applicable)
* Statut du contrat (en cours ou rompu)
* Accord écrit avec l'employeur (si applicable)

**Section 2 : Résumé du calcul**
* Période concernée (date de début et date de fin)
* Nombre de mois avec arriérés
* Salaire Minimum Hiérarchique (SMH) calculé
* **Total des arriérés** (mis en évidence)

**Section 3 : Détail des arriérés par période**
* Tableau détaillé avec colonnes :
  * Période (mois et année)
  * Salaire réel (rémunération mensuelle totale brut)
  * Salaire dû (rémunération mensuelle totale brut)
  * Arriérés (différence mensuelle)
* Formatage des montants : Espaces comme séparateurs de milliers (ex: "35 000 €" au lieu de "35/000€")

**Section 4 : Points d'attention juridiques**
* Prescription : Article L.3245-1 du Code du travail (3 ans par échéance)
* Convention Collective : Limitation aux arriérés postérieurs au 1er janvier 2024
* Points favorables : Accord écrit, changement de classification documenté (si applicable)

**Section 5 : Méthodologie de calcul** (résumé)
* **Conformément à la CCN Métallurgie (IDCC 3248), dispositions relatives aux SMH et à leur assiette**, le rapport PDF est **toujours** établi sur la base du SMH (option « SMH seul » forcée).
* SMH de base, majoration forfait, répartition 12/13 mois (13e mois en novembre si accord Kuhn). Accord Kuhn : prime ancienneté, prime vacances, 13e mois — mentionnés pour contexte, mais **le salaire dû retenu dans le PDF = assiette SMH uniquement** (base + forfait, hors primes). L'ancienneté n'affecte pas l'assiette SMH.
* Calcul rétrospectif mois par mois : pour chaque mois, le salaire dû = assiette SMH ; comparé au salaire perçu (hors primes). Sources et références : CCN Métallurgie (IDCC 3248), SMH et assiette ; Code du travail art. L.3245-1 ; Accord Kuhn si pertinent.

**Section 6 : Méthodes de calcul détaillées**
* **Principe** : Conformément à la convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette, ce rapport est établi uniquement sur la base du SMH (assiette conventionnelle hors primes). Pour chaque mois, le salaire dû = assiette SMH (base + majorations forfait), comparé au salaire perçu (hors primes). L'assiette SMH **ne dépend pas de l'ancienneté**.
* **Période** : Date de début (embauche / changement de classification / 01/01/2024 / prescription 3 ans), date de fin (rupture ou aujourd'hui).
* **Calcul du salaire mensuel dû** : Le salaire dû retenu dans ce rapport = assiette SMH uniquement (base + forfait ; inclus : base, forfaits cadres, 13e mois ; exclus : primes ancienneté, prime vacances, majorations pénibilité/nuit/dimanche/équipe). Répartition 12 ou 13 mois (13e mois en novembre si Kuhn).
* **Formule** : `Arriérés(mois) = max(0 ; Salaire mensuel dû(mois) − Salaire mensuel perçu(mois))` ; total = somme sur tous les mois. Le texte de la formule est découpé en largeur (`splitTextToSize`) pour ne pas dépasser la marge du PDF.
* **Base de calcul du rapport : assiette SMH** : Conformément à la CCN Métallurgie (IDCC 3248), dispositions relatives à l'assiette SMH (inclus / exclus). Ce rapport retient uniquement l'assiette SMH comme salaire dû. Les salaires saisis pour la comparaison sont les salaires mensuels bruts hors primes.
* **Références** : Convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette ; Code du travail, art. L.3245-1 ; Accord Kuhn si pertinent.

**Formatage et lisibilité :**
* **Formatage des nombres** : Utilisation de `formatMoneyPDF()` qui utilise des espaces comme séparateurs de milliers (conforme aux standards français)
* **Hiérarchie visuelle** : Titres en gras, sections numérotées, mise en évidence du total
* **Couleurs** : Utilisation discrète de couleurs pour mettre en évidence les montants importants
* **Espacement** : Marges cohérentes, espacement entre sections
* **Pagination** : Numérotation des pages en bas de chaque page

**Format :** PDF professionnel généré avec jsPDF, téléchargeable avec nom de fichier : `Rapport_arriérés_[Classification]_[Date].pdf`

**Gestion multi-pages :** Le PDF gère automatiquement les sauts de page si le contenu dépasse une page, avec réaffichage des en-têtes et pieds de page appropriés.

##### 3.9.6. Instructions Juridiques Interactives (Version avec Onglets)

**Affichage amélioré :** Système d'onglets dans l'étape 4 pour réduire le scroll et améliorer la navigation.

**Structure en deux onglets :**

**Onglet 1 : Guide juridique**
* **Étape 1 : Vérification des informations**
  * Vérifier classification, ancienneté, dates, salaires saisis
  * Comparer avec bulletins de paie et contrat de travail
* **Étape 2 : Consultation professionnelle**
  * Avocat spécialisé en droit du travail
  * Syndicat pour accompagnement
  * Inspection du travail pour informations
* **Étape 3 : Rassemblement des preuves**
  * Bulletins de paie de toute la période
  * Contrat de travail et avenants
  * Correspondances écrites
  * Fiches de poste, évaluations, emails

**Onglet 2 : Prochaines étapes**
* **Étape 1 : Demande amiable**
  * Rédaction d'une LRAR
  * Joindre le rapport PDF généré
  * Inclure les justificatifs
  * Ton courtois et factuel
* **Étape 2 : Médiation/Juridiction**
  * Médiation si demande amiable échoue
  * Saisine Conseil de Prud'hommes
  * Délai de prescription (3 ans)
* **Étape 3 : Délais et prescription**
  * Prescription : 3 ans par échéance de paiement
  * Délai de réponse LRAR : 1 mois
  * Saisine Prud'hommes dans les délais
  * Limitation CCNM 2024

**Avantages de cette approche :**
* **Réduction du scroll** : Contenu organisé en deux sections accessibles via onglets
* **Navigation intuitive** : L'utilisateur peut facilement basculer entre le guide et les étapes pratiques
* **Meilleure lisibilité** : Contenu moins dense, plus facile à parcourir
* **Engagement utilisateur** : Interface plus moderne et interactive

**Style interactif :** Chaque étape est présentée dans une carte avec numéro, titre et contenu détaillé. Les onglets sont stylisés avec état actif/inactif clair.

**Avertissement légal :** Le rapport est indicatif et ne constitue pas un avis juridique. Consultation professionnelle obligatoire avant toute démarche.

##### 3.9.7. Bouton de Calcul Sticky

**Positionnement :**
* **Bouton sticky** : Fixé en bas de l'écran lors du scroll dans l'étape 4
* **Visibilité** : Apparaît automatiquement dès qu'au moins un salaire est saisi
* **Style** : Bouton large et visible, style cohérent avec l'application
* **Fonctionnalité** : Lance le calcul des arriérés et fait défiler vers les résultats

**Avantages :**
* **Accessibilité** : Le bouton reste accessible même après avoir scrollé pour saisir de nombreux mois
* **Ergonomie** : Permet de recalculer facilement après modification des salaires
* **Guidage** : Indique clairement l'action suivante à effectuer

---

### 4. Spécifications Techniques & UI (Design System Hugo Book)

#### A. Stack Technique

* **Langages :** HTML5, CSS3, JavaScript (ES6+).
* **Dépendances Externes :**
* `Popper.js` (Core positionnement).
* `Tippy.js` (Gestion des tooltips).
  * `Chart.js` (Graphiques d'évolution).
  * `jsPDF` (Génération de rapports PDF).
* *Aucun framework lourd (React/Vue) pour garantir la portabilité.*
* **APIs Externes :**
  * API Banque Mondiale (données inflation France) - avec fallback local INSEE

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
  * **Acronymes :** Chaque acronyme est défini **une seule fois**, à sa **première apparition** dans l'application (forme complète puis acronyme entre parenthèses, ex. « Convention collective nationale (CCN) »). Toutes les occurrences suivantes utilisent le seul acronyme. Exemples : CCN, CCNM, SMH, PDF.

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

**Audit config vs calculs et tooltips :** Tous les calculs (rémunération, arriérés, évolution) s'appuient sur les valeurs de `config.js` (CONFIG) : SMH, BAREME_DEBUTANTS, TAUX_ANCIENNETE, POINT_TERRITORIAL, ACCORD_ENTREPRISE, MAJORATIONS_CCN, FORFAITS, etc. Les tooltips du détail de rémunération (étape 3) indiquent l'origine de chaque ligne (CCN ou Accord d'entreprise Kuhn). Les conditions et montants affichés dans l'application doivent rester alignés sur la config pour éviter les régressions.

#### D. Architecture du Code (`app.js`)

Le code est organisé en modules fonctionnels :

* **État global (`state`)** : Centralise toutes les valeurs saisies par l'utilisateur
* **Moteur de classification** : `calculateClassification()`, `getActiveClassification()`
* **Moteur de rémunération** : `calculateRemuneration()` - source unique de vérité
* **Fonctions d'affichage** : `updateAll()`, `updateRemunerationDisplay()`, `updateHintDisplay()`
* **Graphique d'évolution** : `calculateSalaryEvolution()` - **réutilise `calculateRemuneration()`**
* **Rapport arriérés** : `calculerArretees()`, `afficherResultatsArretees()`, `genererPDFArretees()`
* **Notifications** : `showToast()` - Messages temporaires pour actions automatiques
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
11. **Prime d'équipe Kuhn :** Non-cadre, accord Kuhn activé, 151.67h/mois → Prime = 0.82 × 151.67 = 124€/mois
12. **Activation automatique accord :** Cocher "Travail en équipes postées" sans accord → Accord activé automatiquement avec notification
13. **Désactivation prime équipe :** Désactiver accord Kuhn avec prime équipe cochée → Prime équipe décochée automatiquement avec notification

#### 5.4. Tests Répartition 13 Mois
11. **Calcul sur 12 mois :** Classe A1 (21 700€) → 1 808€/mois
12. **Calcul sur 13 mois :** Classe A1 (21 700€) → 1 669€/mois (total annuel inchangé)

#### 5.5. Tests de Cohérence des Données
13. **Expérience ≥ Ancienneté :** Si ancienneté = 5, expérience pro ne peut pas être < 5
14. **Synchronisation :** Modifier l'ancienneté met à jour l'expérience pro si nécessaire

#### 5.6. Tests Graphique d'Évolution
15. **Cohérence simulateur :** Le salaire année 0 du graphique = total affiché dans le simulateur
16. **Évolution ancienneté :** L'ancienneté augmente de 1 par année projetée
17. **Évolution expérience :** Pour cadres débutants, l'expérience augmente de 1 par année
18. **Augmentation générale :** Avec 2%/an sur 10 ans, le salaire variable augmente d'environ 22%
19. **Source inflation :** Affichage de la source (Banque Mondiale ou INSEE) et de la période
20. **Lazy loading :** Les données d'inflation ne sont chargées qu'à l'ouverture du panneau
21. **Projection retraite :** Option "Jusqu'à la retraite" calcule correctement les années restantes (64 ans - âge actuel)
22. **Synchronisation :** Modification des paramètres (ancienneté, majorations, accord Kuhn) → graphique mis à jour automatiquement
23. **Responsive mobile :** Graphique lisible sur petits écrans (labels adaptés, tooltips optimisés)

#### 5.7. Tests Hints Multiples
19. **Affichage combiné :** Cadre débutant + Kuhn activé → 2 hints visibles simultanément
20. **Hint par défaut :** Si aucune condition spéciale, affiche "minimum conventionnel"

#### 5.8. Tests UI/UX
21. **Wizard navigation :** Navigation possible via les numéros d'étapes (stepper)
22. **Responsive :** Carrousel et graphique utilisables sur mobile
23. **Tooltips :** Informations contextuelles sur tous les champs avec "?"
24. **Intégration Hugo :** Le code s'intègre sans casser le style du thème Book
25. **Sélection automatique champs :** Focus sur champ numérique → contenu sélectionné automatiquement
26. **Toast notifications :** Messages temporaires pour actions automatiques (activation/désactivation accord, prime équipe)

#### 5.9. Tests Notifications Toast
27. **Activation automatique accord :** Cocher prime équipe sans accord → Toast success "Accord Kuhn activé automatiquement"
28. **Désactivation prime équipe :** Désactiver accord avec prime équipe cochée → Toast info "Option décochée car accord inactif"
29. **Correction expérience :** Saisir expérience < ancienneté → Toast warning avec valeur tentée et correction
30. **Disparition automatique :** Toast disparaît après 3-4 secondes avec animation

#### 5.10. Tests Rapport d'Arriérés
31. **Bouton étape 3 :** Bouton "Vérifier mes arriérés" visible dans l'étape 3
32. **Navigation étape 4 :** Clic sur le bouton → Navigation vers étape 4 dédiée
33. **Frise chronologique :** Génération automatique des périodes mois par mois selon les dates renseignées
34. **Saisie salaire :** Clic sur période → Modal s'ouvre avec champ de saisie
35. **Enregistrement salaire :** Saisie montant → Carte passe en état "Saisi" (vert) avec montant affiché
35bis. **Modification après complétion :** Une fois tous les salaires saisis, le popup reste affiché ; clic sur un point du graphique → réouverture du popup sur ce mois pour modifier le salaire
36. **Calcul sans arriérés :** Tous les salaires saisis ≥ SMH mensuel → Message "aucun arriéré"
37. **Calcul avec arriérés :** Salaires inférieurs au SMH → Calcul mois par mois des différences
37bis. **Option « SMH seul » :** Si cochée, salaire dû = assiette SMH (base + forfaits ; forfaits et heures sup inclus, pénibilité et primes ancienneté exclues) avec répartition 12/13 mois ; le 13e mois fait partie du SMH. Saisie utilisateur = brut hors primes ; avertissement et tooltip le rappellent
37ter. **PDF uniquement sur SMH :** Conformément à la CCN Métallurgie (IDCC 3248), dispositions relatives aux SMH et à leur assiette, le rapport PDF est toujours généré sur la base du SMH (assiette hors primes). L'option « SMH seul » est forcée à l'ouverture du modal PDF ; toast et notice dans le modal préviennent l'utilisateur.
38. **Prescription 3 ans :** Date embauche 2015, aujourd'hui 2025 → Période limitée à 3 ans (2022-2025) ou CCNM (2024-2025) si plus récent
39. **CCNM 2024 :** Date embauche 2020 → Période commence au 01/01/2024 (pas avant)
40. **Changement classification :** Date changement après embauche → Période commence à la date de changement
41. **Rupture contrat :** Date rupture renseignée → Période se termine à la date de rupture
42. **Validation saisie :** Modal refuse montant ≤ 0 avec toast d'avertissement
43. **Pré-remplissage date embauche :** Ancienneté renseignée → Date embauche pré-remplie automatiquement
44. **Génération PDF :** Tous les éléments présents (montants, détails mois par mois, points juridiques, instructions, numérotation pages)
45. **Instructions juridiques :** Affichage interactif des 6 étapes dans accordéon avec cartes numérotées
46. **Points juridiques :** Affichage des limitations (prescription, CCNM) et points favorables (accord écrit, changement documenté)
47. **Calcul précis :** Variation de salaire dans le temps → Calcul correct mois par mois avec différences individuelles

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

#### 6.6. Aspects Juridiques - Arriérés de Salaire

**Références légales :**
* **Prescription :** Article L.3245-1 du Code du travail - 3 ans à compter de chaque échéance
* **CCNM 2024 (IDCC 3248) :** Entrée en vigueur le 1er janvier 2024 ; dispositions relatives aux salaires minima hiérarchiques et à leur assiette (inclus / exclus, voir § 3.4.1)
* **Maintien de salaire :** Article L.2261-22 - Obligation de maintien si nouvelle classification fait baisser la rémunération

**Conditions de réclamation :**
* Salaire actuel < SMH calculé selon la classification
* Période dans les limites de prescription (3 ans)
* Période postérieure au 1er janvier 2024 (CCNM)
* Pas de rupture de contrat invalidante (démission sans préavis, faute grave, etc.)

**Éléments favorables :**
* Accord écrit avec l'employeur sur la classification
* Changement de classification documenté
* Correspondances écrites mentionnant la classification

**Démarches recommandées :**
1. Consultation professionnelle (avocat, syndicat)
2. Rassemblement des preuves (bulletins, contrat, correspondances)
3. Demande amiable par LRAR
4. Médiation ou saisine Conseil de Prud'hommes si échec
