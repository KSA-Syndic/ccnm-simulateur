import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SimulatorFooter from '@/components/SimulatorFooter.vue';
import { CONVENTION_METALLURGIE_URL, EDITEUR, SIMULATOR_SHELL } from '@/domain/ui/labels';

describe('SimulatorFooter', () => {
  it('affiche les textes shell et le lien UIMM', () => {
    const w = mount(SimulatorFooter, {
      global: { stubs: { PrivacyModal: { template: '<div class="privacy-stub" />' } } },
      attachTo: document.body,
    });

    expect(w.text()).toContain(SIMULATOR_SHELL.footerMainLine);
    expect(w.text()).toContain(SIMULATOR_SHELL.footerDisclaimer);
    const uimm = w.find(`a[href="${CONVENTION_METALLURGIE_URL}"]`);
    expect(uimm.exists()).toBe(true);
    expect(uimm.text()).toBe(SIMULATOR_SHELL.footerConventionTextsLinkLabel);
    w.unmount();
  });

  it('affiche le lien CFDT et le bouton vie privée', () => {
    const w = mount(SimulatorFooter, {
      global: { stubs: { PrivacyModal: { template: '<div />' } } },
    });

    const cfdt = w.find(`a[href="${EDITEUR.url}"]`);
    expect(cfdt.text()).toBe(EDITEUR.nom);
    expect(w.find('button.footer-privacy-btn').text()).toBe(SIMULATOR_SHELL.privacyLinkLabel);
    w.unmount();
  });
});
