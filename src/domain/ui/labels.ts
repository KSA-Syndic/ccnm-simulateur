import { SEMANTIC_ID } from '../types';

/** Hiérarchie des normes (affichage / audit) — ordre : accord entreprise → branche → Code. */
export type NormHierarchy = 'accord_entreprise' | 'branche' | 'code_travail' | 'usage' | 'mixte';

export interface SemanticLabelEntry {
  semanticId: string;
  /** Libellé court (formulaire, listes). */
  shortLabel: string;
  /** Libellé long (détail résultat, PDF). */
  longLabel: string;
  /** Référence textuelle sourcée (article, titre) — ne pas inventer de numéros non présents au catalogue. */
  texteSource: string;
  /** Note de hiérarchie pour l’utilisateur (faveur, dérogation, etc.). */
  hierarchieNote: string;
  provenance: NormHierarchy;
}

/**
 * Registre global des sémantiques de rémunération — passe 1 : alignement sur le catalogue domaine.
 * Passe 2 (uniformisation CCNM 2024) : réservée à l’agent `juriste-uniformisation` + `docs/LACUNES_UI_CIBLES.md`.
 */
export const GLOBAL_SEMANTIC_REGISTRY: Record<string, SemanticLabelEntry> = {
  [SEMANTIC_ID.PRIME_ANCIENNETE]: {
    semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
    shortLabel: "Prime d'ancienneté",
    longLabel: "Prime d'ancienneté conventionnelle",
    texteSource:
      'CCNM — grille barémique par ancienneté et classe (sources dans le catalogue éléments).',
    hierarchieNote: "Minimum de branche ; peut être amélioré par accord d'entreprise (faveur).",
    provenance: 'branche',
  },
  [SEMANTIC_ID.PRIME_EQUIPE]: {
    semanticId: SEMANTIC_ID.PRIME_EQUIPE,
    shortLabel: "Prime d'équipe",
    longLabel: "Prime d'équipe (travail en équipe successives)",
    texteSource: 'CCNM — contrepartie organisation du travail (réf. élément catalogue).',
    hierarchieNote: 'Branche ; accord peut fixer une valeur unitaire plus favorable.',
    provenance: 'mixte',
  },
  [SEMANTIC_ID.PRIME_VACANCES]: {
    semanticId: SEMANTIC_ID.PRIME_VACANCES,
    shortLabel: 'Prime de congés payés',
    longLabel: 'Indemnité de congés payés (rappel / régularisation)',
    texteSource: 'Code du travail (congés payés) ; CCNM pour modalités de branche le cas échéant.',
    hierarchieNote: "Code et branche ; vérifier accord d'entreprise.",
    provenance: 'mixte',
  },
  [SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE]: {
    semanticId: SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE,
    shortLabel: 'Astreinte (disponibilité)',
    longLabel: "Indemnité d'astreinte — disponibilité hors travail effectif",
    texteSource: 'Code du travail L3121-9, L3121-10 ; CCNM (organisation).',
    hierarchieNote: "Code + branche ; temps d'intervention = travail effectif (distinct).",
    provenance: 'mixte',
  },
  [SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN]: {
    semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN,
    shortLabel: 'Astreinte repos quotidien',
    longLabel: 'Astreinte sur temps de repos quotidien (hors TTE)',
    texteSource: 'CCNM (organisation du travail, astreinte hors temps de travail effectif).',
    hierarchieNote: 'Branche ; articulation avec durée du travail et repos.',
    provenance: 'branche',
  },
  [SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS]: {
    semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS,
    shortLabel: 'Astreinte jour de repos',
    longLabel: 'Astreinte un jour de repos (hors travail effectif)',
    texteSource: 'CCNM (organisation du travail, astreinte hors temps de travail effectif).',
    hierarchieNote: 'Branche ; coefficient spécifique jour de repos.',
    provenance: 'branche',
  },
  [SEMANTIC_ID.PRIME_PANIER_NUIT]: {
    semanticId: SEMANTIC_ID.PRIME_PANIER_NUIT,
    shortLabel: 'Indemnité repas de nuit',
    longLabel: 'Indemnité de repas de nuit (barème fiscal / social applicable)',
    texteSource: 'CCNM Art. 147 ; barème fiscal repas (ACOSS / Urssaf) — voir année affichée.',
    hierarchieNote:
      'Branche + paramètres fiscaux datés ; pas de montant garanti sans barème applicable.',
    provenance: 'branche',
  },
  [SEMANTIC_ID.PRIME_INVENTION_BREVETABLE]: {
    semanticId: SEMANTIC_ID.PRIME_INVENTION_BREVETABLE,
    shortLabel: 'Invention brevetable',
    longLabel: 'Rémunération minimale invention de mission brevetable',
    texteSource: 'CCNM (invention de mission brevetable).',
    hierarchieNote: 'Branche ; montants dans CONFIG / catalogue.',
    provenance: 'branche',
  },
  [SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE]: {
    semanticId: SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE,
    shortLabel: 'Habillage / déshabillage',
    longLabel: 'Contrepartie habillage / déshabillage sur le lieu de travail',
    texteSource: 'Code du travail L3121-3 ; CCNM.',
    hierarchieNote: 'Code + branche.',
    provenance: 'mixte',
  },
  [SEMANTIC_ID.PRIME_DEPLACEMENT_PRO]: {
    semanticId: SEMANTIC_ID.PRIME_DEPLACEMENT_PRO,
    shortLabel: 'Temps de déplacement',
    longLabel: 'Indemnisation du temps de déplacement professionnel excédentaire',
    texteSource: 'Code du travail L3121-4 ; CCNM.',
    hierarchieNote: 'Code + branche.',
    provenance: 'mixte',
  },
  [SEMANTIC_ID.MAJORATION_NUIT]: {
    semanticId: SEMANTIC_ID.MAJORATION_NUIT,
    shortLabel: 'Majoration nuit',
    longLabel: 'Majoration pour travail de nuit habituel / exceptionnel (selon accord)',
    texteSource: 'CCNM — majorations horaires (détail dans catalogue).',
    hierarchieNote: 'Branche ; accord peut prévoir un taux supérieur.',
    provenance: 'branche',
  },
  [SEMANTIC_ID.MAJORATION_DIMANCHE]: {
    semanticId: SEMANTIC_ID.MAJORATION_DIMANCHE,
    shortLabel: 'Majoration dimanche / férié',
    longLabel: 'Majoration pour travail le dimanche ou jour férié',
    texteSource: 'CCNM — majorations horaires.',
    hierarchieNote: 'Branche.',
    provenance: 'branche',
  },
  [SEMANTIC_ID.MAJORATION_HEURES_SUP_25]: {
    semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
    shortLabel: 'Heures sup. +25 %',
    longLabel: 'Heures supplémentaires majorées à 25 %',
    texteSource: 'Code du travail ; CCNM pour contingent et modalités.',
    hierarchieNote: 'Code + branche (contingent, contreparties).',
    provenance: 'mixte',
  },
  [SEMANTIC_ID.MAJORATION_HEURES_SUP_50]: {
    semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
    shortLabel: 'Heures sup. +50 %',
    longLabel: 'Heures supplémentaires majorées à 50 %',
    texteSource: 'Code du travail ; CCNM pour contingent et modalités.',
    hierarchieNote: 'Code + branche.',
    provenance: 'mixte',
  },
  [SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE]: {
    semanticId: SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE,
    shortLabel: 'Intervention astreinte',
    longLabel: "Heures d'intervention pendant astreinte (travail effectif)",
    texteSource: 'Code du travail L3121-9, L3121-10 ; CCNM (travail effectif).',
    hierarchieNote: 'Code + branche.',
    provenance: 'mixte',
  },
  [SEMANTIC_ID.FORFAIT_HEURES]: {
    semanticId: SEMANTIC_ID.FORFAIT_HEURES,
    shortLabel: 'Forfait heures',
    longLabel: 'Forfait annuel en heures',
    texteSource: 'CCNM — forfait et contreparties (cf. convention).',
    hierarchieNote: 'Branche ; articulation avec durée du travail.',
    provenance: 'branche',
  },
  [SEMANTIC_ID.FORFAIT_JOURS]: {
    semanticId: SEMANTIC_ID.FORFAIT_JOURS,
    shortLabel: 'Forfait jours',
    longLabel: 'Forfait annuel en jours',
    texteSource: 'CCNM — forfait jours et référence 218 j/an si applicable.',
    hierarchieNote: 'Branche.',
    provenance: 'branche',
  },
  [SEMANTIC_ID.RACHAT_JOURS_REPOS_FORFAIT]: {
    semanticId: SEMANTIC_ID.RACHAT_JOURS_REPOS_FORFAIT,
    shortLabel: 'Rachat jours repos (forfait jours)',
    longLabel: 'Indemnisation des jours travaillés au-delà du contingent (forfait jours)',
    texteSource:
      'Code du travail L.3121-59 (contingent conventionnel) ; majoration minimale et paramètres dans CONFIG / accord le cas échéant.',
    hierarchieNote: 'Code ; taux complémentaire peut être fixé par accord (minimum paramétré).',
    provenance: 'mixte',
  },
  smh: {
    semanticId: 'smh',
    shortLabel: 'SMH',
    longLabel: 'Salaire Minimum Hiérarchique (SMH)',
    texteSource: 'CCNM — barème SMH par classe et année (paramètres datés).',
    hierarchieNote:
      'Branche ; montants = paramètres de simulation, non garantis sans texte applicable.',
    provenance: 'branche',
  },
};

