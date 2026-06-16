import { useState } from 'react'
import type { GameState } from '../../../types/game'
import { BOARD_SQUARES, PROPERTY_COLOR_HEX } from '../../../config/boardData'
import { PLAYER_COLORS } from '../../../types/game'
import { getSocket } from '../../../socket/socketClient'
import styles from './TradePanel.module.css'

interface Props {
  gameState: GameState
  myId: string | null
}

function PropertyTag({ index, selected, onClick }: { index: number; selected: boolean; onClick: () => void }) {
  const sq = BOARD_SQUARES[index]
  const colorHex = sq.color ? PROPERTY_COLOR_HEX[sq.color] : '#888'
  return (
    <button
      className={`${styles.propTag} ${selected ? styles.propTagSelected : ''}`}
      onClick={onClick}
    >
      <span className={styles.propDot} style={{ background: colorHex }} />
      <span className={styles.propName}>{sq.name.replace('\n', ' ')}</span>
      <span className={styles.propPrice}>{sq.price}€</span>
    </button>
  )
}

export function TradePanel({ gameState, myId }: Props) {
  const [open, setOpen] = useState(false)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [offeredProps, setOfferedProps] = useState<number[]>([])
  const [requestedProps, setRequestedProps] = useState<number[]>([])
  const [offeredMoney, setOfferedMoney] = useState(0)
  const [requestedMoney, setRequestedMoney] = useState(0)

  const phase = gameState.gamePhase
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId
  const canTrade = isMyTurn && (phase === 'end_turn' || phase === 'rolling')

  if (!canTrade) return null

  const me = gameState.players.find(p => p.id === myId)
  if (!me) return null

  const otherPlayers = gameState.players.filter(p => p.id !== myId && p.isActive && !p.isBankrupt)
  if (otherPlayers.length === 0) return null

  const target = targetId ? gameState.players.find(p => p.id === targetId) : null
  const myTradable = me.properties.filter(i => !gameState.properties[i]?.isMortgaged)
  const theirTradable = (target?.properties || []).filter(i => !gameState.properties[i]?.isMortgaged)

  const toggle = (arr: number[], set: (v: number[]) => void, idx: number) =>
    set(arr.includes(idx) ? arr.filter(i => i !== idx) : [...arr, idx])

  const handlePropose = () => {
    if (!targetId) return
    getSocket().emit('trade:propose', {
      fromPlayerId: myId,
      toPlayerId: targetId,
      offeredProperties: offeredProps,
      requestedProperties: requestedProps,
      offeredMoney,
      requestedMoney,
    })
    setOpen(false)
    setTargetId(null)
    setOfferedProps([])
    setRequestedProps([])
    setOfferedMoney(0)
    setRequestedMoney(0)
  }

  const canPropose = targetId && (offeredProps.length > 0 || offeredMoney > 0 || requestedProps.length > 0 || requestedMoney > 0)

  return (
    <>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}>
        🤝 Handeln
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.panel} onClick={e => e.stopPropagation()}>
            <div className={styles.panelHeader}>
              <span>🤝 Handel vorschlagen</span>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* Target player selection */}
            <div className={styles.targetRow}>
              <span className={styles.sectionLabel}>Mit wem handeln?</span>
              <div className={styles.targetBtns}>
                {otherPlayers.map(p => (
                  <button
                    key={p.id}
                    className={`${styles.targetBtn} ${targetId === p.id ? styles.targetActive : ''}`}
                    style={targetId === p.id ? { borderColor: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] } : {}}
                    onClick={() => { setTargetId(p.id); setRequestedProps([]) }}
                  >
                    <span className={styles.targetDot} style={{ background: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#888' }} />
                    {p.name}
                    {p.isBot && <span className={styles.botLabel}>🤖</span>}
                  </button>
                ))}
              </div>
            </div>

            {target && (
              <div className={styles.columns}>
                {/* LEFT: My side */}
                <div className={styles.col}>
                  <div className={styles.colHeader}>
                    <span className={styles.colDot} style={{ background: PLAYER_COLORS[me.color as keyof typeof PLAYER_COLORS] || '#888' }} />
                    <strong>{me.name}</strong>
                    <span className={styles.money}>💰 {me.money.toLocaleString('de-DE')}€</span>
                  </div>
                  <div className={styles.colLabel}>Du bietest:</div>
                  <div className={styles.propList}>
                    {myTradable.length === 0 && <div className={styles.emptyMsg}>Keine Grundstücke</div>}
                    {myTradable.map(i => (
                      <PropertyTag key={i} index={i}
                        selected={offeredProps.includes(i)}
                        onClick={() => toggle(offeredProps, setOfferedProps, i)} />
                    ))}
                  </div>
                  <div className={styles.moneyInput}>
                    <span>+ Geld:</span>
                    <input type="number" min={0} max={me.money}
                      value={offeredMoney || ''}
                      placeholder="0"
                      onChange={e => setOfferedMoney(Math.max(0, Math.min(me.money, parseInt(e.target.value) || 0)))}
                    />
                    <span>€</span>
                  </div>
                </div>

                <div className={styles.arrow}>⇄</div>

                {/* RIGHT: Their side */}
                <div className={styles.col}>
                  <div className={styles.colHeader}>
                    <span className={styles.colDot} style={{ background: PLAYER_COLORS[target.color as keyof typeof PLAYER_COLORS] || '#888' }} />
                    <strong>{target.name}</strong>
                    {target.isBot && <span className={styles.botLabel}>🤖</span>}
                    <span className={styles.money}>💰 {target.money.toLocaleString('de-DE')}€</span>
                  </div>
                  <div className={styles.colLabel}>Du verlangst:</div>
                  <div className={styles.propList}>
                    {theirTradable.length === 0 && <div className={styles.emptyMsg}>Keine Grundstücke</div>}
                    {theirTradable.map(i => (
                      <PropertyTag key={i} index={i}
                        selected={requestedProps.includes(i)}
                        onClick={() => toggle(requestedProps, setRequestedProps, i)} />
                    ))}
                  </div>
                  <div className={styles.moneyInput}>
                    <span>+ Geld:</span>
                    <input type="number" min={0}
                      value={requestedMoney || ''}
                      placeholder="0"
                      onChange={e => setRequestedMoney(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span>€</span>
                  </div>
                </div>
              </div>
            )}

            {target && (
              <button className={styles.proposeBtn} disabled={!canPropose} onClick={handlePropose}>
                🤝 Handel vorschlagen
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
