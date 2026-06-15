import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { getSocket } from '../../../socket/socketClient'
import { PLAYER_COLORS } from '../../../types/game'
import styles from './Lobby.module.css'

export function Lobby() {
  const lobbyPlayers = useGameStore(s => s.lobbyPlayers)
  const gameState = useGameStore(s => s.gameState)
  const roomCode = useSocketStore(s => s.roomCode)
  const isHost = useSocketStore(s => s.isHost)
  const myId = useSocketStore(s => s.myPlayerId)

  // Combine lobby players + game state players
  const allPlayers = gameState?.players.length
    ? gameState.players
    : lobbyPlayers

  const handleStart = () => {
    getSocket().emit('room:start-game')
  }

  const canStart = allPlayers.length >= 1

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>🏫 Remigianum Monopoly</h1>
          <div className={styles.codeBox}>
            <span className={styles.codeLabel}>Raum-Code</span>
            <span className={styles.code}>{roomCode}</span>
            <span className={styles.codeHint}>Teile diesen Code mit deinen Mitspielern</span>
          </div>
        </div>

        <div className={styles.playerList}>
          <h3 className={styles.sectionTitle}>Spieler ({allPlayers.length}/6)</h3>
          {allPlayers.map((p, i) => (
            <div key={p.id} className={styles.playerRow}>
              <div
                className={styles.colorDot}
                style={{ background: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#999' }}
              />
              <span className={styles.playerName}>
                {p.name}
                {p.id === myId && <span className={styles.you}> (Du)</span>}
                {p.id === gameState?.hostId && <span className={styles.host}> 👑</span>}
              </span>
              <span className={styles.piece}>{p.piece}</span>
            </div>
          ))}
          {allPlayers.length < 6 && (
            <div className={styles.waiting}>
              ⏳ Warte auf Mitspieler...
            </div>
          )}
        </div>

        {isHost ? (
          <button
            className={styles.startBtn}
            onClick={handleStart}
            disabled={!canStart}
          >
            {'🎮 Spiel starten!'}
          </button>
        ) : (
          <div className={styles.waitingHost}>
            ⏳ Warte auf den Host, das Spiel zu starten...
          </div>
        )}
      </div>
    </div>
  )
}
