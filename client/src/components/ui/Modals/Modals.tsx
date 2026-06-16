import { useState, useEffect, useCallback } from 'react'
import { useUiStore } from '../../../store/uiStore'
import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { getSocket } from '../../../socket/socketClient'
import { BOARD_SQUARES, PROPERTY_COLOR_HEX } from '../../../config/boardData'
import { PLAYER_COLORS } from '../../../types/game'
import type { GameState, TradeOffer } from '../../../types/game'
import styles from './Modals.module.css'

export function Modals() {
  const activeModal = useUiStore(s => s.activeModal)
  const modalData = useUiStore(s => s.modalData) as Record<string, unknown>
  const closeModal = useUiStore(s => s.closeModal)
  const gameState = useGameStore(s => s.gameState)
  const myId = useSocketStore(s => s.myPlayerId)

  if (!activeModal || !gameState) return null

  const isWide = activeModal === 'trade'

  return (
    <div className={styles.overlay}>
      <div className={isWide ? styles.modalWide : styles.modal}>
        {activeModal === 'property' && (
          <PropertyModal data={modalData} myId={myId} gameState={gameState} closeModal={closeModal} />
        )}
        {activeModal === 'card' && (
          <CardModal data={modalData} closeModal={closeModal} />
        )}
        {activeModal === 'jail' && (
          <JailModal myId={myId} gameState={gameState} closeModal={closeModal} />
        )}
        {activeModal === 'auction' && (
          <AuctionModal myId={myId} gameState={gameState} />
        )}
        {activeModal === 'trade' && (
          <TradeModal myId={myId} gameState={gameState} closeModal={closeModal} />
        )}
        {activeModal === 'winner' && (
          <WinnerModal gameState={gameState} closeModal={closeModal} />
        )}
      </div>
    </div>
  )
}

// ─── Property ────────────────────────────────────────────────────────────────

interface PropertyModalProps {
  data: Record<string, unknown>
  myId: string | null
  gameState: GameState
  closeModal: () => void
}

