/**
 * Utilitaires date pour proratisation CCN (entrée en cours de mois).
 * CCNM Art. 103.5.1 : valeur d'un jour = 1/22 de la rémunération mensuelle.
 * CCNM Art. 103.5.2 : régularisation basée sur le nombre réel de jours travaillés.
 */

/**
 * Compte le nombre de jours ouvrés (lundi à vendredi) entre deux dates, incluses.
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
