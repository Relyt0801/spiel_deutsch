import { useEffect, useState, useMemo } from 'react'
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
  index, players, propertyState, freeParkingMoney, onSelect,
}: {
  index: number
  players: Array<{ id: string; name?: string; color: string; piece: string; position: number }>
  propertyState?: { houses: number; hotel: boolean; isMortgaged: boolean; ownerId: string | null }
  freeParkingMoney?: number
  onSelect?: (index: number) => void
}) {
  const sq = BOARD_SQUARES[index]
  if (!sq) return null

  const pos = getSquarePos(index)
  const colorHex = sq.color ? PROPERTY_COLOR_HEX[sq.color] : null
  const piecesHere = players.filter(p => p.position === index)
  const icon = squareIcon(index)
  const isMortgaged = propertyState?.isMortgaged ?? false
  const ownerId = propertyState?.ownerId ?? null
  const owner = ownerId ? players.find(p => p.id === ownerId) : undefined
  const ownerColor = owner ? (PLAYER_COLORS[owner.color as keyof typeof PLAYER_COLORS] ?? null) : null
  const ownerPiece = owner ? PIECE_LABELS[owner.piece as keyof typeof PIECE_LABELS] : null
  const clickable = sq.type === 'property' || sq.type === 'railroad' || sq.type === 'utility'

  const zoneClass = {
    corner: styles.zoneCorner,
    bottom: styles.zoneBottom,
    top: styles.zoneTop,
    left: styles.zoneLeft,
    right: styles.zoneRight,
  }[pos.zone]

  return (
    <div
      className={`${styles.square} ${zoneClass} ${isMortgaged ? styles.mortgaged : ''} ${clickable ? styles.clickable : ''}`}
      style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}
      onClick={clickable && onSelect ? () => onSelect(index) : undefined}
    >
      {/* Owner deed marker — square-shaped tag, distinct from the round player pieces */}
      {ownerColor && (
        <div className={styles.ownerTag} style={{ background: ownerColor }} title={owner?.name ? `Gehört ${owner.name}` : 'Im Besitz'}>
          <span className={styles.ownerTagIcon}>{ownerPiece || '🏷️'}</span>
        </div>
      )}
      {/* Color strip */}
      {colorHex && (
        <div
          className={styles.colorStrip}
          style={{ background: colorHex }}
        >
          {propertyState && (propertyState.houses > 0 || propertyState.hotel) && (
            <Buildings houses={propertyState.houses} hotel={propertyState.hotel} zone={pos.zone} />
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
            {index === 20 && freeParkingMoney !== undefined && (
              <div className={styles.freeParkingInfo}>
                <span className={styles.freeParkingAmount}>💰 {freeParkingMoney}€</span>
              </div>
            )}
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
  const isSpectator = useSocketStore(s => s.isSpectator)
  const rawCameraTarget = useUiStore(s => s.cameraTarget)
  // Spectators always watch the full board (never the per-player zoom-follow).
  const cameraTarget = isSpectator ? null : rawCameraTarget
  const activeModal = useUiStore(s => s.activeModal)

  // Prefer the visual viewport: on iOS window.innerHeight counts the area behind the
  // address bar, which made the board scale too big and get cut off at the bottom.
  const readViewport = () => ({
    w: window.visualViewport?.width ?? window.innerWidth,
    h: window.visualViewport?.height ?? window.innerHeight,
  })
  const [viewport, setViewport] = useState(readViewport)

  useEffect(() => {
    const onResize = () => setViewport(readViewport())
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [])

  // The camera stays zoomed on the target square for the whole turn; it is reset to
  // the overview at the start of the next turn (handled in socketHandlers on 'rolling').
  // Players can peek at the full board any time via the overview toggle below.

  const transform = useMemo(
    () => getBoardTransform(cameraTarget, viewport.w, viewport.h),
    [cameraTarget, viewport]
  )

  // Open a read-only info card for any street (price / rent / owner). Blocked while a
  // modal that needs a decision is open (it covers the board anyway).
  const handleSelectSquare = (index: number) => {
    if (activeModal) return
    useUiStore.getState().openModal('property', { propertyIndex: index, infoOnly: true })
  }

  const currentTarget = gameState ? gameState.players[gameState.currentPlayerIndex]?.position ?? null : null
  const toggleOverview = () =>
    useUiStore.getState().setCameraTarget(cameraTarget === null ? currentTarget : null)

  const players = gameState?.players ?? []
  const properties = gameState?.properties ?? []
  const freeParkingMoney = gameState?.freeParkingMoney ?? 0

  const getPropertyState = (index: number) =>
    properties.find(p => p.boardIndex === index)

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null

  // Show the in-board info panel whenever the board is big enough to read it.
  // (Kept in sync with HUD's `isCompact` so exactly one of the two is visible.)
  // The centre info panel scales with the (square) board, so key it off the smaller
  // dimension. This keeps it in the middle of the field on iPad & desktop (portrait and
  // landscape) instead of leaving the centre empty; only phones fall back to the
  // compact left leaderboard. (Kept in sync with HUD's `isCompact`.)
  const showCenterInfo = Math.min(viewport.w, viewport.h) >= 480

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
                freeParkingMoney={i === 20 ? freeParkingMoney : undefined}
                onSelect={handleSelectSquare}
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

            {showCenterInfo && gameState && (
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
                  {players.map((p, i) => {
                    const isActive = i === gameState.currentPlayerIndex
                    const isMe = p.id === myId
                    return (
                      <div key={p.id} className={`${styles.playerRow} ${isActive ? styles.playerActive : ''} ${isMe ? styles.playerMe : ''} ${p.isBankrupt ? styles.playerBankrupt : ''}`}>
                        <div className={styles.playerDot} style={{ background: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#888' }} />
                        <span className={styles.playerName}>{p.name}{isMe ? ' (Du)' : ''}{p.disconnected ? ' 🔌' : ''}</span>
                        <span className={styles.playerMoney}>💰 {p.money.toLocaleString('de-DE')}€</span>
                      </div>
                    )
                  })}
                </div>
                <div className={styles.logArea}>
                  {gameState.log.slice(-3).reverse().map((entry, i) => (
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

      {/* Overview / zoom toggle — hidden for spectators (they always see the overview). */}
      {!isSpectator && (
        <button className={styles.overviewBtn} onClick={toggleOverview}>
          {cameraTarget === null ? '🎯 Zur Figur' : '🔍 Übersicht'}
        </button>
      )}

      {/* Dice overlay rendered at fixed screen position */}
      <DiceOverlay />
    </div>
  )
}
