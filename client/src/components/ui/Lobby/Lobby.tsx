import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { getSocket } from '../../../socket/socketClient'
import { PLAYER_COLORS } from '../../../types/game'
import styles from './Lobby.module.css'

export function Lobby() {
  const lobbyPlayers = useGameStore(s => s.lobbyPlayers)
  const lobbyAllReady = useGameStore(s => s.lobbyAllReady)
  const gameState = useGameStore(s => s.gameState)
  const roomCode = useSocketStore(s => s.roomCode)
  const isHost = useSocketStore(s => s.isHost)
  const myId = useSocketStore(s => s.myPlayerId)

  const allPlayers = gameState?.players.length ? gameState.players : lobbyPlayers
  const me = lobbyPlayers.find(p => p.id === myId)
  const amIReady = me?.isReady ?? false
  const canStart = lobbyAllReady && allPlayers.length >= 1

  const nonHostHumans = lobbyPlayers.filter(p => !p.isBot && p.id !== myId)
  const readyNonHostHumans = nonHostHumans.filter(p => p.isReady)

  const handleStart = () => getSocket().emit('room:start-game')
  const handleToggleReady = () => getSocket().emit('room:toggle-ready')
  const handleAddBot = () => getSocket().emit('room:add-bot')
  const handleKick = (playerId: string) => getSocket().emit('room:kick-player', { playerId })

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
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Spieler ({allPlayers.length}/6)</h3>
            {isHost && nonHostHumans.length > 0 && (
              <span className={styles.readyCount}>
                {readyNonHostHumans.length}/{nonHostHumans.length} bereit
              </span>
            )}
          </div>

          {allPlayers.map(p => {
            const color = PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] ?? '#999'
            const isBot = (p as any).isBot ?? false
            const isReady = (p as any).isReady ?? false
            const isMe = p.id === myId
            const isHostPlayer = isHost && isMe || gameState?.hostId === p.id

            return (
              <div key={p.id} className={`${styles.playerRow} ${isMe ? styles.playerRowMe : ''}`}>
                <div className={styles.colorDot} style={{ background: color }} />
                <span className={styles.playerName}>
                  {p.name}
                  {isMe && <span className={styles.you}> (Du)</span>}
                </span>
                {isHostPlayer && <span className={styles.hostBadge}>👑</span>}
                {isBot
                  ? <span className={styles.botBadge}>🤖</span>
                  : isHostPlayer
                    ? <span className={styles.adminBadge}>Admin</span>
                    : <span className={`${styles.readyBadge} ${isReady ? styles.readyYes : styles.readyNo}`}>
                        {isReady ? '✓' : '○'}
                      </span>
                }
                {isHost && !isMe && (
                  <button className={styles.kickBtn} onClick={() => handleKick(p.id)}>✕</button>
                )}
              </div>
            )
          })}

          {allPlayers.length < 6 && (
            <div className={styles.waiting}>⏳ Warte auf Mitspieler...</div>
          )}
        </div>

        <div className={styles.actions}>
          {isHost ? (
            <>
              {allPlayers.length < 6 && (
                <button className={styles.addBotBtn} onClick={handleAddBot}>
                  🤖 Bot hinzufügen
                </button>
              )}
              <button
                className={styles.startBtn}
                onClick={handleStart}
                disabled={!canStart}
              >
                🎮 Spiel starten
              </button>
              {!canStart && nonHostHumans.length > 0 && (
                <p className={styles.waitNote}>Warte bis alle Spieler bereit sind...</p>
              )}
              {nonHostHumans.length === 0 && (
                <p className={styles.waitNote}>Füge Bots oder Mitspieler hinzu</p>
              )}
            </>
          ) : (
            <>
              <button
                className={`${styles.readyBtn} ${amIReady ? styles.readyBtnActive : ''}`}
                onClick={handleToggleReady}
              >
                {amIReady ? '✓ Bereit!' : 'Bereit drücken'}
              </button>
              <p className={styles.waitNote}>
                {amIReady ? 'Warte auf den Host...' : 'Drücke Bereit wenn du spielbereit bist'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
