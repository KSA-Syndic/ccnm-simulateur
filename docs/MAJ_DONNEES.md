# Mettre à jour les chiffres du simulateur

Procédure de veille et de mise à jour des données juridiques et économiques (grilles SMH, point territorial, SMIC, inflation, jurisprudence, accord d'entreprise). À faire **au moins deux fois par an** : en début d'année (nouvelle grille SMH, SMIC au 1er janvier) et à la rentrée (avenants en cours d'année, valeur du point, revalorisations automatiques du SMIC).

## 1. Où sont les chiffres

Toutes les valeurs de référence sont dans **`src/domain/config/index.ts`**, sauf l'accord d'entreprise.

| Donnée                                                                 | Clé / fichier                                                                                                              | Rythme                                                      | Source primaire                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Grille SMH par classe (1–18)                                           | `SMH_BY_YEAR[année]`                                                                                                       | Annuel (avenant de branche)                                 | Avenant SMH à la CCNM (UIMM « La Fabrique de l'avenir », Légifrance IDCC 3248) |
| Barème débutants F11/F12                                               | `BAREME_DEBUTANTS_BY_YEAR[année]`                                                                                          | Annuel (même avenant)                                       | Idem                                                                           |
| Métadonnées de la grille (date d'effet, taux moyen, source, extension) | `SMH_UPDATE.years[année]`, `SMH_UPDATE.updatedAt`                                                                          | À chaque changement                                         | Avenant + arrêté d'extension (JO)                                              |
| Année courante des données                                             | `CURRENT_DATA_YEAR`                                                                                                        | Annuel                                                      | —                                                                              |
| Valeur du point (prime d'ancienneté), par zone et datée                | `src/domain/config/pointsTerritoriaux.ts` (`POINTS_TERRITORIAUX`) ; zone par défaut `POINT_TERRITORIAL.territoireDefautId` | Annuel par zone (accord territorial, date d'effet variable) | Accords territoriaux « valeur de point » (UIMM, BOCC)                          |
| Indemnités de repas (panier de nuit)                                   | `INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR[année]`                                                                                | Annuel (1er janvier)                                        | Barème URSSAF des frais professionnels                                         |
| Inflation annuelle (secours de la courbe)                              | `INFLATION_FALLBACK_SERIES`, `INFLATION_FALLBACK_PERIOD`                                                                   | Annuel (mi-janvier)                                         | INSEE, « Informations rapides » IPC moyenne annuelle                           |
| Note sur l'assiette de comparaison au SMH (art. 140)                   | `CCNM_CONTREPARTIES_ORGANISATION.rolesSimulation.noteAssimilee`                                                            | Selon la jurisprudence                                      | Décisions de justice (Légifrance, Judilibre)                                   |
| Taux de prime d'ancienneté par classe, seuils, majorations CCNM        | `TAUX_ANCIENNETE`, `ANCIENNETE`, `MAJORATIONS_CCN`, `FORFAITS`                                                             | Rare (révision de la CCNM)                                  | Texte de la CCNM                                                               |
| Accord d'entreprise (primes, barèmes)                                  | `src/accords/<id>.ts` (ex. `kuhn.ts`)                                                                                      | À chaque NAO / avenant                                      | Texte de l'accord (voir `docs/AJOUTER_ACCORD.md`)                              |

Le **SMIC** n'est pas encore modélisé : aucun plancher SMIC n'est appliqué au résultat ni aux arriérés (voir § 6).

## 2. Liste de veille

Pour chaque point, noter la **valeur**, la **date d'effet**, le **texte** (date, signataires) et le **statut d'extension**.

1. **Grille SMH** de l'année : avenant signé ? étendu (arrêté + date du JO) ? taux moyen ?
2. **Négociations en cours** : réouverture des SMH en cours d'année, négociation de la grille de l'année suivante.
3. **SMIC** : montant au 1er janvier et revalorisations automatiques en cours d'année (inflation > 2 %, art. L3231-5). Comparer le SMIC annuel (taux horaire × 1 820 h) aux SMH des premières classes.
4. **Valeur du point de chaque zone** : nouveaux accords territoriaux et leur date d'effet (voir § 3 bis).
5. **Indemnités de repas URSSAF** de l'année.
6. **Inflation INSEE** définitive de l'année écoulée.
7. **Jurisprudence** sur la CCNM : assiette de comparaison au SMH (art. 140), prime d'ancienneté (art. 142), classification ; suites (appel, cassation) des décisions déjà citées.
8. **Accord d'entreprise** : NAO, avenants (prime d'équipe, prime de vacances, barème d'ancienneté).

## 3. Règles de fiabilité

- **Privilégier le texte primaire** : PDF de l'avenant ou de l'accord, arrêté au JO, publication INSEE ou URSSAF. Les sites de paie et les blogs se contredisent souvent (montants, taux moyen, dates). Ils servent à repérer une nouveauté, pas à fixer une valeur.
- **Lire le PDF lui-même** quand il existe : valeur, date d'effet, signataires.
- **Distinguer** « signé », « avis d'extension » et « étendu (arrêté, JO) ». Un accord non étendu ne s'applique qu'aux entreprises adhérentes de l'organisation patronale signataire : le signaler dans la source ou la note.
- **Une décision de première instance** se cite avec sa juridiction, sa date et son numéro RG, et la mention « 1re instance ».
- **Ne rien inventer** : si une négociation n'a pas abouti ou si l'information est réservée aux abonnés, ne pas modifier les chiffres. Consigner le point comme « en cours » (§ 5).

## 3 bis. Collecter les valeurs du point (toutes zones)

L'UIMM publie chaque accord territorial avec un intitulé normalisé (« Accord du … portant détermination de la valeur de point … à compter du … ») et le PDF en pièce jointe. Son API publique permet de tout lister sans parcourir le site :

```bash
# Accords « valeur de point » (titre, CPTN, lien) — 100 par page
curl -s "https://uimm.lafabriquedelavenir.fr/wp-json/wp/v2/texte-conventionnel?per_page=100&search=valeur%20de%20point"
# Correspondance des identifiants de CPTN
curl -s "https://uimm.lafabriquedelavenir.fr/wp-json/wp/v2/cptn?per_page=100"
# PDF d'un accord (champ source_url)
curl -s "https://uimm.lafabriquedelavenir.fr/wp-json/wp/v2/media?parent=<id>"
```

- Ne traiter que les accords **postérieurs au dernier relevé** (champ `date`), puis lire dans le PDF la valeur et la date d'effet (« à compter du … »).
- Les PDF anciens sont parfois des scans : les recouper avec le texte publié au BOCC / Légifrance.
- Ajouter une ligne `[date d'effet, valeur]` à la zone dans `pointsTerritoriaux.ts` (historique trié). Un nouveau regroupement de CPTN ne crée une zone que si l'accord fixe une valeur propre.
- Le test `tests/domain/remuneration/pointTerritorial.test.ts` vérifie l'ordre des dates, l'unicité des zones et la plausibilité des valeurs.

## 4. Appliquer une mise à jour

1. Modifier les valeurs dans `src/domain/config/index.ts` (ou `src/accords/<id>.ts`).
   - Nouvelle année : ajouter `SMH_BY_YEAR[N]`, `BAREME_DEBUTANTS_BY_YEAR[N]`, `SMH_UPDATE.years[N]`, `INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR[N]`, puis passer `CURRENT_DATA_YEAR` à `N`. Le schéma zod bloque le démarrage si une grille de l'année courante manque.
   - Garder les années précédentes : elles servent au calcul des arriérés mois par mois.
   - Mettre `SMH_UPDATE.updatedAt` à la date du jour.
2. Mettre à jour les tests qui figent une valeur par défaut (ex. `tests/unit/stores/situation.test.ts` pour le point territorial). Les fixtures qui passent une valeur explicite (`pointTerritorial: 5.9`) n'ont pas à changer.
3. Mettre à jour le README (valeur par défaut du point, « Dernière mise à jour »).
4. Vérifier :

   ```bash
   npm run test:run
   npx vue-tsc --noEmit
   ```

   Pour un changement de grille, contrôler aussi un scénario d'arriérés et l'export PDF (`npm run e2e` ; régénérer les captures si l’affichage change).

5. Commiter et pousser **sous l'identité anonyme du dépôt** (`Dev1`, sans e-mail : config locale `user.email=""` et `user.useConfigOnly=true` ; vérifier avec `git var GIT_AUTHOR_IDENT`, qui doit afficher `Dev1 <>`). Message conseillé : `chore(data): mise à jour des données au <date>`, avec une ligne par donnée modifiée et sa source.

## 5. Journal des mises à jour

| Date       | Donnée              | Avant → après                                             | Source                                                   |
| ---------- | ------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| 2026-10-08 | Point Bas-Rhin      | 5,90 € → 5,95 € (effet 1er avril 2026)                    | Accord UIMM Alsace du 27 mars 2026 (FO, CFE-CGC), étendu |
| 2026-10-08 | Points territoriaux | Historique 2024-2026 des 73 zones, appliqué mois par mois | Accords territoriaux (API UIMM, BOCC)                    |
| 2026-10-08 | Inflation 2025      | 1,8 % → 0,9 %                                             | INSEE, Informations rapides, 15 janvier 2026             |
| 2026-10-08 | Grille SMH 2026     | Montants inchangés ; ajout du statut « étendu »           | Arrêté du 20 mai 2026, JO du 5 juin 2026                 |
| 2026-10-08 | Note art. 140       | Ajout de la référence                                     | TJ Paris, 2 déc. 2025, RG 25/08553 (1re instance)        |
| 2026-10-08 | Repas URSSAF 2026   | Inchangé (7,50 / 10,40 / 21,40 €)                         | Barème URSSAF 2026                                       |

**Points en cours au 2026-10-08** (à revérifier à la prochaine mise à jour) :

- Réouverture des SMH 2026 négociée le 8 septembre 2026 (premiers niveaux sous le SMIC) : aucun avenant trouvé.
- Négociation des SMH 2027 attendue en fin d'année.
- Appel éventuel du jugement TJ Paris du 2 décembre 2025.
- Points territoriaux non retrouvés : valeurs en vigueur début 2024 de la plupart des zones (accords 2023), Lorraine 2024 et 2026, Île-de-France 2024, Gironde-Landes, Pyrénées-Atlantiques, Loire-Atlantique et Vendée avant 2026, date d'extension des accords Charente.
- NAO Kuhn 2026 : aucune information publique.

## 6. Limites connues

- **SMIC non modélisé** : depuis le 1er juin 2026 (12,31 €/h, environ 22 404 €/an), le SMIC dépasse les SMH des classes A1 (21 980 €) et A2 (22 100 €). Le simulateur affiche alors un minimum inférieur au minimum légal et peut sous-estimer les arriérés. Correctif à prévoir : un plancher SMIC daté (`SMIC_BY_PERIOD`) appliqué au résultat et au salaire dû mois par mois.
- **Point territorial avant la première valeur référencée d'une zone** : la plus ancienne valeur connue est appliquée (souvent la valeur mi-2024 au lieu de celle de début 2024). Pour un dossier précis, choisir « Autre territoire » et saisir la valeur du bulletin.
