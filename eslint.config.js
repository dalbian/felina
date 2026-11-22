// Configuración de ESLint. Nació de un fallo real: la vista de semana usaba
// una variable (`note`) que nunca se declaró. Ni `npm run build` ni los tests
// lo detectaron — Vite no analiza variables no declaradas y los tests solo
// cubren la lógica pura de src/lib — así que llegó a producción y dejaba la
// pantalla en blanco. `no-undef` es, por tanto, la regla que justifica todo
// este fichero; el resto son extras baratos.
//
// Filosofía: pocas reglas y todas ACCIONABLES. Esto lo mantiene una sola
// persona; un lint que grita por estilo se acaba ignorando, y entonces no
// sirve para lo que importa. El formato no se toca.

import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.claude/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      // ── Lo que de verdad rompe la aplicación ───────────────────────────
      // Variables o componentes no declarados (el fallo de la semana).
      'no-undef': 'error',
      // JSX que usa un componente que no está importado.
      'react/jsx-no-undef': 'error',
      // Hooks dentro de condicionales o bucles: rompe React en caliente.
      'react-hooks/rules-of-hooks': 'error',

      // Sin estas dos, `no-unused-vars` no ve el JSX y marca como "no usado"
      // cualquier componente que solo aparezca dentro de <Etiquetas />.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',

      // ── Avisos: señalan despistes sin bloquear ─────────────────────────
      // Dependencias de useEffect/useMemo incompletas. Aviso y no error
      // porque hay casos conscientes (efectos de montaje con []).
      'react-hooks/exhaustive-deps': 'warn',
      // Variables e imports que sobran. Los argumentos que empiezan por _
      // se ignoran: es la forma de decir "este parámetro no lo uso".
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // `catch {}` vacío es intencionado en varios sitios (localStorage en
      // modo incógnito, por ejemplo): si falla, no hay nada que hacer.
      'no-empty': ['error', { allowEmptyCatch: true }],

      // ── Apagadas a propósito ───────────────────────────────────────────
      // No usamos PropTypes ni TypeScript: avisaría en cada componente.
      'react/prop-types': 'off',
      // Con el JSX transform moderno no hace falta importar React.
      'react/react-in-jsx-scope': 'off',
      // El HTML de los popups de Leaflet se construye a mano (map.jsx).
      'react/no-unescaped-entities': 'off',
    },
  },

  // Tests: añaden los globales de Vitest.
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Scripts de Node (herramientas del repo, no van al navegador).
  {
    files: ['scripts/**/*.{js,mjs}', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
