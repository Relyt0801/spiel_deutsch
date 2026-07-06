import { useState, useEffect } from 'react'
import { useUiStore } from '../../../store/uiStore'
import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { getSocket } from '../../../socket/socketClient'
import { clearSavedRoom } from '../../../socket/session'
import { BOARD_SQUARES, PROPERTY_COLOR_HEX, COLOR_GROUPS } from '../../../config/boardData'
import { EVENT_TITLES } from '../../../config/events'
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

function RentTable({ square }: { square: typeof BOARD_SQUARES[number] }) {
  if (square.type === 'property') {
    return (
      <div className={styles.rentTable}>
        {[
          { n: 0, label: 'Ohne Gebäude', amount: square.rent[0] },
          { n: 1, label: '1 Klassenraum', amount: square.rent[1] },
          { n: 2, label: '2 Klassenräume', amount: square.rent[2] },
          { n: 3, label: '3 Klassenräume', amount: square.rent[3] },
          { n: 4, label: '4 Klassenräume', amount: square.rent[4] },
        ].map(({ n, label, amount }) => (
          <div key={label} className={styles.rentRow}>
            <span className={styles.houseSlots}>
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className={i < n ? styles.houseFilled : styles.houseEmpty} />
              ))}
            </span>
            <span className={styles.rentLabel}>{label}</span>
            <span className={styles.rentAmt}>{amount}€</span>
          </div>
        ))}
        <div className={styles.rentRow}>
          <span className={styles.houseSlots}>
            <span className={styles.hotelBlock}>H</span>
          </span>
          <span className={styles.rentLabel}>Schulgebäude</span>
          <span className={styles.rentAmt}>{square.rent[5]}€</span>
        </div>
        <div className={styles.rentSep} />
        <div className={styles.rentRow}>
          <span className={styles.houseSlots} />
          <span className={styles.rentLabel} style={{ opacity: 0.5 }}>Klassenraum kostet</span>
          <span className={styles.rentAmt} style={{ opacity: 0.5 }}>{square.houseCost}€</span>
        </div>
      </div>
    )
  }
  if (square.type === 'railroad') {
    return (
      <div className={styles.rentTable}>
        {[25, 50, 100, 200].map((amt, i) => (
          <div key={i} className={styles.rentRow}>
            <span className={styles.houseSlots}>
              {Array.from({ length: 4 }, (_, j) => (
                <span key={j} className={j <= i ? styles.busFilled : styles.houseEmpty} />
              ))}
            </span>
            <span className={styles.rentLabel}>{i + 1} Schulbus{i > 0 ? 'se' : ''}</span>
            <span className={styles.rentAmt}>{amt}€</span>
          </div>
        ))}
      </div>
    )
  }
  if (square.type === 'utility') {
    return (
      <div className={styles.rentTable}>
        <div className={styles.rentRow}>
          <span className={styles.rentLabel}>1 Versorgungswerk</span>
          <span className={styles.rentAmt}>Würfel × 4</span>
        </div>
        <div className={styles.rentRow}>
          <span className={styles.rentLabel}>Beide Werke</span>
          <span className={styles.rentAmt}>Würfel × 10</span>
        </div>
      </div>
    )
  }
  return null
}

