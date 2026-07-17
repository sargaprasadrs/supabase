const { defineConfig } = require('eslint/config')
const supabaseConfig = require('eslint-config-supabase/next')

module.exports = defineConfig([
  supabaseConfig,
  {
    rules: {
      // Studio cleared this rule's ratchet; design-system still has debt — keep warn until a sweep.
      'supabase/require-explicit-tabindex': 'warn',
    },
  },
  {
    files: ['registry/**/*.tsx', '__registry__/**/*.tsx', 'app/**/*.tsx'],
    rules: {
      'no-restricted-exports': 'off',
    },
  },
])
