/**
 * ============================================
 * EXPOSE TO APP - Exposition des Fonctions pour app.js
 * ============================================
 * 
 * Expose les fonctions des nouveaux modules sur window pour que app.js puisse les utiliser.
 * Synchronise automatiquement le state de app.js vers le state des modules.
 */

import { getMontantAnnuelSMHSeul } from '../remuneration/RemunerationCalculator.js';
import { calculateAnnualRemuneration } from '../remuneration/RemunerationCalculator.js';
import { getMontantPrimesFixesAnnuel, getMontantPrimesVerseesCeMois } from '../remuneration/PrimesFixesHelper.js';
import { calculateSalaireDuPourMois } from '../arretees/ArreteesCalculator.js';
import { genererPDFArretees } from '../arretees/PDFGenerator.js';
import { getActiveAgreement } from '../agreements/AgreementLoader.js';
import { state as moduleState } from '../core/state.js';
import { computeSalaireProrataEntree } from '../utils/dateUtils.js';

/**
 * Synchroniser le state de app.js vers le state des modules
 * @param {Object} appState - State de app.js
 */
function syncStateToModules(appState) {
    // Synchroniser tous les champs pertinents
    moduleState.currentStep = appState.currentStep || moduleState.currentStep;
    moduleState.modeClassification = appState.modeClassification || moduleState.modeClassification;
    moduleState.salairesParMois = appState.salairesParMois || moduleState.salairesParMois;
    moduleState.dateEmbaucheArretees = appState.dateEmbaucheArretees || moduleState.dateEmbaucheArretees;
    moduleState.dateChangementClassificationArretees = appState.dateChangementClassificationArretees || moduleState.dateChangementClassificationArretees;
    moduleState.ruptureContratArretees = appState.ruptureContratArretees !== undefined ? appState.ruptureContratArretees : moduleState.ruptureContratArretees;
    moduleState.dateRuptureArretees = appState.dateRuptureArretees || moduleState.dateRuptureArretees;
    moduleState.accordEcritArretees = appState.accordEcritArretees !== undefined ? appState.accordEcritArretees : moduleState.accordEcritArretees;
    moduleState.arretesSurSMHSeul = appState.arretesSurSMHSeul !== undefined ? appState.arretesSurSMHSeul : moduleState.arretesSurSMHSeul;
    moduleState.scores = appState.scores || moduleState.scores;
    moduleState.modeManuel = appState.modeManuel !== undefined ? appState.modeManuel : moduleState.modeManuel;
    moduleState.groupeManuel = appState.groupeManuel || moduleState.groupeManuel;
    moduleState.classeManuel = appState.classeManuel || moduleState.classeManuel;
    moduleState.anciennete = appState.anciennete !== undefined ? appState.anciennete : moduleState.anciennete;
    moduleState.pointTerritorial = appState.pointTerritorial !== undefined ? appState.pointTerritorial : moduleState.pointTerritorial;
    moduleState.forfait = appState.forfait || moduleState.forfait;
    moduleState.experiencePro = appState.experiencePro !== undefined ? appState.experiencePro : moduleState.experiencePro;
    moduleState.typeNuit = appState.typeNuit || moduleState.typeNuit;
    moduleState.heuresNuit = appState.heuresNuit !== undefined ? appState.heuresNuit : moduleState.heuresNuit;
    moduleState.travailDimanche = appState.travailDimanche !== undefined ? appState.travailDimanche : moduleState.travailDimanche;
    moduleState.heuresDimanche = appState.heuresDimanche !== undefined ? appState.heuresDimanche : moduleState.heuresDimanche;
    if (appState.accordInputs && typeof appState.accordInputs === 'object') {
        moduleState.accordInputs = { ...(moduleState.accordInputs || {}), ...appState.accordInputs };
    }
    // Synchroniser accordActif (app.js) vers accordActif/accordId (modules)
    const accordActif = appState.accordActif;
    if (accordActif !== undefined) {
        moduleState.accordActif = !!accordActif;
        if (!accordActif) {
            moduleState.accordId = null;
        } else if (!moduleState.accordId) {
            // Accord actif : déduire accordId depuis l'accord déjà chargé (URL ou registre), pas d'ID hardcodé
            const agreement = getActiveAgreement();
            if (agreement) moduleState.accordId = agreement.id;
        }
    }
    // accordInputs : clés fournies par l'accord (stateKeyActif, stateKeyHeures), hydraté par hydrateAccordInputs
    moduleState.nbMois = appState.nbMois !== undefined ? appState.nbMois : moduleState.nbMois;
}

/**
 * Wrapper pour getMontantAnnuelSMHSeul qui synchronise le state
 */
window.getMontantAnnuelSMHSeulFromModules = function(appState) {
    syncStateToModules(appState);
    return getMontantAnnuelSMHSeul(moduleState);
};

