/**
 * Design tokens — v1, GENERIC/STRUCTURAL only (Supaimage multi-brand phase).
 *
 * Everything that differs BY BRAND (colors, illustration stroke) moved to
 * lib/design/brands/ — see that module's doc comment. Everything that differs
 * BY FORMAT/PLATFORM (canvas dimensions, icon sizing) moved to
 * lib/design/formats.ts. What's left here is genuinely shared across every
 * brand and format: the typeface and the base grid unit.
 */

export const TOKEN_VERSION = 1

// --- Typography (Manrope throughout, brief §4) -------------------------------
// Roles map to weights. Headline auto-fits within [min,max]; eyebrow is fixed.
export const typography = {
  family: 'Manrope',
  roles: {
    headline: {
      weight: 500 as const,
      minSize: 40,
      maxSize: 64,
      lineHeight: 1.1,
      letterSpacing: -0.02, // em
    },
    eyebrow: {
      weight: 500 as const,
      size: 22,
      lineHeight: 1.2,
      letterSpacing: 0.06, // em — slight tracking for the kicker label
    },
  },
} as const

// --- Composition aids (brief §4) ---------------------------------------------
export const grid = { base: 8 } as const
