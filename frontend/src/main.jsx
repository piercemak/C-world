import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerOfflineCache } from './lib/offlineCache.js'

// Warming the full offline image manifest is useful in production, but doing
// it during Vite development competes with HMR and makes local scrolling and
// animation noticeably uneven. Production/deployed builds retain the cache.
if (!import.meta.env.DEV) {
  registerOfflineCache();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