export type LabelSurface = 'form' | 'detail' | 'pdf';

export function getLabel(semanticId: string, surface: LabelSurface = 'form'): string {
  const entry = GLOBAL_SEMANTIC_REGISTRY[semanticId];
  if (!entry) return semanticId;
  if (surface === 'detail' || surface === 'pdf') return entry.longLabel;
  return entry.shortLabel;
}

/** Bandeau résultat — texte figé dans `docs/LACUNES_UI_CIBLES.md` (L4). */
export const LEGAL_DISCLAIMER_RESULT =
  'Résultat indicatif basé sur la CCNM 2024. Ne remplace pas un conseil juridique professionnel. Consultez votre syndicat ou un avocat avant toute démarche.';

/** Liens et libellés shell simulateur (header / footer). */
/** Page d’index UIMM — textes conventionnels métallurgie. */
export const CONVENTION_METALLURGIE_URL =
  'https://uimm.lafabriquedelavenir.fr/textes-conventionnels-metallurgie/';

/** PDF consolidé CCNM publié par l’UIMM (texte de référence daté). */
export const CONVENTION_METALLURGIE_CONSOLIDEE_PDF_URL =
  'https://uimm.lafabriquedelavenir.fr/wp-content/uploads/2026/03/CNN_metallurgie_consolidee-au-20-02-2026.pdf';

