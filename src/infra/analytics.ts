const UMAMI_STORAGE_KEY = 'analytics_consent';

export function isLocalEnv(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  );
}

export function getAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(UMAMI_STORAGE_KEY) !== 'off';
  } catch {
    return false;
  }
}

export function setAnalyticsConsentOff(): void {
  try {
    localStorage.setItem(UMAMI_STORAGE_KEY, 'off');
  } catch {
    /* storage not available */
  }
}

/** Réactive la mesure d’audience (comportement par défaut si la clé est absente). */
export function setAnalyticsConsentOn(): void {
  try {
    localStorage.removeItem(UMAMI_STORAGE_KEY);
  } catch {
    /* storage not available */
  }
}

interface UmamiTracker {
  track: (name: string, data?: Record<string, string | number>) => void;
}

export function trackEvent(eventName: string, data?: Record<string, string | number>): void {
  if (isLocalEnv() || !getAnalyticsConsent()) return;

  try {
    const umami = (window as unknown as Record<string, unknown>).umami as UmamiTracker | undefined;
    umami?.track(eventName, data);
  } catch {
    /* silently fail */
  }
}

export function initAnalytics(websiteId: string, src: string): void {
  if (isLocalEnv() || !getAnalyticsConsent()) return;
  if (typeof document === 'undefined') return;

  const existing = document.querySelector('script[data-website-id]');
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.dataset['websiteId'] = websiteId;
  script.src = src;
  document.head.appendChild(script);
}
