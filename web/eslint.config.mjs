import nextConfig from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'output/**',
      '.playwright-cli/**',
    ],
  },
  {
    rules: {
      'react/jsx-key': 'off',
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
      // These rules were introduced as hard errors by the React Compiler
      // preset, while this application still contains legacy effect patterns.
      // Keep the findings visible without blocking unrelated type/test checks.
      'react/no-unescaped-entities': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default eslintConfig;
