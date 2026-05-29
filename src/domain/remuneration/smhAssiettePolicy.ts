/**
 * Règle indicative d’assiette du salaire minimum hiérarchique (SMH) dans ce simulateur.
 *
 * La convention métallurgie distingue en substance (notamment art. 140 et textes liés) la
 * rémunération du travail (contrepartie de l’activité, de la compétence ou de résultats
 * professionnels intégrés au salaire) des rémunérations de sujétion ou liées à l’organisation
 * du travail (nuit, équipes successives, dimanche ou jours fériés, astreinte hors temps de travail
 * effectif, etc.), ainsi que des indemnités assimilées à des frais (panier, déplacements…).
 *
 * Le drapeau `inclusDansSMH` sur chaque `ElementDef` matérialise cette distinction pour
 * l’indicateur « assiette de comparaison », les sous-lignes « dont… » et les agrégats PDF :
 * `true` = pris en compte dans la vérification au SMH telle que paramétrée ici ; `false` = versé
 * en sus du minimum conventionnel affiché.
 *
 * Les majorations d’heures supplémentaires (+25 % / +50 %) suivent la même logique de périodicité
 * que les autres lignes « heures mensuelles » du moteur : montant mensuel reconstitué puis ×12
 * pour le total annuel affiché (`period: 'annual'` sur le mode `heuresXtaux`).
 *
 * Une jurisprudence récente (Cass. civ., 2 déc. 2025) éclaire notamment l’assiette par rapport
 * aux primes d’ancienneté (entreprise vs branche) et à l’abus consistant à absorber le SMH avec
 * des primes de sujétion : interprétation indicative ; chaque dossier dépend du texte
 * applicable et des faits.
 */

/** Référence courte pour infobulles, PDF et aide contextuelle. */
export const SMH_ASSIETTE_SOURCE_ARTICLE =
  'CCNM art. 140 — rémunération du travail / sujétion (indicatif, dossier à confirmer)';

/** Phrase compacte pour encarts HTML (assistant, arriérés). */
export const SMH_ASSIETTE_REFERENCE_LINE = `${SMH_ASSIETTE_SOURCE_ARTICLE}. Les listes « Inclus » / « Exclus » suivent le paramétrage courant du moteur.`;