export const SIMULATOR_SHELL = {
  headerTitle: 'Simulateur Métallurgie',
  headerSubtitle: 'Classification et Rémunération',
  headerInfoIntro:
    'Outil de simulation indicatif : les montants et règles dépendent des paramètres chargés et du texte applicable dans votre situation.',
  /** Lien infobulle en-tête — PDF consolidé CCNM (UIMM). */
  headerConventionPdfLinkLabel: 'Convention collective de la métallurgie (CCNM)',
  /** Pied de page — index UIMM. */
  footerConventionTextsLinkLabel: 'Textes conventionnels (UIMM)',
  footerMainLine:
    'Simulateur de classification et rémunération — Convention collective métallurgie (IDCC 3248).',
  footerDisclaimer:
    'Outil indicatif — ne remplace pas un conseil juridique ou social personnalisé.',
  privacyLinkLabel: 'Données personnelles & mesure d’audience',
  cfdtKuhnLinkLabel: 'CFDT Kuhn Saverne',
  cfdtKuhnUrl: 'https://cfdt-kuhn.fr',
  privacyModalTitle: 'Données personnelles & mesure d’audience',
  privacyModalDescription:
    'Ce simulateur ne transmet pas vos saisies à un serveur : tout le calcul est effectué dans votre navigateur.',
  privacyModalAnalyticsNote:
    'Une mesure d’audience anonymisée (Umami) peut être activée. Vous pouvez refuser ci-dessous ; votre choix est mémorisé localement.',
  privacyModalOptoutLinkLabel: 'En savoir plus sur Umami',
  privacyModalOptoutLinkUrl: 'https://umami.is/docs',
  privacyModalSuccess: 'Votre choix a été enregistré sur cet appareil.',
  /** Déclencheur infobulle en-tête (`AppTooltip`, `role="button"`). */
  headerTooltipTriggerAriaLabel:
    'Informations : convention métallurgie, grilles des minima, dates d’effet et accord chargé',
} as const;

