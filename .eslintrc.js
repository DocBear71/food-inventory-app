module.exports = {
    extends: [
        'next/core-web-vitals',
        'eslint:recommended'
    ],
    rules: {
        // Fix common parsing issues
        'comma-dangle': ['error', 'always-multiline'],
        'semi': ['error', 'always'],
        'quotes': ['error', 'single'],
        'object-curly-spacing': ['error', 'always'],

        // Allow console.log in development
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

        // Fix React/JSX issues
        'react/jsx-key': 'error',
        'react/jsx-no-duplicate-props': 'error',
        'react/jsx-uses-react': 'off', // Not needed in Next.js 13+
        'react/react-in-jsx-scope': 'off', // Not needed in Next.js 13+

        // Allow unused vars in development
        'no-unused-vars': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    },
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    env: {
        browser: true,
        node: true,
        es6: true,
    },
};