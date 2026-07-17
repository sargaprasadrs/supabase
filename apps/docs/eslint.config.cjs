const { defineConfig } = require('eslint/config')
const supabaseConfig = require('eslint-config-supabase/next')

module.exports = defineConfig([
  supabaseConfig,
  {
    rules: {
      // Studio cleared this rule's ratchet; docs still has debt — keep warn until a sweep.
      'supabase/require-explicit-tabindex': 'warn',
    },
  },
])
