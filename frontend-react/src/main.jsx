import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
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
