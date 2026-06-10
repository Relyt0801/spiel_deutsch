import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { useUiStore } from '../../../store/uiStore'
import { getSocket } from '../../../socket/socketClient'
import { PLAYER_COLORS, PIECE_LABELS } from '../../../types/game'
import { BOARD_SQUARES } from '../../../config/boardData'
import { BuildingPanel } from './BuildingPanel'
import styles from './HUD.module.css'

export function HUD() {
  const gameState = useGameStore(s => s.gameState)
  const myId = useSocketStore(s => s.myPlayerId)
  const isAnimating = useUiStore(s => s.isAnimating)
  const diceAnimating = useUiStore(s => s.diceAnimating)

  if (!gameState) return null

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId
  const phase = gameState.gamePhase

  const canRoll = isMyTurn && (phase === 'rolling') && !isAnimating && !diceAnimating
  const canEndTurn = isMyTurn && phase === 'end_turn' && !isAnimating

  const handleRoll = () => getSocket().emit('game:roll-dice')
  const handleEndTurn = () => getSocket().emit('game:end-turn')

  return (
    <div className={styles.hud}>
      {/* Turn indicator top center */}
      <div className={styles.turnBanner}>
        <div
          className={styles.turnDot}
          style={{ background: PLAYER_COLORS[currentPlayer?.color] || '#ccc' }}
        />
        <span>
          {isMyTurn ? 'Du bist dran' : `${currentPlayer?.name} ist dran`}
        </span>
        {gameState.currentDiceRoll && (
          <span className={styles.diceResult}>
            🎲 {gameState.currentDiceRoll.die1} + {gameState.currentDiceRoll.die2} = {gameState.currentDiceRoll.total}
            {gameState.currentDiceRoll.isDouble && ' (Pasch! 🎉)'}
          </span>
        )}
      </div>

      {/* Players sidebar */}
      <div className={styles.sidebar}>
        {gameState.players.map((p, i) => (
          <div
            key={p.id}
            className={`${styles.playerCard} ${i === gameState.currentPlayerIndex ? styles.active : ''} ${p.isBankrupt ? styles.bankrupt : ''}`}
          >
            <div className={styles.playerHeader}>
              <div className={styles.playerDot} style={{ background: PLAYER_COLORS[p.color] || '#ccc' }} />
              <span className={styles.playerName}>{p.name}{p.id === myId ? ' (Du)' : ''}</span>
              <span className={styles.playerPiece}>{PIECE_LABELS[p.piece] || '●'}</span>
            </div>
            <div className={styles.playerMoney}>💰 {p.money.toLocaleString('de-DE')}€</div>
            <div className={styles.playerPos}>📍 {BOARD_SQUARES[p.position]?.name.replace('\n', ' ')}</div>
            {p.jailTurns > 0 && <div className={styles.jailBadge}>🔒 Nachsitzen ({p.jailTurns}/3)</div>}
          </div>
        ))}
      </div>

      {/* Action buttons bottom right */}
      {isMyTurn && (
        <div className={styles.actions}>
          {phase === 'jail_decision' && (
            <div className={styles.jailActions}>
              <div className={styles.jailTitle}>Nachsitz-Zimmer</div>
              <button className={styles.btnSmall} onClick={() => getSocket().emit('game:jail-pay')}
                disabled={currentPlayer.money < 50}>
                50€ zahlen & frei sein
              </button>
              {currentPlayer.getOutOfJailCards > 0 && (
                <button className={styles.btnSmall} onClick={() => getSocket().emit('game:jail-use-card')}>
                  Befreiungskarte nutzen
                </button>
              )}
              <button className={styles.btnSmall} onClick={() => getSocket().emit('game:jail-roll')}>
                Würfeln (Pasch = frei)
              </button>
            </div>
          )}

          <BuildingPanel gameState={gameState} myId={myId} />

          {canRoll && (
            <button className={styles.btnRoll} onClick={handleRoll}>
              🎲 Würfeln
            </button>
          )}

          {canEndTurn && (
            <button className={styles.btnEnd} onClick={handleEndTurn}>
              ✅ Zug beenden
            </button>
          )}

          {(isAnimating || diceAnimating) && (
            <div className={styles.animating}>⏳ Animiert...</div>
          )}
        </div>
      )}

      {/* Game log bottom left */}
      <div className={styles.log}>
        {gameState.log.slice(-6).reverse().map((entry, i) => (
          <div key={i} className={`${styles.logEntry} ${styles[entry.type]}`}>
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  )
}
