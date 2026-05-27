export type AppToastType = 'success' | 'warning' | 'info' | 'error';

/** Émet l’événement global consommé par `<AppToast />` (monté dans `App.vue`). */
export function dispatchAppToast(
  message: string,
  type: AppToastType = 'info',
  duration = 4000,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('app:toast', {
      detail: { message, type, duration },
    }),
  );
}
