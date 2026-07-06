import { Component, type ReactNode } from 'react'

interface Props {
  /** Changes on every server state update; a new value clears a previous render error. */
  resetKey: unknown
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches render errors so a single bad frame (e.g. a half-synced trade) shows a small
 * recoverable card instead of a blank white screen. Because the server is the source of
 * truth and pushes fresh state constantly, the boundary auto-resets on the next update.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidUpdate(prev: Props): void {
    // A new state arrived from the server → try rendering again.
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(error: unknown): void {
    // Keep a trace in the console for debugging, but never crash the whole app.
    console.error('Render error caught by ErrorBoundary:', error)
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(4px)',
          padding: '1rem', textAlign: 'center',
        }}
      >
        <div style={{
          maxWidth: 360, background: 'linear-gradient(180deg,#1a1a2e,#12121f)',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16,
          padding: '1.5rem', color: '#eaf2ff', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Kurzer Anzeigefehler</h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', opacity: 0.85 }}>
            Die Anzeige hat sich verhakt – das Spiel läuft im Hintergrund weiter.
            Versuche es erneut; beim nächsten Server-Update stellt sich die Ansicht
            normalerweise von selbst wieder her.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{
                background: '#CC0000', color: 'white', border: 'none', borderRadius: 10,
                padding: '0.55rem 1.1rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Weiter
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'rgba(255,255,255,0.1)', color: '#eaf2ff',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                padding: '0.55rem 1.1rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      </div>
    )
  }
}
