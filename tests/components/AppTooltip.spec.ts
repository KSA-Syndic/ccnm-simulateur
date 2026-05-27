import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AppTooltip from '../../src/components/ui/AppTooltip.vue';
import { A11Y_LABELS } from '../../src/domain/ui/labels';

function getPopper(): HTMLElement | null {
  return document.body.querySelector('.app-tooltip-popper[role="tooltip"]');
}

describe('AppTooltip', () => {
  it('expose un nom accessible par défaut sur le déclencheur (role=button)', () => {
    const w = mount(AppTooltip, { props: { content: 'X' }, attachTo: document.body });
    expect(w.find('.app-tooltip-trigger').attributes('aria-label')).toBe(
      A11Y_LABELS.tooltipTriggerDefault,
    );
    w.unmount();
  });

  it('accepte un aria-label personnalisé sur le déclencheur', () => {
    const w = mount(AppTooltip, {
      props: { content: 'X', triggerAriaLabel: 'Informations test' },
      attachTo: document.body,
    });
    expect(w.find('.app-tooltip-trigger').attributes('aria-label')).toBe('Informations test');
    w.unmount();
  });

  it('affiche le contenu au survol (Teleport body)', async () => {
    const w = mount(AppTooltip, {
      props: { content: 'Texte d’aide' },
      attachTo: document.body,
    });
    await w.find('.app-tooltip-trigger').trigger('mouseenter');
    await w.vm.$nextTick();
    const popper = getPopper();
    expect(popper).toBeTruthy();
    expect(popper?.textContent).toContain('Texte d’aide');
    w.unmount();
  });

  it('injecte legalBlockHtml pour TooltipContent structuré', async () => {
    const w = mount(AppTooltip, {
      props: {
        content: {
          summary: 'Résumé',
          legalBlockHtml: '<strong>Bloc</strong> légal',
        },
      },
      attachTo: document.body,
    });
    await w.find('.app-tooltip-trigger').trigger('mouseenter');
    await w.vm.$nextTick();
    const popper = getPopper();
    expect(popper?.innerHTML).toContain('tooltip-summary');
    expect(popper?.innerHTML).toContain('tooltip-legal-fragment');
    expect(popper?.innerHTML).toContain('<strong>Bloc</strong> légal');
    w.unmount();
  });

  it('survol du popper : délai avant fermeture après mouseleave trigger', async () => {
    vi.useFakeTimers();
    try {
      const w = mount(AppTooltip, {
        props: { content: 'Aide persistante', hideDelayMs: 100 },
        attachTo: document.body,
      });
      await w.find('.app-tooltip-trigger').trigger('mouseenter');
      await flushPromises();
      const popper = getPopper();
      expect(popper).toBeTruthy();

      await w.find('.app-tooltip-trigger').trigger('mouseleave');
      vi.advanceTimersByTime(40);
      await flushPromises();
      expect(popper?.textContent).toContain('Aide persistante');

      popper!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      vi.advanceTimersByTime(200);
      await flushPromises();
      expect(popper?.textContent).toContain('Aide persistante');

      popper!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      vi.advanceTimersByTime(150);
      await flushPromises();
      expect(window.getComputedStyle(popper!).display).toBe('none');

      w.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
