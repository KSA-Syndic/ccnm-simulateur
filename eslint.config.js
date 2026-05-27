import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'tests/', '*.js', 'accords/*.js', 'src/**/*.js', 'legacy-archive/**'],
  },
  {
    files: ['src/domain/**/*.ts'],
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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'vue', message: 'Le domaine ne doit pas importer Vue.' },
            { name: 'vue-router', message: 'Le domaine ne doit pas importer vue-router.' },
            { name: 'pinia', message: 'Le domaine ne doit pas importer Pinia.' },
          ],
          patterns: [
            { group: ['@/components/*', '@/features/*', '@/stores/*'], message: 'Le domaine ne doit pas importer la couche UI.' },
            { group: ['@legacy/*', '**/legacy-archive/**'], message: 'Le domaine ne doit pas importer le code legacy (oracle).' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/domain/**'],
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
