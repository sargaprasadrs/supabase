// Browser-safe stub for `next/constants`.
//
// The real `next/constants` re-exports `next/dist/shared/lib/constants`, whose
// module-init code runs `process?.features?.typescript`. Optional chaining does
// NOT guard an *undeclared* global, so in the Vite/TanStack browser bundle
// (where `process` is not defined) merely importing it throws
// `ReferenceError: process is not defined`. That crash takes down any chunk
// that transitively imports it — e.g. `@sentry/nextjs`'s `isBuild.js` does
// `import { PHASE_PRODUCTION_BUILD } from 'next/constants'`, pulling the whole
// module (and the crash) into the table-editor chunk.
//
// These PHASE_* values are stable string literals; re-exporting just them keeps
// the Sentry (and any other) consumers working without loading Next internals.
// Aliased in vite.config.ts so it also intercepts node_modules importers.

export const PHASE_EXPORT = 'phase-export'
export const PHASE_PRODUCTION_BUILD = 'phase-production-build'
export const PHASE_PRODUCTION_SERVER = 'phase-production-server'
export const PHASE_DEVELOPMENT_SERVER = 'phase-development-server'
export const PHASE_TEST = 'phase-test'
export const PHASE_INFO = 'phase-info'
