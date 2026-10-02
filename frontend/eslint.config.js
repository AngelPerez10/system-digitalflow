import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Módulo de clientes: fuera de su carpeta solo se usa su API pública
    // (`@/components/clientes` o `@/components/clientes/domain`).
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/components/clientes/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/components/clientes/(?!domain$).+',
              message: 'Importa desde "@/components/clientes" (o "@/components/clientes/domain"); lo demás es interno del módulo.',
            },
          ],
        },
      ],
    },
  },
)
