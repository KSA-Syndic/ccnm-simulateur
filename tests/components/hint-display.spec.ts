import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HintDisplay from '@/features/results/HintDisplay.vue';

describe('HintDisplay', () => {
  it('n’affiche rien si hint vide', () => {
    const w = mount(HintDisplay, { props: { hint: '' } });
    expect(w.find('.hint-display').exists()).toBe(false);
    w.unmount();
  });

  it('affiche les blocs book-hint', () => {
    const w = mount(HintDisplay, {
      props: {
        blocks: [{ type: 'info', html: '<strong>X</strong>' }],
      },
    });
    expect(w.find('.book-hint.info').exists()).toBe(true);
    expect(w.html()).toContain('<strong>X</strong>');
    w.unmount();
  });
});
