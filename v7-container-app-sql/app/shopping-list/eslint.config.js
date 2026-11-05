import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    // The Node web server (app.js, server.js, telemetry.js) and its tests.
    files: ['*.js', 'server-tests/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui components export their variant helpers (buttonVariants, badgeVariants)
    // and the theme provider exports its hook next to the component - the upstream
    // pattern. The rule only affects dev-time fast refresh, so it's off for these files
    // rather than restructuring generated code.
    files: ['src/components/ui/**/*.tsx', 'src/providers/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
