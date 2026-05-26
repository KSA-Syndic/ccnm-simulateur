import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'tests/', '*.js', 'accords/*.js', 'src/**/*.js'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../../accords/*'], message: 'Domain must not import accords directly.' },
        ],
      }],
    },
  },
  ...pluginVue.configs['flat/recommended'].map(config => ({
    ...config,
    files: ['src/**/*.vue'],
    languageOptions: {
      ...config.languageOptions,
      parser: vueParser,
      parserOptions: {
        parser: tsparser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  })),
];
