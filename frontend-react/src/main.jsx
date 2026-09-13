import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import './index.css'
import './lib/sentry' // self-initializing; no-op without VITE_SENTRY_DSN
import App from './App.jsx'

createRoot(document.getElementById('root'), {
  // Render-phase crashes surface to Sentry instead of a white screen.
  onError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    {/* reducedMotion="user" — Framer collapses transform/layout motion to
        opacity-only when the OS asks for it (the CSS floor in index.css
        covers everything else). */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgba(14, 19, 34, 0.9)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          color: '#f3f4f6',
          backdropFilter: 'blur(12px)',
        },
      }}
    />
  </StrictMode>
)
