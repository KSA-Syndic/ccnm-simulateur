/**
 * Liens de composition webmail (pas de PJ possible par URL — voir notice UI).
 * Aligné sur `buildGmailComposeUrl` legacy (`legacy-archive/app.js`).
 */
export function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  if (to) params.set('to', to);
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  const q = params.toString();
  return `https://mail.google.com/mail/?view=cm&fs=1${q ? `&${q}` : ''}`;
}

/** Outlook sur le web (compte personnel / outlook.live.com). */
export function buildOutlookComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  if (to) params.set('to', to);
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const q = params.toString();
  return `https://outlook.live.com/mail/0/deeplink/compose${q ? `?${q}` : ''}`;
}

export function buildMailtoHref(to: string, subject: string, body: string): string {
  const encSubject = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body);
  const addr = encodeURIComponent(to.trim());
  return `mailto:${addr}?subject=${encSubject}&body=${encBody}`;
}