/** Libellés accessibilité réutilisables (ARIA, focus). */
export const A11Y_LABELS = {
  /** Nom accessible par défaut pour tout déclencheur `AppTooltip` sans libellé explicite. */
  tooltipTriggerDefault: 'Aide contextuelle',
} as const;

/** Libellés PDF / cohérence marque syndicale (liens publics, hors calcul). */
export const CFDT_KUHN_BRANDING = {
  pdfResourcesSectionTitle: '5. Ressources utiles (liens externes)',
  pdfConventionRowLabel:
    'Convention collective de la métallurgie (CCNM) · Textes conventionnels (UIMM)',
  pdfCfdtSectionRowLabel: 'Section CFDT — site public',
  pdfAccordReferenceRowLabel: "Accord d'entreprise (référence)",
} as const;

/** Textes des hints contextuels (moteur `domain/hints/engine.ts`). */
export const HINT_ENGINE = {
  cadreDebutant:
    'Profil <strong>F11 / F12</strong> avec moins de 6 ans d’expérience : le barème débutants peut s’appliquer sur le SMH (paramètres CCNM du simulateur).',
  accordApplique:
    'Un <strong>accord d’entreprise</strong> est pris en compte : vérifiez les options sur l’étape Résultat et les mentions dans le détail.',
  majorationsSansAccord:
    'Vous avez saisi des <strong>majorations</strong> (nuit, dimanche, heures sup.) sans accord d’entreprise actif : les taux CCNM de base s’appliquent.',
  defautCadre:
    'Statut <strong>cadre</strong> : pensez au type de forfait (heures / jours) et aux contreparties applicables dans votre situation réelle.',
  defautNonCadre:
    'Statut <strong>non-cadre</strong> : le point territorial et la prime d’ancienneté CCNM sont des paramètres clés du calcul.',
} as const;

