import { SMH_ASSIETTE_SOURCE_ARTICLE } from '../remuneration/smhAssiettePolicy';
import { POINT_TERRITORIAL_CODE_TRAVAIL_CONTRIBUTION } from './tooltipReferences';

/** Bandeau résultat — avertissement juridique. */
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
    'Simulateur de classification et rémunération — Convention collective de la métallurgie.',
  footerDisclaimer:
    'Outil indicatif — ne remplace pas un conseil juridique ou social personnalisé.',
  privacyLinkLabel: 'Données personnelles & mesure d’audience',
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

/**
 * Éditeur du simulateur (déploiement) : lien de pied de page, ressources PDF et contacts.
 * Distinct des accords d'entreprise, qui portent leurs propres coordonnées syndicales.
 */
export const EDITEUR = {
  nom: 'CFDT Kuhn Saverne',
  url: 'https://cfdt-kuhn.fr',
  /** Contact du bureau syndical (questions, accompagnement). */
  emailBureau: 'cfdt.kuhn@gmail.com',
  /** Contact technique (bugs, ajout d'accord, contributions). */
  emailDev: 'kuhn.syndic.dev@gmail.com',
  /**
   * Logo de l'annexe PDF : data URL PNG (`data:image/png;base64,…`), jsPDF n'acceptant pas d'URL distante.
   * Vide : pas de logo.
   */
  logoPdfDataUrl: '',
} as const;

/** Libellés accessibilité réutilisables (ARIA, focus). */
export const A11Y_LABELS = {
  /** Nom accessible par défaut pour tout déclencheur `AppTooltip` sans libellé explicite. */
  tooltipTriggerDefault: 'Aide contextuelle',
} as const;

