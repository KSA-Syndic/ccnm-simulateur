import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/domain/config';
import { eligibleHints, formatHintsHtml, buildResultHintBlocks } from '@/domain/hints/engine';
import type { ElementResult } from '@/domain/types';

describe('hints engine', () => {
  it('cadre débutant F11 + exp sous le seuil catalogue', () => {
    const ids = eligibleHints({
      isCadre: true,
      classe: 11,
      experiencePro: 2,
      accordActif: false,
      travailNuit: false,
      travailDimanche: false,
      travailHeuresSup: false,
    });
    expect(ids).toContain('cadreDebutant');
  });

  it('cadre F11 + exp au seuil catalogue : pas de hint cadre débutant', () => {
    const seuil = CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO;
    const ids = eligibleHints({
      isCadre: true,
      classe: 11,
      experiencePro: seuil,
      accordActif: false,
      travailNuit: false,
      travailDimanche: false,
      travailHeuresSup: false,
    });
    expect(ids).not.toContain('cadreDebutant');
  });

  it('majorations sans accord', () => {
    const ids = eligibleHints({
      isCadre: false,
      classe: 5,
      experiencePro: 10,
      accordActif: false,
      travailNuit: true,
      travailDimanche: false,
      travailHeuresSup: false,
    });
    expect(ids).toContain('majorationsSansAccord');
  });

  it('formatHintsHtml produit une liste', () => {
    const html = formatHintsHtml(['defautNonCadre']);
    expect(html).toContain('<ul');
    expect(html).toContain('non-cadre');
  });

  it('buildResultHintBlocks — majorations CCNM sans accord', () => {
    const details: ElementResult[] = [
      {
        amount: 100,
        label: 'Majoration de nuit conventionnelle',
        kind: 'majoration',
        source: 'convention',
        semanticId: 'majorationNuit',
        inclusDansSMH: false,
        isAgreementSpecific: false,
      },
    ];
    const blocks = buildResultHintBlocks({
      scenario: 'non-cadre',
      groupe: 'A',
      classe: 5,
      anciennete: 5,
      experiencePro: 5,
      accordActif: false,
      agreement: null,
      details,
    });
    expect(blocks.some((b) => b.type === 'info' && b.html.includes('Majorations CCNM'))).toBe(true);
  });

  it('buildResultHintBlocks — barème débutants mentionne le seuil catalogue', () => {
    const seuil = CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO;
    const blocks = buildResultHintBlocks({
      scenario: 'cadre-debutant',
      groupe: 'F',
      classe: 11,
      anciennete: 0,
      experiencePro: seuil - 1,
      accordActif: false,
      agreement: null,
      details: [],
    });
    expect(blocks.some((b) => b.type === 'warning' && b.html.includes(String(seuil)))).toBe(true);
  });
});
