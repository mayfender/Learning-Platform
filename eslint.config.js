import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'dev-dist', 'public'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
      // ProgressStore เป็น interface แบบ async เสมอ (เผื่อ adapter ในอนาคตต้องรอจริง) แม้
      // MemoryStore จะไม่มี await ก็ตาม จึงปิดกฎนี้แทนการใส่ await ปลอม
      '@typescript-eslint/require-await': 'off',
      // ฟีเจอร์ purity/compiler ของปลั๊กอินนี้ (v7+) ตรวจกฎของ React Compiler ซึ่งโปรเจกต์นี้ไม่ได้ใช้
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(@/|(\\.\\./)+)(app|store|engine|content|manipulatives)(/|$)',
              message: 'src/ui ห้าม import app, store, engine, content, manipulatives',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/manipulatives/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(@/|(\\.\\./)+)(app|store|engine|content)(/|$)',
              message: 'src/manipulatives ห้าม import app, store, engine, content',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^react',
              message: 'src/engine ห้าม import react',
              allowTypeImports: false,
            },
            {
              regex: '^(@/|(\\.\\./)+)(app|ui|manipulatives|store)(/|$)',
              message: 'src/engine ห้าม import app, ui, manipulatives, store',
              allowTypeImports: true,
            },
            {
              regex: '^(@/|(\\.\\./)+)content(/|$)',
              message: 'src/engine import content ได้เฉพาะ type',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/store/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^react',
              message: 'src/store ห้าม import react',
              allowTypeImports: false,
            },
            {
              regex: '^(@/|(\\.\\./)+)(app|ui|manipulatives|content)(/|$)',
              message: 'src/store ห้าม import app, ui, manipulatives, content',
              allowTypeImports: true,
            },
            {
              regex: '^(@/|(\\.\\./)+)engine(/|$)',
              message: 'src/store import engine ได้เฉพาะ type',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/content/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^react',
              message: 'src/content ห้าม import react',
              allowTypeImports: false,
            },
            {
              regex: '^(@/|(\\.\\./)+)(app|ui|manipulatives|store)(/|$)',
              message: 'src/content ห้าม import app, ui, manipulatives, store',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/test/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/test/**', '@/test/**'],
              message: 'โค้ด production ห้าม import src/test',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
