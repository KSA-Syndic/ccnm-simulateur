import { describe, expect, it } from 'vitest';
import {
  buildGmailComposeUrl,
  buildMailtoHref,
  buildOutlookComposeUrl,
} from '@/domain/pdf/syndicatMail';

describe('syndicatMail', () => {
  it('buildMailtoHref encode sujet et corps', () => {
    const href = buildMailtoHref('a@b.com', 'Objet test', 'Ligne1\nLigne2');
    expect(href).toContain('mailto:a%40b.com');
    expect(href).toContain('subject=');
    expect(href).toContain('body=');
  });

  it('buildGmailComposeUrl reprend les paramètres su et body', () => {
    const u = buildGmailComposeUrl('x@y.fr', 'S', 'B');
    expect(u).toContain('mail.google.com');
    expect(u).toContain('su=S');
    expect(u).toContain('body=B');
    expect(u).toContain('to=x%40y.fr');
  });

  it('buildOutlookComposeUrl utilise subject et body', () => {
    const u = buildOutlookComposeUrl('x@y.fr', 'S', 'B');
    expect(u).toContain('outlook.live.com');
    expect(u).toContain('subject=S');
    expect(u).toContain('body=B');
  });
});
