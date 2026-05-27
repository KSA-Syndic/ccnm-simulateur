import { describe, expect, it } from 'vitest';
import { buildWizardTooltipHtml } from '@/domain/ui/wizardTooltips';

describe('buildWizardTooltipHtml', () => {
  it('n’affiche pas de bloc Source pour les champs d’aide pure (date d’embauche)', () => {
    const html = buildWizardTooltipHtml('dateEmbaucheArretees');
    expect(html).toContain('embauche');
    expect(html).not.toContain('tooltip-source');
    expect(html).not.toContain('Simulateur');
  });

  it('affiche le bloc Source pour un tooltip conventionnel', () => {
    const html = buildWizardTooltipHtml('travailNuit');
    expect(html).toContain('tooltip-source');
    expect(html).toContain('CCNM');
  });
});
