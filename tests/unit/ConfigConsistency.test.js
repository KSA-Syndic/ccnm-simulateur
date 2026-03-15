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
