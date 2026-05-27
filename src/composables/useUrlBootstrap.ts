import { useAgreementStore } from '@/stores/agreement';

/** À appeler une fois au démarrage (après `app.use(pinia)`). */
export function useUrlBootstrap(): void {
  useAgreementStore().bootstrapFromUrl();
}
