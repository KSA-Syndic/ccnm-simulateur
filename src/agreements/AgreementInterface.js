/**
 * ============================================
 * AGREEMENT INTERFACE - Schéma Standard
 * ============================================
 *
 * Interface/schéma standard pour tous les accords d'entreprise.
 * Permet de lister primes, majorations, garanties via un tableau
 * « elements » sans connaître les noms de propriétés de chaque accord.
 * Condition d'ancienneté réutilisable pour tout élément.
 */

/**
 * Condition d'ancienneté pour l'attribution d'un élément (prime, garantie, etc.)
 * Réutilisable dans tous les accords.
 * @typedef {Object} ConditionAnciennete
 * @property {'aucune'|'annees_revolues'|'proratise'} type - Type de condition
 * @property {number} [annees] - Nombre d'années révolues requis (si type === 'annees_revolues')
 * @property {string} [description] - Libellé court (ex: "1 an révolu", "2 ans révolus")
 */

/**
 * Élément de droit (prime, majoration, garantie) pour affichage / synthèse.
 * Permet d'itérer sur tous les éléments sans accéder aux propriétés spécifiques.
 * @typedef {Object} ElementDroit
 * @property {string} id - Identifiant unique (ex: 'primeVacances', 'primeAnciennete')
 * @property {'prime'|'majoration'|'garantie'} type - Type d'élément
 * @property {string} label - Libellé affiché (ex: "Prime de Vacances")
 * @property {string} source - Référence (ex: "Accord Kuhn Art. 2.5", "CCNM Art. 139")
 * @property {ConditionAnciennete} conditionAnciennete - Condition d'ancienneté pour en bénéficier
 * @property {string} dateCle - Date ou période clé (ex: "Au 1er juin de l'année")
 */

/**
 * Type de valeur d'une prime (extensible pour futurs accords).
 * Détermine aussi la période de calcul (évite la redondance avec calculMensuel) :
 * - horaire : montant par heure (€/h) ; saisie d'heures mensuelles → calcul mensuel (heures × taux) puis × 12
 * - montant : montant fixe annuel (€) ; versement en un mois (moisVersement optionnel)
 * - pourcentage : % d'une base (ex. salaire)
 * @typedef {'horaire'|'montant'|'pourcentage'} PrimeValueType
 */

/**
 * Définition générique d'une prime d'accord.
 * Permet à l'UI et aux calculs de s'adapter sans accéder à des propriétés spécifiques (ex. primes.equipe.montantHoraire).
 * @typedef {Object} PrimeDef
 * @property {string} id - Identifiant unique (ex: 'primeEquipe', 'primeVacances')
 * @property {string} label - Libellé affiché (ex: "Prime d'équipe")
 * @property {'accord'|'modalite'} sourceValeur - Valeur fixée par l'accord ou à compléter par l'utilisateur (modalité)
 * @property {PrimeValueType} valueType - Type de la valeur (horaire, montant, pourcentage)
 * @property {string} unit - Unité affichée (ex: '€/h', '€', '%')
 * @property {number|null} valeurAccord - Valeur fixe lorsque sourceValeur === 'accord' ; null si modalité
 * @property {string} stateKeyActif - Clé dans state pour activer/désactiver (ex: 'travailEquipe', 'primeVacances')
 * @property {string} [stateKeyHeures] - Clé state pour les heures mensuelles (valueType === 'horaire')
 * @property {string} [stateKeyValeur] - Clé state pour la valeur utilisateur (sourceValeur === 'modalite') ; peut être 'primesModalites.<id>'
 * @property {boolean} [defaultActif] - Si true, la case est cochée par défaut à l'affichage (défini par l'accord, pas par l'app)
 * @property {number} [defaultHeures] - Valeur par défaut pour stateKeyHeures (heures mensuelles ; valueType === 'horaire')
 * @property {number} [min] - Borne min pour input modalité (optionnel)
 * @property {number} [max] - Borne max pour input modalité (optionnel)
 * @property {number} [step] - Pas pour input (optionnel, ex: 0.01)
 * @property {boolean} [calculMensuel] - Déprécié / redondant : pour valueType 'horaire' le calcul est toujours mensuel (heures/mois × taux × 12) ; pour 'montant' le montant est annuel. À réserver à un cas particulier futur si besoin.
 * @property {number} [moisVersement] - Mois de versement 1-12 (valueType === 'montant' : prime versée ce mois-là)
 * @property {ConditionAnciennete} [conditionAnciennete] - Condition d'ancienneté pour en bénéficier (générique ; utilisé pour le calcul)
 * @property {string} [tooltip] - Texte d'aide affiché au survol (?) sur l'option (modalités particulières)
 */

