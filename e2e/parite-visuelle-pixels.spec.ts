import { test, expect, type Page } from '@playwright/test';
import { comparePngBuffers } from './helpers/comparePng';
import {
  legacyGoToStep2,
  legacyGoToStep3,
  legacyGoToStep4,
  legacyStep1a,
  legacyStep1cVisible,
} from './legacy-parity-nav';
import { goToStep1b, goToStep2, goToStep3, goToStep4 } from './wizard-helpers';

/**
 * Comparaison pixel **legacy (5174)** vs **Vue (5173)** sur 12 couples capture
 * (6 parcours × 2 bandes : en-tête + corps).
 *
 * Seuil pilotable : `PW_PARITE_MAX_DIFF_RATIO` (0–1, défaut **0,82** — volontairement
 * large : polices, tippy, contenus dynamiques). À resserrer quand les pipelines sont stables.
 *
 * @see docs/PARITE_MATRIX.md — D6.04
 */
const dual = process.env.DUAL_PARITE_E2E === '1';
const legacyBase = process.env.PW_LEGACY_BASE ?? 'http://localhost:5174';
const vueBase = process.env.PW_VUE_BASE ?? 'http://localhost:5173';

const VIEWPORT = { width: 1280, height: 900 } as const;
const CLIPS = {
  header: { x: 0, y: 0, width: 1280, height: 140 },
  body: { x: 0, y: 140, width: 1280, height: 760 },
} as const;

async function vueStep1c(page: Page): Promise<void> {
  await page.goto(vueBase);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Je souhaite l'estimer/i }).click();
  await page.locator('.roulette-item').first().waitFor({ state: 'visible', timeout: 30_000 });
}

const SCENARIOS: Array<{
  id: string;
  legacy: (page: Page) => Promise<void>;
  vue: (page: Page) => Promise<void>;
}> = [
  {
    id: '01-step1a',
    legacy: (p) => legacyStep1a(p, legacyBase),
    vue: async (p) => {
      await p.goto(vueBase);
      await p.waitForLoadState('networkidle');
    },
  },
  {
    id: '02-step1b-direct-C',
    legacy: async (p) => {
      await legacyStep1a(p, legacyBase);
      await p.locator('#btn-connais-classe').click();
      await p.waitForSelector('#select-groupe');
      await p.selectOption('#select-groupe', 'C');
      await p.selectOption('#select-classe', '1');
    },
    vue: (p) => goToStep1b(p, 'C', '1', vueBase),
  },
  {
    id: '03-step1c-estimation',
    legacy: (p) => legacyStep1cVisible(p, legacyBase),
    vue: vueStep1c,
  },
  {
    id: '04-step2-situation-A',
    legacy: (p) => legacyGoToStep2(p, legacyBase, 'A', '1'),
    vue: (p) => goToStep2(p, 'A', '1', vueBase),
  },
  {
    id: '05-step3-resultat-A',
    legacy: (p) => legacyGoToStep3(p, legacyBase, 'A', '1'),
    vue: (p) => goToStep3(p, 'A', '1', vueBase),
  },
  {
    id: '06-step4-arretees-A',
    legacy: (p) => legacyGoToStep4(p, legacyBase, 'A', '1'),
    vue: (p) => goToStep4(p, 'A', '1', vueBase),
  },
];

if (!dual) {
  test('parité pixels — désactivé sans DUAL_PARITE_E2E=1', () => {
    test.skip();
  });
} else {
  for (const s of SCENARIOS) {
    for (const clipName of ['header', 'body'] as const) {
      test(`${s.id} — ${clipName}`, async ({ browser }) => {
        const maxRatio = Number(process.env.PW_PARITE_MAX_DIFF_RATIO ?? '0.82');
        const context = await browser.newContext({ viewport: VIEWPORT });
        const pLegacy = await context.newPage();
        const pVue = await context.newPage();
        try {
          await s.legacy(pLegacy);
          await s.vue(pVue);
          const clip = CLIPS[clipName];
          const bufL = await pLegacy.screenshot({ clip });
          const bufV = await pVue.screenshot({ clip });
          const { ratio } = comparePngBuffers(Buffer.from(bufL), Buffer.from(bufV), {
            threshold: 0.28,
          });
          expect(
            ratio,
            `${s.id} ${clipName} — ratio pixels différents ${ratio.toFixed(4)} (max ${maxRatio})`,
          ).toBeLessThanOrEqual(maxRatio);
        } finally {
          await context.close();
        }
      });
    }
  }
}
