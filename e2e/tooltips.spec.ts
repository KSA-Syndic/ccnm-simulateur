import { test, expect } from '@playwright/test';
import { goToStep2 } from './wizard-helpers';

test.describe('Tooltips', () => {
  test('hover sur .app-tooltip-trigger affiche le contenu', async ({ page }) => {
    await goToStep2(page, 'A', '1');
    const trigger = page.locator('.app-tooltip-trigger').first();
    await expect(trigger).toBeVisible();
    await trigger.hover();
    await expect(page.locator('[role="tooltip"]')).toBeVisible();
  });
});
