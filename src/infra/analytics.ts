import { CONFIG } from '@/domain/config';

const UMAMI_STORAGE_KEY = 'analytics_consent';

/** Envoi unique de l’événement « résultat salaire » par session (analytics). */
let resultatSalaireSent = false;

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

function umamiConfigured(): boolean {
  return Boolean(CONFIG.UMAMI_WEBSITE_ID?.trim() && CONFIG.UMAMI_SCRIPT_URL?.trim());
}

interface UmamiTracker {
  track: (name: string, data?: Record<string, string | number>) => void;
}

export function trackEvent(eventName: string, data?: Record<string, string | number>): void {
  if (isLocalEnv() || !getAnalyticsConsent() || !umamiConfigured()) return;

  try {
    const umami = (window as unknown as Record<string, unknown>).umami as UmamiTracker | undefined;
    umami?.track(eventName, data);
  } catch {
    /* silently fail */
  }
}

/** Charge Umami Cloud si la configuration et le consentement le permettent. */
export function setupUmamiAnalytics(): void {
  if (isLocalEnv() || !getAnalyticsConsent() || !umamiConfigured()) return;
  if (typeof document === 'undefined') return;

  const websiteId = CONFIG.UMAMI_WEBSITE_ID.trim();
  const src = CONFIG.UMAMI_SCRIPT_URL.trim();

  const existing = document.querySelector(`script[data-website-id="${websiteId}"]`);
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = src;
  script.setAttribute('data-website-id', websiteId);
  document.head.appendChild(script);
}

/** Réinitialise les drapeaux « une fois par session » (ex. Recommencer). */
export function resetAnalyticsSession(): void {
  resultatSalaireSent = false;
}

/** Étape 3 — premier affichage du résultat de rémunération. */
export function trackResultatSalaireOnce(): void {
  if (resultatSalaireSent) return;
  resultatSalaireSent = true;
  trackEvent('Resultat salaire');
}

export interface PdfArrieresAnalyticsPayload {
  totalArretees: number;
  dateDebut: string;
  dateFin: string;
  groupe: string;
  classe: string | number;
  nbMois: number;
  accord: string;
}

/** Export PDF arriérés réussi (métadonnées anonymes, pas de salaires). */
export function trackPdfArrieres(data: PdfArrieresAnalyticsPayload): void {
  trackEvent('PDF arrieres', { ...data });
}

export function buildPdfArrieresAnalyticsPayload(
  periodes: ReadonlyArray<{ periodKey?: string; salaireVerse?: number | undefined }>,
  opts: {
    totalArretees: number;
    groupe: string;
    classe: number;
    nbMois: number;
    accordNomCourt: string | null;
  },
): PdfArrieresAnalyticsPayload {
  const periodKeys = periodes
    .filter((p) => p.salaireVerse !== undefined && p.periodKey)
    .map((p) => p.periodKey as string)
    .sort();
  const iso = (key: string) => (/^\d{4}-\d{2}$/.test(key) ? `${key}-01` : key);
  return {
    totalArretees: opts.totalArretees,
    dateDebut: periodKeys[0] ? iso(periodKeys[0]) : '',
    dateFin: periodKeys.length ? iso(periodKeys[periodKeys.length - 1]!) : '',
    groupe: opts.groupe,
    classe: opts.classe,
    nbMois: opts.nbMois,
    accord: opts.accordNomCourt ? opts.accordNomCourt : 'non',
  };
}
