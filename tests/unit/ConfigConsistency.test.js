import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { CONFIG as MODULE_CONFIG } from '../../src/core/config.js';

const testDir = dirname(fileURLToPath(import.meta.url));

function loadLegacyConfig() {
    const legacyConfigPath = resolve(testDir, '../../config.js');
    const code = readFileSync(legacyConfigPath, 'utf8');
    const sandbox = {
        window: {},
        module: { exports: {} },
        console
    };
    vm.runInNewContext(code, sandbox, { filename: 'config.js' });
    return sandbox.window.CONFIG || sandbox.module.exports;
}

describe('Config consistency (legacy/runtime vs module)', () => {
    it('garde les textes UI de tooltips synchronisés', () => {
        const legacy = loadLegacyConfig();
        expect(legacy?.TOOLTIP_TEXTS).toEqual(MODULE_CONFIG.TOOLTIP_TEXTS);
    });

    it('garde les modalités nationales synchronisées', () => {
        const legacy = loadLegacyConfig();
        expect(legacy?.MODALITES_NATIONALES).toEqual(MODULE_CONFIG.MODALITES_NATIONALES);
    });
});
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, it, expect } from 'vitest';
import { CONFIG as moduleConfig } from '../../src/core/config.js';

function loadLegacyConfigFromScript() {
    const configPath = path.join(process.cwd(), 'config.js');
    const source = fs.readFileSync(configPath, 'utf8');
    const context = {
        window: {},
        console: { log: () => {}, warn: () => {}, error: () => {} }
    };
    vm.runInNewContext(source, context, { filename: 'config.js' });
    return context.window.CONFIG;
}

describe('Configuration consistency', () => {
    it('garde config.js et src/core/config.js synchronisés', () => {
        const legacyConfig = loadLegacyConfigFromScript();
        expect(legacyConfig).toBeTruthy();
        expect(moduleConfig).toBeTruthy();
        expect(moduleConfig).toEqual(legacyConfig);
    });
});
