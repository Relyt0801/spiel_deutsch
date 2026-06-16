import { useState, useEffect } from 'react'
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

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
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

function TradeModal({ myId, gameState, closeModal }: TradeModalProps) {
  const trade = gameState.activeTrade as TradeOffer | null
  if (!trade) return null

  const fromPlayer = gameState.players.find(p => p.id === trade.fromPlayerId)
  const toPlayer = gameState.players.find(p => p.id === trade.toPlayerId)
  const isReceiver = myId === trade.toPlayerId

  return (
    <div>
      <h2 className={styles.modalTitle}>🤝 Handelsangebot</h2>
      <p className={styles.tradeMeta}>
        <strong>{fromPlayer?.name}</strong> möchte mit <strong>{toPlayer?.name}</strong> handeln
      </p>

      <div className={styles.tradeColumns}>
        <div className={styles.tradeCol}>
          <div className={styles.tradeColHeader} style={{ color: PLAYER_COLORS[fromPlayer?.color || 'red'] }}>
            {fromPlayer?.name} bietet:
          </div>
          {trade.offeredProperties.length > 0 && trade.offeredProperties.map(i => (
            <div key={i} className={styles.tradeProp}>
              {BOARD_SQUARES[i].name.replace('\n', ' ')}
            </div>
          ))}
          {trade.offeredMoney > 0 && (
            <div className={styles.tradeMoney}>💰 {trade.offeredMoney.toLocaleString('de-DE')}€</div>
          )}
          {trade.offeredProperties.length === 0 && trade.offeredMoney === 0 && (
            <div className={styles.tradeNothing}>Nichts</div>
          )}
        </div>

        <div className={styles.tradeArrow}>⇄</div>

        <div className={styles.tradeCol}>
          <div className={styles.tradeColHeader} style={{ color: PLAYER_COLORS[toPlayer?.color || 'blue'] }}>
            {toPlayer?.name} gibt:
          </div>
          {trade.requestedProperties.length > 0 && trade.requestedProperties.map(i => (
            <div key={i} className={styles.tradeProp}>
              {BOARD_SQUARES[i].name.replace('\n', ' ')}
            </div>
          ))}
          {trade.requestedMoney > 0 && (
            <div className={styles.tradeMoney}>💰 {trade.requestedMoney.toLocaleString('de-DE')}€</div>
          )}
          {trade.requestedProperties.length === 0 && trade.requestedMoney === 0 && (
            <div className={styles.tradeNothing}>Nichts</div>
          )}
        </div>
      </div>

      {isReceiver ? (
        <div className={styles.btnRow}>
          <button className={styles.btnBuy} onClick={() => {
            getSocket().emit('trade:accept', { tradeId: trade.id })
            closeModal()
          }}>
            ✅ Annehmen
          </button>
          <button className={styles.btnAuction} onClick={() => {
            getSocket().emit('trade:reject', { tradeId: trade.id })
            closeModal()
          }}>
            ❌ Ablehnen
          </button>
        </div>
      ) : (
        <div className={styles.tradeWaiting}>
          ⏳ Warte auf Antwort von {toPlayer?.name}...
        </div>
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
