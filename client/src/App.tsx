import { useUiStore } from './store/uiStore'
import { useGameStore } from './store/gameStore'
import { StartMenu } from './components/ui/StartMenu/StartMenu'
import { Lobby } from './components/ui/Lobby/Lobby'
import { Board2D } from './components/board/Board2D'
import { HUD } from './components/ui/HUD/HUD'
import { Modals } from './components/ui/Modals/Modals'
import { ErrorBoundary } from './components/ErrorBoundary'

function NoticeBanner() {
  const notice = useUiStore(s => s.notice)
  if (!notice) return null
  return (
    <div
      onClick={() => useUiStore.getState().setNotice(null)}
      style={{
        position: 'fixed',
        top: 'max(10px, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        maxWidth: '92vw',
        background: 'linear-gradient(180deg, rgba(20,40,80,0.96), rgba(10,25,55,0.96))',
        border: '1px solid rgba(120,180,255,0.5)',
        color: '#eaf2ff',
        padding: '0.55rem 1rem',
        borderRadius: 12,
        fontSize: '0.9rem',
        fontWeight: 600,
        boxShadow: '0 8px 30px rgba(0,0,0,0.55)',
        textAlign: 'center',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
    >
      {notice}
    </div>
  )
}

export default function App() {
  const appPhase = useUiStore(s => s.appPhase)
  // Fresh reference on every server update → lets the ErrorBoundary auto-recover.
  const gameState = useGameStore(s => s.gameState)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {appPhase === 'menu' && <StartMenu />}
      {appPhase === 'lobby' && <Lobby />}
      {appPhase === 'game' && (
        <ErrorBoundary resetKey={gameState}>
          <Board2D />
          <HUD />
          <Modals />
        </ErrorBoundary>
      )}
      <NoticeBanner />
    </div>
  )
}
