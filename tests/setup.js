/**
 * Configuration globale pour les tests Vitest
 */

import { expect, afterEach, vi } from 'vitest';

// Matcher personnalisé pour toBeInTheDocument (si jest-dom n'est pas disponible)
expect.extend({
    toBeInTheDocument(received) {
        if (received === null || received === undefined) {
            return {
                message: () => `expected ${received} to be in the document`,
                pass: false
            };
        }
        // Vérifier si l'élément est dans le document
        const isInDocument = received.ownerDocument !== null || 
                            (typeof document !== 'undefined' && document.body && document.body.contains(received)) ||
                            (typeof document !== 'undefined' && received === document.body) ||
                            (typeof document !== 'undefined' && received === document.documentElement);
        return {
            message: () => `expected ${received} ${isInDocument ? 'not ' : ''}to be in the document`,
            pass: isInDocument
        };
    }
});

// Nettoyer le DOM après chaque test (cleanup n'est plus exporté par @testing-library/dom)
afterEach(() => {
    // Nettoyer le body si nécessaire
    if (typeof document !== 'undefined' && document.body) {
        document.body.innerHTML = '';
    }
});

// Mock global pour Chart.js si nécessaire
global.Chart = class MockChart {
    constructor() {
        this.data = { labels: [], datasets: [] };
        this.options = {};
    }
    update() {}
    destroy() {}
    resize() {}
};

// Mock pour jsPDF si nécessaire
global.jsPDF = class MockJsPDF {
    constructor() {
        this.internal = {
            pageSize: {
                getWidth: () => 210,
                getHeight: () => 297
            },
            getNumberOfPages: () => 1
        };
    }
    setFontSize() { return this; }
    setFont() { return this; }
    setTextColor() { return this; }
    text() { return this; }
    line() { return this; }
    addPage() { return this; }
    setPage(pageNum) { return this; } // Ajout de setPage manquant
    splitTextToSize(text, width) { return [text]; }
    save() {}
    setDrawColor() { return this; }
};
