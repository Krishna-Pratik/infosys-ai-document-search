/* ----------------------------------------------------------------
   Sentry — browser error tracking (free tier).

   Activates only when VITE_SENTRY_DSN is set (Vercel env var, build-time
   inlined). Without it every export below is a no-op, so local dev and
   DSN-less deploys behave exactly as before.

   Default integrations already capture unhandled JS errors, unhandled
   promise rejections, console errors and failed requests — this module
   adds the *handled* paths: failed API calls and provider-exhausted
   stream events that the UI shows as friendly bubbles but that we still
   want to know about.
----------------------------------------------------------------- */
import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN

const sentryEnabled = Boolean(DSN)

if (sentryEnabled) {
  Sentry.init({
    dsn: DSN,
    // Error tracking only — no performance tracing (that's the paid part).
    tracesSampleRate: 0,
    environment: import.meta.env.MODE,
    // Don't spam the free tier from localhost.
    enabled: !import.meta.env.DEV,
  })
}

/** Report a handled API/upload failure with a breadcrumb of where it came from. */
export function captureError(err, area) {
  if (!sentryEnabled) return
  try {
    Sentry.withScope((scope) => {
      scope.setTag('area', area)
      if (err?.status) scope.setContext('http', { status_code: err.status })
      Sentry.captureException(err)
    })
  } catch {
    /* telemetry must never break the UI */
  }
}

/** Report a terminal failure the backend streamed to the user (provider pool exhausted). */
export function captureStreamError(message) {
  if (!sentryEnabled) return
  try {
    Sentry.captureMessage(message.slice(0, 500), {
      level: 'error',
      fingerprint: ['stream-error', message.split('\n')[0].slice(0, 80)],
    })
  } catch {
    /* ditto */
  }
}