/** Flux post-export arriérés (modal syndicat + mail) — aligné legacy `app.js` (sujet/corps mail). */
export const POST_PDF_SYNDICAT = {
  syndicatModalTitle: "L'union fait la force 💪",
  /** Suite du paragraphe après le nom du syndicat en gras (espace initial inclus). */
  syndicatLeadAfterName:
    " peut donner du poids à votre dossier — seul, c'est plus léger. Envoyez-lui le rapport (mail ou visite) et il se fera un plaisir de vous aider.",
  syndicatNoticePj:
    'Une fois le mail ouvert, ajoutez les documents en pièces jointes (lettre Word + annexe PDF). Les liens ci-dessous ne peuvent pas joindre les fichiers à votre place.',
  syndicatDefaultName: 'le syndicat',
  buttonDecline: 'Je gère',
  buttonMailto: 'Ouvrir ma messagerie',
  gmailLinkLabel: 'Gmail',
  outlookLinkLabel: 'Outlook',
  mailSubject: "Arriérés de salaire – demande d'accompagnement",
  mailBody: `Bonjour,

J'ai constaté un écart entre mon salaire et le minimum conventionnel (SMH) de la CCN Métallurgie.

Vous trouverez en pièces jointes :
- Un projet de lettre de mise en demeure (Word éditable)
- Une annexe technique avec le détail des calculs et références (PDF)

Ces documents sont indicatifs. Pourriez-vous les vérifier et m'accompagner dans les démarches si nécessaire ?

Cordialement`,
  celebrationTitle: 'Document généré !',
  celebrationBody: 'Votre document de rappel de salaire a été généré avec succès.',
  celebrationNote: 'Conservez-le précieusement pour vos démarches.',
  celebrationFinish: 'Terminer',
  celebrationReopenSyndicat: 'Renvoyer un courrier au syndicat',
} as const;

/**
 * Textes wizard / résultat / arriérés — copie fonctionnelle de `legacy-archive/ui/Labels.js`
 * (passe 1, parité libellés avec le bundle legacy).
 */
export const WIZARD_LEGACY_LABELS = {
  step1aPageTitle: 'Connaissez-vous votre classification ?',
  step1aPageSubtitle: 'Elle figure sur votre fiche de paie (ex: F11, D7, A1...)',
  step1bPageTitle: 'Votre classification',
  step1bPageSubtitle: 'Sélectionnez votre groupe et classe',
  step1cPageTitle: 'Estimation de votre classification',
  step1cPageSubtitle: 'Évaluez votre poste sur les 6 critères (de 1 à 10)',
  connaisClasse: 'Oui, je la connais',
  connaisClasseDesc: 'Je saisis directement ma classification',
  estimerClasse: "Non, je veux l'estimer",
  estimerClasseDesc: 'Je réponds aux 6 critères classants',
  resultPageTitle: 'Votre salaire',
  resultPageSubtitle:
    'Rémunération globale due par votre employeur (salaire minima, primes et majorations).',
  resultatAnnuel: 'bruts / an',
  resultatMensuel: 'bruts / mois',
  detailCalcul: 'Détail du calcul',
  evolutionInflation: "📈 Évolution par rapport à l'inflation",
  evolutionAugmentationPrompt:
    "Indiquez une hausse annuelle moyenne estimée pour ajuster la courbe de votre salaire. Saisissez 0 si vous n'en prévoyez pas.",
  resultArreteesPromptTitle: '💡 Vous pensez gagner moins que la rémunération affichée ?',
  resultArreteesPromptBody:
    'Calculez vos arriérés de salaire et générez un rapport PDF pour les réclamer.',
  calculerArretees: 'Calculer mes arriérés',
  restartConfirmMessage:
    'Toutes vos saisies seront effacées. Voulez-vous recommencer une nouvelle simulation depuis le début ?',
  step4PageTitle: 'Calcul des arriérés de salaire',
  step4PageSubtitle:
    'Saisissez vos salaires réels mois par mois pour calculer précisément vos arriérés',
  arreteesBaseInfoTitle: 'Informations nécessaires',
  arreteesOptionsTitle: 'Options et autres informations',
  ruptureContratLabel: 'Le contrat est rompu',
  accordEcritLabel: "Un accord écrit existe avec l'employeur concernant la classification",
  arreteesSmhSeulLabel: 'Calculer sur le minimum conventionnel seul (recommandé)',
  salaryCurveTitle: 'Saisie de vos salaires par mois',
  salaryCurveHelp:
    "Saisissez votre salaire mensuel brut pour chaque mois. Le graphique ci-dessous montre l'évolution du salaire dû au fil du temps.",
  timelineHelpText: "Veuillez renseigner la date d'embauche pour générer la courbe.",
  legalGuideTitle: 'Guide juridique et prochaines étapes',
  arreteesWarningHtml:
    "<strong>⚠️ Important :</strong> Ce calcul est un outil d'aide. Pour toute action juridique, consultez un avocat spécialisé en droit du travail ou votre syndicat.",
  floatingSalaryInputTooltip:
    "Indiquez le « Total brut » de votre fiche de paie. Le détail des éléments inclus et exclus dans la comparaison au minimum conventionnel figure dans l'encart ci-dessous.",
  floatingHintEnterLine: 'Entrée : valider et passer au mois suivant',
  floatingHintEscapeLine: 'Échap : fermer',
  curveProgressReopenHint: '— Entrée pour reprendre la saisie',
  curveProgressReopenAriaSuffix: 'Appuyez sur Entrée pour reprendre la saisie.',
  btnCalculerArreteesSticky: 'Calculer les arriérés',
  arreteesResultsTitle: 'Résultats du calcul',
  arreteesResumeAnneeTitle: 'Résumé par année civile',
  arreteesDetailMoisTitle: 'Détail mois par mois',
  arreteesLegalPointsTitle: "Points d'attention juridiques",
  arreteesConformeMsg: 'Votre salaire est conforme, vous êtes en ordre.',
  arreteesExportPdf: "Générer mon rapport d'arriérés",
} as const;

