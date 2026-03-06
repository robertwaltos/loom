import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The Ten Commandments enforcement
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',

      // Max nesting depth (Commandment 3)
      'max-depth': ['error', 3],

      // Max function length (Commandment 2)
      'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],

      // No console.log (Commandment 7 — use structured logging)
      'no-console': 'error',

      // Consistent returns
      'consistent-return': 'error',

      // No unused vars (strict)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      '**/dist/',
      'fabrics/bridge-loom-ue5/',
      '**/*.js',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
      'vitest.config.ts',
      'eslint.config.js',
    ],
  },
);