function OwnerControls({ propertyIndex, gameState, myId }: {
  propertyIndex: number; gameState: GameState; myId: string | null
}) {
  const sq = BOARD_SQUARES[propertyIndex]
  const prop = gameState.properties[propertyIndex]
  if (!prop || prop.ownerId !== myId) return null

  const name = sq.name.replace('\n', ' ')
  const me = gameState.players.find(p => p.id === myId)
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId
  const canManageNow = isMyTurn && ['rolling', 'end_turn', 'buying'].includes(gameState.gamePhase)
  const money = me?.money ?? 0
  const houseCost = sq.houseCost ?? 0
  const refund = Math.floor(houseCost / 2)
  const unmortCost = Math.floor((sq.mortgageValue ?? 0) * 1.1)

  const isBuildable = sq.type === 'property'
  const groupIndices = sq.group ? (COLOR_GROUPS[sq.group] ?? []) : []
  const ownsAll = isBuildable && groupIndices.length > 0 && groupIndices.every(i => gameState.properties[i]?.ownerId === myId)
  const maxHouses = ownsAll ? Math.max(...groupIndices.map(i => gameState.properties[i].houses)) : 0
  const hasBuildings = prop.houses > 0 || prop.hotel

  // Build (house, or "Schulgebäude" once 4 houses are reached)
  const isHotelBuild = prop.houses === 4 && !prop.hotel
  const canBuildHouse = ownsAll && !prop.hotel && prop.houses < 4 && prop.houses <= maxHouses && !prop.isMortgaged && money >= houseCost && gameState.bankHouses > 0
  const canBuildHotel = ownsAll && prop.houses === 4 && !prop.hotel && money >= houseCost && gameState.bankHotels > 0
  const buildLabel = isHotelBuild ? '🏨 Schulgebäude' : '🏠 Haus bauen'
  const canBuild = isHotelBuild ? canBuildHotel : canBuildHouse
  const doBuild = () => getSocket().emit(isHotelBuild ? 'game:buy-hotel' : 'game:buy-house', { propertyIndex })

  // Sell (one building)
  const sellLabel = prop.hotel ? '🏨 Schulgebäude verkaufen' : '🏠 Haus verkaufen'
  const doSell = () => {
    const msg = prop.hotel
      ? `Schulgebäude auf „${name}" für ${refund}€ verkaufen?`
      : `Einen Klassenraum auf „${name}" für ${refund}€ verkaufen?`
    if (window.confirm(msg)) getSocket().emit(prop.hotel ? 'game:sell-hotel' : 'game:sell-house', { propertyIndex })
  }

  // Mortgage (only without buildings) / un-mortgage
  const mortLabel = prop.isMortgaged ? '🔓 Hypothek auflösen' : '🔒 Hypothek aufnehmen'
  const canMort = prop.isMortgaged ? money >= unmortCost : !hasBuildings
  const doMort = () => {
    const msg = prop.isMortgaged
      ? `Hypothek auf „${name}" für ${unmortCost}€ auflösen?`
      : `Hypothek auf „${name}" aufnehmen und ${sq.mortgageValue}€ erhalten?`
    if (window.confirm(msg)) getSocket().emit(prop.isMortgaged ? 'game:unmortgage' : 'game:mortgage', { propertyIndex })
  }

  return (
    <div className={styles.ownerControls}>
      {!canManageNow && <p className={styles.manageHint}>⏳ Verwalten nur in deinem Zug möglich.</p>}
      {isBuildable && (
        <div className={styles.manageRow}>
          <button className={styles.mSell} disabled={!canManageNow || !(prop.houses > 0 || prop.hotel)} onClick={doSell}>
            {sellLabel}
          </button>
          <button className={styles.mBuild} disabled={!canManageNow || !canBuild} onClick={doBuild}>
            {buildLabel}
          </button>
        </div>
      )}
      <button className={styles.mMort} disabled={!canManageNow || !canMort} onClick={doMort}>
        {mortLabel}
      </button>
    </div>
  )
}