/**
 * Configuration prime d'ancienneté de l'accord (source unique pour le calcul).
 * Toute modification dans le fichier d'accord (ex. accords/KuhnAgreement.js) est prise en compte :
 * seuil, plafond, barème, majoration forfait jours, etc.
 * @typedef {Object} AncienneteConfig
 * @property {number} seuil - Ancienneté minimale en années pour ouvrir droit (ex. 2 pour accord, 3 pour CCN)
 * @property {number} plafond - Ancienneté plafonnée pour le barème (ex. 25 ans)
 * @property {boolean} tousStatuts - true = Cadres et Non-cadres ; false = Non-cadres seuls (comportement CCN)
 * @property {'salaire'|'point'} baseCalcul - Base de calcul : 'salaire' = rémunération brute, 'point' = valeur du point
 * @property {Object|function} barème - Taux par année (ex. { 2: 0.02, 3: 0.03, ... }) ou fonction(annees) => taux
 * @property {number} [majorationForfaitJours] - Majoration du montant en forfait jours (ex. 0.30 = +30 %, CCNM Art. 139)
 * @property {string} [formule] - Formule affichée (optionnel)
 */

/**
 * Schéma d'accord d'entreprise standard
 * @typedef {Object} Agreement
 * @property {string} id - Identifiant unique (ex: 'kuhn')
 * @property {string} nom - Nom affiché complet
 * @property {string} nomCourt - Nom court pour affichage compact
 * @property {string} url - URL vers le texte de l'accord (site officiel, PDF, etc.)
 * @property {string} dateEffet - Date d'entrée en vigueur (format ISO: 'YYYY-MM-DD')
 * @property {string} [dateSignature] - Date de signature (optionnel, format ISO)
 * @property {AncienneteConfig} anciennete - Configuration prime d'ancienneté ; entièrement pilotée par l'instance d'accord (calcul : seuil, plafond, barème, majoration forfait jours)
 * @property {Object} majorations - Configuration majorations (calcul)
 * @property {PrimeDef[]} primes - Liste des primes (schéma générique) ; remplace primes.equipe / primes.vacances
 * @property {Object} repartition13Mois - Configuration répartition mensuelle (13e mois)
 * @property {ElementDroit[]} [elements] - Liste des éléments de droit (primes, majorations, garanties) pour affichage dynamique
 * @property {string[]} [pointsVigilance] - Points de vigilance (ex: suspension contrat, calcul ancienneté)
 * @property {Array<{date: string, points: string[]}>} [exemplesRecrutement] - Exemples "Si vous êtes recruté le..." (date, points)
 * @property {Object} [conges] - Congés d'ancienneté (optionnel, informatif)
 * @property {Object} labels - Labels et métadonnées UI
 * @property {Object} metadata - Métadonnées techniques
 */

/**
 * Validation basique d'un accord
 * @param {Agreement} agreement - Accord à valider
 * @returns {boolean} true si l'accord est valide
 */
export function validateAgreement(agreement) {
    if (!agreement || typeof agreement !== 'object') {
        return false;
    }
    
    const required = ['id', 'nom', 'nomCourt', 'url', 'dateEffet', 'anciennete', 'majorations', 'primes', 'repartition13Mois', 'labels', 'metadata'];
    
    for (const field of required) {
        if (!(field in agreement)) {
            console.warn(`Champ requis manquant dans l'accord: ${field}`);
            return false;
        }
    }
    
    if (!Array.isArray(agreement.primes)) {
        console.warn('Champ primes doit être un tableau (PrimeDef[])');
        return false;
    }
    
    return true;
}

/**
 * Export du schéma pour documentation
 */
