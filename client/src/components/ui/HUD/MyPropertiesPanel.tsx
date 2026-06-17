import { useState } from 'react'
import { BOARD_SQUARES, PROPERTY_COLOR_HEX } from '../../../config/boardData'
import type { GameState, PropertyState } from '../../../types/game'
import { PLAYER_COLORS } from '../../../types/game'
import styles from './MyPropertiesPanel.module.css'

interface Props {
  gameState: GameState
  myId: string | null
}

const RAILROAD_RENT = [25, 50, 100, 200]

/** Overlapping building icons (1–4 Klassenräume) or Schulgebäude (Hotel). */
function Buildings({ houses, hotel }: { houses: number; hotel: boolean }) {
  if (hotel) {
    return <span className={`${styles.bStack} ${styles.hotelStack}`}><span className={styles.hotel}>H</span></span>
  }
  if (houses > 0) {
    return (
      <span className={styles.bStack}>
        {Array.from({ length: houses }, (_, i) => (
          <span key={i} className={styles.house} />
        ))}
      </span>
    )
  }
  return null
}

function infoFor(p: PropertyState, square: typeof BOARD_SQUARES[number], ownedSameGroup: number) {
  // Returns the icon block + the right-aligned value for one property row.
  if (square.type === 'railroad') {
    const rent = RAILROAD_RENT[Math.max(0, ownedSameGroup - 1)]
    return {
      icon: <span className={styles.transport}>🚌<span className={styles.transportCount}>×{ownedSameGroup}</span></span>,
      value: `${rent}€`,
    }
  }
  if (square.type === 'utility') {
    return {
      icon: <span className={styles.transport}>💡</span>,
      value: ownedSameGroup >= 2 ? '×10' : '×4',
    }
  }
  // Normal property
  const rentIdx = p.hotel ? 5 : p.houses
  const rent = square.rent[rentIdx] ?? square.rent[0]
  return {
    icon: <Buildings houses={p.houses} hotel={p.hotel} />,
    value: `${rent}€`,
  }
}

export function MyPropertiesPanel({ gameState, myId }: Props) {
  const [open, setOpen] = useState(false)

  const myProperties = gameState.properties
    .filter(p => p.ownerId === myId)
    .map(p => ({ ...p, square: BOARD_SQUARES[p.boardIndex] }))
    .filter(p => p.square)

  // Count how many properties of each board group this player owns (for railroad/utility rent).
  const groupCounts: Record<string, number> = {}
  for (const p of myProperties) {
    const g = p.square.group
    if (g) groupCounts[g] = (groupCounts[g] ?? 0) + 1
  }

  const me = gameState.players.find(p => p.id === myId)
  const players = gameState.players

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.toggleBtn} ${open ? styles.active : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        💼 Mein Konto ({myProperties.length})
      </button>

      {open && (
        <div className={styles.panel}>
          {/* Money overview */}
          <div className={styles.cashRow}>
            <span className={styles.cashLabel}>💰 Mein Geld</span>
            <span className={styles.cashValue}>{(me?.money ?? 0).toLocaleString('de-DE')}€</span>
          </div>
          <div className={styles.playersMini}>
            {players.map(p => (
              <div key={p.id} className={`${styles.playerMini} ${p.isBankrupt ? styles.miniBankrupt : ''}`}>
                <span className={styles.miniDot} style={{ background: PLAYER_COLORS[p.color] || '#888' }} />
                <span className={styles.miniName}>{p.name}{p.id === myId ? ' (Du)' : ''}</span>
                <span className={styles.miniMoney}>{p.money.toLocaleString('de-DE')}€</span>
              </div>
            ))}
          </div>

          <div className={styles.header}>Meine Grundstücke</div>

          {myProperties.length === 0 ? (
            <div className={styles.empty}>Noch keine Grundstücke</div>
          ) : (
            <div className={styles.list}>
              {myProperties.map(p => {
                const { icon, value } = infoFor(p, p.square, groupCounts[p.square.group ?? ''] ?? 1)
                return (
                  <div
                    key={p.boardIndex}
                    className={`${styles.row} ${p.isMortgaged ? styles.mortgaged : ''}`}
                  >
                    <div
                      className={styles.colorDot}
                      style={{
                        background: p.square.color
                          ? PROPERTY_COLOR_HEX[p.square.color] ?? '#888'
                          : '#888',
                      }}
                    />
                    <span className={styles.name}>{p.square.name.replace('\n', ' ')}</span>
                    {p.isMortgaged ? (
                      <span className={styles.mortgageBadge}>
                        📋 Hypothek <em>{p.square.mortgageValue ?? 0}€</em>
                      </span>
                    ) : (
                      <span className={styles.info}>
                        {icon}
                        <span className={styles.value}>{value}</span>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