/** Libellés PDF / cohérence marque syndicale (liens publics, hors calcul). */
export const PDF_RESOURCES_LABELS = {
  pdfResourcesSectionTitle: '5. Ressources utiles (liens externes)',
  pdfConventionRowLabel:
    'Convention collective de la métallurgie (CCNM) · Textes conventionnels (UIMM)',
  pdfEditeurRowLabel: 'Section syndicale — site public',
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

/** Flux post-export arriérés (modal syndicat + mail) — sujet et corps du courrier type. */
export const POST_PDF_SYNDICAT = {
  syndicatModalTitle: "L'union fait la force 💪",
  /** Suite du paragraphe après le nom du syndicat en gras (espace initial inclus). */
  syndicatLeadAfterName:
    " peut donner du poids à votre dossier — seul, c'est plus léger. Envoyez-lui le rapport (mail ou visite) et il se fera un plaisir de vous aider.",
  /** Aperçu composition mail (champs et PJ). */
  syndicatComposeAria: 'Aperçu du message à envoyer au syndicat',
  syndicatFieldTo: 'À',
  syndicatFieldSubject: 'Objet',
  syndicatFieldAttachments: 'Pièces jointes',
  syndicatPjWord: 'Lettre de mise en demeure.doc',
  syndicatPjPdf: 'Annexe technique.pdf',
  syndicatPjHint: 'À joindre après ouverture de votre messagerie',
  syndicatOpenWith: 'Ouvrir avec',
  syndicatDefaultName: 'le syndicat',
  buttonDecline: 'Je gère',
  gmailLinkLabel: 'Gmail',
  outlookLinkLabel: 'Outlook',
  gmailComposeAria: 'Ouvrir la composition dans Gmail',
  outlookComposeAria: 'Ouvrir la composition dans Outlook',
  /** Lien mailto sur l’adresse « À » : ouverture de la messagerie avec destinataire, sujet et corps type. */
  syndicatAddressMailtoAria:
    'Composer un courriel vers cette adresse avec le sujet et le texte type déjà renseignés',
  mailSubject: "Arriérés de salaire – demande d'accompagnement",
  mailBody: `Bonjour,

J'ai constaté un écart entre mon salaire et le minimum conventionnel (SMH) de la CCN Métallurgie.

Vous trouverez en pièces jointes :
- Un projet de lettre de mise en demeure au format Word (.doc)
- Une annexe technique avec le détail des calculs et références (PDF)

Ces documents sont indicatifs. Pourriez-vous les vérifier et m'accompagner dans les démarches si nécessaire ?

Cordialement`,
  celebrationTitle: 'Bravo !',
  celebrationBody: 'Vous avez mené la simulation à son terme.',
  celebrationNote:
    "Si l'envoi du courrier au syndicat a échoué, vous pouvez rouvrir la fenêtre pour réessayer.",
  celebrationFinish: 'Terminer',
  celebrationReopenSyndicat: 'Renvoyer un courrier au syndicat',
} as const;

/** Libellés et textes longs du parcours assistant (étapes, résultat, arriérés). */
export const WIZARD_LABELS = {
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
  resultatMensuel: 'bruts / mois en moyenne',
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
    "Indiquez le « Total brut » de votre fiche de paie. Le détail des éléments inclus et exclus dans la comparaison au minimum conventionnel figure dans l'encart ci-dessus.",
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
      "Valeur du point de la prime d'ancienneté, fixée par l'accord territorial de votre zone. Le calcul applique, mois par mois, la valeur en vigueur à la date concernée (arriérés compris). Choisissez « Autre territoire » pour saisir une valeur non référencée.",
    sourceArticle: 'CCNM Art. 142 — accords territoriaux de valeur de point',
    externalLink: POINT_TERRITORIAL_CODE_TRAVAIL_CONTRIBUTION,
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
  travailEquipe: {
    title: 'Travail en équipe (équipes successives)',
    description:
      'Prime conventionnelle pour travail en équipes successives : 30 minutes du taux horaire de base par poste, sur la base de 22 postes par mois (temps plein). Versée en plus du minimum conventionnel.',
    sourceArticle: 'CCNM Art. 145 ; art. 140 (hors assiette SMH)',
  },
  anciennete: {
    title: "Ancienneté dans l'entreprise",
    description:
      "Durée d'emploi continu chez votre employeur actuel (depuis la date d'embauche), calculée selon les règles de l'article 3 de la CCNM (reprise d'ancienneté, périodes assimilées). Elle conditionne notamment le droit à la prime d'ancienneté (seuil et barème selon CCNM ou accord applicable).",
    sourceArticle: 'CCNM Art. 3 ; Art. 142-143 ; accord si applicable',
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
      "Inclus : la base (grille SMH) et les rubriques paramétrées comme « rémunération du travail » (résultats, garanties assimilées au bulletin, prime d'ancienneté d'entreprise le cas échéant, etc.).\nExclus : la prime d'ancienneté de branche (CCNM) et les sujétions (nuit, équipes successives, dimanche, astreintes, temps annexes, paniers…) ainsi que les majorations d'heures supplémentaires : elles s'ajoutent en plus du minimum.\nLes listes « Inclus » et « Exclus » sous l’encart correspondent aux rubriques retenues pour cette simulation.",
    sourceArticle: SMH_ASSIETTE_SOURCE_ARTICLE,
  },
  resultatMensuel: {
    title: 'Montant mensuel indicatif',
    description:
      "Ce montant est une moyenne obtenue en divisant le minimum annuel garanti (SMH) par le nombre de mois. Le versement mensuel effectif peut différer selon le calendrier de paie de l'entreprise (13ᵉ mois, primes versées à date fixe, etc.). Seul le total annuel fait foi pour vérifier la conformité au minimum conventionnel.",
    sourceArticle: 'CCNM — grille SMH (base annuelle)',
  },
  evolutionInflation: {
    title: "Évolution par rapport à l'inflation",
    description:
      'Deux courbes sur la période : la vôtre (hausse annuelle saisie) et l’inflation (même départ, taux moyen retenu). Au-dessus : le salaire progresse plus vite que les prix ; en dessous : perte de pouvoir d’achat. Le % sous le graphique résume l’écart en fin de période. Indicatif.',
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

/** Libellés longs des groupes (liste déroulante groupe / classe). */
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