function PropertyModal({ data, myId, gameState, closeModal }: PropertyModalProps) {
  const propertyIndex = data.propertyIndex as number
  const canBuy = data.canBuy as boolean
  const ownerId = data.ownerId as string | null
  const rentDue = data.rentDue as number | null
  const infoOnly = (data.infoOnly as boolean) ?? false
  const square = BOARD_SQUARES[propertyIndex]
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId
  const colorHex = square.color ? PROPERTY_COLOR_HEX[square.color] : null

  // Read-only info card (opened by clicking a street on the board)
  if (infoOnly) {
    const ps = gameState.properties.find(p => p.boardIndex === propertyIndex)
    const owner = ps?.ownerId ? gameState.players.find(pl => pl.id === ps.ownerId) : null
    return (
      <div>
        {colorHex && <div className={styles.propStrip} style={{ background: colorHex }} />}
        <h2 className={styles.modalTitle}>{square.name.replace('\n', ' ')}</h2>
        {square.price != null && (
          <p className={styles.propPrice}>💰 Kaufpreis: <strong>{square.price}€</strong></p>
        )}
        <p className={styles.rentInfo}>
          {owner ? (
            <>
              <span className={styles.ownerDot} style={{ background: PLAYER_COLORS[owner.color] || '#888' }} />
              Eigentümer: <strong>{owner.name}{owner.id === myId ? ' (Du)' : ''}</strong>
              {ps?.isMortgaged && <span className={styles.mortNote}> · 📋 Hypothek aktiv</span>}
            </>
          ) : (
            <span style={{ opacity: 0.7 }}>Noch frei – nicht gekauft</span>
          )}
        </p>
        <RentTable square={square} />
        {square.mortgageValue != null && (
          <p className={styles.smallText}>Hypothekenwert: {square.mortgageValue}€</p>
        )}
        <OwnerControls propertyIndex={propertyIndex} gameState={gameState} myId={myId} />
        <button className={styles.btnClose} onClick={closeModal}>Schließen</button>
      </div>
    )
  }

  const isBuyDecision = isMyTurn && gameState.gamePhase === 'buying'
  const me = gameState.players.find(p => p.id === myId)
  const price = square.price ?? 0
  const canAfford = (me?.money ?? 0) >= price

  return (
    <div>
      {colorHex && <div className={styles.propStrip} style={{ background: colorHex }} />}
      <div className={styles.propHeadRow}>
        <h2 className={styles.modalTitle}>{square.name.replace('\n', ' ')}</h2>
        {isBuyDecision && (
          <button className={styles.closeIconBtn} title="Schließen – Geld beschaffen" onClick={closeModal}>✕</button>
        )}
      </div>

      {isBuyDecision && (
        <>
          <p className={styles.propPrice}>
            💰 Kaufpreis: <strong>{price}€</strong>
            <span className={styles.cashHint}> · Dein Geld: {(me?.money ?? 0).toLocaleString('de-DE')}€</span>
          </p>
          <RentTable square={square} />
          {!canAfford && (
            <p className={styles.warnHint}>
              Nicht genug Geld. Schließe dieses Fenster (✕), um über „🏗️ Verwalten“ Häuser zu
              verkaufen oder Hypotheken aufzunehmen – danach kannst du noch kaufen. Oder gib die Straße zur Auktion frei.
            </p>
          )}
          <div className={styles.btnRow}>
            <button className={styles.btnBuy} disabled={!canAfford}
              onClick={() => { getSocket().emit('game:buy-property'); closeModal() }}>
              ✅ Kaufen ({price}€)
            </button>
            <button className={styles.btnAuction} onClick={() => { getSocket().emit('game:decline-property'); closeModal() }}>
              🔨 Auktion / Ablehnen
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
      // Observers can't click "OK" – leave the card up long enough to read the (longer) text.
      const t = setTimeout(() => closeModal(), 8000)
      return () => clearTimeout(t)
    }
  }, [isMyTurn, closeModal])

  const title = EVENT_TITLES[card.id]

  return (
    <div className={styles.cardModal}>
      <div className={styles.cardHeader} style={{ background: isChance ? '#d97706' : '#2563eb' }}>
        {isChance ? '⚡ Ereignis' : '📋 Klassenbuch'}
      </div>
      {title && <div className={styles.cardTitle}>{title}</div>}
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
  // Spieler ohne genug Geld für das Mindestgebot können nicht mitbieten.
  const canAffordMinBid = !!me && me.money >= minBid

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

      {!alreadyPassed && me && me.money < minBid && (
        <p className={styles.warnHint}>💸 Zu wenig Geld zum Mitbieten (du hast {me.money.toLocaleString('de-DE')}€). Du kannst nur passen.</p>
      )}

      {!alreadyPassed && me && (
        <>
          {!canAffordMinBid && (
            <p className={styles.warnHint}>
              💸 Du hast nur {me.money.toLocaleString('de-DE')}€ – das reicht nicht für das
              Mindestgebot von {minBid}€. Du kannst diese Auktion nur passen.
            </p>
          )}
          <div className={styles.bidInputRow}>
            <input
              type="number"
              className={styles.bidInput}
              value={bidAmount}
              placeholder={`Min. ${minBid}€`}
              min={minBid}
              max={me.money}
              disabled={!canAffordMinBid}
              onChange={e => setBidAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBid()}
            />
            <button className={styles.btnBuy}
              disabled={!canAffordMinBid || numBid < minBid || numBid > me.money}
              onClick={handleBid}>
              💰 Bieten
            </button>
            <button className={styles.btnAuction} onClick={() => getSocket().emit('auction:pass')}>
              🚫 Passen
            </button>
          </div>
        </>
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

/** Read-only column used to display a side of the trade to spectators. */
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
            {BOARD_SQUARES[i]?.name.replace('\n', ' ')}
          </div>
        ))}
        {money > 0 && <div className={styles.tradeMoney}>💰 {money.toLocaleString('de-DE')}€</div>}
        {properties.length === 0 && money === 0 && <div className={styles.tradeNothing}>–</div>}
      </div>
    </div>
  )
}

