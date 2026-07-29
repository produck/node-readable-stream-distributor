import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import * as ProduckRule from '@produck/eslint-rules';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
  ProduckRule.config.ecma,
  ProduckRule.config.json,
  ProduckRule.config.markdown,
  ProduckRule.excludeGitIgnore(import.meta.url),
]);
