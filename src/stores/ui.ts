import { defineStore, getActivePinia } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    nbMois: 12 as 12 | 13,
    isDirty: false,
  }),
  actions: {
    markDirty() {
      this.isDirty = true;
    },
    resetAll() {
      const pinia = getActivePinia();
      if (pinia) {
        for (const [, store] of Object.entries(pinia.state.value)) {
          const s = store as { $reset?: () => void };
          if (typeof s.$reset === 'function') s.$reset();
        }
      }
      sessionStorage.clear();
    },
  },
  persist: {
    storage: sessionStorage,
  },
});
