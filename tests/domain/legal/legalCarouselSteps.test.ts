import { describe, expect, it } from 'vitest';
import { buildLegalCarouselSteps, getCcnmEffectiveYear } from '@/domain/legal/legalCarouselSteps';

describe('legalCarouselSteps', () => {
  it('6 slides avec HTML et année CCNM dans la dernière', () => {
    const steps = buildLegalCarouselSteps();
    expect(steps).toHaveLength(6);
    expect(steps[0]!.title).toContain('Vérification');
    expect(steps[0]!.contentHtml).toMatch(/<ul>/);
    const y = getCcnmEffectiveYear();
    expect(steps[5]!.contentHtml).toContain(`CCNM ${y}`);
  });
});
