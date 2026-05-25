/**
 * ============================================
 * FORMATTERS - Formatage des Données
 * ============================================
 * 
 * Fonctions utilitaires pour le formatage des montants et autres données.
 */

import { roundToCents } from './rounding.js';

/**
 * Montant ou taux en euros pour libellés de détail (2 décimales, séparateur français).
 * @param {number} amount
 * @returns {string}
 */
export function formatEurosDetail(amount) {
    const n = roundToCents(Number(amount) || 0);
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(n).replace(/\u202f/g, ' ');
}

/**
 * Quantité d'heures pour libellés de détail (jusqu'à 2 décimales, sans zéros superflus à droite au-delà de l'usage métier).
 * @param {number} heures
 * @returns {string}
 */
export function formatHeuresDetail(heures) {
    const n = Math.round((Number(heures) || 0) * 100) / 100;
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(n).replace(/\u202f/g, ' ');
}

/**
 * Formater un montant en euros (affichage écran)
 * @param {number} amount - Montant à formater
 * @returns {string} Montant formaté (ex: "21 500 €")
 */
export function formatMoney(amount) {
    const n = Math.round(Number(amount));
    const s = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true
    }).format(n);
    return s.replace(/\u202f/g, ' ') + ' €';
}

/**
 * Formater un montant en euros (PDF)
 * @param {number} amount - Montant à formater
 * @returns {string} Montant formaté (ex: "21 500 €")
 */
export function formatMoneyPDF(amount) {
    const n = Math.round(Number(amount));
    const s = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true
    }).format(n);
    return s.replace(/\u202f/g, ' ') + ' €';
}

/**
 * Échapper les caractères HTML pour éviter les injections XSS
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne échappée
 */
export function escapeHTML(str) {
    if (typeof str !== 'string') {
        return String(str);
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