export const AGREEMENT_SCHEMA = {
    id: 'string (requis)',
    nom: 'string (requis)',
    nomCourt: 'string (requis)',
    url: 'string (requis)',
    dateEffet: 'string ISO date (requis)',
    dateSignature: 'string ISO date (optionnel)',
    anciennete: {
        seuil: 'number (requis) - ancienneté min. pour ouvrir droit',
        plafond: 'number (requis) - plafond années pour le barème',
        tousStatuts: 'boolean (requis) - true = Cadres + Non-cadres',
        baseCalcul: "'salaire' | 'point' (requis)",
        barème: 'object | function (requis) - taux par année',
        majorationForfaitJours: 'number (optionnel) - ex. 0.30 pour +30 % en forfait jours',
        tauxParClasse: 'object (optionnel si baseCalcul === "salaire")',
        formule: 'string (optionnel)'
    },
    majorations: {
        nuit: {
            posteNuit: 'number (requis)',
            posteMatin: 'number (requis)',
            plageDebut: 'number (requis)',
            plageFin: 'number (requis)',
            seuilHeuresPosteNuit: 'number (requis)'
        },
        dimanche: 'number (requis)',
        heuresSupplementaires: 'object (optionnel)',
        penibilite: 'object (optionnel)'
    },
    primes: 'PrimeDef[] (requis) - liste générique des primes (id, valueType, unit, sourceValeur, stateKeyActif, etc.)',
    repartition13Mois: {
        actif: 'boolean (requis)',
        moisVersement: 'number 1-12 (requis)',
        inclusDansSMH: 'boolean (requis)'
    },
    conges: 'object (optionnel)',
    labels: {
        nomCourt: 'string (requis)',
        description: 'string (optionnel) - texte unique pour tooltips header et page Résultat',
        tooltipHeader: 'string (optionnel, fallback description)',
        tooltipPage3: 'string (optionnel, fallback description)',
        tooltip: 'string (optionnel, fallback description)',
        badge: 'string (optionnel)'
    },
    metadata: {
        version: 'string (requis)',
        articlesSubstitues: 'array (requis)',
        territoire: 'string (optionnel)',
        entreprise: 'string (requis)'
    },
    elements: 'ElementDroit[] (optionnel) - liste pour affichage dynamique',
    pointsVigilance: 'string[] (optionnel)',
    exemplesRecrutement: 'Array<{date, points}> (optionnel)'
};

/**
 * Retourne la liste des éléments de droit (primes, majorations, garanties) pour affichage.
 * Permet d'itérer sans connaître les propriétés de l'accord.
 * @param {Agreement} agreement - Accord d'entreprise
 * @returns {ElementDroit[]}
 */
export function getElements(agreement) {
    return agreement?.elements ?? [];
}

/**
 * Retourne la liste des primes définies dans l'accord (schéma générique).
 * @param {Agreement} agreement - Accord d'entreprise
 * @returns {PrimeDef[]}
 */
export function getPrimes(agreement) {
    if (!agreement || !Array.isArray(agreement.primes)) {
        return [];
    }
    return agreement.primes;
}

/**
 * Retourne une prime par son id.
 * @param {Agreement} agreement - Accord d'entreprise
 * @param {string} primeId - Identifiant de la prime (ex: 'primeEquipe', 'primeVacances')
 * @returns {PrimeDef|null}
 */
export function getPrimeById(agreement, primeId) {
    const primes = getPrimes(agreement);
    return primes.find(p => p.id === primeId) ?? null;
}

/**
 * Lit une entrée accord (actif, heures ou valeur modalité) depuis le state.
 * Utilise state.accordInputs en priorité ; compatibilité avec anciennes clés à la racine de state.
 * @param {Object} state - État de l'application
 * @param {string} key - Clé (stateKeyActif, stateKeyHeures ou primeId pour modalité)
 * @returns {boolean|number|undefined}
 */
export function getAccordInput(state, key) {
    if (!state) return undefined;
    const v = state.accordInputs && key in state.accordInputs
        ? state.accordInputs[key]
        : state[key];
    return v;
}

/** Valeur par défaut pour les champs "heures mensuelles" (ex. prime équipe) lorsque l'accord n'en définit pas. */
const DEFAULT_HEURES_MENSUELLES = 151.67;

