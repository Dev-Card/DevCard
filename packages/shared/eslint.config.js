import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {},
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
