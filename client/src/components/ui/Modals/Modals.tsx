import { useUiStore } from '../../../store/uiStore'
import { useGameStore } from '../../../store/gameStore'
import { useSocketStore } from '../../../store/socketStore'
import { getSocket } from '../../../socket/socketClient'
import { BOARD_SQUARES, PROPERTY_COLOR_HEX } from '../../../config/boardData'
import { PLAYER_COLORS } from '../../../types/game'
import type { GameState } from '../../../types/game'
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
        {activeModal === 'winner' && (
          <WinnerModal gameState={gameState} closeModal={closeModal} />
        )}
      </div>
    </div>
  )
}

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
              <div>Miete (ohne Häuser): {square.rent[0]}€</div>
              <div>Mit 1 Klassenraum: {square.rent[1]}€</div>
              <div>Mit 2 Klassenräumen: {square.rent[2]}€</div>
              <div>Mit 3 Klassenräumen: {square.rent[3]}€</div>
              <div>Mit 4 Klassenräumen: {square.rent[4]}€</div>
              <div>Mit Schulgebäude: {square.rent[5]}€</div>
              <div>Klassenraum-Kosten: {square.houseCost}€</div>
            </div>
          )}
          <div className={styles.btnRow}>
            <button className={styles.btnBuy} onClick={() => { getSocket().emit('game:buy-property'); closeModal() }}>
              ✅ Kaufen ({square.price}€)
            </button>
            <button className={styles.btnAuction} onClick={() => { getSocket().emit('game:decline-property'); closeModal() }}>
              🔨 Auktion starten
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

interface CardModalProps {
  data: Record<string, unknown>
  closeModal: () => void
}

function CardModal({ data, closeModal }: CardModalProps) {
  const cardType = data.cardType as 'chance' | 'community'
  const card = data.card as { id: string; text: string }
  const isChance = cardType === 'chance'

  return (
    <div className={styles.cardModal}>
      <div className={styles.cardHeader} style={{ background: isChance ? '#FF8C00' : '#4169E1' }}>
        {isChance ? '❓ Stundenplanwechsel' : '📋 Klassenbuch'}
      </div>
      <div className={styles.cardText}>{card.text}</div>
      <button className={styles.btnClose} onClick={() => {
        closeModal()
        getSocket().emit('game:card-acknowledge')
      }}>
        OK, verstanden
      </button>
    </div>
  )
}

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

interface AuctionModalProps {
  myId: string | null
  gameState: GameState
}

function AuctionModal({ myId, gameState }: AuctionModalProps) {
  const auction = gameState.auction
  if (!auction) return null
  const square = BOARD_SQUARES[auction.propertyIndex]

  const handleBid = () => {
    const input = prompt('Dein Gebot (€):')
    const amount = parseInt(input || '0')
    if (amount > 0) getSocket().emit('auction:bid', { amount })
  }

  const alreadyPassed = myId ? auction.passedPlayers.includes(myId) : false

  return (
    <div>
      <h2 className={styles.modalTitle}>🔨 Auktion: {square?.name.replace('\n', ' ')}</h2>
      <p className={styles.propPrice}>
        Höchstgebot: <strong>{auction.highestBid}€</strong>
        {auction.highestBidderId && ` von ${gameState.players.find(p => p.id === auction.highestBidderId)?.name}`}
      </p>
      <div className={styles.auctionTimer}>⏱ {auction.timeRemaining}s</div>
      {!alreadyPassed && (
        <div className={styles.btnRow}>
          <button className={styles.btnBuy} onClick={handleBid}>💰 Bieten</button>
          <button className={styles.btnAuction} onClick={() => getSocket().emit('auction:pass')}>🚫 Passen</button>
        </div>
      )}
      {alreadyPassed && (
        <p className={styles.smallText}>Du hast gepasst. Warte auf das Ende der Auktion...</p>
      )}
    </div>
  )
}

interface WinnerModalProps {
  gameState: GameState
  closeModal: () => void
}

function WinnerModal({ gameState, closeModal }: WinnerModalProps) {
  const winner = gameState.players.find(p => p.id === gameState.winnerId)

  return (
    <div className={styles.winnerModal}>
      <div className={styles.winnerEmoji}>🏆</div>
      <h2 className={styles.winnerTitle}>{winner?.name} hat gewonnen!</h2>
      <p className={styles.winnerText}>
        Herzlichen Glückwunsch! Du hast das Remigianum Monopoly gewonnen mit {winner?.money.toLocaleString('de-DE')}€ im Konto!
      </p>
      <button className={styles.btnClose} onClick={closeModal}>Neues Spiel</button>
    </div>
  )
}
