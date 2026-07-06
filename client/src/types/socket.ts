import type { GameState, Player, DiceRoll, AuctionState, TradeOffer, GameCard, PlayerColor, PieceType, GameSettings } from './game'

export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string; color: PlayerColor; piece: PieceType; clientToken?: string }) => void
  'room:join': (payload: { roomCode: string; playerName: string; color: PlayerColor; piece: PieceType; clientToken?: string }) => void
  'room:rejoin': (payload: { roomCode: string; clientToken: string }) => void
  'room:play-again': () => void
  'room:peek': (payload: { roomCode: string }) => void
  'room:leave': () => void
  'room:start-game': () => void
  'room:kick-player': (payload: { playerId: string }) => void
  'room:add-bot': () => void
  'room:toggle-ready': () => void

  'game:roll-dice': () => void
  'game:buy-property': () => void
  'game:decline-property': () => void
  'game:end-turn': () => void
  'game:movement-complete': () => void
  'game:card-acknowledge': () => void

  'game:jail-pay': () => void
  'game:jail-use-card': () => void
  'game:jail-roll': () => void

  'game:buy-house': (payload: { propertyIndex: number }) => void
  'game:sell-house': (payload: { propertyIndex: number }) => void
  'game:buy-hotel': (payload: { propertyIndex: number }) => void
  'game:sell-hotel': (payload: { propertyIndex: number }) => void
  'game:mortgage': (payload: { propertyIndex: number }) => void
  'game:unmortgage': (payload: { propertyIndex: number }) => void
  'game:sell-all-buildings': (payload: { propertyIndex: number }) => void
  'game:auction-all': () => void
  'room:update-settings': (payload: { settings: Partial<GameSettings> }) => void

  'auction:bid': (payload: { amount: number }) => void
  'auction:pass': () => void

  'trade:propose': (payload: Omit<TradeOffer, 'id' | 'status' | 'confirmedBy'>) => void
  'trade:reject': (payload: { tradeId: string }) => void
  'trade:counter': (payload: { offeredProperties: number[]; requestedProperties: number[]; offeredMoney: number; requestedMoney: number }) => void
  'trade:confirm': (payload: { tradeId: string }) => void

  'game:declare-bankruptcy': () => void
  'game:settle-debt': () => void
  'game:card-choose-target': (payload: { targetId: string }) => void
  'game:card-roll': () => void
}

export interface ServerToClientEvents {
  'room:created': (payload: { roomCode: string; gameState: GameState; lobbyPlayers: Array<{ id: string; name: string; color: string; piece: string }> }) => void
  'room:joined': (payload: { gameState: GameState; lobbyPlayers: Array<{ id: string; name: string; color: string; piece: string }> }) => void
  'room:peek-result': (payload: { takenPieces: string[]; takenColors: string[] }) => void
  'room:error': (payload: { message: string }) => void
  'room:player-joined': (payload: { player: Player; gameState: GameState }) => void
  'room:player-left': (payload: { playerId: string; gameState: GameState }) => void
  'room:game-started': (payload: { gameState: GameState }) => void
  'room:rejoined': (payload: { roomCode: string; gameState: GameState | null; lobbyPlayers: Array<{ id: string; name: string; color: string; piece: string; isBot: boolean; isReady: boolean; disconnected?: boolean }>; isHost: boolean; inGame: boolean }) => void
  'room:rejoin-failed': (payload: Record<string, never>) => void
  'room:returned-to-lobby': (payload: Record<string, never>) => void
  'room:lobby-update': (payload: { lobbyPlayers: Array<{ id: string; name: string; color: string; piece: string; isBot: boolean; isReady: boolean }>; allReady: boolean; hostId: string; settings?: GameSettings }) => void
  'room:settings-update': (payload: { settings: GameSettings }) => void
  'room:kicked': () => void

  'game:turn-tick': (payload: { timeRemaining: number }) => void
  'trade:tick': (payload: { timeRemaining: number }) => void

  'game:state-update': (payload: { gameState: GameState }) => void

  'game:debt-due': (payload: {
    debtorId: string
    amount: number
    creditorId: string | null
    reason: string
    gameState: GameState
  }) => void

  'game:dice-rolled': (payload: {
    playerId: string
    roll: DiceRoll
    gameState: GameState
  }) => void

  'game:piece-move-step': (payload: {
    playerId: string
    fromIndex: number
    toIndex: number
    stepNumber: number
    totalSteps: number
  }) => void

  'game:landed-property': (payload: {
    playerId: string
    propertyIndex: number
    ownerId: string | null
    rentDue: number | null
    canBuy: boolean
    gameState: GameState
  }) => void

  'game:landed-go': (payload: { playerId: string; collected: number; gameState: GameState }) => void
  'game:landed-tax': (payload: { playerId: string; amount: number; gameState: GameState }) => void
  'game:landed-jail-visit': (payload: { playerId: string; gameState: GameState }) => void
  'game:landed-free-parking': (payload: { playerId: string; gameState: GameState }) => void
  'game:go-to-jail': (payload: { playerId: string; gameState: GameState }) => void

  'game:card-drawn': (payload: {
    playerId: string
    cardType: 'chance' | 'community'
    card: GameCard
    gameState: GameState
  }) => void

  'auction:started': (payload: { auction: AuctionState; gameState: GameState }) => void
  'auction:bid-placed': (payload: { playerId: string; amount: number; auction: AuctionState }) => void
  'auction:ended': (payload: { winnerId: string | null; amount: number; gameState: GameState }) => void
  'auction:tick': (payload: { timeRemaining: number }) => void

  'trade:proposed': (payload: { trade: TradeOffer }) => void
  'trade:accepted': (payload: { trade: TradeOffer | null; gameState: GameState }) => void
  'trade:rejected': (payload: { trade: TradeOffer; byId?: string | null }) => void
  'trade:countered': (payload: { trade: TradeOffer }) => void
  'trade:confirm-update': (payload: { trade: TradeOffer }) => void

  'game:player-bankrupt': (payload: { playerId: string; gameState: GameState }) => void
  'game:over': (payload: { winnerId: string; gameState: GameState }) => void

  'game:error': (payload: { message: string; code: string }) => void
}
