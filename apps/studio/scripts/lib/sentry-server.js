// Server-side Sentry for the TanStack Start runtime.
//
// The Next.js build gets its server SDK via the framework convention files
// (`instrumentation.ts` → `sentry.server.config.ts`), but nothing invokes
// those when the TanStack SSR handler runs — its two server entries
// (`api/server.js` on Vercel, `scripts/serve.js` self-hosted) are plain Node
// ESM that import the built `dist/server/server.js` directly. This module is
// the TanStack counterpart: both entries call `initServerSentry()` and wrap
// the fetch handler with `wrapFetchHandler()`. It must stay plain ESM `.js`
// (no TS, no bundler) because those entries are executed by Node as-is.
//
// The init options deliberately mirror `sentry.server.config.ts` so the two
// runtimes report identically; keep them in sync when editing either file.
import * as Sentry from '@sentry/node'

// Same list as `sentry.server.config.ts`.
const IGNORE_ERRORS = [
  'ResizeObserver',
  'Failed to load Stripe.js',
  // Next.js internals — not actual errors
  'NEXT_NOT_FOUND',
  'NEXT_REDIRECT',
  // Network / infrastructure
  /504 Gateway Time-out/,
  'Network request failed',
  'Failed to fetch',
  'AbortError',
  // Code-split loading failures
  'ChunkLoadError',
  /Loading chunk [\d]+ failed/,
  // React hydration mismatches caused by extensions modifying DOM before hydration
  /text content does not match/i,
  /There was an error while hydrating/i,
]

let initialized = false

// Initialize the @sentry/node SDK once. Call this as early as possible —
// before importing the SSR bundle — so the SDK's instrumentation is in place
// when application modules load. Safe to call multiple times, and a clean
// no-op (no client, no instrumentation) when no DSN is configured, e.g.
// self-hosted deployments.
export function initServerSentry() {
  if (initialized) return
  initialized = true

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    ...(process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT && {
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    }),
    // The server runtime reads process.env directly (no NEXT_PUBLIC_ build-time
    // inlining needed). Using the commit SHA matches the client build's release,
    // so client and server events land on the same Sentry release — and without
    // a release the SDK drops session/health data entirely.
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    debug: false,
    tracesSampleRate: 0.02,
    ignoreErrors: IGNORE_ERRORS,
  })
}

// Wrap a `{ fetch(request) }` Web handler (the shape `dist/server/server.js`
// exports) so that errors thrown while handling a request are reported to
// Sentry before being rethrown — the platform still produces its own 500.
//
// Each request runs in its own isolation scope so per-request data (tags,
// breadcrumbs) never bleeds between concurrent requests.
//
// Flush strategy: we only `flush()` when an error was captured. On Vercel the
// function is frozen right after the response is produced, so without an
// explicit flush the error envelope is silently dropped. We skip flushing on
// the success path to avoid adding per-request latency; the trade-off is that
// the rare sampled transaction (tracesSampleRate: 0.02) may be lost on
// serverless, which is acceptable.
//
// Known limitation: TanStack Start (and the pages-router `apiWrapper` shim)
// catches some errors internally and returns a 500 response without throwing,
// so those never reach this wrapper. SSR render errors are still captured
// client-side by the __root error boundary; capturing internally-swallowed
// server errors (via a Sentry integration or TanStack's server error hooks)
// is a follow-up.
export function wrapFetchHandler(handler) {
  return {
    ...handler,
    fetch(request) {
      return Sentry.withIsolationScope(async (scope) => {
        try {
          return await handler.fetch(request)
        } catch (err) {
          scope.setContext('request_info', { method: request.method, url: request.url })
          Sentry.captureException(err)
          // Never let a flush failure mask the original error.
          await Sentry.flush(2000).catch(() => {})
          throw err
        }
      })
    },
  }
}
