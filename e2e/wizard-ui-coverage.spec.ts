import { test, expect } from '@playwright/test';
import {
  fillOneSalaireViaBulkModal,
  goToStep2,
  goToStep3,
  goToStep4,
  hashBase,
} from './wizard-helpers';

const accordKuhnStart = '/?accord=kuhn';

test.describe('P5.2 — UI wizard (situation, header, footer, hints, graphiques, export)', () => {
  test('étape 2 — panneau « Conditions de travail » + temps partiel + saisie numérique taux', async ({
    page,
  }) => {
    await goToStep2(page, 'A', '1');
    await page.locator('#conditions-travail').locator(':scope > summary').click();
    await expect(page.getByRole('checkbox', { name: /Temps partiel/i })).toBeVisible();
    await expect(page.getByLabel(/Taux d'activité/i)).not.toBeVisible();
    await page.getByRole('checkbox', { name: /Temps partiel/i }).check();
    await expect(page.getByLabel(/Taux d'activité/i)).toBeVisible();
    await page.getByLabel(/Taux d'activité/i).fill('80');
    await expect(page.getByLabel(/Taux d'activité/i)).toHaveValue(/80/);
  });

  test('étape 2 — point territorial (NumericInput décimal)', async ({ page }) => {
    await goToStep2(page, 'A', '1');
    const pt = page.locator('#point-territorial');
    await pt.fill('6,12');
    await pt.blur();
    await expect(pt).toHaveValue(/6[,.]12/);
  });

  test('en-tête — sous-titre dynamique avec accord Kuhn (?accord=kuhn)', async ({ page }) => {
    await page.goto(accordKuhnStart);
    await expect(page.locator('#header-subtitle-text')).toContainText(/Kuhn/i);
  });

  test('pied de page — liens UIMM, CFDT et modal vie privée', async ({ page }) => {
    await page.goto(hashBase);
    await expect(page.getByRole('link', { name: /Textes conventionnels \(UIMM\)/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /CFDT Kuhn Saverne/i })).toBeVisible();
    await page.getByRole('button', { name: /Données personnelles/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('étape 3 — hints + options accord Kuhn + graphique évolution (détail)', async ({ page }) => {
    await goToStep3(page, 'A', '1', accordKuhnStart);
    const step3 = page.locator('section[aria-label="Étape 3 — Résultat"]');
    const hintsRegion = step3.getByRole('region', { name: /Conseils liés au calcul/i });
    await expect(hintsRegion).toBeVisible();
    await expect(hintsRegion).toContainText(/accord/i);
    await expect(
      step3.getByRole('checkbox', { name: /Appliquer l'accord d'entreprise/i }),
    ).toBeVisible();
    await expect(
      step3.getByRole('checkbox', { name: /Appliquer l'accord d'entreprise/i }),
    ).toBeChecked();
    await expect(step3.getByText(/Kuhn/i).first()).toBeVisible();

    await step3.locator('details.evolution-details summary').click();
    await expect(step3.locator('details.evolution-details')).toHaveAttribute('open', '');
    const canvas = step3.locator('details.evolution-details canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(80);
    expect(box?.height).toBeGreaterThan(80);
  });

  test('étape 4 — carrousel juridique + ouverture modale export PDF', async ({ page }) => {
    await goToStep4(page, 'A', '1');
    await fillOneSalaireViaBulkModal(page);
    await page.getByRole('button', { name: /Calculer les arriérés/i }).click();

    const carousel = page.getByRole('region', { name: /Guide juridique/i });
    await expect(carousel).toBeVisible({ timeout: 15_000 });
    await expect(carousel.locator('.carousel-slide.active h4')).toContainText(
      /Vérification des informations/i,
    );
    await carousel.getByRole('button', { name: /Suivant/i }).click();
    await expect(carousel.locator('.carousel-slide.active h4')).toContainText(
      /Consultation professionnelle/i,
    );

    await page.getByRole('button', { name: /Générer mon rapport d'arriérés/i }).click();
    await expect(page.getByRole('dialog', { name: /Export PDF et lettre Word/i })).toBeVisible();
    await expect(page.locator('#pdf-nom')).toBeVisible();
  });
});