/**
 * Initialise state.accordInputs à partir des primes de l'accord (sans connaître les clés à l'avance).
 * À appeler quand un accord est chargé ou activé. Ne touche qu'aux clés manquantes (préserve la saisie utilisateur).
 * @param {Object|null} agreement - Accord actif ou null
 * @param {Object} state - État de l'application (state.accordInputs sera complété)
 */
export function hydrateAccordInputs(agreement, state) {
    if (!agreement || !state || typeof state.accordInputs !== 'object') return;
    if (!state.accordInputs) state.accordInputs = {};
    const primes = getPrimes(agreement);
    for (const prime of primes) {
        if (prime.stateKeyActif && !(prime.stateKeyActif in state.accordInputs)) {
            state.accordInputs[prime.stateKeyActif] = prime.defaultActif === true;
        }
        if (prime.stateKeyHeures && !(prime.stateKeyHeures in state.accordInputs)) {
            state.accordInputs[prime.stateKeyHeures] = prime.defaultHeures ?? DEFAULT_HEURES_MENSUELLES;
        }
    }
}

/**
 * Retourne la valeur effective d'une prime (accord ou modalité) pour les calculs.
 * @param {Agreement} agreement - Accord d'entreprise
 * @param {string} primeId - Identifiant de la prime
 * @param {Object} state - État de l'application (accordInputs ou stateKeyActif / stateKeyHeures / primesModalites)
 * @returns {number} Valeur à utiliser (taux horaire, montant, ou pourcentage) ou 0 si non applicable
 */
export function getPrimeValue(agreement, primeId, state) {
    const prime = getPrimeById(agreement, primeId);
    if (!prime) return 0;
    if (prime.sourceValeur === 'accord' && prime.valeurAccord != null) {
        return Number(prime.valeurAccord);
    }
    const modaliteVal = getAccordInput(state, prime.id)
        ?? (state?.primesModalites && prime.id in state.primesModalites ? state.primesModalites[prime.id] : undefined)
        ?? (prime.stateKeyValeur && state ? state[prime.stateKeyValeur] : undefined);
    if (modaliteVal != null) return Number(modaliteVal) || 0;
    return 0;
}

/**
 * Retourne les heures mensuelles associées à une prime de type horaire (ex: prime d'équipe).
 * @param {Agreement} agreement - Accord d'entreprise
 * @param {string} primeId - Identifiant de la prime
 * @param {Object} state - État de l'application
 * @returns {number} Heures mensuelles ou 0
 */
export function getPrimeHeures(agreement, primeId, state) {
    const prime = getPrimeById(agreement, primeId);
    if (!prime || !prime.stateKeyHeures || !state) return 0;
    const h = getAccordInput(state, prime.stateKeyHeures);
    return Number(h) || 0;
}

/**
 * Indique si une prime est activée par l'utilisateur (state).
 * @param {Agreement} agreement - Accord d'entreprise
 * @param {string} primeId - Identifiant de la prime
 * @param {Object} state - État de l'application
 * @returns {boolean}
 */
export function isPrimeActive(agreement, primeId, state) {
    const prime = getPrimeById(agreement, primeId);
    if (!prime || !state) return false;
    const actif = getAccordInput(state, prime.stateKeyActif);
    return actif === true || actif === 'true';
}

/**
 * Convertit une PrimeDef (accord) en ElementDef unifié pour calcul générique.
 * @param {PrimeDef} primeDef - Définition prime de l'accord
 * @param {Agreement} agreement - Accord d'entreprise (pour nomCourt dans labels)
 * @returns {import('../core/RemunerationTypes.js').ElementDef}
 */
export function primeDefToElementDef(primeDef, agreement) {
    return {
        id: primeDef.id,
        semanticId: primeDef.id,
        kind: 'prime',
        source: 'accord',
        valueKind: primeDef.valueType,
        label: primeDef.label,
        config: {
            ...primeDef,
            nomCourt: agreement?.nomCourt
        }
    };
}

/**
 * Retourne les primes d'accord converties en ElementDef.
 * @param {Agreement} agreement - Accord d'entreprise
 * @returns {import('../core/RemunerationTypes.js').ElementDef[]}
 */
export function getAccordPrimeDefsAsElements(agreement) {
    const primes = getPrimes(agreement);
    return primes.map(p => primeDefToElementDef(p, agreement));
}