/** Editable column: pick which of `options` to put on the table, plus a money amount. */
function TradeEditCol({ title, color, options, selected, onToggle, money, onMoney, maxMoney }: {
  title: string; color: string; options: number[]; selected: number[]
  onToggle: (i: number) => void; money: number; onMoney: (v: number) => void; maxMoney: number
}) {
  return (
    <div className={styles.tradeCol}>
      <div className={styles.tradeColHeader} style={{ borderColor: color }}>
        <span className={styles.tradeColDot} style={{ background: color }} />
        {title}
      </div>
      <div className={styles.counterPropList}>
        {options.length === 0 && <div className={styles.tradeNothing}>Keine Grundstücke</div>}
        {options.map(i => (
          <button key={i}
            className={`${styles.counterPropBtn} ${selected.includes(i) ? styles.counterSelected : ''}`}
            onClick={() => onToggle(i)}>
            <span className={styles.tradePropDot} style={{ background: PROPERTY_COLOR_HEX[BOARD_SQUARES[i]?.color || ''] || '#888' }} />
            {BOARD_SQUARES[i]?.name.replace('\n', ' ')}
          </button>
        ))}
      </div>
      <div className={styles.counterMoneyRow}>
        <span>+ Geld:</span>
        <input type="number" className={styles.counterInput} value={money || ''} placeholder="0"
          min={0} max={maxMoney}
          onChange={e => onMoney(Math.max(0, Math.min(maxMoney, parseInt(e.target.value) || 0)))} />
        <span>€</span>
      </div>
    </div>
  )
}

const sortedEq = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false
  const sa = [...a].sort((x, y) => x - y)
  const sb = [...b].sort((x, y) => x - y)
  return sa.every((v, i) => v === sb[i])
}

