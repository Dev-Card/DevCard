import tseslint from 'typescript-eslint';
import pluginN from 'eslint-plugin-n';
import pluginImportX from 'eslint-plugin-import-x';
import pluginPromise from 'eslint-plugin-promise';
import pluginSecurity from 'eslint-plugin-security';
import pluginUnicorn from 'eslint-plugin-unicorn';

export default tseslint.config(

  // ─── Global Ignores ──────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      'prisma/migrations/**',
      '**/*.d.ts',
    ],
  },

  // ─── Base: ESLint Recommended + TypeScript ──────────────────────────────────
  ...tseslint.configs.recommendedTypeChecked,

  // ─── Main Config ────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],

    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      n: pluginN,
      'import-x': pluginImportX,
      promise: pluginPromise,
      security: pluginSecurity,
      unicorn: pluginUnicorn,
    },

    settings: {
      'import-x/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
      node: { version: '>=18.0.0' },
    },

    rules: {

      // ── TypeScript: Type Safety ─────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',

      // ── TypeScript: Async / Promises ────────────────────────────────────────
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/return-await': 'off',

      // ── TypeScript: Imports ─────────────────────────────────────────────────
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // ── TypeScript: Code Quality ────────────────────────────────────────────
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],

      // ── Node.js ─────────────────────────────────────────────────────────────
      'n/no-deprecated-api': 'error',
      'n/no-extraneous-import': 'error',
      'n/no-process-exit': 'off',
      'n/prefer-global/buffer': ['error', 'always'],
      'n/prefer-global/process': ['error', 'always'],
      'n/prefer-promises/fs': 'error',
      'n/prefer-promises/dns': 'error',
      'n/no-sync': 'warn',

      // ── Imports (import-x) ──────────────────────────────────────────────────
      'import-x/no-duplicates': 'error',
      'import-x/no-cycle': 'off',
      'import-x/no-self-import': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // ── Promises ────────────────────────────────────────────────────────────
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
      'promise/no-new-statics': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/no-promise-in-callback': 'warn',

      // ── Security ────────────────────────────────────────────────────────────
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-possible-timing-attacks': 'warn',

      // ── Unicorn ─────────────────────────────────────────────────────────────
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-process-exit': 'off',
      'unicorn/error-message': 'off',
      'unicorn/throw-new-error': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/prefer-string-slice': 'warn',
      'unicorn/no-for-loop': 'off',
      'unicorn/prefer-includes': 'warn',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/prevent-abbreviations': 'off',

      // ── Core ESLint ─────────────────────────────────────────────────────────
      'no-console': 'warn',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-throw-literal': 'error',
      'curly': ['error', 'all'],
      'object-shorthand': 'error',
      'no-lonely-if': 'warn',
      'no-nested-ternary': 'off',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['acc', 'request', 'reply'],
        },
      ],
    },
  },

  // ─── Test File Overrides ────────────────────────────────────────────────────
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'src/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'security/detect-object-injection': 'off',
      'no-console': 'off',
    },
  },

  // ─── Prisma Seed / Scripts Override ────────────────────────────────────────
  {
    files: ['prisma/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'n/no-process-exit': 'off',
      'unicorn/no-process-exit': 'off',
      'no-console': 'off',
    },
  },
);