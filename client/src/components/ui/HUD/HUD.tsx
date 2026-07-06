import { useState, useEffect } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { useUiStore } from '../../../store/uiStore'
import { getSocket } from '../../../socket/socketClient'
import { clearSavedRoom } from '../../../socket/session'
import { PLAYER_COLORS } from '../../../types/game'
import { BOARD_SQUARES } from '../../../config/boardData'
import { MyPropertiesPanel } from './MyPropertiesPanel'
import styles from './HUD.module.css'

export function HUD() {
  const gameState = useGameStore(s => s.gameState)
  const myId = useSocketStore(s => s.myPlayerId)
  const isHost = useSocketStore(s => s.isHost)
  const isAnimating = useUiStore(s => s.isAnimating)
  const diceAnimating = useUiStore(s => s.diceAnimating)
  const errorMessage = useUiStore(s => s.errorMessage)
  const setError = useUiStore(s => s.setError)
  const activeModal = useUiStore(s => s.activeModal)
  const turnTime = useUiStore(s => s.turnTimeRemaining)
  const tradeTime = useUiStore(s => s.tradeTimeRemaining)

  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  // Below this the board (and thus its center info) gets too small to read, so we
  // show a compact leaderboard on the LEFT instead. Threshold matches Board2D.
  const isCompact = viewport.w < 760 || viewport.h < 640

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
  const handleLeave = () => {
    if (!window.confirm('Spiel wirklich verlassen? Du wirst sofort entfernt.')) return
    getSocket().emit('room:leave')
    clearSavedRoom()
    useGameStore.getState().clearGame()
    useUiStore.getState().setAppPhase('menu')
  }

  const myPlayer = gameState.players.find(p => p.id === myId)
  const canDeclareBankruptcy = isMyTurn && phase === 'end_turn' && myPlayer && !myPlayer.isBankrupt

  // Re-open the buy decision after the player closed it to raise money.
  const buyPending = isMyTurn && phase === 'buying' && !activeModal
  const reopenBuy = () => {
    useUiStore.getState().openModal('property', {
      propertyIndex: currentPlayer.position, canBuy: true, ownerId: null, rentDue: null,
    })
  }

  // Admin: auction all free streets to speed up the round.
  const hasFreeStreets = gameState.properties.some(p => {
    if (p.ownerId !== null) return false
    const t = BOARD_SQUARES[p.boardIndex]?.type
    return t === 'property' || t === 'railroad' || t === 'utility'
  })
  const canAuctionAll = isHost && (phase === 'rolling' || phase === 'end_turn') &&
    !gameState.auction && !gameState.activeTrade && hasFreeStreets

  const timeLimitOn = gameState.settings?.timeLimit
  const showTurnTimer = timeLimitOn && isMyTurn && turnTime != null &&
    ['rolling', 'end_turn', 'buying', 'jail_decision', 'card_drawn'].includes(phase) &&
    !gameState.activeTrade
  const showTradeTimer = timeLimitOn && !!gameState.activeTrade && tradeTime != null
  const fmt = (s: number) => `${Math.max(0, Math.floor(s / 60))}:${String(Math.max(0, s % 60)).padStart(2, '0')}`

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
        {(showTurnTimer || showTradeTimer) && (
          <span className={`${styles.timer} ${((showTradeTimer ? tradeTime! : turnTime!) <= 15) ? styles.timerLow : ''}`}>
            ⏱ {fmt(showTradeTimer ? tradeTime! : turnTime!)}
          </span>
        )}
      </div>

      {/* Compact leaderboard on the LEFT — shown when the board center info is hidden
          (small / short screens like an iPad in landscape). Keeps the top area clear. */}
      {isCompact && (
        <div className={styles.leaderboard}>
          {gameState.players.map((p, i) => (
            <div
              key={p.id}
              className={`${styles.mobileChip} ${i === gameState.currentPlayerIndex ? styles.mobileChipActive : ''} ${p.isBankrupt ? styles.mobileChipBankrupt : ''}`}
            >
              <div className={styles.mobileChipDot} style={{ background: PLAYER_COLORS[p.color] || '#888' }} />
              <span className={styles.mobileChipName}>{p.name}{p.id === myId ? ' ✓' : ''}{p.disconnected ? ' 🔌' : ''}</span>
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

          {buyPending && (
            <button className={styles.btnRoll} onClick={reopenBuy}>
              🏠 Kaufentscheidung
            </button>
          )}

          {canAuctionAll && (
            <button className={styles.btnTrade}
              onClick={() => { if (confirm('Alle freien Straßen nacheinander versteigern?')) getSocket().emit('game:auction-all') }}>
              🔨 Freie Straßen versteigern
            </button>
          )}

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

          {(isAnimating || diceAnimating) && (
            <div className={styles.animating}>⏳ Animiert...</div>
          )}
        </div>
      )}

      {/* My Properties panel — bottom left above log */}
      {myPlayer && (
        <div className={styles.myPropertiesWrapper}>
          <MyPropertiesPanel gameState={gameState} myId={myId} />
          {canDeclareBankruptcy && (
            <button className={styles.btnBankruptLeft}
              onClick={() => { if (confirm('Wirklich Bankrott erklären?')) getSocket().emit('game:declare-bankruptcy') }}>
              💸 Bankrott erklären
            </button>
          )}
          <button className={styles.btnLeave} onClick={handleLeave}>🚪 Verlassen</button>
        </div>
      )}

    </div>
  )
}