/** Infobulles wizard (titres + descriptions) — couplage `buildLegalTooltipContent(CONFIG.TOOLTIP_TEXTS, …)`. */
export const WIZARD_TOOLTIPS = {
  groupeClasse: {
    title: 'Groupe et classe',
    description:
      'Le groupe (lettre A–I) et le numéro de classe figurent en général sur votre fiche de paie ou votre contrat, à côté de la mention de classification / coefficient.',
    sourceArticle: 'CCNM — classification des emplois',
  },
  pointTerritorial: {
    title: 'Point territorial',
    description:
      'Valeur du point territorial applicable dans votre secteur géographique ; montant indicatif issu des paramètres du simulateur — vérifiez la valeur officielle en vigueur.',
    sourceArticle: 'CCNM — grilles et annexes territoriales',
    externalLink: {
      href: 'https://code.travail.gouv.fr/contribution/3248-quand-le-salarie-a-t-il-droit-a-une-prime-danciennete-quel-est-son-montant',
      label: 'Voir sur code.travail.gouv.fr',
    },
  },
  travailNuit: {
    title: 'Travail de nuit',
    description: 'Majoration pour heures effectuées entre 21h et 6h.',
    sourceArticle: 'CCNM Art. 145',
  },
  travailDimanche: {
    title: 'Travail le dimanche',
    description: 'Majoration pour heures travaillées le dimanche.',
    sourceArticle: 'CCNM Art. 146',
  },
  heuresSup: {
    title: 'Heures supplémentaires',
    description:
      'CCNM : +25 % de la 36e à la 43e heure, +50 % à partir de la 44e heure (tranches et durée légale selon paramètres du simulateur).',
    sourceArticle: 'CCNM Art. 145',
  },
  joursSupForfait: {
    title: 'Jours supplémentaires (rachat)',
    description:
      'Majoration minimale pour le rachat de jours de repos lorsque vous êtes en forfait jours (contingent et taux selon paramètres du simulateur).',
    sourceArticle: 'Code du travail L3121-59',
  },
  anciennete: {
    title: "Ancienneté dans l'entreprise",
    description:
      "Durée d'emploi continu chez votre employeur actuel (depuis la date d'embauche). Elle conditionne notamment le droit à la prime d'ancienneté (seuil et barème selon CCNM ou accord applicable).",
    sourceArticle:
      "Accord d'entreprise (si existant) ; à défaut CCNM Art. 142-143 (prime d'ancienneté)",
  },
  experiencePro: {
    title: 'Expérience professionnelle',
    description:
      "Durée totale de votre carrière, tous employeurs confondus (à distinguer de l'ancienneté dans l'entreprise actuelle). Utilisée ici uniquement pour le barème débutants F11/F12.",
    sourceArticle: 'CCNM — barème débutants F11/F12',
  },
  dateEmbaucheArretees: {
    title: "Date d'embauche",
    description:
      'Date de début de votre contrat dans cette entreprise. Si elle est antérieure à 2024, le graphique commence au 1er janvier 2024 (entrée en vigueur de la convention métallurgie).',
  },
  dateChangementClassificationArretees: {
    title: 'Changement de classification',
    description:
      'Si votre groupe ou classe a changé en cours de contrat, indiquez la date d’effet ; sinon laissez vide.',
  },
  arreteesSmhSeul: {
    title: 'Minimum conventionnel seul',
    description:
      "Compare uniquement votre salaire au Salaire minimum hiérarchique (SMH) de la convention, sans intégrer les primes et majorations variables. Option recommandée pour une réclamation d'arriérés.",
    sourceArticle: 'CCNM — grille SMH (Annexe I)',
  },
  arreteesAssietteComparaison: {
    title: 'Base de comparaison au minimum conventionnel',
    description:
      "Inclus : la base (grille SMH) et les primes d'assiette listées dans l'encart. Exclus : les autres rubriques actives de votre simulation, comptées en supplément sur le bulletin.",
    sourceArticle: 'CCNM — assiette de comparaison au SMH',
  },
  evolutionInflation: {
    title: "Évolution par rapport à l'inflation",
    description:
      "La courbe « Votre salaire » projette votre rémunération sur la durée choisie, avec la hausse annuelle que vous indiquez. La courbe « inflation » montre ce que donnerait le même montant de départ s'il n'augmentait que du taux d'inflation retenu. La phrase sous le graphique indique en % si vous seriez en situation de gagner (de plus que l'inflation) ou d'en perdre (de moins que l'inflation) en pouvoir d'achat. Résultat indicatif selon vos hypothèses.",
  },
} as const;

