# 📑 PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Simulateur de Classification et Rémunération - Métallurgie 2024

### 1. Vision et Objectifs

* **Objectif Principal :** Fournir aux salariés de la métallurgie un outil autonome, simple et juridiquement fiable pour déterminer leur classification (Groupe/Classe) et leur salaire minimum conventionnel.
* **Contexte :** La nouvelle Convention Collective Nationale de la Métallurgie (CCNM), entrée en vigueur au 01/01/2024, introduit un système de cotation par critères classants complexe. L'outil doit vulgariser cette complexité sans perdre en rigueur.
* **Sources Juridiques :**
  * **CCNM 2024 :** Convention Collective Nationale de la Métallurgie (IDCC 3248) - Entrée en vigueur 01/01/2024
  * **Code du Travail :** Art. L2254-2 (Principe de faveur)
  * **Accords d'entreprise :** Définis dans le dossier `accords/` et chargés à l'exécution (voir documentation technique et `docs/AJOUTER_ACCORD.md`).
* **Cible Technique :** Module web intégrable nativement dans un site de documentation statique (Hugo avec thème "Book") ou via iframe.
* **Territoire cible :** Bas-Rhin (67) - valeur du point territorial configurée en conséquence.
* **Extensibilité :** L'application supporte désormais un système générique d'accords d'entreprise, permettant d'ajouter facilement de nouveaux accords sans modifier le code de base.
* **Conformité Juridique :** Le système applique systématiquement le principe de faveur (Art. L2254-2 Code du Travail) en comparant les règles CCN et Accord et en choisissant la plus avantageuse pour le salarié.

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
  - **Cadres :** Type de forfait (ex. 35h, forfait heures, forfait jours — taux dans CONFIG.FORFAITS)
  - **Cadres débutants (F11/F12) :** Expérience professionnelle
- Conditions de travail particulières (panneau dépliable) : travail de nuit (type + heures ou, si accord avec deux taux nuit, deux champs heures poste nuit / poste matin), travail dimanche

#### Étape 3 : Résultat
- Options de calcul (Accord d'entreprise si disponible, 13e mois)
- **Comparaison avec/sans accord** : Checkbox pour activer/désactiver l'accord d'entreprise et comparer les résultats. À la désactivation, l'état et les valeurs des options accord (primes cochées, heures, etc.) sont **conservés** et restitués à la réactivation, sans obliger l'utilisateur à ressaisir.
- Badge visuel indiquant si l'accord est appliqué dans le calcul
- Affichage du SMH annuel et mensuel
- Détail du calcul (panneau dépliable) avec indication de l'origine (CCN ou Accord)
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
* **Table de Transposition :** Points → Groupe/Classe (ex. A1 pour 6-8 pts, I18 pour 60 pts). Valeurs dans CONFIG.MAPPING_POINTS.

* **Fonctionnalité "Débrayage" :** L'utilisateur doit pouvoir forcer manuellement le couple Groupe/Classe via un bouton "Ajuster manuellement".

#### 3.2. Moteur de Rémunération (Le Calculateur Financier)

Le simulateur doit gérer **3 profils distincts** avec des règles de paie radicalement différentes.

##### PROFIL A : OUVRIERS & ETAM (Non-Cadres - Cl. 1 à 10)

* **Salaire Base :** SMH de la classe (Voir Annexe).
* **Prime d'ancienneté (CCN, non-cadres) :**
  * *Condition :* Ancienneté ≥ seuil CCN (CONFIG.ANCIENNETE.seuil ; ex. 3 ans).
  * *Base de calcul :* Valeur du point territorial (pas le SMH). *Source :* CCNM Art. 142.
  * *Formule :* Point territorial × Taux (classe) × Années = montant **mensuel** ; annuel = mensuel × 12. Taux et plafond : CONFIG.TAUX_ANCIENNETE, CONFIG.ANCIENNETE.plafond (ex. 15 ans).
  * *Exemple :* Point 5,90 × taux C5 × 10 ans → montant mensuel puis × 12 (valeurs numériques dans CONFIG).
  * *Principe de faveur :* Si un accord prévoit une prime d'ancienneté plus avantageuse, le système applique la règle la plus favorable (Art. L2254-2).

* **Majorations conditions de travail (CCNM Art. 145, 146) :** Les taux CCN (ex. nuit, dimanche) sont centralisés dans CONFIG.MAJORATIONS_CCN et peuvent être mis à jour ; les valeurs actuelles ne sont pas figées (ex. à titre indicatif : nuit +15 %, dimanche +100 %). Exclues de l'assiette SMH. Principe de faveur : si un accord prévoit des taux différents, le système applique le plus avantageux. Saisie des heures dans le simulateur pour le calcul.
  * **CCN seule :** Un seul type de nuit (un taux CCN pour toutes les heures de nuit) ; l'utilisateur choisit « aucun », « poste de nuit » ou « poste matin/AM » et saisit les heures de nuit/mois.
  * **Accord avec deux taux nuit (ex. poste nuit / poste matin) :** Lorsqu'un accord définit deux majorations nuit distinctes (ex. +20 % poste nuit, +15 % poste matin/AM — valeurs d'exemple, propres à chaque accord), le simulateur affiche **deux champs** : « Heures poste de nuit/mois » et « Heures poste matin/AM/mois », afin de refléter la diversité des postes d'un ouvrier sur un même mois (plusieurs types d'heures de nuit cumulables).

