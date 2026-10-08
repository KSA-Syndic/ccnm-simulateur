/** Configuration globale Vitest. */
import { afterEach } from 'vitest';

afterEach(() => {
  document.body.innerHTML = '';
});

// Génération Word / PDF : jsdom ne fournit pas les URL de blob.
URL.createObjectURL ??= () => 'blob:mock-url';
URL.revokeObjectURL ??= () => {};
