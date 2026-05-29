/**
 * Liens de composition webmail (pas de PJ possible par URL — voir notice UI).
 * Construction d’URL mailto / webmail pour le syndicat (sujet et corps encodés).
 *
 * Gmail : format `mail/u/0/?tf=cm` (recommandé par Google ; `view=cm` seul est peu fiable sur mobile).
 * Outlook : `mail/deeplink/compose` sans segment `/0/` (aligné sur la doc OWA actuelle).
 */
export function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  if (to) params.set('to', to);
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  const q = params.toString();
  return `https://mail.google.com/mail/u/0/?${q ? `${q}&` : ''}tf=cm`;
}

/** Outlook sur le web (compte personnel / outlook.live.com). */
export function buildOutlookComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  if (to) params.set('to', to);
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const q = params.toString();
  return `https://outlook.live.com/mail/deeplink/compose${q ? `?${q}` : ''}`;
}

export function buildMailtoHref(to: string, subject: string, body: string): string {
  const encSubject = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body);
  const addr = encodeURIComponent(to.trim());
  return `mailto:${addr}?subject=${encSubject}&body=${encBody}`;
}
