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
    {/* reducedMotion="user" — Framer collapses transform/layout motion
        (the chip→panel morph) to opacity-only when the OS asks for it. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#12162a',
          border: '1px solid #1e2538',
          color: '#f3f4f6',
        },
      }}
    />
  </StrictMode>
)