##### PROFIL B : CADRES CONFIRMÉS (Cl. 11 à 18, hors débutants)

* **Salaire de base :** SMH de la classe (CONFIG.SMH).
* **Prime d'ancienneté CCN :** Incluse dans le salaire de base des cadres (CCNM Art. 142). Un accord d'entreprise peut prévoir une prime d'ancienneté pour les cadres (base = rémunération de base).
* **Majorations forfaits (CCNM Art. 139) :** Taux forfait heures / forfait jours — **inclus dans l'assiette SMH** (CONFIG.FORFAITS ; ex. +15 % heures, +30 % jours).

##### PROFIL C : CADRES DÉBUTANTS (Classes F11 et F12)

* **Déclencheur :** Si classe 11 ou 12, demander l’expérience professionnelle.
* **Logique :** Si expérience &lt; seuil (ex. 6 ans), le SMH suit le barème débutants (CONFIG.BAREME_DEBUTANTS), pas le SMH standard de la classe.
* **Source :** CCNM Art. 139, barème salariés débutants.
* **Tranches :** Définies dans CONFIG.BAREME_DEBUTANTS (ex. &lt; 2 ans, 2 à &lt; 4 ans, 4 à 6 ans, ≥ 6 ans). L’alternance compte pour moitié.
* **Note :** Les montants du barème intègrent déjà les majorations Art. 139 (taux selon tranche ; ex. 5 % à 2 ans, 8 % à 4 ans).

#### 3.3. Accord d'entreprise

Les accords d'entreprise sont **définis en dehors du PRD** (dossier `accords/`, chargés à l'exécution). Le PRD ne fixe pas les règles d'un accord particulier.

**Comportement générique :**
* L'utilisateur peut activer un accord d'entreprise via une **checkbox** (libellé et liste d'accords fournis par les définitions chargées).
* Une fois un accord activé, des options supplémentaires apparaissent pour configurer les éléments de rémunération prévus par cet accord (primes, majorations, etc.).
* **Désactivation sans perte :** Lorsque l'accord est désactivé (décocher la case), l'état et les valeurs des options (primes cochées, heures, etc.) sont **conservés** ; à la réactivation (recocher la case ou activer une option liée à l'accord), les valeurs sont restituées sans ressaisie.
* **Principe de faveur (Art. L2254-2 Code du Travail) :** Le système compare les règles CCN et accord et applique la règle la plus avantageuse pour le salarié (ex. prime d'ancienneté, majorations nuit/dimanche).
* Les primes et majorations spécifiques à l'accord (prime d'équipe, prime de vacances, etc.) sont décrites dans chaque fichier d'accord ; l'UI s'adapte dynamiquement (options conditionnelles, activation/désactivation liée à l'accord).
* **Répartition 12/13 mois :** Si l'accord prévoit une répartition sur 13 mois (mois de versement défini dans l'accord, ex. novembre), le sélecteur et les calculs en tiennent compte.

**Documentation :** Pour ajouter ou modifier un accord, voir `docs/AJOUTER_ACCORD.md` et `docs/INTEGRER_ACCORD_TEXTE_ET_IA.md`. Référence du schéma : `src/agreements/AgreementInterface.js` et exemples dans `accords/`.

**Règle d'architecture (ancre métier) :** L'application est **générique** vis-à-vis des accords : pas d'identifiants ni de conditions spécifiques à un accord ou à une prime ; seuls les types du schéma (ex. `valueType`, `stateKeyHeures`, `defaultActif`) sont utilisés. Options accord : affichage dynamique, délégation d'événements, `state.accordInputs`.

