export type PieceType = 'Radiergummi' | 'Lineal' | 'Bleistift' | 'Spitzer' | 'Tintenfüller' | 'Buch'

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'

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
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
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
}

export const STARTING_MONEY = 1500

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: '#CC0000',
  blue: '#0066CC',
  green: '#009933',
  yellow: '#FFCC00',
  purple: '#9933CC',
  orange: '#FF6600',
}

export const PIECE_LABELS: Record<PieceType, string> = {
  Radiergummi: '🩷',
  Lineal: '📏',
  Bleistift: '✏️',
  Spitzer: '⚙️',
  Tintenfüller: '🖊️',
  Buch: '📚',
}
