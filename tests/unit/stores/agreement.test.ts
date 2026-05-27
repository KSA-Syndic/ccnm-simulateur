import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/accords/index';
import { useAgreementStore } from '@/stores/agreement';
import { createFreshPinia } from './createFreshPinia';

function stubLocation(search: string, hash = '') {
  vi.stubGlobal('location', {
    search,
    hash,
    ancestorOrigins: [] as unknown as DOMStringList,
    href: `http://localhost/${search}${hash}`,
    origin: 'http://localhost',
    protocol: 'http:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
  } as Location);
}

describe('useAgreementStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('bootstrapFromUrl active un accord enregistré (?accord=kuhn)', () => {
    stubLocation('?accord=kuhn');
    const pinia = createFreshPinia();
    const a = useAgreementStore(pinia);
    a.bootstrapFromUrl();
    expect(a.activeAccordId).toBe('kuhn');
    expect(a.accordActif).toBe(true);
  });

  it('bootstrapFromUrl lit accord dans la query du hash', () => {
    stubLocation('', '#/step?accord=kuhn');
    const pinia = createFreshPinia();
    const a = useAgreementStore(pinia);
    a.bootstrapFromUrl();
    expect(a.activeAccordId).toBe('kuhn');
  });

  it('bootstrapFromUrl ignore un id inconnu', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubLocation('?accord=inconnu-xyz');
    const pinia = createFreshPinia();
    const a = useAgreementStore(pinia);
    a.$patch({ activeAccordId: null, accordActif: false });
    a.bootstrapFromUrl();
    expect(a.activeAccordId).toBe(null);
    expect(a.accordActif).toBe(false);
    warn.mockRestore();
  });

  it('bootstrapFromUrl ne fait rien sans param accord', () => {
    stubLocation('');
    const pinia = createFreshPinia();
    const a = useAgreementStore(pinia);
    a.$patch({ activeAccordId: 'kuhn', accordActif: true });
    a.bootstrapFromUrl();
    expect(a.activeAccordId).toBe('kuhn');
    expect(a.accordActif).toBe(true);
  });
});
