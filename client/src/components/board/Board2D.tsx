import { useEffect, useState, useRef, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useSocketStore } from '../../store/socketStore'
import { useUiStore } from '../../store/uiStore'
import { BOARD_SQUARES, PROPERTY_COLOR_HEX } from '../../config/boardData'
import { PLAYER_COLORS, PIECE_LABELS } from '../../types/game'
import { DiceOverlay } from './DiceOverlay'
import styles from './Board2D.module.css'

// ─── Layout constants ────────────────────────────────────────────────────────
const BOARD_SIZE = 700
const CORNER = 80
const CELL = 60

type Zone = 'corner' | 'bottom' | 'left' | 'top' | 'right'

interface SquarePos {
  left: number; top: number; width: number; height: number; zone: Zone
}

function getSquarePos(index: number): SquarePos {
  if (index === 0)  return { left: 620, top: 620, width: CORNER, height: CORNER, zone: 'corner' }
  if (index <= 9)   return { left: 620 - index * CELL, top: 620, width: CELL, height: CORNER, zone: 'bottom' }
  if (index === 10) return { left: 0, top: 620, width: CORNER, height: CORNER, zone: 'corner' }
  if (index <= 19)  return { left: 0, top: 620 - (index - 10) * CELL, width: CORNER, height: CELL, zone: 'left' }
  if (index === 20) return { left: 0, top: 0, width: CORNER, height: CORNER, zone: 'corner' }
  if (index <= 29)  return { left: CORNER + (index - 21) * CELL, top: 0, width: CELL, height: CORNER, zone: 'top' }
  if (index === 30) return { left: 620, top: 0, width: CORNER, height: CORNER, zone: 'corner' }
  return              { left: 620, top: CORNER + (index - 31) * CELL, width: CORNER, height: CELL, zone: 'right' }
}

// ─── Board transform ─────────────────────────────────────────────────────────
function getBoardTransform(cameraTarget: number | null, vw: number, vh: number) {
  if (cameraTarget !== null) {
    const sq = getSquarePos(cameraTarget)
    const cx = sq.left + sq.width / 2
    const cy = sq.top + sq.height / 2
    const s = 2.2
    return `translate(${vw / 2 - s * cx}px, ${vh / 2 - s * cy}px) scale(${s})`
  }
  const s = Math.min(vw, vh) / BOARD_SIZE * 0.9
  return `translate(${vw / 2 - s * BOARD_SIZE / 2}px, ${vh / 2 - s * BOARD_SIZE / 2}px) scale(${s})`
}

