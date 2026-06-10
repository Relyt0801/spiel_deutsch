import { useUiStore } from './store/uiStore'
import { StartMenu } from './components/ui/StartMenu/StartMenu'
import { Lobby } from './components/ui/Lobby/Lobby'
import { Scene } from './components/three/Scene'
import { HUD } from './components/ui/HUD/HUD'
import { Modals } from './components/ui/Modals/Modals'

export default function App() {
  const appPhase = useUiStore(s => s.appPhase)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {appPhase === 'menu' && <StartMenu />}
      {appPhase === 'lobby' && <Lobby />}
      {appPhase === 'game' && (
        <>
          <Scene />
          <HUD />
          <Modals />
        </>
      )}
    </div>
  )
}
