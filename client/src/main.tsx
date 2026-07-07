import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Block manual zoom everywhere: it shifts the fixed board layout and can reveal
// un-styled areas. Covers iOS Safari pinch (gesture*), multi-touch pinch, double-tap,
// and desktop Ctrl/⌘+wheel and Ctrl/⌘ +/- keyboard zoom.
const stop = (e: Event) => e.preventDefault()
document.addEventListener('gesturestart', stop, { passive: false })
document.addEventListener('gesturechange', stop, { passive: false })
document.addEventListener('gestureend', stop, { passive: false })
document.addEventListener('touchmove', (e) => {
  if ((e as TouchEvent).touches.length > 1) e.preventDefault()
}, { passive: false })
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) e.preventDefault()
}, { passive: false })
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '_', '0'].includes(e.key)) e.preventDefault()
})
// iOS double-tap-to-zoom guard.
let lastTouchEnd = 0
document.addEventListener('touchend', (e) => {
  const now = Date.now()
  if (now - lastTouchEnd <= 300) e.preventDefault()
  lastTouchEnd = now
}, { passive: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
