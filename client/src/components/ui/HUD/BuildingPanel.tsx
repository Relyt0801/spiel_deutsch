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
  // Usable on your own turn — including while deciding whether to buy a street,
  // so you can raise cash by selling buildings / taking mortgages.
  const canManage = isMyTurn && ['end_turn', 'rolling', 'buying'].includes(phase)

  const me = gameState.players.find(p => p.id === myId)
  if (!canManage || !me) return null

  const myProps = me.properties
    .map(idx => ({ idx, sq: BOARD_SQUARES[idx], prop: gameState.properties[idx] }))
    .filter(p => p.sq && p.prop)
    .sort((a, b) => a.idx - b.idx)

  if (myProps.length === 0) return null

  // Which buildable color groups do I fully own?
  const fullyOwned = new Set(
    Object.entries(COLOR_GROUPS)
      .filter(([group, indices]) =>
        group !== 'railroad' && group !== 'utility' &&
        indices.every(i => gameState.properties[i]?.ownerId === myId))
      .map(([group]) => group)
  )

  const emit = (ev: 'game:buy-house' | 'game:sell-house' | 'game:buy-hotel' | 'game:sell-hotel'
    | 'game:mortgage' | 'game:unmortgage' | 'game:sell-all-buildings', idx: number) =>
    getSocket().emit(ev, { propertyIndex: idx })

  return (
    <div className={styles.container}>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}>
        🏗️ Verwalten {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>Häuser & Hypotheken</div>
          {myProps.map(({ idx, sq, prop }) => {
            const buildable = sq.type === 'property' && fullyOwned.has(sq.group ?? '')
            const canBuyHouse = buildable && !prop.hotel && prop.houses < 4 && !prop.isMortgaged && me.money >= (sq.houseCost || 999)
            const canBuyHotel = buildable && prop.houses === 4 && !prop.hotel && me.money >= (sq.houseCost || 999)
            const hasBuildings = prop.houses > 0 || prop.hotel
            const canMortgage = !prop.isMortgaged && !hasBuildings
            const unmortCost = Math.floor((sq.mortgageValue || 0) * 1.1)
            const canUnmortgage = prop.isMortgaged && me.money >= unmortCost

            return (
              <div key={idx} className={styles.property}>
                <div className={styles.propTop}>
                  <span className={styles.dot} style={{ background: sq.color ? PROPERTY_COLOR_HEX[sq.color] ?? '#888' : '#888' }} />
                  <span className={styles.propName}>{sq.name.replace('\n', ' ')}</span>
                  <span className={styles.propState}>
                    {prop.isMortgaged ? '📋 Hypothek'
                      : prop.hotel ? '🏨 Hotel'
                      : prop.houses > 0 ? `🏠 ×${prop.houses}`
                      : '—'}
                  </span>
                </div>
                <div className={styles.propBtns}>
                  {canBuyHouse && (
                    <button onClick={() => emit('game:buy-house', idx)}>+🏠 {sq.houseCost}€</button>
                  )}
                  {canBuyHotel && (
                    <button className={styles.hotelBtn} onClick={() => emit('game:buy-hotel', idx)}>+🏨 {sq.houseCost}€</button>
                  )}
                  {hasBuildings && (
                    <>
                      <button className={styles.sellBtn} onClick={() => emit(prop.hotel ? 'game:sell-hotel' : 'game:sell-house', idx)}>
                        −{prop.hotel ? '🏨' : '🏠'}
                      </button>
                      <button className={styles.sellAllBtn} onClick={() => emit('game:sell-all-buildings', idx)}>
                        Alle verkaufen
                      </button>
                    </>
                  )}
                  {canMortgage && (
                    <button className={styles.mortBtn} onClick={() => emit('game:mortgage', idx)}>
                      🔒 belasten +{sq.mortgageValue}€
                    </button>
                  )}
                  {canUnmortgage && (
                    <button className={styles.unmortBtn} onClick={() => emit('game:unmortgage', idx)}>
                      🔓 einlösen −{unmortCost}€
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
