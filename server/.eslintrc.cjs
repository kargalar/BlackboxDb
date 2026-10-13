module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended'],
    env: {
        node: true,
        es2022: true,
    },
    rules: {
        'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
        'no-unused-vars': 'off',
    },
    ignorePatterns: ['dist/', 'node_modules/', 'prisma/migrations/'],
};