**Règle commentaires (toutes modifications futures) :** Ne conserver que les commentaires à valeur ajoutée durable (règles métier, non-évidents, ancre pour maintenance). Proscrire les commentaires de simple mise à jour ou sans portée.

**Méthodologie prime d'ancienneté et assiette SMH (convention / accord — Art. 140 CCNM) :**
* **Assiette SMH** (vérification du minimum conventionnel et mode « SMH seul » arriérés) = base SMH + majorations forfaits cadres + primes d'accord avec `inclusDansSMH: true` (ex. prime de vacances, complément salarial annuel). **Exclues** : prime d'ancienneté (CCN ou accord — formellement exclue par l'Art. 140 et le Conseil d'État), majorations nuit/dimanche/équipe, majorations pénibilité. La prime d'ancienneté **s'ajoute au minimum garanti** ; elle ne fait pas partie de l'assiette SMH.
* **Base de calcul de la prime d'ancienneté :** CCN (non-cadres) = **valeur du point territorial** × taux (classe) × années (CCNM Art. 142). Accord (ex. Kuhn) = **rémunération de base brute** (dans l'app : SMH de la classe utilisé comme base) ; les dispositions accord se substituent aux art. 142/143 CCN.
* **Principe de faveur (Art. L2254-2) :** Un accord **moins favorable ou illégal** par rapport à la convention n'est pas appliqué pour l'élément concerné ; la règle CCN prime.

#### 3.4. Répartition sur 13 Mois

Le 13e mois est une **modalité de versement**, pas un élément de rémunération supplémentaire.

* **Principe :** Le SMH annuel reste identique, seule la répartition mensuelle change
* **Affichage :** Petit sélecteur discret à côté du montant mensuel ("sur 12 mois" / "sur 13 mois")
* **Calcul :**
  * Sur 12 mois : SMH annuel ÷ 12
  * Sur 13 mois : SMH annuel ÷ 13 (avec un mois de "bonus" versé selon l'entreprise)
* **Versement (si accord avec 13e mois) :** Selon l'accord, le 13e mois est versé un mois donné (ex. novembre ; défini dans l'accord).
* **Note importante :** Le 13e mois est **inclus** dans la vérification du SMH minimum (il fait **partie du SMH**), tout comme les primes d'accord marquées `inclusDansSMH: true` (ex. prime de vacances). En revanche, la prime d'ancienneté est **exclue** (Art. 140 CCNM). En mode « SMH seul » (étape 4 arriérés), la répartition sur 12 ou 13 mois s'applique à la base SMH hors primes fixes incluses, celles-ci étant concentrées dans leur mois de versement (ex. vacances en juillet).

#### 3.4.1. Assiette SMH – Inclus / Exclus (Art. 140 CCNM)

Aligné sur la convention (IDCC 3248, Art. 140) et la config (config.js). Chaque prime d'accord porte un flag `inclusDansSMH` (défini dans le fichier d'accord) qui détermine dynamiquement son inclusion.

**INCLUS (comptent pour atteindre le minimum) :** Base SMH (ou CONFIG.BAREME_DEBUTANTS si cadre F11/F12 sous le seuil), majorations forfaits cadres (CONFIG.FORFAITS), majorations heures sup, 13e mois (répartition 12/13), primes d'accord avec `inclusDansSMH: true` (ex. prime de vacances = complément salarial annuel).

**EXCLUS (s'ajoutent au minimum, ne servent pas à l'atteindre) :** Prime d'ancienneté (CCN ou accord — Art. 140, Conseil d'État), majorations pénibilité, majorations nuit / dimanche / prime d'équipe, primes d'accord avec `inclusDansSMH: false`.

S'applique à la vérification du minimum conventionnel et au mode « SMH seul » des arriérés (étape 4). En mode SMH seul, les primes incluses avec `moisVersement` sont concentrées dans leur mois de versement pour une comparaison mensuelle correcte.

#### 3.5. Graphique d'Évolution Salaire vs Inflation

Fonctionnalité permettant de visualiser l'évolution projetée du salaire comparée à l'inflation.

##### 3.5.1. Fonctionnalités