/** Toasts wizard — messages courts (sans HTML). */
export const WIZARD_TOASTS = {
  experienceProMinAnciennete:
    "L'expérience professionnelle totale ne peut pas être inférieure à votre ancienneté dans cette entreprise. La valeur a été ajustée au minimum requis.",
  arreteesAucunSalaireSaisi:
    'Saisissez au moins un salaire mensuel brut sur le graphique avant de lancer le calcul des arriérés.',
} as const;

/** Infobulle « salaire de base » (étape résultat) — texte + source centralisés. */
export const RESULT_SALAIRE_BASE_TOOLTIP = {
  title: 'Salaire de base',
  description:
    'Montant du minimum conventionnel (Salaire minimum hiérarchique — SMH) ou du barème débutants F11/F12 retenu comme base, avant primes et majorations comptées en supplément.',
  sourceArticle: 'CCNM — grille SMH / barème débutants (Annexe I)',
} as const;

/** Attribut `title` / infobulle native du badge accord (court, sans HTML). */
export const ACCORD_BADGE_TOOLTIP_TITLE =
  'Indique que la ligne ou l’option s’appuie sur l’accord d’entreprise sélectionné (paramètres et primes prévus par cet accord).';

/** Libellés longs des groupes — identiques à `legacy-archive/index.html` (select groupe). */
export const GROUPE_SELECT_LABELS: Record<string, string> = {
  A: 'A - Employés/Ouvriers',
  B: 'B - Employés/Ouvriers',
  C: 'C - Techniciens',
  D: 'D - Techniciens',
  E: 'E - Agents de maîtrise',
  F: 'F - Cadres',
  G: 'G - Cadres',
  H: 'H - Cadres supérieurs',
  I: 'I - Cadres dirigeants',
};
