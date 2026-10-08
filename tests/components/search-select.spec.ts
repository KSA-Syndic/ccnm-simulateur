import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SearchSelect from '../../src/components/ui/SearchSelect.vue';

const options = [
  { value: 'bas-rhin', label: 'Bas-Rhin', detail: 'Bas-Rhin (67)', meta: '5,95 €', keywords: '67' },
  {
    value: 'ile-de-france',
    label: 'Île-de-France',
    detail: 'Paris (75)',
    meta: '5,29 €',
    keywords: '75',
  },
  { value: 'rhone', label: 'Rhône', detail: 'Rhône (69)', meta: '5,10 €', keywords: '69' },
];

function mountSelect(modelValue: string | null = 'bas-rhin') {
  return mount(SearchSelect, {
    props: { id: 'zone', modelValue, options },
    attachTo: document.body,
  });
}

describe('SearchSelect', () => {
  it('affiche la sélection et sa valeur fermée', () => {
    const w = mountSelect();
    expect((w.find('input').element as HTMLInputElement).value).toBe('Bas-Rhin');
    expect(w.find('.search-select__current-meta').text()).toBe('5,95 €');
    w.unmount();
  });

  it('filtre sans accents ni casse, et par numéro de département', async () => {
    const w = mountSelect();
    const input = w.find('input');
    await input.trigger('focus');
    await input.setValue('ile');
    expect(w.findAll('[role="option"]').map((o) => o.find('.search-select__label').text())).toEqual(
      ['Île-de-France'],
    );
    await input.setValue('69');
    expect(w.findAll('[role="option"]')).toHaveLength(1);
    await input.setValue('zzz');
    expect(w.find('.search-select__empty').exists()).toBe(true);
    w.unmount();
  });

  it('clavier : flèches puis Entrée émettent la valeur', async () => {
    const w = mountSelect();
    const input = w.find('input');
    await input.trigger('focus');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'Enter' });
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['ile-de-france']);
    expect(input.attributes('aria-expanded')).toBe('false');
    w.unmount();
  });
});