function TradeModal({ myId, gameState, closeModal }: TradeModalProps) {
  const trade = gameState.activeTrade as TradeOffer | null
  const tradeTime = useUiStore(s => s.tradeTimeRemaining)
  const me = gameState.players.find(p => p.id === myId)
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myId
  const isMortgaged = (bi: number) =>
    gameState.properties.find(p => p.boardIndex === bi)?.isMortgaged ?? false
  const toggleArr = (arr: number[], set: (v: number[]) => void, idx: number) =>
    set(arr.includes(idx) ? arr.filter(i => i !== idx) : [...arr, idx])

  // ── Setup state (no active trade yet) ──
  const [targetId, setTargetId] = useState<string | null>(null)
  const [sOff, setSOff] = useState<number[]>([])
  const [sReq, setSReq] = useState<number[]>([])
  const [sOffM, setSOffM] = useState(0)
  const [sReqM, setSReqM] = useState(0)

  // ── Negotiation draft (active trade, from MY perspective) ──
  const [dGive, setDGive] = useState<number[]>([])
  const [dGet, setDGet] = useState<number[]>([])
  const [dGiveM, setDGiveM] = useState(0)
  const [dGetM, setDGetM] = useState(0)

  const isFrom = trade ? myId === trade.fromPlayerId : false
  const isTo = trade ? myId === trade.toPlayerId : false
  const involved = isFrom || isTo

  // Current offer mapped to my perspective.
  const myGiveProps = trade ? (isFrom ? trade.offeredProperties : trade.requestedProperties) : []
  const myGetProps = trade ? (isFrom ? trade.requestedProperties : trade.offeredProperties) : []
  const myGiveMoney = trade ? (isFrom ? trade.offeredMoney : trade.requestedMoney) : 0
  const myGetMoney = trade ? (isFrom ? trade.requestedMoney : trade.offeredMoney) : 0

  // Re-sync the draft whenever the canonical offer changes (a new proposal / counter arrived).
  const sig = trade
    ? `${trade.id}|${[...trade.offeredProperties].sort().join(',')}|${trade.offeredMoney}|${[...trade.requestedProperties].sort().join(',')}|${trade.requestedMoney}|${trade.fromPlayerId}`
    : ''
  useEffect(() => {
    if (!trade) return
    setDGive(myGiveProps); setDGet(myGetProps); setDGiveM(myGiveMoney); setDGetM(myGetMoney)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  // ── SETUP MODE ──────────────────────────────────────────────────────────────
  if (!trade) {
    const canPropose = isMyTurn && gameState.gamePhase === 'end_turn'
    const target = targetId ? gameState.players.find(p => p.id === targetId) : null
    const others = gameState.players.filter(p => p.id !== myId && p.isActive && !p.isBankrupt)
    const myProps = (me?.properties ?? []).filter(i => !isMortgaged(i))
    const theirProps = (target?.properties ?? []).filter(i => !isMortgaged(i))
    const canSend = !!(targetId && (sOff.length > 0 || sReq.length > 0 || sOffM > 0 || sReqM > 0))

    const propose = () => {
      if (!targetId) return
      getSocket().emit('trade:propose', {
        fromPlayerId: myId ?? '', toPlayerId: targetId,
        offeredProperties: sOff, requestedProperties: sReq,
        offeredMoney: sOffM, requestedMoney: sReqM,
      })
    }

    if (!canPropose) {
      return (
        <div className={styles.tradeWrap}>
          <div className={styles.tradeHeader}>
            <span className={styles.tradeTitle}>🤝 Handeln</span>
            <button className={styles.closeIconBtn} onClick={closeModal}>✕</button>
          </div>
          <div className={styles.tradeWaiting}>Handeln ist nur am Ende deines eigenen Zuges möglich.</div>
        </div>
      )
    }

    return (
      <div className={styles.tradeWrap}>
        <div className={styles.tradeHeader}>
          <span className={styles.tradeTitle}>🤝 Handel vorschlagen</span>
          <button className={styles.closeIconBtn} onClick={closeModal}>✕</button>
        </div>

        <div className={styles.partnerRow}>
          <span className={styles.partnerLabel}>Mit wem handeln?</span>
          <div className={styles.partnerBtns}>
            {others.map(p => (
              <button key={p.id}
                className={`${styles.partnerBtn} ${targetId === p.id ? styles.partnerActive : ''}`}
                style={targetId === p.id ? { borderColor: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#888' } : {}}
                onClick={() => { setTargetId(p.id); setSReq([]); setSReqM(0) }}>
                <span className={styles.partnerDot} style={{ background: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#888' }} />
                {p.name}{p.isBot ? ' 🤖' : ''}
              </button>
            ))}
          </div>
        </div>

        {target && (
          <>
            <div className={styles.tradeColumns}>
              <TradeEditCol title={`Du gibst (${me?.name})`}
                color={PLAYER_COLORS[me?.color as keyof typeof PLAYER_COLORS] || '#888'}
                options={myProps} selected={sOff} onToggle={i => toggleArr(sOff, setSOff, i)}
                money={sOffM} onMoney={setSOffM} maxMoney={me?.money ?? 0} />
              <div className={styles.tradeArrow}>⇄</div>
              <TradeEditCol title={`Du forderst (${target.name})`}
                color={PLAYER_COLORS[target.color as keyof typeof PLAYER_COLORS] || '#888'}
                options={theirProps} selected={sReq} onToggle={i => toggleArr(sReq, setSReq, i)}
                money={sReqM} onMoney={setSReqM} maxMoney={target.money} />
            </div>
            <div className={styles.btnRow}>
              <button className={styles.btnBuy} disabled={!canSend} onClick={propose}>
                🤝 Handel vorschlagen
              </button>
              <button className={styles.btnClose} onClick={closeModal}>Abbrechen</button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── ACTIVE TRADE MODE ─────────────────────────────────────────────────────────
  const fromPlayer = gameState.players.find(p => p.id === trade.fromPlayerId)
  const toPlayer = gameState.players.find(p => p.id === trade.toPlayerId)
  const fromColor = PLAYER_COLORS[fromPlayer?.color as keyof typeof PLAYER_COLORS] || '#888'
  const toColor = PLAYER_COLORS[toPlayer?.color as keyof typeof PLAYER_COLORS] || '#888'

  const otherPlayer = isFrom ? toPlayer : fromPlayer
  const myColor = isFrom ? fromColor : toColor
  const otherColor = isFrom ? toColor : fromColor
  const myOwnProps = (me?.properties ?? []).filter(i => !isMortgaged(i))
  const theirProps = (otherPlayer?.properties ?? []).filter(i => !isMortgaged(i))

  const iHaveConfirmed = trade.confirmedBy.includes(myId ?? '')
  const draftChanged = !(
    sortedEq(dGive, myGiveProps) && sortedEq(dGet, myGetProps) &&
    dGiveM === myGiveMoney && dGetM === myGetMoney
  )
  const draftHasContent = dGive.length > 0 || dGet.length > 0 || dGiveM > 0 || dGetM > 0

  const sendCounter = () => {
    getSocket().emit('trade:counter', {
      offeredProperties: dGive, requestedProperties: dGet,
      offeredMoney: dGiveM, requestedMoney: dGetM,
    })
  }
  const confirm = () => getSocket().emit('trade:confirm', { tradeId: trade.id })
  const cancel = () => { getSocket().emit('trade:reject', { tradeId: trade.id }); closeModal() }

  return (
    <div className={styles.tradeWrap}>
      <div className={styles.tradeHeader}>
        <span className={styles.tradeTitle}>🤝 Handel</span>
        <span className={styles.tradeMeta}>
          <strong style={{ color: fromColor }}>{fromPlayer?.name}</strong>
          {' ⇄ '}
          <strong style={{ color: toColor }}>{toPlayer?.name}</strong>
        </span>
        {gameState.settings?.timeLimit && tradeTime != null && (
          <span className={`${styles.tradeTimer} ${tradeTime <= 15 ? styles.tradeTimerLow : ''}`}>
            ⏱ {Math.floor(tradeTime / 60)}:{String(Math.max(0, tradeTime % 60)).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Confirmation status — visible to everyone */}
      <div className={styles.tradeConfirmAvatars}>
        {[fromPlayer, toPlayer].map(p => p && (
          <span key={p.id}
            className={`${styles.tradeConfirmBadge} ${trade.confirmedBy.includes(p.id) ? styles.tradeConfirmed : ''}`}
            style={{ borderColor: PLAYER_COLORS[p.color as keyof typeof PLAYER_COLORS] || '#888' }}>
            {p.name} {trade.confirmedBy.includes(p.id) ? '✓ bereit' : '… offen'}
          </span>
        ))}
      </div>

      {involved ? (
        <>
          <div className={styles.tradeColumns}>
            <TradeEditCol title="Du gibst" color={myColor}
              options={myOwnProps} selected={dGive} onToggle={i => toggleArr(dGive, setDGive, i)}
              money={dGiveM} onMoney={setDGiveM} maxMoney={me?.money ?? 0} />
            <div className={styles.tradeArrow}>⇄</div>
            <TradeEditCol title={`Du bekommst (${otherPlayer?.name})`} color={otherColor}
              options={theirProps} selected={dGet} onToggle={i => toggleArr(dGet, setDGet, i)}
              money={dGetM} onMoney={setDGetM} maxMoney={otherPlayer?.money ?? 0} />
          </div>

          {draftChanged && (
            <div className={styles.tradeWaiting}>
              ✏️ Du hast den Tausch geändert – sende dein Angebot, danach müssen beide neu bestätigen.
            </div>
          )}

          <div className={styles.btnRow}>
            {draftChanged ? (
              <button className={styles.btnBuy} disabled={!draftHasContent} onClick={sendCounter}>
                📨 Angebot senden
              </button>
            ) : iHaveConfirmed ? (
              <button className={styles.btnBuy} disabled>
                ⏳ Warte auf {otherPlayer?.name}…
              </button>
            ) : (
              <button className={styles.btnBuy} onClick={confirm}>
                ✅ Tausch bestätigen
              </button>
            )}
            <button className={styles.btnEnd} onClick={cancel}>❌ Abbrechen</button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.tradeColumns}>
            <TradeSide label={`${fromPlayer?.name} gibt`} color={fromColor}
              properties={trade.offeredProperties} money={trade.offeredMoney} />
            <div className={styles.tradeArrow}>⇄</div>
            <TradeSide label={`${toPlayer?.name} gibt`} color={toColor}
              properties={trade.requestedProperties} money={trade.requestedMoney} />
          </div>
          <div className={styles.tradeWaiting}>👀 Du bist Zuschauer – nur die Handelspartner können handeln.</div>
        </>
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
  const isHost = useSocketStore(s => s.isHost)
  const winner = gameState.players.find(p => p.id === gameState.winnerId)

  // Leaderboard by total assets (cash + un-mortgaged property + buildings).
  const assets = (p: GameState['players'][number]) => {
    let total = p.money
    for (const idx of p.properties) {
      const sq = BOARD_SQUARES[idx]
      const ps = gameState.properties[idx]
      if (!sq || !ps) continue
      if (!ps.isMortgaged) total += sq.price ?? 0
      const hc = sq.houseCost ?? 0
      total += ps.houses * hc + (ps.hotel ? hc * 5 : 0)
    }
    return total
  }
  const sorted = [...gameState.players].sort((a, b) => {
    if (a.isBankrupt && !b.isBankrupt) return 1
    if (!a.isBankrupt && b.isBankrupt) return -1
    return assets(b) - assets(a)
  })
  const medal = ['🥇', '🥈', '🥉']

  const playAgain = () => { getSocket().emit('room:play-again'); closeModal() }
  const toMenu = () => {
    getSocket().emit('room:leave')
    clearSavedRoom()
    useGameStore.getState().clearGame()
    useUiStore.getState().setAppPhase('menu')
    closeModal()
  }

  return (
    <div className={styles.winnerModal}>
      <div className={styles.winnerEmoji}>🏆</div>
      <h2 className={styles.winnerTitle}>{winner?.name} hat gewonnen!</h2>
      <p className={styles.winnerText}>Endstand des Remigianum Monopoly:</p>

      <div className={styles.standings}>
        {sorted.map((p, rank) => (
          <div key={p.id} className={`${styles.standingRow} ${p.isBankrupt ? styles.bankrupt : ''} ${rank === 0 && !p.isBankrupt ? styles.standingTop : ''}`}>
            <span className={styles.rank}>{!p.isBankrupt && medal[rank] ? medal[rank] : `${rank + 1}.`}</span>
            <div className={styles.standingDot} style={{ background: PLAYER_COLORS[p.color] || '#ccc' }} />
            <span className={styles.standingName}>{p.name}</span>
            <span className={styles.standingMoney}>
              {p.isBankrupt ? '💸 Bankrott' : `${assets(p).toLocaleString('de-DE')}€`}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.btnRow}>
        {isHost ? (
          <button className={styles.btnBuy} onClick={playAgain}>🔁 Noch eine Runde</button>
        ) : (
          <span className={styles.smallText}>Warte auf den Host für eine neue Runde…</span>
        )}
        <button className={styles.btnEnd} onClick={toMenu}>🏠 Hauptmenü</button>
      </div>
    </div>
  )
}
