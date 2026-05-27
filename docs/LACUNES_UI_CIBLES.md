# Lacunes UI ciblées — Passe 2 (liste figée)

> Ce fichier est la **seule source de vérité** pour les améliorations autorisées en passe 2.
> Il est **fermé** : toute nouvelle amélioration nécessite un ajout explicite ici, validé manuellement.
> Les régressions passe 1 (R1-R20) ne figurent pas ici — elles sont traitées dans `docs/PARITE_MATRIX.md`.
> L'agent `juriste-uniformisation` ne traite **que** les lacunes listées ci-dessous.

---

## L1 — Uniformisation du jargon CCNM 2024 sur toutes les surfaces

**Constat :** Les libellés actuels utilisent des termes informels ou inconsistants
(« seuil », « niveau », « salaire minimum », « majoration de nuit »).

**Cible :** Remplacer partout — formulaires, tooltips, récapitulatifs, rapports PDF — par la
terminologie officielle de la CCNM 2024 :

| Terme actuel (à éliminer) | Terme officiel CCNM 2024                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| Seuil / Niveau            | Classe d'emploi (A à I)                                                |
| Groupe                    | Groupe d'emplois (1 à 3)                                               |
| Salaire minimum           | Salaire Minimum Hiérarchique (SMH)                                     |
| Majoration de nuit        | Majoration pour travail de nuit habituel / exceptionnel (selon accord) |
| Prime                     | Prime de [type] — toujours qualifiée et sourcée                        |

**Périmètre :** Formulaires étapes 1-2-3-4 + tooltips + détail résultat + PDF rapport + mentions légales.

---

## L2 — Tooltips enrichis avec références juridiques

**Constat :** Les tooltips actuels sont génériques ou absents. Ils ne citent pas la source légale
applicable (article CCNM, avenant, accord d'entreprise, jurisprudence).

**Cible :** Chaque tooltip sur un élément de rémunération ou de classification doit indiquer :

- L'explication courte (formulaire)
- La référence précise (ex. « Art. 142 CCNM 2024 — Titre V Ch. II »)
- Si accord d'entreprise plus favorable : mention du principe de faveur
- Si jurisprudence Cass. Soc. applicable : référence et portée

**Surfaces concernées :** Tous les `.tooltip-trigger` des étapes 2, 3 et du rapport PDF.

---

## L3 — Cohérence transversale formulaire ↔ détail résultat ↔ rapport PDF

**Constat :** Un même concept (ex. prime d'ancienneté, majoration nuit, SMH) peut apparaître avec
des intitulés, des niveaux de détail ou des formulations différentes selon l'écran.
L'utilisateur ne retrouve pas la même information d'un écran à l'autre.

**Cible :** Pour chaque `semanticId` de `labels.ts`, garantir que :

- Le **libellé court** (formulaire) et le **libellé long** (détail résultat) sont cohérents entre eux.
- Le **libellé PDF** reprend le libellé long avec formule de calcul et provenance.
- Un test automatique vérifie que les 3 surfaces pointent vers le même `texteSource`.

**Périmètre :** ~40 sémantiques estimés (primes, majorations, forfaits, SMH, ancienneté, heures sup).

---

## L4 — Mention légale + disclaimer systématiques

**Constat :** L'avertissement « Résultat indicatif » n'est pas systématique.
Il est absent de certains écrans et non standardisé dans le PDF.

**Cible :**

- **Écran résultat (étape 3)** : bandeau disclaimer visible sous le total SMH.
  Texte : « Résultat indicatif basé sur la CCNM 2024 (IDCC 3248). Ne remplace pas un conseil
  juridique professionnel. Consultez votre syndicat ou un avocat avant toute démarche. »
- **Rapport PDF** : mention légale en pied de première page + répétée en annexe.
  Texte : identique + date de génération + version des barèmes utilisés (ex. SMH 2026).
- **Mode iframe** : disclaimer présent même en version compacte.

---

## L5 — Rapport PDF : traçabilité des formules de calcul

**Constat :** Le rapport PDF actuel liste les montants mais ne montre pas toujours la formule
utilisée ni la source légale de chaque ligne de détail.

**Cible :** Dans la section « Détail du calcul » du rapport :

- Chaque ligne affiche : libellé officiel | formule synthétique | montant | provenance juridique
- Exemple : `Prime d'ancienneté | pointTerritorial × tauxClasse × min(ancienneté, 15 ans) × 12 | 1 240 € | Art. 142 CCNM 2024`
- L'annexe technique (rapport arriérés) reprend le même format.
- Police et espacements doivent rester identiques au legacy pour ne pas créer de décalage.

---

### Suivi jalon 9.2 (application des lacunes)

| ID lacune                    | Statut court | Détail                                                                                                                                                                          |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L4 — Disclaimer résultat     | **Partiel**  | `LEGAL_DISCLAIMER_RESULT` étape 3 (`StepResult.vue`). Annexe arriérés PDF : pied de page indicatif via `addPdfFooter` (`src/domain/pdf/jsPdfHelpers.ts`). Iframe : **à faire**. |
| L5 — Formules PDF détaillées | **Partiel**  | Annexe : synthèse SMH + tableaux paramètres / accord / écarts par mois (`usePdfGeneration.ts`). Pas de miroir ligne à ligne du « Détail du calcul » écran (hors scope passe 1). |
| L1, L2, L3                   | **Pending**  | Uniformisation jargon, tooltips juridiques enrichis, cohérence 3 surfaces — après `docs/GATE_PASSE2.md`.                                                                        |

---

## Ce qui est explicitement HORS PÉRIMÈTRE de la passe 2

Les éléments suivants ne seront **pas** modifiés sans ajout explicite à ce fichier :

- Redesign graphique global (couleurs, typographie, layout)
- Ajout de nouvelles fonctionnalités métier
- Modification de la logique de calcul (domain/)
- Modification du CSS global (`main.css`)
- Refonte de l'architecture des composants
- Ajout de nouvelles langues / i18n
- Changement de la structure des PDFs (mise en page)

---

_Dernière mise à jour : 2026-05-27 — Passe 1 UI/PDF arriérés consolidée ; L1–L3 gated par `docs/GATE_PASSE2.md`._