/**
 * Wrapper pour calculateRemuneration qui synchronise le state
 */
window.calculateRemunerationFromModules = function(appState) {
    syncStateToModules(appState);
    const agreement = getActiveAgreement();
    const activeAgreement = (moduleState.accordActif && agreement) ? agreement : null;
    return calculateAnnualRemuneration(moduleState, activeAgreement, { mode: 'full' });
};

/**
 * Wrapper pour calculateSalaireDuPourMois qui synchronise le state
 */
window.calculateSalaireDuPourMoisFromModules = function(dateMois, dateEmbauche, appState, agreement, smhSeul) {
    syncStateToModules(appState);
    // Créer un snapshot du state pour ce mois spécifique (cohérent avec courbe évolution vs inflation)
    const stateSnapshot = { ...moduleState };

    // Ancienneté à la date du mois (années révolues depuis embauche)
    const dateMoisTime = dateMois instanceof Date ? dateMois.getTime() : new Date(dateMois).getTime();
    const dateEmbaucheTime = dateEmbauche instanceof Date ? dateEmbauche.getTime() : new Date(dateEmbauche).getTime();
    const moisDepuisEmbauche = (dateMoisTime - dateEmbaucheTime) / (365.25 * 24 * 60 * 60 * 1000 / 12);
    const ancienneteMois = Math.floor(moisDepuisEmbauche / 12);
    stateSnapshot.anciennete = ancienneteMois;

    // Expérience pro à la date du mois (barème débutants F11/F12). Si le caller a déjà fourni un state pour ce mois (experiencePro < actuel), on le garde.
    const yearsFromMoisToNow = (Date.now() - dateMoisTime) / (365.25 * 24 * 60 * 60 * 1000);
    const experienceProAtMois = Math.max(0, Math.floor((appState.experiencePro ?? 0) - yearsFromMoisToNow));
    const callerProvidedStateForMonth = appState.experiencePro !== undefined && appState.experiencePro <= experienceProAtMois + 1 && appState.anciennete !== undefined;
    stateSnapshot.experiencePro = callerProvidedStateForMonth ? appState.experiencePro : experienceProAtMois;
    
    // Si agreement n'est pas fourni, essayer de le récupérer
    let activeAgreement = agreement;
    if (!activeAgreement && moduleState.accordActif) {
        activeAgreement = getActiveAgreement();
    }
    
    return calculateSalaireDuPourMois(dateMois, dateEmbauche, stateSnapshot, activeAgreement, smhSeul);
};

/**
 * Wrapper pour genererPDFArretees qui synchronise le state
 */
window.genererPDFArreteesFromModules = function(data, infosPersonnelles, appState) {
    syncStateToModules(appState);
    // Passer le state synchronisé au générateur PDF
    return genererPDFArretees(data, infosPersonnelles, false, moduleState);
};

/**
 * Montant annuel des primes à versement unique (type montant) de l'accord actif.
 * Utilisé pour l'évolution salariale (ne pas appliquer l'inflation sur cette part).
 * @param {Object} appState - State de app.js
 * @returns {number}
 */
window.getMontantPrimesFixesAnnuelFromModules = function(appState) {
    syncStateToModules(appState);
    const agreement = getActiveAgreement();
    if (!agreement || !appState.accordActif) return 0;
    return getMontantPrimesFixesAnnuel(moduleState, agreement);
};

/**
 * Montant des primes à versement unique versées un mois donné (mois 1-12).
 * Utilisé pour la répartition mensuelle (courbe, arriérés).
 * @param {Object} appState - State de app.js
 * @param {number} mois - Mois (1-12)
 * @returns {number}
 */
window.getMontantPrimesVerseesCeMoisFromModules = function(appState, mois) {
    syncStateToModules(appState);
    const agreement = getActiveAgreement();
    if (!agreement || !appState.accordActif || !mois || mois < 1 || mois > 12) return 0;
    return getMontantPrimesVerseesCeMois(moduleState, agreement, mois);
};

/**
 * Salaire mensuel au prorata pour entrée en cours de mois (CCN Art. 139, 103.5.1, 103.5.2).
 * Utilise la valeur JOURS_OUVRES_CCN de la config.
 * @param {number} salaireMensuelComplet - Salaire mensuel brut complet
 * @param {Date} dateDebutTravail - Premier jour travaillé (ex. date d'embauche)
 * @param {Date} dernierJourMois - Dernier jour du mois
 * @returns {number}
 */
window.computeSalaireProrataEntreeFromModules = function(salaireMensuelComplet, dateDebutTravail, dernierJourMois) {
    return computeSalaireProrataEntree(salaireMensuelComplet, dateDebutTravail, dernierJourMois);
};
