import { useState } from 'react'
import type { GameState } from '../../../types/game'
import { BOARD_SQUARES } from '../../../config/boardData'
import { getSocket } from '../../../socket/socketClient'
import styles from './TradePanel.module.css'

interface Props {
  gameState: GameState
  myId: string | null
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
    <div className={styles.container}>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}>
        🤝 Handeln {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.section}>
            <div className={styles.label}>Mit wem handeln?</div>
            <div className={styles.playerBtns}>
              {otherPlayers.map(p => (
                <button
                  key={p.id}
                  className={`${styles.playerBtn} ${targetId === p.id ? styles.active : ''}`}
                  onClick={() => { setTargetId(p.id); setRequestedProps([]) }}
                >
                  {p.name} ({p.money.toLocaleString('de-DE')}€)
                </button>
              ))}
            </div>
          </div>

          {target && (
            <>
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.label}>Du bietest:</div>
                {myTradable.length === 0 && <div className={styles.empty}>Keine handelbaren Grundstücke</div>}
                {myTradable.map(i => (
                  <label key={i} className={styles.check}>
                    <input type="checkbox" checked={offeredProps.includes(i)}
                      onChange={() => toggle(offeredProps, setOfferedProps, i)} />
                    {BOARD_SQUARES[i].name.replace('\n', ' ')}
                  </label>
                ))}
                <div className={styles.moneyRow}>
                  <span>+ Geld:</span>
                  <input type="number" className={styles.numInput} min={0} max={me.money}
                    value={offeredMoney || ''} placeholder="0"
                    onChange={e => setOfferedMoney(Math.max(0, Math.min(me.money, parseInt(e.target.value) || 0)))} />
                  <span>€</span>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.label}>Du verlangst von {target.name}:</div>
                {theirTradable.length === 0 && <div className={styles.empty}>Keine handelbaren Grundstücke</div>}
                {theirTradable.map(i => (
                  <label key={i} className={styles.check}>
                    <input type="checkbox" checked={requestedProps.includes(i)}
                      onChange={() => toggle(requestedProps, setRequestedProps, i)} />
                    {BOARD_SQUARES[i].name.replace('\n', ' ')}
                  </label>
                ))}
                <div className={styles.moneyRow}>
                  <span>+ Geld:</span>
                  <input type="number" className={styles.numInput} min={0}
                    value={requestedMoney || ''} placeholder="0"
                    onChange={e => setRequestedMoney(Math.max(0, parseInt(e.target.value) || 0))} />
                  <span>€</span>
                </div>
              </div>

              <button className={styles.proposeBtn} disabled={!canPropose} onClick={handlePropose}>
                🤝 Handel vorschlagen
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
