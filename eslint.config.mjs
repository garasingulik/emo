import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

// `eslint-config-next` ships flat config in v16; `core-web-vitals` already
// bundles the base `next` and `next/typescript` rule sets.
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
]

export default eslintConfig