* **Bouton "Comparer à l'inflation"** : Affiche/masque le panneau du graphique
* **Projection temporelle** : horizons proposés (ex. 5, 10, 15, 20, 25, 30 ans) ou jusqu'à la retraite
* **Option "Jusqu'à la retraite"** : 
  * Affiche un champ pour saisir l'âge actuel
  * Calcule automatiquement les années restantes (âge légal de départ, ex. 64 ans)
* **Augmentation générale annuelle** : Taux moyen d'augmentation configurable par l'utilisateur (ex. 0 % à 10 %)
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
  * Taux configurable par l'utilisateur (ex. 0 % à 10 %)
  * Appliquée sur la partie variable du salaire (hors primes à montant fixe type prime vacances, montant défini par l'accord)
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
* **Success (vert)** : Action réussie (ex: "Accord d'entreprise activé automatiquement")
* **Warning (orange)** : Avertissement (ex: "Valeur corrigée")
* **Info (bleu)** : Information (ex: "Option disponible dans l'étape Situation")

**Comportement :**
* Affichage en bas à droite de l'écran
* Disparition automatique après quelques secondes (ex. 3–4 s)
* Animation d'entrée/sortie fluide
* Responsive : Adaptation sur mobile (pleine largeur en bas)

**Cas d'utilisation :**
* Activation automatique de l'accord lors de la sélection d'une option liée (ex. prime d'équipe)
* Désactivation automatique de l'option lors de la désactivation de l'accord
* Correction automatique de l'expérience professionnelle si inférieure à l'ancienneté
* Validation des champs (salaire actuel, dates, etc.)

#### 3.7. Système de Hints Contextuels Multiples

L'interface peut afficher **plusieurs messages informatifs simultanément** selon la situation de l'utilisateur.

##### Types de Hints

| Type | Couleur | Idée | Quand l'afficher |
| --- | --- | --- | --- |
| Warning | orange | Barème spécifique (ex. débutants) : rappel du régime et du seuil pour le SMH standard | Cas particulier (ex. cadre avec peu d'expérience) |
| Success | vert | Accord d'entreprise appliqué : rappel des éléments pris en compte (primes, majorations) | Accord activé et éléments accord dans le calcul |
| Info | bleu | Majorations CCN : rappel des taux et invitation à activer un accord si pertinent | Majorations cochées sans accord activé |
| Info | bleu | Message par défaut : minimum conventionnel, éventuellement prime d'ancienneté | Aucun des cas ci-dessus |

##### Combinaisons possibles

Plusieurs hints peuvent coexister (ex. barème spécifique + accord appliqué). Sinon un seul hint suffit pour contextualiser le résultat.

#### 3.8. Contraintes de Cohérence des Données

##### 3.8.1. Expérience professionnelle ≥ Ancienneté

L'expérience professionnelle totale ne peut pas être inférieure à l'ancienneté dans l'entreprise :
* **Si ancienneté augmente** : L'expérience pro est automatiquement ajustée si elle était inférieure
* **Si expérience pro est modifiée** : Elle ne peut pas descendre en dessous de l'ancienneté
* **Message d'avertissement** : Si l'utilisateur tente de saisir une valeur inférieure, un message temporaire explique la correction automatique

##### 3.8.2. Amélioration UX des champs numériques

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
* **Calculer les arriérés sur le SMH seul** : Option (cochée par défaut) pour l'affichage et le calcul à l'écran. Si coché, le salaire dû = assiette SMH Art. 140 : base + forfait cadres + primes d'accord avec `inclusDansSMH: true` (ex. prime de vacances, concentrée dans son mois de versement). Exclues : prime d'ancienneté, majorations nuit/dimanche/équipe/pénibilité. Majorations heures sup et 13e mois inclus (voir § 3.4.1). L'utilisateur saisit les salaires bruts **incluant les primes SMH** (ex. vacances en juillet) mais **excluant** ancienneté et majorations ; un avertissement dynamique (construit depuis les flags `inclusDansSMH` de l'accord) et un tooltip le rappellent. **Conformément à la CCN Métallurgie (IDCC 3248), Art. 140, le rapport PDF n'est généré qu'en mode « SMH seul »** : la génération est bloquée sinon (voir § 3.9.5).

##### 3.9.3. Frise Chronologique Interactive

**Principe :** Affichage visuel mois par mois de la période réclamable avec saisie interactive.

**Génération automatique :**
* **Période affichée** : Déterminée par la date la plus récente entre :
  * Date d'embauche
  * Date de changement de classification (si applicable)
  * **Entrée en vigueur CCNM** (ex. 1er janvier 2024)
  * **Date de prescription** (délai légal en arrière ; ex. 3 ans)
* **Date de fin** : Date de rupture du contrat ou date du jour

**Affichage :**
* Graphique de l’évolution du salaire dû, chaque mois étant un point sur la courbe.
* Saisie guidée : l’utilisateur complète chaque salaire mensuel via une carte interactive animée apparaissant successivement au centre du graphique ; la carte se transforme en point après validation.
* Saisie rapide : le champ du mois à remplir est sélectionné automatiquement ; validation possible au clavier (Entrée), puis passage immédiat au mois suivant.
* Fin : lorsque le dernier champ est rempli, rajouter le point sur la courbe et ne plus afficher de carte intéractive, laisser l'utilisateur voir le graphique voir modifier certains points par après. 
* **Label avec tooltip** pour indiquer où trouver l’information sur la fiche de paie.

**Mode de saisie :**
* Affichage de la période concernée
* Champ numérique pour le salaire mensuel brut
* Valider avec la touche "Entrée" ou via un bouton "Valider"
* Validation : Montant > 0 requis

##### 3.9.4. Calcul des Arriérés (Comparaison par Année Civile — Art. 140 CCNM)

**Principe fondamental :** Le SMH s'apprécie sur l'**année civile** (Art. 140 CCNM). La comparaison s'effectue par année civile, pas mois par mois.

**Base de calcul :** temps plein 35h/semaine (151,67h/mois).

**Option « SMH seul » (état `arretesSurSMHSeul`) — Art. 140 CCNM**  
Si l'option « Calculer les arriérés sur le SMH seul » est cochée :
* **Salaire dû annuel** = base SMH + **majorations forfaits** (heures/jours). Les primes d'accord avec `inclusDansSMH: true` (ex. prime de vacances) ne modifient pas le total annuel dû mais sont **gérées dans la distribution mensuelle** (concentrées dans leur mois de versement). **Exclues** : prime d'ancienneté (Art. 140), majorations nuit/dimanche/équipe, pénibilité.
* **Distribution mensuelle :** Base de répartition = annuel − primes fixes SMH. Si 13 mois : mois du 13e = 2 × (base / 13), autres = base / 13 ; sinon base / 12. Primes SMH ajoutées dans leur mois de versement.

**Logique de calcul en deux passes :**

**Passe 1 — Calcul mois par mois (données granulaires) :**
* **Pour chaque mois** de la période réclamable :
  * Calcul du salaire mensuel dû (ancienneté progressive, forfait, accord, primes, etc.)
  * Salaire mensuel réel = salaire saisi par l'utilisateur
  * Écart mensuel = salaire dû − salaire réel (informatif)
* Ce détail mensuel est conservé pour la **transparence** (affichage et annexe PDF)

**Passe 2 — Regroupement par année civile (base de comparaison) :**
* Pour chaque année civile de la période :
  * `totalDû(année)` = somme des salaires mensuels dus de cette année
  * `totalPerçu(année)` = somme des salaires réels de cette année
  * `arriérés(année)` = max(0, totalDû − totalPerçu)
* **Total des arriérés** = somme des arriérés par année
* Les années incomplètes (entrée/sortie en cours d'année) comparent les mois présents

**Formule :**
* `Arriérés(année) = max(0 ; ΣsalaireDû(mois) − ΣsalairePerçu(mois))` pour chaque année civile
* `Total = Σ Arriérés(année)`

**Avantages de cette approche :**
* **Conformité CCN** : le SMH s'apprécie sur l'année civile, pas mois par mois
* **Pas de surestimation** : la compensation entre mois au sein d'une même année est prise en compte
* **Transparence** : le détail mois par mois est conservé en annexe
* **Ancienneté progressive** : l'ancienneté augmente mois par mois dans la passe 1
* **Respect de la prescription** : période limitée à 3 ans (Art. L.3245-1)

##### 3.9.5. Génération des Rapports PDF (Lettre + Annexe)

**Deux fichiers PDF distincts :**
1. **Lettre de mise en demeure** — modèle officiel (code.travail.gouv.fr/modeles-de-courriers/demande-de-paiement-de-salaire)
2. **Annexe technique** — détail des calculs, méthodologie, références juridiques

**Règle : PDF uniquement sur la base du SMH (Art. 140 CCNM)**
* La génération n'est possible **qu'en mode « SMH seul »** : bloquée sinon avec avertissement.
* L'utilisateur est prévenu par un toast et une notice dans le modal de saisie.

**PDF 1 — Lettre de mise en demeure :**
* Bloc expéditeur (salarié : nom, adresse, CP+ville)
* Bloc destinataire (société, représentant, fonction, adresse, CP+ville)
* Lieu et date, mention « Lettre recommandée avec AR »
* Objet : « Demande de régularisation de salaire »
* Corps : constat de l'écart, tableau par année civile (SMH dû, total perçu, écart), mise en demeure (8 jours), mention Conseil de Prud'hommes
* Mention facultative : copie à l'inspection du travail
* Référence à l'annexe technique en pièce jointe
* Disclaimer : document indicatif, montants à vérifier
* Formule de politesse et signature

**PDF 2 — Annexe technique :**
* Section 1 : Informations du contrat (classification, dates, employeur, SMH annuel, mention base 35h)
* Section 2 : Méthodologie (Art. 140, assiette SMH, formule de comparaison par année civile)
* Section 3 : Résumé par année civile (tableau avec totaux annuels et écarts)
* Section 4 : Détail mois par mois (informatif, avec mention que la comparaison effective est annuelle)
* Section 5 : Accord d'entreprise (si applicable, avec tag [incluse SMH] / [hors SMH])
* Section 6 : Références juridiques (CCNM Art. 140, Code du travail L.3245-1, L.2254-2)
* Disclaimer en pied de page

**Format :** PDF générés avec jsPDF, noms de fichiers : `mise_en_demeure_[date].pdf` et `annexe_technique_[date].pdf`

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
  * Délai de prescription (délai légal ; ex. 3 ans)
* **Étape 3 : Délais et prescription**
  * Prescription : délai légal par échéance de paiement (ex. 3 ans)
  * Délai de réponse LRAR : délai usuel (ex. 1 mois)
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

### 4. Spécifications Techniques & UI

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

* **Charte graphique :**
  * **Palette** : orange CFDT (#E15C12, Pantone 166) comme couleur primaire et d'accent. Déclinaisons : primary-dark (#c04e0f), primary-light (#f4a261), arrière-plan subtil (rgba 6 %). Gris neutres pour texte, bordures et fonds. Pas de bleu ni de gradient.
  * **Design brut et épuré** : aucun border-radius (angles droits partout), pas de box-shadow décoratifs, pas de linear-gradient sur les composants. Bordures fines (1 px solid) pour délimiter les zones.
  * **Typographie** : Inter (ou system fallback), hiérarchie claire par taille et graisse uniquement.
  * **Principe** : modernité et sobriété ; l'identité CFDT transparaît par la couleur orange sans surcharge visuelle.
* **Variables CSS** : `var(--color-primary)`, `var(--color-primary-dark)`, `var(--color-primary-bg)`, `var(--body-background)`, `var(--gray-100..600)`.
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

Le code centralise les données **CCN** dans `config.js` (CONFIG) : SMH, BAREME_DEBUTANTS, TAUX_ANCIENNETE, FORFAITS, MAJORATIONS_CCN, etc. Les **accords d'entreprise** ne sont pas dans CONFIG : ils sont définis dans le dossier `accords/` (fichiers par accord) et chargés à l'exécution via AgreementLoader/AgreementRegistry.

**Valeurs numériques (convention, accords) :** Les montants, taux, seuils et délais mentionnés dans ce PRD (SMH, majorations, forfaits, ancienneté, barèmes, prescription, etc.) sont donnés **à titre d'exemple** ou reflètent une version antérieure des textes. Les valeurs à jour à utiliser dans l'application doivent être cherchées dans les **fichiers de configuration** (`src/core/config.js`, objet CONFIG) et dans les **définitions d'accord** (dossier `accords/`, fichiers par accord).

```javascript
const CONFIG = {
    SMH: { 1: 21700, ... 18: 68000 }, // Valeurs annuelles
    BAREME_DEBUTANTS: { 11: {...}, 12: {...} }, // Grille F11/F12 par tranche d'expérience
    TAUX_ANCIENNETE: { 1: 1.45, ... 10: 3.80 }, // Taux par classe pour prime ancienneté CCN
    MAPPING_POINTS: [ ... ], // Logique 6-60 pts → Groupe/Classe
    CRITERES: [ ... ], // Textes et définitions des 6 critères
    SEUIL_CADRE: 11, // Classe à partir de laquelle on est cadre
    FORFAITS: { '35h': 0, 'heures': 0.15, 'jours': 0.30 }, // ex.
    ANCIENNETE: { seuil: 3, plafond: 15 }, // CCN non-cadres, ex.
    POINT_TERRITORIAL_DEFAUT: 5.90, // ex. Bas-Rhin
    MAJORATIONS_CCN: { nuit: 0.15, dimanche: 1.00 } // ex.
};
// Accords : dossier accords/, chargés via AgreementLoader/AgreementRegistry
```

**Audit config vs calculs et tooltips :** Les calculs (rémunération, arriérés, évolution) s'appuient sur `config.js` (CONFIG) pour la CCN : SMH, BAREME_DEBUTANTS, TAUX_ANCIENNETE, POINT_TERRITORIAL, MAJORATIONS_CCN, FORFAITS. Les accords d'entreprise sont définis dans le dossier `accords/` et chargés via AgreementLoader/AgreementRegistry. Les tooltips du détail de rémunération (étape 3) indiquent l'origine de chaque ligne (CCN ou accord d'entreprise). Les conditions et montants doivent rester alignés sur la config et les définitions d'accord pour éviter les régressions.

#### D. Architecture du Code (`app.js`)

Le code est organisé en modules fonctionnels :

* **État global (`state`)** : Centralise toutes les valeurs saisies par l'utilisateur
* **Moteur de classification** : `calculateClassification()`, `getActiveClassification()`
* **Moteur de rémunération** : `calculateRemuneration()` - source unique de vérité
* **Fonctions d'affichage** : `updateAll()`, `updateRemunerationDisplay()`, `updateHintDisplay()`
* **Graphique d'évolution** : `calculateSalaryEvolution()` - **réutilise `calculateRemuneration()`**
* **Rapport arriérés** : `calculerArretees()`, `afficherResultatsArretees()`, `genererPDFArretees()`
* **Notifications** : `showToast()` - Messages temporaires pour actions automatiques
* **Utilitaires** : `formatMoney()`, `computePrime()`, `computeMajoration()`, `computeForfait()`, etc.

**Principe de factorisation** : Le graphique d'évolution ne duplique pas la logique de calcul. Il modifie temporairement l'état, appelle `calculateRemuneration()`, puis restaure l'état original.

---

### 5. Critères d'Acceptation (Definition of Done)

#### 5.1. Tests de Classification
1. **Score minimal :** 6 points → Classe A1
2. **Score maximal :** 60 points → Classe I18
3. **Débrayage manuel :** Possibilité de forcer n'importe quelle combinaison Groupe/Classe

#### 5.2. Tests de Rémunération CCN
4. **Non-Cadre avec ancienneté :** Classe C5, ancienneté ≥ seuil CCN, point territorial → Prime = point × taux (classe) × années × 12 (valeurs dans CONFIG).
5. **Cadre forfait jours :** F11 → SMH × taux forfait jours (CONFIG.FORFAITS.jours).
6. **Cadre débutant :** F11, expérience dans une tranche donnée, forfait jours → SMH barème débutants × taux forfait (CONFIG.BAREME_DEBUTANTS, CONFIG.FORFAITS).

#### 5.3. Tests accord d'entreprise
7. **Prime ancienneté accord :** Selon l'accord chargé (seuil, plafond, barème).
8. **Cadres éligibles :** Si l'accord prévoit la prime d'ancienneté pour tous les statuts, les cadres en bénéficient.
9. **Majorations accord :** Les taux (nuit, dimanche) sont ceux de l'accord si activé ; principe de faveur avec la CCN.
10. **Primes accord :** Primes spécifiques (vacances, équipe, etc.) selon la définition de l'accord et les options cochées.
11. **Activation / désactivation :** Options liées à l'accord (ex. prime d'équipe) activent ou désactivent l'accord avec notification selon le comportement défini. La désactivation ne réinitialise pas les options (primes, heures) : elles sont conservées et restituées à la réactivation.

#### 5.4. Tests Répartition 13 Mois
11. **Calcul sur 12 mois :** SMH annuel ÷ 12 (ex. classe A1).
12. **Calcul sur 13 mois :** SMH annuel ÷ 13 (total annuel inchangé ; ex. classe A1).

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
21. **Projection retraite :** Option "Jusqu'à la retraite" calcule correctement les années restantes (âge légal - âge actuel, ex. 64 ans)
22. **Synchronisation :** Modification des paramètres (ancienneté, majorations, accord d'entreprise) → graphique mis à jour automatiquement
23. **Responsive mobile :** Graphique lisible sur petits écrans (labels adaptés, tooltips optimisés)

#### 5.7. Tests Hints Multiples
19. **Affichage combiné :** Cadre débutant + accord d'entreprise activé → 2 hints visibles simultanément (ex.)
20. **Hint par défaut :** Si aucune condition spéciale, affiche "minimum conventionnel"

#### 5.8. Tests UI/UX
21. **Wizard navigation :** Navigation possible via les numéros d'étapes (stepper)
22. **Responsive :** Carrousel et graphique utilisables sur mobile
23. **Tooltips :** Informations contextuelles sur tous les champs avec "?"
24. **Intégration Hugo :** Le code s'intègre sans casser le style du thème Book
25. **Sélection automatique champs :** Focus sur champ numérique → contenu sélectionné automatiquement
26. **Toast notifications :** Messages temporaires pour actions automatiques (activation/désactivation accord, prime équipe)

#### 5.9. Tests Notifications Toast
27. **Activation automatique accord :** Cocher une option liée à un accord sans accord activé → Toast success (accord activé automatiquement)
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
37bis. **Option « SMH seul » (Art. 140 CCNM) :** Si cochée, salaire dû = assiette SMH (base + forfaits + primes `inclusDansSMH: true` gérées dans distribution mensuelle ; exclues : ancienneté, majorations nuit/dim/équipe, pénibilité). Répartition 12/13 mois. Saisie utilisateur = brut incluant primes SMH (ex. vacances), excluant ancienneté et majorations ; avertissement dynamique et tooltip le rappellent.
37ter. **PDF uniquement sur SMH :** Conformément à la CCN Métallurgie (IDCC 3248), Art. 140, le rapport PDF n'est généré qu'en mode « SMH seul ». Si l'option n'est pas cochée, la génération est bloquée avec avertissement.
38. **Prescription :** Période limitée au délai légal (ex. 3 ans) en arrière et/ou à l'entrée en vigueur CCNM selon les cas
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

*À inclure dans l'objet `CONFIG` du script. Les tableaux ci-dessous sont donnés **à titre d'exemple** ; les valeurs à jour sont dans `src/core/config.js` (CONFIG) et dans les accords (dossier `accords/`).*

#### 6.1. Grille SMH (Base 35h)

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

*Valeurs réelles : CONFIG.SMH.*

#### 6.2. Barème Cadres Débutants (Groupe F : F11 et F12)

*Base 35h, mensualisée 151,66h. Inclut les majorations Art. 139 (taux selon tranche ; ex. 5 % à 2 ans, 8 % à 4 ans). Valeurs réelles : CONFIG.BAREME_DEBUTANTS.*

| Expérience professionnelle | F11 | F12 |
| --- | --- | --- |
| **< 2 ans** | 28 200 € | 29 700 € |
| **2 à < 4 ans** | 29 610 € | 31 185 € |
| **4 à 6 ans** | 31 979 € | 33 680 € |
| **≥ 6 ans** | 34 900 € (standard) | 36 700 € (standard) |

#### 6.3. Valeur du Point Territorial (ex. Bas-Rhin)

| Territoire | Valeur 2025 | Source |
| --- | --- | --- |
| **Bas-Rhin (67)** | 5.90 € (ex.) | Accord territorial (ex. 17 avril 2025) |

*Source officielle : [code.travail.gouv.fr](https://code.travail.gouv.fr/contribution/3248-quand-le-salarie-a-t-il-droit-a-une-prime-danciennete-quel-est-son-montant)*

#### 6.4. Taux pour Prime d'Ancienneté (Non-Cadres)

*Formule : `Point Territorial × Taux × 100 × Années`. Valeurs réelles : CONFIG.TAUX_ANCIENNETE.*

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
* **Prescription :** Article L.3245-1 du Code du travail — délai à compter de chaque échéance (ex. 3 ans)
* **CCNM 2024 (IDCC 3248) :** Entrée en vigueur le 1er janvier 2024 ; dispositions relatives aux salaires minima hiérarchiques et à leur assiette (inclus / exclus, voir § 3.4.1)
* **Maintien de salaire :** Article L.2261-22 - Obligation de maintien si nouvelle classification fait baisser la rémunération

**Conditions de réclamation :**
* Salaire actuel < SMH calculé selon la classification
* Période dans les limites de prescription (délai légal ; ex. 3 ans)
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
