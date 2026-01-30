/**
 * Utilitaires date pour proratisation CCN (entrée en cours de mois).
 *
 * Spécifications juridiques (CCN Métallurgie IDCC 3248) :
 * - Art. 139 : réduction au prorata en cas d'entrée en cours de mois.
 * - Art. 103.5.1 : valeur d'un jour = 1/22 de la rémunération mensuelle ; demi-journée = 1/44.
 * - Art. 103.5.2 : régularisation basée sur le nombre réel de jours travaillés par rapport à la moyenne.
 *
 * Exemple (base 3 464,39 € brut/mois) :
 * - Valeur d'un jour : 3 464,39 / 22 = 157,47 €
 * - 10 jours travaillés : 157,47 × 10 = 1 574,70 € brut
 */

import { CONFIG } from '../core/config.js';

/**
 * Retourne le nombre de jours ouvrés de référence par mois (CCN Art. 103.5.1).
 * Valeur dynamique depuis la config (ex. 22).
 * @returns {number}
 */
export function getJoursOuvresReference() {
    return CONFIG.JOURS_OUVRES_CCN ?? 22;
}

/**
 * Compte le nombre de jours ouvrés (lundi à vendredi) entre deux dates incluses.
 * Correspond au « nombre réel de jours travaillés » (Art. 103.5.2).
 * @param {Date} startDate - Date de début (incluse)
 * @param {Date} endDate - Date de fin (incluse)
 * @returns {number} Nombre de jours ouvrés
 */
export function getWorkingDaysBetween(startDate, endDate) {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (start.getTime() > end.getTime()) return 0;
    let count = 0;
    const d = new Date(start);
    while (d.getTime() <= end.getTime()) {
        const day = d.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
        if (day >= 1 && day <= 5) count++;
        d.setDate(d.getDate() + 1);
    }
    return count;
}

/**
 * Calcule le salaire mensuel dû au prorata pour un premier mois (entrée en cours de mois).
 * Utilise la valeur CCN de la config (jours ouvrés de référence) et le nombre réel de jours travaillés.
 *
 * Formule : salaire_mensuel × (jours_ouvres_reels / JOURS_OUVRES_CCN)
 * Si le salarié travaille tout le mois (jours ouvrés >= référence), retourne le salaire complet.
 *
 * @param {number} salaireMensuelComplet - Salaire mensuel brut complet du mois
 * @param {Date} dateDebutTravail - Premier jour travaillé (ex. date d'embauche)
 * @param {Date} dernierJourMois - Dernier jour du mois concerné
 * @returns {number} Salaire dû pour ce mois (proratisé ou complet)
 */
export function computeSalaireProrataEntree(salaireMensuelComplet, dateDebutTravail, dernierJourMois) {
    const joursOuvres = getWorkingDaysBetween(dateDebutTravail, dernierJourMois);
    const joursRef = getJoursOuvresReference();
    if (joursRef <= 0) return salaireMensuelComplet;
    if (joursOuvres >= joursRef) return salaireMensuelComplet;
    return salaireMensuelComplet * (joursOuvres / joursRef);
}
