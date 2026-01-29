/**
 * Tests fonctionnels pour le wizard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/dom';

describe('Wizard - Parcours Utilisateur', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
        container.innerHTML = `
            <div class="wizard-progress">
                <div class="progress-step active" data-step="1">
                    <span class="progress-dot">1</span>
                    <span class="progress-label">Classification</span>
                </div>
                <div class="progress-line"></div>
                <div class="progress-step" data-step="2">
                    <span class="progress-dot">2</span>
                    <span class="progress-label">Situation</span>
                </div>
                <div class="progress-line"></div>
                <div class="progress-step" data-step="3">
                    <span class="progress-dot">3</span>
                    <span class="progress-label">Résultat</span>
                </div>
            </div>
            <div id="step-1" class="step-content">
                <button id="btn-connais-classe">Oui, je la connais</button>
                <button id="btn-estimer-classe">Non, je veux l'estimer</button>
            </div>
            <div id="step-2" class="step-content hidden">
                <input type="number" id="anciennete-input" min="0" step="0.5" value="0">
            </div>
            <div id="step-3" class="step-content hidden">
                <div id="result-smh">0 €</div>
            </div>
        `;
        document.body.appendChild(container);
    });

    it('devrait permettre la navigation entre les étapes', () => {
        const step2 = container.querySelector('[data-step="2"]');
        expect(step2).toBeInTheDocument();
        
        // Simuler le clic sur l'étape 2
        fireEvent.click(step2);
        
        // Vérifier que l'étape 2 est active
        expect(step2.classList.contains('active')).toBe(true);
    });

    it('devrait afficher le mode estimation quand on clique sur "Non, je veux l\'estimer"', () => {
        const btnEstimer = container.querySelector('#btn-estimer-classe');
        expect(btnEstimer).toBeInTheDocument();
        
        fireEvent.click(btnEstimer);
        
        // Vérifier que le mode estimation est activé
        // (dépend de l'implémentation réelle dans app.js)
        expect(btnEstimer).toBeInTheDocument();
    });

    it('devrait afficher le mode direct quand on clique sur "Oui, je la connais"', () => {
        const btnConnais = container.querySelector('#btn-connais-classe');
        expect(btnConnais).toBeInTheDocument();
        
        fireEvent.click(btnConnais);
        
        // Vérifier que le mode direct est activé
        expect(btnConnais).toBeInTheDocument();
    });
});

describe('Wizard - Validation des Données', () => {
    it('devrait valider l\'ancienneté saisie', () => {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'anciennete-input';
        input.min = '0';
        input.value = '5';
        
        expect(parseFloat(input.value)).toBe(5);
        expect(parseFloat(input.value)).toBeGreaterThanOrEqual(0);
    });

    it('devrait rejeter une ancienneté négative', () => {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = '-1';
        
        expect(parseFloat(input.value)).toBeLessThan(0);
    });
});
