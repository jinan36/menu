import studio from '@sanity/eslint-config-studio'

export default [
  {ignores: ['dist/**', 'coverage/**', '.sanity/**']},
  ...studio,
  {
    files: ['setInitialStatus.js', 'tests/**/*.mjs'],
    languageOptions: {
      globals: {process: 'readonly', console: 'readonly', URL: 'readonly'},
    },
  },
]
