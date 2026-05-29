import { CONSTANTS } from '../config/constants';

/** Année d’effet CCNM affichée dans le guide juridique. */
export function getCcnmEffectiveYear(): number {
  return CONSTANTS.DATE_CCNM_EFFET.getFullYear();
}

export interface LegalCarouselSlide {
  title: string;
  /** HTML statique (affichage `v-html` côté composant). */
  contentHtml: string;
}

export function buildLegalCarouselSteps(): LegalCarouselSlide[] {
  const y = getCcnmEffectiveYear();
  return [
    {
      title: 'Vérification des informations',
      contentHtml: `
            <p>Avant toute démarche, vérifiez attentivement que toutes les informations sont correctes :</p>
            <ul>
                <li>Votre classification (Groupe/Classe)</li>
                <li>Votre ancienneté dans l'entreprise</li>
                <li>Les dates (embauche, changement de classification, rupture si applicable)</li>
                <li>Les salaires saisis mois par mois</li>
            </ul>
            <p><strong>Conseil :</strong> Comparez avec vos bulletins de paie et votre contrat de travail.</p>
        `,
    },
    {
      title: 'Consultation professionnelle',
      contentHtml: `
            <p><strong>Important :</strong> Ce calcul est un outil d'aide et ne constitue pas un avis juridique. Avant toute démarche, consultez :</p>
            <ul>
                <li><strong>Un avocat spécialisé en droit du travail</strong> pour un conseil juridique personnalisé</li>
                <li><strong>Votre syndicat</strong> qui peut vous accompagner dans vos démarches</li>
                <li><strong>L'inspection du travail</strong> pour des informations sur vos droits</li>
            </ul>
            <p>Ces professionnels pourront vous aider à évaluer la pertinence de votre demande et les chances de succès.</p>
        `,
    },
    {
      title: 'Rassemblement des preuves',
      contentHtml: `
            <p>Pour appuyer votre demande, rassemblez tous les documents suivants :</p>
            <ul>
                <li><strong>Bulletins de paie</strong> de toute la période concernée</li>
                <li><strong>Contrat de travail</strong> et tous les avenants</li>
                <li><strong>Correspondances écrites</strong> mentionnant votre classification ou votre salaire</li>
                <li><strong>Fiches de poste</strong> ou descriptions de fonction</li>
                <li><strong>Évaluations</strong> ou entretiens annuels</li>
                <li><strong>Emails ou courriers</strong> relatifs à votre rémunération</li>
            </ul>
            <p>Organisez ces documents par ordre chronologique pour faciliter leur consultation.</p>
        `,
    },
    {
      title: 'Demande amiable',
      contentHtml: `
            <p>La première étape consiste à faire une demande amiable à votre employeur :</p>
            <ul>
                <li>Rédigez une <strong>lettre recommandée avec accusé de réception (LRAR)</strong></li>
                <li>Joignez le <strong>rapport PDF généré</strong> par cet outil</li>
                <li>Incluez les <strong>copies de vos bulletins de paie</strong> et autres justificatifs</li>
                <li>Demandez un <strong>règlement des arriérés</strong> dans un délai raisonnable (ex: 1 mois)</li>
            </ul>
            <p><strong>Ton à adopter :</strong> Restez courtois et factuel. Présentez les faits de manière objective et référez-vous à la convention collective.</p>
        `,
    },
    {
      title: 'Médiation ou saisine juridictionnelle',
      contentHtml: `
            <p>Si votre demande amiable n'aboutit pas ou est refusée :</p>
            <ul>
                <li><strong>Médiation :</strong> Vous pouvez proposer une médiation pour trouver un accord à l'amiable</li>
                <li><strong>Conseil de Prud'hommes :</strong> Vous pouvez saisir le Conseil de Prud'hommes compétent</li>
                <li><strong>Délai de prescription :</strong> Attention, la prescription est de <strong>3 ans</strong> à compter de chaque échéance de paiement (Art. L.3245-1 Code du travail)</li>
            </ul>
            <p><strong>Important :</strong> Conservez toutes les preuves de vos démarches (copies de lettres, accusés de réception, etc.).</p>
        `,
    },
    {
      title: 'Délais et prescription',
      contentHtml: `
            <p>Respectez impérativement les délais légaux :</p>
            <ul>
                <li><strong>Prescription :</strong> 3 ans à compter de chaque échéance de paiement (chaque mois est une échéance distincte)</li>
                <li><strong>Délai de réponse LRAR :</strong> Généralement 1 mois pour une réponse de l'employeur</li>
                <li><strong>Saisine Prud'hommes :</strong> Doit être effectuée dans les délais de prescription</li>
                <li><strong>CCNM ${y} :</strong> Les arriérés antérieurs au 1er janvier ${y} ne sont pas réclamables au titre de cette convention</li>
            </ul>
            <p><strong>Conseil :</strong> Ne tardez pas à agir. Plus vous attendez, plus vous risquez de perdre le droit à certains arriérés par prescription.</p>
        `,
    },
  ];
}