function PropertyModal({ data, myId, gameState, closeModal }: PropertyModalProps) {
  const propertyIndex = data.propertyIndex as number
  const canBuy = data.canBuy as boolean
  const ownerId = data.ownerId as string | null
  const rentDue = data.rentDue as number | null
  const square = BOARD_SQUARES[propertyIndex]
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId
  const colorHex = square.color ? PROPERTY_COLOR_HEX[square.color] : null

  return (
    <div>
      {colorHex && <div className={styles.propStrip} style={{ background: colorHex }} />}
      <h2 className={styles.modalTitle}>{square.name.replace('\n', ' ')}</h2>

      {canBuy && isMyTurn && (
        <>
          <p className={styles.propPrice}>💰 Kaufpreis: <strong>{square.price}€</strong></p>
          {square.type === 'property' && (
            <div className={styles.rentTable}>
              <div>Miete (kein Gebäude): {square.rent[0]}€</div>
              <div>1 Klassenraum: {square.rent[1]}€</div>
              <div>2 Klassenräume: {square.rent[2]}€</div>
              <div>3 Klassenräume: {square.rent[3]}€</div>
              <div>4 Klassenräume: {square.rent[4]}€</div>
              <div>Schulgebäude: {square.rent[5]}€</div>
              <div>Klassenraum kostet: {square.houseCost}€</div>
            </div>
          )}
          <div className={styles.btnRow}>
            <button className={styles.btnBuy} onClick={() => { getSocket().emit('game:buy-property'); closeModal() }}>
              ✅ Kaufen ({square.price}€)
            </button>
            <button className={styles.btnAuction} onClick={() => { getSocket().emit('game:decline-property'); closeModal() }}>
              🔨 Auktion
            </button>
          </div>
        </>
      )}

      {rentDue !== null && ownerId && (
        <>
          <p className={styles.rentInfo}>
            👤 Eigentümer: <strong>{gameState.players.find(p => p.id === ownerId)?.name}</strong>
          </p>
          <p className={styles.rentInfo}>💸 Miete: <strong>{rentDue}€</strong></p>
          <p className={styles.smallText}>Miete wurde automatisch abgebucht.</p>
          <button className={styles.btnClose} onClick={closeModal}>OK</button>
        </>
      )}

      {!canBuy && ownerId === myId && (
        <>
          <p className={styles.smallText}>Das gehört dir bereits.</p>
          <button className={styles.btnClose} onClick={closeModal}>OK</button>
        </>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardModalProps {
  data: Record<string, unknown>
  closeModal: () => void
}

function CardModal({ data, closeModal }: CardModalProps) {
  const cardType = data.cardType as 'chance' | 'community'
  const card = data.card as { id: string; text: string }
  const isMyTurn = (data.isMyTurn as boolean) ?? false
  const isChance = cardType === 'chance'

  useEffect(() => {
    if (!isMyTurn) {
      const t = setTimeout(() => closeModal(), 4000)
      return () => clearTimeout(t)
    }
  }, [isMyTurn, closeModal])

  return (
    <div className={styles.cardModal}>
      <div className={styles.cardHeader} style={{ background: isChance ? '#d97706' : '#2563eb' }}>
        {isChance ? '❓ Stundenplanwechsel' : '📋 Klassenbuch'}
      </div>
      <div className={styles.cardText}>{card.text}</div>
      {isMyTurn ? (
        <button className={styles.btnClose} onClick={() => {
          closeModal()
          getSocket().emit('game:card-acknowledge')
        }}>
          OK, verstanden
        </button>
      ) : (
        <p className={styles.smallText}>Schließt automatisch...</p>
      )}
    </div>
  )
}

// ─── Jail ─────────────────────────────────────────────────────────────────────

interface JailModalProps {
  myId: string | null
  gameState: GameState
  closeModal: () => void
}

function JailModal({ myId, gameState, closeModal }: JailModalProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId

  return (
    <div>
      <h2 className={styles.modalTitle}>🔒 Nachsitz-Zimmer</h2>
      <p className={styles.propPrice}>Du musst nachsitzen! (Runde {currentPlayer?.jailTurns}/3)</p>
      {isMyTurn && (
        <div className={styles.btnRow}>
          <button className={styles.btnBuy} disabled={currentPlayer.money < 50}
            onClick={() => { getSocket().emit('game:jail-pay'); closeModal() }}>
            💰 50€ zahlen & frei sein
          </button>
          {currentPlayer.getOutOfJailCards > 0 && (
            <button className={styles.btnAuction}
              onClick={() => { getSocket().emit('game:jail-use-card'); closeModal() }}>
              🃏 Befreiungskarte nutzen
            </button>
          )}
          <button className={styles.btnEnd}
            onClick={() => { getSocket().emit('game:jail-roll'); closeModal() }}>
            🎲 Würfeln (Pasch = frei)
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Auction ──────────────────────────────────────────────────────────────────

interface AuctionModalProps {
  myId: string | null
  gameState: GameState
}

function AuctionModal({ myId, gameState }: AuctionModalProps) {
  const [bidAmount, setBidAmount] = useState('')
  const auction = gameState.auction
  if (!auction) return null

  const square = BOARD_SQUARES[auction.propertyIndex]
  const alreadyPassed = myId ? auction.passedPlayers.includes(myId) : false
  const me = gameState.players.find(p => p.id === myId)
  const minBid = auction.highestBid + 1
  const numBid = parseInt(bidAmount) || 0

  const handleBid = () => {
    if (numBid >= minBid && me && numBid <= me.money) {
      getSocket().emit('auction:bid', { amount: numBid })
      setBidAmount('')
    }
  }

  return (
    <div>
      <h2 className={styles.modalTitle}>🔨 Auktion</h2>
      <p className={styles.auctionProp}>{square?.name.replace('\n', ' ')}</p>

      <div className={styles.auctionMeta}>
        <span>Startpreis: <strong>{square.price}€</strong></span>
        <span>Höchstgebot: <strong>{auction.highestBid}€</strong>
          {auction.highestBidderId && (
            <span className={styles.bidLeader}> – {gameState.players.find(p => p.id === auction.highestBidderId)?.name}</span>
          )}
        </span>
      </div>

      <div className={styles.auctionTimer}>⏱ {auction.timeRemaining}s</div>

      <div className={styles.bidderList}>
        {gameState.players.filter(p => p.isActive && !p.isBankrupt).map(p => {
          const passed = auction.passedPlayers.includes(p.id)
          const isLeading = p.id === auction.highestBidderId
          return (
            <div key={p.id} className={`${styles.bidderRow} ${isLeading ? styles.leading : ''} ${passed ? styles.passed : ''}`}>
              <div className={styles.bidderDot} style={{ background: PLAYER_COLORS[p.color] || '#ccc' }} />
              <span>{p.name}{p.id === myId ? ' (Du)' : ''}</span>
              <span className={styles.bidderAmount}>
                {passed ? '🚫 Gepasst' : auction.bids[p.id] ? `${auction.bids[p.id]}€` : '–'}
              </span>
            </div>
          )
        })}
      </div>

      {!alreadyPassed && me && (
        <div className={styles.bidInputRow}>
          <input
            type="number"
            className={styles.bidInput}
            value={bidAmount}
            placeholder={`Min. ${minBid}€`}
            min={minBid}
            max={me.money}
            onChange={e => setBidAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBid()}
          />
          <button className={styles.btnBuy}
            disabled={numBid < minBid || numBid > me.money}
            onClick={handleBid}>
            💰 Bieten
          </button>
          <button className={styles.btnAuction} onClick={() => getSocket().emit('auction:pass')}>
            🚫 Passen
          </button>
        </div>
      )}
      {alreadyPassed && (
        <p className={styles.smallText}>Du hast gepasst. Warte auf das Ende der Auktion...</p>
      )}
    </div>
  )
}

// ─── Trade ────────────────────────────────────────────────────────────────────

interface TradeModalProps {
  myId: string | null
  gameState: GameState
  closeModal: () => void
}

function TradeSide({ label, color, properties, money }: {
  label: string; color: string; properties: number[]; money: number
}) {
  return (
    <div className={styles.tradeCol}>
      <div className={styles.tradeColHeader} style={{ borderColor: color }}>
        <span className={styles.tradeColDot} style={{ background: color }} />
        {label}
      </div>
      <div className={styles.tradePropList}>
        {properties.map(i => (
          <div key={i} className={styles.tradeProp}>
            <span className={styles.tradePropDot} style={{ background: PROPERTY_COLOR_HEX[BOARD_SQUARES[i]?.color || ''] || '#888' }} />
            {BOARD_SQUARES[i]?.name}
          </div>
        ))}
        {money > 0 && <div className={styles.tradeMoney}>💰 {money.toLocaleString('de-DE')}€</div>}
        {properties.length === 0 && money === 0 && <div className={styles.tradeNothing}>–</div>}
      </div>
    </div>
  )
}

function TradeModal({ myId, gameState, closeModal }: TradeModalProps) {
  const trade = gameState.activeTrade as TradeOffer | null
  const [showCounter, setShowCounter] = useState(false)
  const [counterOfferedMoney, setCounterOfferedMoney] = useState('')
  const [counterRequestedMoney, setCounterRequestedMoney] = useState('')
  const [counterOfferedProps, setCounterOfferedProps] = useState<number[]>([])
  const [counterRequestedProps, setCounterRequestedProps] = useState<number[]>([])

  const resetCounter = useCallback(() => {
    setShowCounter(false)
    setCounterOfferedMoney('')
    setCounterRequestedMoney('')
    setCounterOfferedProps([])
    setCounterRequestedProps([])
  }, [])

  useEffect(() => { resetCounter() }, [trade?.id, resetCounter])

  if (!trade) return null

  const fromPlayer = gameState.players.find(p => p.id === trade.fromPlayerId)
  const toPlayer = gameState.players.find(p => p.id === trade.toPlayerId)
  const isFromPlayer = myId === trade.fromPlayerId
  const isToPlayer = myId === trade.toPlayerId
  const isInvolved = isFromPlayer || isToPlayer
  const isObserver = !isInvolved

  const fromColor = PLAYER_COLORS[fromPlayer?.color as keyof typeof PLAYER_COLORS] || '#888'
  const toColor = PLAYER_COLORS[toPlayer?.color as keyof typeof PLAYER_COLORS] || '#888'

  const myPlayer = isFromPlayer ? fromPlayer : toPlayer
  const myProps = myPlayer?.properties ?? []

  const isPendingConfirm = trade.status === 'pending_confirm'
  const iHaveConfirmed = isPendingConfirm && trade.confirmedBy.includes(myId ?? '')

  const toggleProp = (idx: number, list: number[], setList: (v: number[]) => void) => {
    setList(list.includes(idx) ? list.filter(i => i !== idx) : [...list, idx])
  }

  const submitCounter = () => {
    getSocket().emit('trade:counter', {
      offeredProperties: counterOfferedProps,
      requestedProperties: counterRequestedProps,
      offeredMoney: parseInt(counterOfferedMoney) || 0,
      requestedMoney: parseInt(counterRequestedMoney) || 0,
    })
    resetCounter()
  }

  const otherPlayer = isFromPlayer ? toPlayer : fromPlayer
  const otherProps = otherPlayer?.properties ?? []

  return (
    <div className={styles.tradeWrap}>
      <div className={styles.tradeHeader}>
        <span className={styles.tradeTitle}>🤝 Handelsangebot</span>
        <span className={styles.tradeMeta}>
          <strong style={{ color: fromColor }}>{fromPlayer?.name}</strong>
          {' ⇄ '}
          <strong style={{ color: toColor }}>{toPlayer?.name}</strong>
        </span>
      </div>

      {isPendingConfirm && (
        <div className={styles.tradeConfirmBanner}>
          ✅ Angebot angenommen – beide müssen bestätigen
          <div className={styles.tradeConfirmAvatars}>
            {[fromPlayer, toPlayer].map(p => p && (
              <span key={p.id} className={`${styles.tradeConfirmBadge} ${trade.confirmedBy.includes(p.id) ? styles.tradeConfirmed : ''}`}
                style={{ borderColor: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#888' }}>
                {p.name} {trade.confirmedBy.includes(p.id) ? '✓' : '…'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.tradeColumns}>
        <TradeSide
          label={`${fromPlayer?.name} bietet`}
          color={fromColor}
          properties={trade.offeredProperties}
          money={trade.offeredMoney}
        />
        <div className={styles.tradeArrow}>⇄</div>
        <TradeSide
          label={`${toPlayer?.name} gibt`}
          color={toColor}
          properties={trade.requestedProperties}
          money={trade.requestedMoney}
        />
      </div>

      {isObserver && !isPendingConfirm && (
        <div className={styles.tradeWaiting}>👀 Handel läuft – du bist Zuschauer</div>
      )}

      {!isPendingConfirm && isToPlayer && !showCounter && (
        <div className={styles.btnRow}>
          <button className={styles.btnBuy} onClick={() => getSocket().emit('trade:accept', { tradeId: trade.id })}>
            ✅ Annehmen
          </button>
          <button className={styles.btnAuction} onClick={() => setShowCounter(true)}>
            🔄 Gegenangebot
          </button>
          <button className={styles.btnEnd} onClick={() => { getSocket().emit('trade:reject', { tradeId: trade.id }); closeModal() }}>
            ❌ Ablehnen
          </button>
        </div>
      )}

      {!isPendingConfirm && isFromPlayer && (
        <div className={styles.tradeWaiting}>⏳ Warte auf Antwort von {toPlayer?.name}…</div>
      )}

      {showCounter && isToPlayer && (
        <div className={styles.counterSection}>
          <div className={styles.counterTitle}>Dein Gegenangebot</div>
          <div className={styles.counterColumns}>
            <div className={styles.counterCol}>
              <div className={styles.counterColLabel} style={{ color: toColor }}>Du bietest (deine Straßen)</div>
              <div className={styles.counterPropList}>
                {myProps.map(i => (
                  <button key={i} className={`${styles.counterPropBtn} ${counterOfferedProps.includes(i) ? styles.counterSelected : ''}`}
                    onClick={() => toggleProp(i, counterOfferedProps, setCounterOfferedProps)}>
                    <span className={styles.tradePropDot} style={{ background: PROPERTY_COLOR_HEX[BOARD_SQUARES[i]?.color || ''] || '#888' }} />
                    {BOARD_SQUARES[i]?.name}
                  </button>
                ))}
              </div>
              <div className={styles.counterMoneyRow}>
                <span>+ Geld:</span>
                <input type="number" className={styles.counterInput} value={counterOfferedMoney}
                  placeholder="0" min={0} max={myPlayer?.money ?? 0}
                  onChange={e => setCounterOfferedMoney(e.target.value)} />
                <span>€</span>
              </div>
            </div>
            <div className={styles.tradeArrow}>⇄</div>
            <div className={styles.counterCol}>
              <div className={styles.counterColLabel} style={{ color: fromColor }}>Du verlangst (deren Straßen)</div>
              <div className={styles.counterPropList}>
                {otherProps.map(i => (
                  <button key={i} className={`${styles.counterPropBtn} ${counterRequestedProps.includes(i) ? styles.counterSelected : ''}`}
                    onClick={() => toggleProp(i, counterRequestedProps, setCounterRequestedProps)}>
                    <span className={styles.tradePropDot} style={{ background: PROPERTY_COLOR_HEX[BOARD_SQUARES[i]?.color || ''] || '#888' }} />
                    {BOARD_SQUARES[i]?.name}
                  </button>
                ))}
              </div>
              <div className={styles.counterMoneyRow}>
                <span>+ Geld:</span>
                <input type="number" className={styles.counterInput} value={counterRequestedMoney}
                  placeholder="0" min={0}
                  onChange={e => setCounterRequestedMoney(e.target.value)} />
                <span>€</span>
              </div>
            </div>
          </div>
          <div className={styles.btnRow}>
            <button className={styles.btnBuy} onClick={submitCounter}>📨 Senden</button>
            <button className={styles.btnEnd} onClick={resetCounter}>Abbrechen</button>
          </div>
        </div>
      )}

      {isPendingConfirm && isInvolved && !iHaveConfirmed && (
        <div className={styles.btnRow}>
          <button className={styles.btnBuy} onClick={() => getSocket().emit('trade:confirm', { tradeId: trade.id })}>
            ✅ Bestätigen
          </button>
          <button className={styles.btnEnd} onClick={() => { getSocket().emit('trade:reject', { tradeId: trade.id }); closeModal() }}>
            ❌ Ablehnen
          </button>
        </div>
      )}

      {isPendingConfirm && iHaveConfirmed && (
        <div className={styles.tradeWaiting}>⏳ Du hast bestätigt – warte auf die andere Seite…</div>
      )}
    </div>
  )
}

// ─── Winner ───────────────────────────────────────────────────────────────────

interface WinnerModalProps {
  gameState: GameState
  closeModal: () => void
}

function WinnerModal({ gameState, closeModal }: WinnerModalProps) {
  const winner = gameState.players.find(p => p.id === gameState.winnerId)
  const sorted = [...gameState.players].sort((a, b) => {
    if (a.isBankrupt && !b.isBankrupt) return 1
    if (!a.isBankrupt && b.isBankrupt) return -1
    return b.money - a.money
  })

  return (
    <div className={styles.winnerModal}>
      <div className={styles.winnerEmoji}>🏆</div>
      <h2 className={styles.winnerTitle}>{winner?.name} hat gewonnen!</h2>
      <p className={styles.winnerText}>Herzlichen Glückwunsch! Das Remigianum Monopoly ist entschieden.</p>

      <div className={styles.standings}>
        {sorted.map((p, rank) => (
          <div key={p.id} className={`${styles.standingRow} ${p.isBankrupt ? styles.bankrupt : ''}`}>
            <span className={styles.rank}>{rank + 1}.</span>
            <div className={styles.standingDot} style={{ background: PLAYER_COLORS[p.color] || '#ccc' }} />
            <span className={styles.standingName}>{p.name}</span>
            <span className={styles.standingMoney}>
              {p.isBankrupt ? '💸 Bankrott' : `${p.money.toLocaleString('de-DE')}€`}
            </span>
          </div>
        ))}
      </div>

      <button className={styles.btnClose} onClick={closeModal}>Neues Spiel</button>
    </div>
  )
}
