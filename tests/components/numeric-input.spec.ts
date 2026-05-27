import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import NumericInput from '@/components/ui/NumericInput.vue';

describe('NumericInput', () => {
  it('émet une valeur décimale arrondie au blur (virgule FR)', async () => {
    const w = mount(NumericInput, {
      props: { modelValue: 5.9, mode: 'decimal', min: 0, max: 20 },
      attachTo: document.body,
    });
    const input = w.find('input');
    await input.setValue('6,25');
    await input.trigger('blur');
    const last = w.emitted('update:modelValue')?.at(-1)?.[0];
    expect(last).toBeCloseTo(6.25, 5);
    w.unmount();
  });

  it('émet blockedByMin lorsque la flèche bas tente de passer sous min', async () => {
    const w = mount(NumericInput, {
      props: { modelValue: 5, mode: 'integer', min: 5, max: 50 },
      attachTo: document.body,
    });
    const input = w.find('input');
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(w.emitted('blockedByMin')).toBeTruthy();
    expect(w.emitted('blockedByMin')).toHaveLength(1);
    w.unmount();
  });

  it('émet blockedByMax lorsque la flèche haut tente de passer au-dessus de max', async () => {
    const w = mount(NumericInput, {
      props: { modelValue: 50, mode: 'integer', min: 0, max: 50 },
      attachTo: document.body,
    });
    const input = w.find('input');
    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(w.emitted('blockedByMax')).toBeTruthy();
    expect(w.emitted('blockedByMax')).toHaveLength(1);
    w.unmount();
  });

  it('affiche le placeholder quand la valeur modèle est 0', () => {
    const w = mount(NumericInput, {
      props: { modelValue: 0, mode: 'decimal', placeholder: 'SMH par défaut' },
    });
    expect(w.find('input').attributes('placeholder')).toBe('SMH par défaut');
    expect((w.find('input').element as HTMLInputElement).value).toBe('');
    w.unmount();
  });

  it('flèches : incrémente un décimal avec step explicite', async () => {
    const w = mount(NumericInput, {
      props: { modelValue: 0.25, mode: 'decimal', step: 0.01, min: 0 },
      attachTo: document.body,
    });
    const input = w.find('input');
    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toBeCloseTo(0.26, 5);
    w.unmount();
  });

  it('respecte maxLength en saisie', async () => {
    const w = mount(NumericInput, {
      props: { modelValue: 30, mode: 'integer', min: 18, max: 66, maxLength: 2 },
      attachTo: document.body,
    });
    const input = w.find('input');
    await input.setValue('999');
    await input.trigger('blur');
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toBe(66);
    w.unmount();
  });

  it('mode entier : ne force pas le min pendant la frappe (âge 28)', async () => {
    const w = mount(NumericInput, {
      props: { modelValue: 30, mode: 'integer', min: 18, max: 66, maxLength: 2 },
      attachTo: document.body,
    });
    const input = w.find('input');
    await input.setValue('2');
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toBe(2);
    expect((input.element as HTMLInputElement).value).toBe('2');
    await input.setValue('28');
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toBe(28);
    await input.trigger('blur');
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toBe(28);
    w.unmount();
  });

  it('mode entier : émet un entier tronqué', async () => {
    const w = mount(NumericInput, {
      props: { modelValue: 0, mode: 'integer', min: 0, max: 50 },
      attachTo: document.body,
    });
    const input = w.find('input');
    await input.setValue('12');
    await input.trigger('blur');
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toBe(12);
    w.unmount();
  });
});
