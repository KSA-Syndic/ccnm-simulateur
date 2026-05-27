import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

/** Pinia + persistedstate, session vide (évite reprise d’état entre tests). */
export function createFreshPinia() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);
  return pinia;
}
