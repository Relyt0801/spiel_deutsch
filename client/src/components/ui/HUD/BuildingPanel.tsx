import { useState } from 'react'
import type { GameState } from '../../../types/game'
import { BOARD_SQUARES, COLOR_GROUPS, PROPERTY_COLOR_HEX } from '../../../config/boardData'
import { getSocket } from '../../../socket/socketClient'
import styles from './BuildingPanel.module.css'

interface Props {
  gameState: GameState
  myId: string | null
}

export function BuildingPanel({ gameState, myId }: Props) {
  const [open, setOpen] = useState(false)
  const phase = gameState.gamePhase
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId
  const canManage = isMyTurn && (phase === 'end_turn' || phase === 'rolling')

  if (!canManage) return null

  const myProperties = (gameState.players.find(p => p.id === myId)?.properties || [])
    .filter(idx => {
      const sq = BOARD_SQUARES[idx]
      return sq.type === 'property'
    })

  // Which groups are fully owned by me?
  const ownedGroups = Object.entries(COLOR_GROUPS).filter(([group, indices]) => {
    if (group === 'railroad' || group === 'utility') return false
    return indices.every(i => gameState.properties[i]?.ownerId === myId)
  })

  if (ownedGroups.length === 0) return null

  const me = gameState.players.find(p => p.id === myId)!

  return (
    <div className={styles.container}>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}>
        🏗️ Bauen {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className={styles.panel}>
          {ownedGroups.map(([group, indices]) => (
            <div key={group} className={styles.group}>
              <div
                className={styles.groupHeader}
                style={{ background: PROPERTY_COLOR_HEX[group] || '#ccc' }}
              >
                {group}
              </div>
              {indices.map(idx => {
                const sq = BOARD_SQUARES[idx]
                const prop = gameState.properties[idx]
                const canBuyHouse = !prop.hotel && prop.houses < 4 && me.money >= (sq.houseCost || 999)
                const canBuyHotel = prop.houses === 4 && !prop.hotel && me.money >= (sq.houseCost || 999)
                const canSell = prop.houses > 0 || prop.hotel
                const canMortgage = !prop.isMortgaged && prop.houses === 0 && !prop.hotel
                const canUnmortgage = prop.isMortgaged && me.money >= Math.floor((sq.mortgageValue || 0) * 1.1)

                return (
                  <div key={idx} className={styles.property}>
                    <div className={styles.propName}>{sq.name.replace('\n', ' ')}</div>
                    <div className={styles.propInfo}>
                      {prop.hotel ? '🏢 Schulgebäude'
                        : prop.houses > 0 ? `🏠 ${prop.houses} Klassenraum${prop.houses > 1 ? 'e' : ''}`
                        : prop.isMortgaged ? '🔒 Verpfändet'
                        : 'Kein Gebäude'}
                    </div>
                    <div className={styles.propBtns}>
                      {canBuyHouse && (
                        <button onClick={() => getSocket().emit('game:buy-house', { propertyIndex: idx })}>
                          +🏠 {sq.houseCost}€
                        </button>
                      )}
                      {canBuyHotel && (
                        <button className={styles.hotelBtn} onClick={() => getSocket().emit('game:buy-hotel', { propertyIndex: idx })}>
                          +🏢 {sq.houseCost}€
                        </button>
                      )}
                      {canSell && (
                        <button className={styles.sellBtn} onClick={() => {
                          if (prop.hotel) getSocket().emit('game:sell-hotel', { propertyIndex: idx })
                          else getSocket().emit('game:sell-house', { propertyIndex: idx })
                        }}>
                          -{prop.hotel ? '🏢' : '🏠'}
                        </button>
                      )}
                      {canMortgage && (
                        <button className={styles.mortBtn} onClick={() => getSocket().emit('game:mortgage', { propertyIndex: idx })}>
                          🔒 {sq.mortgageValue}€
                        </button>
                      )}
                      {canUnmortgage && (
                        <button className={styles.unmortBtn} onClick={() => getSocket().emit('game:unmortgage', { propertyIndex: idx })}>
                          🔓 {Math.floor((sq.mortgageValue || 0) * 1.1)}€
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
