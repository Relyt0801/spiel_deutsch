import { useState, useEffect } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { useUiStore } from '../../../store/uiStore'
import { getSocket } from '../../../socket/socketClient'
import { PLAYER_COLORS } from '../../../types/game'
import { BuildingPanel } from './BuildingPanel'
import { MyPropertiesPanel } from './MyPropertiesPanel'
import styles from './HUD.module.css'

export function HUD() {
  const gameState = useGameStore(s => s.gameState)
  const myId = useSocketStore(s => s.myPlayerId)
  const isAnimating = useUiStore(s => s.isAnimating)
  const diceAnimating = useUiStore(s => s.diceAnimating)
  const errorMessage = useUiStore(s => s.errorMessage)
  const setError = useUiStore(s => s.setError)

  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const isMobile = viewport.w < 700 || viewport.h < 700

  if (!gameState) return null

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId
  const phase = gameState.gamePhase

  const canRoll = isMyTurn && (phase === 'rolling') && !isAnimating && !diceAnimating
  const canEndTurn = isMyTurn && phase === 'end_turn' && !isAnimating
  // Doubles grant another roll: clicking "end turn" hands the dice back to the same player.
  const willRollAgain = canEndTurn && !!gameState.currentDiceRoll?.isDouble && currentPlayer?.jailTurns === 0

  const handleRoll = () => getSocket().emit('game:roll-dice')
  const handleEndTurn = () => getSocket().emit('game:end-turn')

  const myPlayer = gameState.players.find(p => p.id === myId)
  const canDeclareBankruptcy = isMyTurn && phase === 'end_turn' && myPlayer && !myPlayer.isBankrupt

  return (
    <div className={styles.hud}>
      {errorMessage && (
        <div className={styles.errorBanner} onClick={() => setError(null)}>
          ⚠️ {errorMessage}
        </div>
      )}
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

      {/* Mobile player strip — visible only when board center info is hidden */}
      {isMobile && (
        <div className={styles.mobilePlayerStrip}>
          {gameState.players.map((p, i) => (
            <div
              key={p.id}
              className={`${styles.mobileChip} ${i === gameState.currentPlayerIndex ? styles.mobileChipActive : ''} ${p.isBankrupt ? styles.mobileChipBankrupt : ''}`}
            >
              <div className={styles.mobileChipDot} style={{ background: PLAYER_COLORS[p.color] || '#888' }} />
              <span className={styles.mobileChipName}>{p.name}{p.id === myId ? ' ✓' : ''}</span>
              <span className={styles.mobileChipMoney}>{p.money.toLocaleString('de-DE')}€</span>
            </div>
          ))}
        </div>
      )}

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
          {(phase === 'end_turn') && !gameState.activeTrade && (
            <button className={styles.btnTrade}
              onClick={() => useUiStore.getState().openModal('trade', null)}>
              🤝 Handeln
            </button>
          )}

          {canRoll && (
            <button className={styles.btnRoll} onClick={handleRoll}>
              🎲 Würfeln
            </button>
          )}

          {canEndTurn && (
            <button className={willRollAgain ? styles.btnRoll : styles.btnEnd} onClick={handleEndTurn}>
              {willRollAgain ? '🎲 Pasch! Nochmal würfeln' : '✅ Zug beenden'}
            </button>
          )}

          {canDeclareBankruptcy && (
            <button className={styles.btnBankrupt}
              onClick={() => { if (confirm('Wirklich Bankrott erklären?')) getSocket().emit('game:declare-bankruptcy') }}>
              💸 Bankrott erklären
            </button>
          )}

          {(isAnimating || diceAnimating) && (
            <div className={styles.animating}>⏳ Animiert...</div>
          )}
        </div>
      )}

      {/* My Properties panel — bottom left above log */}
      {myPlayer && (
        <div className={styles.myPropertiesWrapper}>
          <MyPropertiesPanel gameState={gameState} myId={myId} />
        </div>
      )}

    </div>
  )
}
