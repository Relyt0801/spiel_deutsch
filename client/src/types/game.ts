export type PieceType = 'Radiergummi' | 'Lineal' | 'Bleistift' | 'Spitzer' | 'Tintenfüller' | 'Buch' | 'Schere' | 'Globus'

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'cyan'

export type GamePhase =
  | 'lobby'
  | 'rolling'
  | 'moving'
  | 'landed'
  | 'buying'
  | 'auctioning'
  | 'paying_rent'
  | 'card_drawn'
  | 'jail_decision'
  | 'trading'
  | 'building'
  | 'end_turn'
  | 'game_over'
  | 'debt_settlement'

/** An open debt the current player must cover by selling/mortgaging before continuing. */
export interface DebtInfo {
  debtorId: string
  amount: number
  creditorId: string | null
  toParkingPot: boolean
  reason: string
}

export interface Player {
  id: string
  name: string
  color: PlayerColor
  piece: PieceType
  position: number
  money: number
  properties: number[]
  jailTurns: number
  getOutOfJailCards: number
  isBankrupt: boolean
  isActive: boolean
  doublesCount: number
  isBot: boolean
  skipTurns?: number
  extraTurn?: boolean
  disconnected?: boolean
}

export interface PropertyState {
  boardIndex: number
  ownerId: string | null
  houses: number
  hotel: boolean
  isMortgaged: boolean
}

export interface DiceRoll {
  die1: number
  die2: number
  isDouble: boolean
  total: number
}

export interface AuctionState {
  propertyIndex: number
  highestBid: number
  highestBidderId: string | null
  bids: Record<string, number>
  passedPlayers: string[]
  isActive: boolean
  timeRemaining: number
}

export interface TradeOffer {
  id: string
  fromPlayerId: string
  toPlayerId: string
  offeredProperties: number[]
  requestedProperties: number[]
  offeredMoney: number
  requestedMoney: number
  status: 'pending' | 'countered' | 'pending_confirm' | 'accepted' | 'rejected' | 'cancelled'
  confirmedBy: string[]
}

export interface GameCard {
  id: string
  text: string
  action: string
  target?: number
  amount?: number
  house?: number
  hotel?: number
  nearest?: boolean
  doubleRent?: boolean
}

export interface GameLog {
  timestamp: number
  message: string
  type: 'info' | 'warning' | 'success'
}

export type BankruptcyMode = 'creditorAll' | 'creditorMoney' | 'release' | 'auction'

export interface GameSettings {
  goDoubleMoney: boolean
  bankruptcyMode: BankruptcyMode
  timeLimit: boolean
}

export const DEFAULT_SETTINGS: GameSettings = {
  goDoubleMoney: false,
  bankruptcyMode: 'auction',
  timeLimit: false,
}

export interface GameState {
  roomCode: string
  hostId: string
  gamePhase: GamePhase
  players: Player[]
  currentPlayerIndex: number
  playerOrder: string[]
  properties: PropertyState[]
  currentDiceRoll: DiceRoll | null
  pendingCardAction: GameCard | null
  auction: AuctionState | null
  auctionQueue: number[]
  activeTrade: TradeOffer | null
  bankHouses: number
  bankHotels: number
  chanceDeck: string[]
  communityDeck: string[]
  chanceDiscardPile: string[]
  communityDiscardPile: string[]
  log: GameLog[]
  winnerId: string | null
  freeParkingMoney: number
  settings: GameSettings
  debt: DebtInfo | null
}

export const STARTING_MONEY = 1500

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: '#CC0000',
  blue: '#0066CC',
  green: '#009933',
  yellow: '#FFCC00',
  purple: '#9933CC',
  orange: '#FF6600',
  pink: '#FF66B3',
  cyan: '#00B3B3',
}

export const PIECE_LABELS: Record<PieceType, string> = {
  Radiergummi: '🩷',
  Lineal: '📏',
  Bleistift: '✏️',
  Spitzer: '⚙️',
  Tintenfüller: '🖊️',
  Buch: '📚',
  Schere: '✂️',
  Globus: '🌍',
}
