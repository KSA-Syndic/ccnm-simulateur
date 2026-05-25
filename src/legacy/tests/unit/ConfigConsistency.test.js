/**
 * Vérifie que config.js (bundle navigateur) et core/config.js (module ES) restent alignés.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { CONFIG as MODULE_CONFIG } from '../../core/config.js';

const testDir = dirname(fileURLToPath(import.meta.url));
const legacyConfigPath = resolve(testDir, '../../config.js');

function loadLegacyConfigFromScript() {
  const source = readFileSync(legacyConfigPath, 'utf8');
  const context = {
    window: {},
    module: { exports: {} },
    console: { log: () => {}, warn: () => {}, error: () => {} },
  };
  vm.runInNewContext(source, context, { filename: 'config.js' });
  return context.window.CONFIG || context.module.exports?.CONFIG || context.module.exports;
}

describe('Config consistency (legacy/runtime vs module)', () => {
  it('garde les textes UI de tooltips synchronisés', () => {
    const legacy = loadLegacyConfigFromScript();
    expect(legacy?.TOOLTIP_TEXTS).toEqual(MODULE_CONFIG.TOOLTIP_TEXTS);
  });

  it('garde les modalités nationales synchronisées', () => {
    const legacy = loadLegacyConfigFromScript();
    expect(legacy?.INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR).toEqual(
      MODULE_CONFIG.INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR,
    );
  });

  it('garde config.js (legacy racine bundle) et core/config.js synchronisés', () => {
    const legacyConfig = loadLegacyConfigFromScript();
    expect(legacyConfig).toBeTruthy();
    expect(MODULE_CONFIG).toBeTruthy();
    expect(MODULE_CONFIG).toEqual(legacyConfig);
  });
});