// ─── Square icon helpers ─────────────────────────────────────────────────────
function squareIcon(index: number) {
  const sq = BOARD_SQUARES[index]
  if (!sq) return null
  switch (sq.type) {
    case 'chance':    return '⚡'
    case 'community': return '📚'
    case 'railroad':  return '🚌'
    case 'utility':   return index === 12 ? '⚙️' : '🚽'
    case 'tax':       return '📉'
    case 'go':        return '🏫'
    case 'go_to_jail': return '😱'
    case 'jail_visit': return '🔒'
    case 'free_parking': return '☕'
    default: return null
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Buildings({ houses, hotel, zone }: { houses: number; hotel: boolean; zone: Zone }) {
  if (hotel) {
    return <div className={`${styles.building} ${styles.hotel}`}>H</div>
  }
  return (
    <div className={styles.buildingRow}>
      {Array.from({ length: houses }, (_, i) => (
        <div key={i} className={`${styles.building} ${styles.house}`} />
      ))}
    </div>
  )
}

function Square({
  index, players, propertyState, ownerId,
}: {
  index: number
  players: Array<{ id: string; color: string; piece: string; position: number }>
  propertyState?: { houses: number; hotel: boolean; isMortgaged: boolean; ownerId: string | null }
  ownerId?: string | null
}) {
  const sq = BOARD_SQUARES[index]
  if (!sq) return null

  const pos = getSquarePos(index)
  const colorHex = sq.color ? PROPERTY_COLOR_HEX[sq.color] : null
  const piecesHere = players.filter(p => p.position === index)
  const icon = squareIcon(index)
  const isProperty = sq.type === 'property'
  const isMortgaged = propertyState?.isMortgaged ?? false

  const zoneClass = {
    corner: styles.zoneCorner,
    bottom: styles.zoneBottom,
    top: styles.zoneTop,
    left: styles.zoneLeft,
    right: styles.zoneRight,
  }[pos.zone]

  return (
    <div
      className={`${styles.square} ${zoneClass} ${isMortgaged ? styles.mortgaged : ''}`}
      style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}
    >
      {/* Color strip */}
      {colorHex && (
        <div
          className={styles.colorStrip}
          style={{ background: colorHex }}
        >
          {propertyState && (
            <Buildings houses={propertyState.houses} hotel={propertyState.hotel} zone={pos.zone} />
          )}
          {ownerId && !propertyState && (
            <div className={styles.ownerDot} style={{ background: '#d4af37' }} />
          )}
        </div>
      )}

      {/* Square content */}
      <div className={styles.squareContent}>
        {pos.zone === 'corner' ? (
          <div className={styles.cornerContent}>
            <span className={styles.cornerIcon}>{icon}</span>
            <span className={styles.cornerName}>{sq.name}</span>
            {index === 0 && <span className={styles.cornerSub}>+200€ →</span>}
          </div>
        ) : (
          <>
            {icon && <span className={styles.squareIcon}>{icon}</span>}
            <span className={styles.squareName}>{sq.name}</span>
            {sq.price && (
              <span className={styles.squarePrice}>
                {sq.type === 'tax' ? `- €${sq.price}` : `€${sq.price}`}
              </span>
            )}
          </>
        )}
      </div>

      {/* Player pieces */}
      {piecesHere.length > 0 && (
        <div className={styles.pieceCluster}>
          {piecesHere.map(p => (
            <div
              key={p.id}
              className={styles.piece}
              style={{ background: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#888' }}
              title={p.piece}
            >
              {PIECE_LABELS[p.piece as keyof typeof PIECE_LABELS] || '●'}
            </div>
          ))}
        </div>
      )}

      {isMortgaged && <div className={styles.mortgagedLabel}>PFAND</div>}
    </div>
  )
}

// ─── Main Board ──────────────────────────────────────────────────────────────
export function Board2D() {
  const gameState = useGameStore(s => s.gameState)
  const myId = useSocketStore(s => s.myPlayerId)
  const cameraTarget = useUiStore(s => s.cameraTarget)
  const isAnimating = useUiStore(s => s.isAnimating)

  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
  const prevAnimating = useRef(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Auto zoom-out 1.5s after movement finishes
  useEffect(() => {
    if (prevAnimating.current && !isAnimating) {
      resetTimer.current = setTimeout(() => {
        useUiStore.getState().setCameraTarget(null)
      }, 1500)
    }
    prevAnimating.current = isAnimating
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current) }
  }, [isAnimating])

  const transform = useMemo(
    () => getBoardTransform(cameraTarget, viewport.w, viewport.h),
    [cameraTarget, viewport]
  )

  const players = gameState?.players ?? []
  const properties = gameState?.properties ?? []

  const getPropertyState = (index: number) =>
    properties.find(p => p.boardIndex === index)

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null

  return (
    <div className={styles.viewport}>
      <div
        className={styles.boardWrapper}
        style={{ transform }}
      >
        <div className={styles.board}>
          {/* All 40 squares */}
          {Array.from({ length: 40 }, (_, i) => {
            const ps = getPropertyState(i)
            return (
              <Square
                key={i}
                index={i}
                players={players}
                propertyState={ps ? { houses: ps.houses, hotel: ps.hotel, isMortgaged: ps.isMortgaged, ownerId: ps.ownerId } : undefined}
                ownerId={ps?.ownerId}
              />
            )
          })}

          {/* Center area */}
          <div className={styles.center}>
            <div className={styles.centerTop}>
              <div className={styles.centerLogo}>🏫</div>
              <div className={styles.centerTitle}>REMIGIANUM</div>
              <div className={styles.centerSub}>MONOPOLY</div>
            </div>

            {gameState && (
              <div className={styles.centerInfo}>
                <div className={styles.turnRow}>
                  <div
                    className={styles.turnDot}
                    style={{ background: PLAYER_COLORS[currentPlayer?.color as keyof typeof PLAYER_COLORS] || '#888' }}
                  />
                  <span className={styles.turnName}>
                    {currentPlayer?.id === myId ? 'Du bist dran' : `${currentPlayer?.name} ist dran`}
                  </span>
                </div>
                {gameState.currentDiceRoll && (
                  <div className={styles.diceResult}>
                    🎲 {gameState.currentDiceRoll.die1} + {gameState.currentDiceRoll.die2} = {gameState.currentDiceRoll.total}
                    {gameState.currentDiceRoll.isDouble && <span className={styles.double}> Pasch!</span>}
                  </div>
                )}
                <div className={styles.playerList}>
                  {players.map((p, i) => (
                    <div key={p.id} className={`${styles.playerRow} ${i === gameState.currentPlayerIndex ? styles.playerActive : ''} ${p.isBankrupt ? styles.playerBankrupt : ''}`}>
                      <div className={styles.playerDot} style={{ background: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#888' }} />
                      <span className={styles.playerName}>{p.name}{p.id === myId ? ' (Du)' : ''}</span>
                      <span className={styles.playerMoney}>💰 {p.money.toLocaleString('de-DE')}€</span>
                    </div>
                  ))}
                </div>
                <div className={styles.logArea}>
                  {gameState.log.slice(-4).reverse().map((entry, i) => (
                    <div key={i} className={`${styles.logEntry} ${styles[entry.type]}`}>
                      {entry.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!gameState && (
              <div className={styles.centerEmpty}>
                <div className={styles.centerEmptyText}>Spiel lädt...</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dice overlay rendered at fixed screen position */}
      <DiceOverlay />
    </div>
  )
}
