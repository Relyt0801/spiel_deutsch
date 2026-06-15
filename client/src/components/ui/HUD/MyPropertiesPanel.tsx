import { useState } from 'react'
import { BOARD_SQUARES, PROPERTY_COLOR_HEX } from '../../../config/boardData'
import type { GameState } from '../../../types/game'
import styles from './MyPropertiesPanel.module.css'

interface Props {
  gameState: GameState
  myId: string | null
}

export function MyPropertiesPanel({ gameState, myId }: Props) {
  const [open, setOpen] = useState(false)

  const myProperties = gameState.properties
    .filter(p => p.ownerId === myId)
    .map(p => ({ ...p, square: BOARD_SQUARES[p.boardIndex] }))
    .filter(p => p.square)

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.toggleBtn} ${open ? styles.active : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        🏘️ Meine Straßen ({myProperties.length})
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>Meine Grundstücke</div>

          {myProperties.length === 0 ? (
            <div className={styles.empty}>Noch keine Grundstücke</div>
          ) : (
            <div className={styles.list}>
              {myProperties.map(p => (
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
                  <span className={styles.name}>{p.square.name}</span>
                  <span className={styles.buildings}>
                    {p.isMortgaged
                      ? '📋 Pfand'
                      : p.hotel
                      ? '🏨 ×1'
                      : p.houses > 0
                      ? `🏠 ×${p.houses}`
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
