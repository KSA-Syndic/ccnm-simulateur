import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LegalCarousel from '@/features/legal-guide/LegalCarousel.vue';

describe('LegalCarousel', () => {
  it('ne boucle pas : page 1 sans précédent, dernière page sans suivant', async () => {
    const w = mount(LegalCarousel, { attachTo: document.body });
    const prev = w.find('#legal-carousel-prev');
    const next = w.find('#legal-carousel-next');
    const total = Number(w.find('#legal-carousel-total').text());

    expect(prev.attributes('disabled')).toBeDefined();
    expect(next.attributes('disabled')).toBeUndefined();

    for (let i = 1; i < total; i++) {
      await next.trigger('click');
    }
    expect(Number(w.find('#legal-carousel-current').text())).toBe(total);
    expect(next.attributes('disabled')).toBeDefined();
    expect(prev.attributes('disabled')).toBeUndefined();

    await next.trigger('click');
    expect(Number(w.find('#legal-carousel-current').text())).toBe(total);

    for (let i = 1; i < total; i++) {
      await prev.trigger('click');
    }
    expect(Number(w.find('#legal-carousel-current').text())).toBe(1);
    expect(prev.attributes('disabled')).toBeDefined();

    await prev.trigger('click');
    expect(Number(w.find('#legal-carousel-current').text())).toBe(1);

    w.unmount();
  });
});
