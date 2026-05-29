import { describe, expect, it } from 'vitest';
import '@/accords';
import { POINT_TERRITORIAL_CODE_TRAVAIL_CONTRIBUTION } from '@/domain/ui/tooltipReferences';
import {
  applyTooltipTemplate,
  buildAccordSummaryTooltip,
  buildLegalTooltipContent,
  buildPrimeConditionTooltip,
  buildResultTooltipContent,
  classifyOriginFromSourceArticle,
  formatAccordEntrepriseSourceArticle,
  getTooltipOrigins,
} from './builders';
import { getAgreement } from '../agreements/registry';

describe('tooltip/builders', () => {
  const cfg = {
    templates: { legalBlock: '<strong>{title}\u00A0:</strong><br>{description}' },
    result: { breakdownLineTemplate: '• {label} : {value}' },
  };

  it('applyTooltipTemplate', () => {
    expect(applyTooltipTemplate('A {x} B', { x: 1 })).toBe('A 1 B');
  });

  it('classifyOriginFromSourceArticle — Code du travail', () => {
    const o = getTooltipOrigins(undefined, 'CCNM');
    expect(classifyOriginFromSourceArticle(o, 'Code du travail L3121-4', 'CCNM')).toBe(
      'Code du travail',
    );
  });

  it('buildLegalTooltipContent échappe le HTML', () => {
    const html = buildLegalTooltipContent(cfg, 'Titre <b>', 'Desc & fin');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&amp;');
  });

  it('buildLegalTooltipContent — lien externe typé', () => {
    const html = buildLegalTooltipContent(cfg, 'Titre', 'Description', {
      externalLink: {
        href: POINT_TERRITORIAL_CODE_TRAVAIL_CONTRIBUTION.href,
        label: POINT_TERRITORIAL_CODE_TRAVAIL_CONTRIBUTION.label,
      },
    });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('class="tooltip-link"');
    expect(html).toContain(POINT_TERRITORIAL_CODE_TRAVAIL_CONTRIBUTION.href);
    expect(html).toContain('Voir sur code.travail.gouv.fr');
  });

  it('buildLegalTooltipContent — lien externe avant le bloc Source', () => {
    const html = buildLegalTooltipContent(cfg, 'Titre', 'Desc', {
      sourceArticle: 'CCNM Art. 145',
      externalLink: { href: 'https://example.com', label: 'Lien' },
    });
    const iSource = html.indexOf('tooltip-source');
    const iLink = html.indexOf('tooltip-link');
    expect(iSource).toBeGreaterThan(-1);
    expect(iLink).toBeGreaterThan(-1);
    expect(iLink).toBeLessThan(iSource);
    expect(html).toContain('CCNM Art. 145');
  });

  it('buildLegalTooltipContent — échappe la source', () => {
    const html = buildLegalTooltipContent(cfg, 'T', 'D', { sourceArticle: '<script>' });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('buildAccordSummaryTooltip — accord Kuhn enregistré', () => {
    const doc = getAgreement('kuhn');
    expect(doc).toBeTruthy();
    const html = buildAccordSummaryTooltip(
      cfg,
      doc!,
      { travailEquipe: true },
      { nationalPrimeOverrides: { primeEquipe: 0.86 } },
    );
    expect(html).toMatch(/Kuhn/i);
    expect(html).toMatch(/vacances|équipe/i);
    expect(html).toMatch(/0,86.*€\/h/i);
    expect(html).toMatch(/151,67.*h\/mois/i);
  });

  it('buildAccordSummaryTooltip — une seule ligne vide entre puces (pas de <br><br> entre puces)', () => {
    const doc = getAgreement('kuhn');
    expect(doc).toBeTruthy();
    const html = buildAccordSummaryTooltip(
      cfg,
      doc!,
      { travailEquipe: true },
      { nationalPrimeOverrides: { primeEquipe: 0.86 } },
    );
    expect(html).not.toMatch(/<br><br>•/);
    expect(html).toMatch(/équipe.*<br>• Majoration/i);
  });

  it('buildPrimeConditionTooltip — majoration horaire', () => {
    const html = buildPrimeConditionTooltip(
      cfg,
      'CCNM',
      {
        valueType: 'majorationHoraire',
        valeurAccord: 0.15,
        tooltip: 'Base SMH.',
        sourceArticle: 'CCNM',
      },
      {},
    );
    expect(html).toContain('+15%');
  });

  it('formatAccordEntrepriseSourceArticle', () => {
    const doc = getAgreement('kuhn');
    expect(formatAccordEntrepriseSourceArticle(cfg, doc!)).toBe("Accord d'entreprise Kuhn");
  });

  it('buildPrimeConditionTooltip — prime accord : titre modalité + source accord (comme CCNM)', () => {
    const doc = getAgreement('kuhn');
    expect(doc).toBeTruthy();
    const html = buildPrimeConditionTooltip(
      cfg,
      'CCNM',
      {
        id: 'primeEquipe',
        label: "Prime d'équipe",
        valueType: 'horaire',
        valeurAccord: 0.86,
        unit: '€/h',
        tooltip: 'Conditions équipe.',
        sourceArticle: 'Accord Kuhn Art. 2.2',
        conditionTexte: 'Base 151,67 h.',
      },
      { isAccordPrime: true, agreement: doc! },
    );
    expect(html).toContain('Prime d&#39;équipe');
    expect(html).toContain('tooltip-source');
    expect(html).toContain('Accord d&#39;entreprise Kuhn');
    expect(html).toContain('0,86');
    expect(html).not.toMatch(/<strong>Accord d&#39;entreprise Kuhn/);
  });

  it('buildResultTooltipContent — ligne par défaut', () => {
    const html = buildResultTooltipContent(cfg, 'CCNM', { label: 'L', value: 1200 }, 'CCNM');
    expect(html).toContain('L');
    expect(html).toContain('1 200,00 €');
  });

  it('buildResultTooltipContent — tooltipOrigin prime sur la classification CCNM', () => {
    const html = buildResultTooltipContent(
      cfg,
      'CCNM',
      {
        tooltipOrigin: "Accord d'entreprise Kuhn",
        sourceArticle: 'CCNM art. 140 (sujétion — hors assiette SMH)',
        tooltipDetail: 'Détail.',
      },
      'CCNM',
    );
    expect(html).toContain('Accord d&#39;entreprise Kuhn');
    expect(html).toContain('CCNM art. 140');
    expect(html).not.toContain('Convention collective nationale de la métallurgie (CCNM)');
  });
});
