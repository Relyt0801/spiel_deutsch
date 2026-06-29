import { v4 as uuidv4 } from 'uuid'
import {
  BOARD_SQUARES, COLOR_GROUPS, CHANCE_CARD_IDS, COMMUNITY_CARD_IDS,
  JAIL_INDEX, GO_INDEX, GO_TO_JAIL_INDEX,
  JAIL_BAIL, PASS_GO_AMOUNT, STARTING_MONEY, BANK_HOUSES, BANK_HOTELS,
  RAILROAD_INDICES, UTILITY_INDICES,
} from '../config/boardData'
import { ALL_CARDS } from '../config/cards'

export interface Player {
  id: string
  name: string
  color: string
  piece: string
  position: number
  money: number
  properties: number[]
  jailTurns: number
  getOutOfJailCards: number
  isBankrupt: boolean
  isActive: boolean
  doublesCount: number
  isBot: boolean
  /** Anzahl Runden, die der Spieler aussetzen muss (z. B. „Update Time!“). */
  skipTurns: number
  /** Spieler ist nach Zugende erneut am Zug (z. B. „Tee-Stunde!“). */
  extraTurn: boolean
  /** Vorübergehend getrennt (Reload) – hat ein Zeitfenster zum Wiederverbinden. */
  disconnected: boolean
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

export interface AuctionState {
  propertyIndex: number
  highestBid: number
  highestBidderId: string | null
  bids: Record<string, number>
  passedPlayers: string[]
  isActive: boolean
  timeRemaining: number
}

export interface GameLog {
  timestamp: number
  message: string
  type: 'info' | 'warning' | 'success'
}

export type GamePhase =
  | 'lobby' | 'rolling' | 'moving' | 'landed' | 'buying'
  | 'auctioning' | 'paying_rent' | 'card_drawn' | 'jail_decision'
  | 'trading' | 'building' | 'end_turn' | 'game_over'

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
  pendingCardAction: Record<string, unknown> | null
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
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function addLog(state: GameState, message: string, type: GameLog['type'] = 'info'): GameState {
  return {
    ...state,
    log: [...state.log.slice(-49), { timestamp: Date.now(), message, type }],
  }
}

export function initGameState(
  players: Array<{ id: string; name: string; color: string; piece: string; isBot?: boolean }>,
  roomCode: string,
  hostId: string,
  settings: GameSettings = DEFAULT_SETTINGS,
): GameState {
  const gamePlayers: Player[] = players.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    piece: p.piece,
    position: 0,
    money: STARTING_MONEY,
    properties: [],
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
    isBot: p.isBot ?? false,
    isActive: true,
    doublesCount: 0,
    skipTurns: 0,
    extraTurn: false,
    disconnected: false,
  }))

  const properties: PropertyState[] = BOARD_SQUARES.map(sq => ({
    boardIndex: sq.id,
    ownerId: null,
    houses: 0,
    hotel: false,
    isMortgaged: false,
  }))

  return {
    roomCode,
    hostId,
    gamePhase: 'rolling',
    players: gamePlayers,
    currentPlayerIndex: 0,
    playerOrder: gamePlayers.map(p => p.id),
    properties,
    currentDiceRoll: null,
    pendingCardAction: null,
    auction: null,
    auctionQueue: [],
    activeTrade: null,
    bankHouses: BANK_HOUSES,
    bankHotels: BANK_HOTELS,
    chanceDeck: shuffle(CHANCE_CARD_IDS),
    communityDeck: shuffle(COMMUNITY_CARD_IDS),
    chanceDiscardPile: [],
    communityDiscardPile: [],
    log: [{ timestamp: Date.now(), message: 'Spiel gestartet! Viel Spaß beim Remigianum Monopoly!', type: 'success' }],
    winnerId: null,
    freeParkingMoney: 0,
    settings,
  }
}

/** Total liquidatable value: cash + building refunds + mortgage value of un-mortgaged streets. */
export function netWorth(state: GameState, playerId: string): number {
  const p = state.players.find(x => x.id === playerId)
  if (!p) return 0
  let total = p.money
  for (const idx of p.properties) {
    const sq = BOARD_SQUARES[idx]
    const prop = state.properties[idx]
    if (!prop) continue
    const halfHouse = Math.floor((sq.houseCost || 0) / 2)
    if (prop.hotel) total += halfHouse
    total += prop.houses * halfHouse
    if (!prop.isMortgaged) total += (sq.mortgageValue || 0)
  }
  return total
}

export function rollDice(): DiceRoll {
  const die1 = Math.floor(Math.random() * 6) + 1
  const die2 = Math.floor(Math.random() * 6) + 1
  return { die1, die2, isDouble: die1 === die2, total: die1 + die2 }
}

export function movePlayer(state: GameState, playerId: string, roll: DiceRoll): GameState {
  let s = { ...state }
  const pIdx = s.players.findIndex(p => p.id === playerId)
  if (pIdx < 0) return s

  const player = { ...s.players[pIdx] }
  const oldPos = player.position
  let newPos = (oldPos + roll.total) % 40

  // Check if passed Go
  if (newPos < oldPos || (oldPos === 0 && roll.total > 0)) {
    // passed go
  }

  player.position = newPos
  const passedGo = newPos < oldPos || (roll.total > 0 && oldPos + roll.total >= 40)
  if (passedGo && newPos !== 0) {
    player.money += PASS_GO_AMOUNT
    s = addLog(s, `${player.name} überquert "Unterricht beginnt!" und erhält ${PASS_GO_AMOUNT}€!`, 'success')
  }

  s.players = s.players.map((p, i) => i === pIdx ? player : p)
  s.gamePhase = 'moving'
  return s
}

export function applyLanding(state: GameState, playerId: string): {
  newState: GameState
  event: string
  data: Record<string, unknown>
} {
  let s = { ...state }
  const player = s.players.find(p => p.id === playerId)!
  const square = BOARD_SQUARES[player.position]

  if (square.type === 'go') {
    const goBonus = PASS_GO_AMOUNT * (s.settings.goDoubleMoney ? 2 : 1)
    s = addLog(s, `${player.name} landet auf "Unterricht beginnt!" und erhält ${goBonus}€!`, 'success')
    s.players = s.players.map(p =>
      p.id === playerId ? { ...p, money: p.money + goBonus } : p
    )
    s.gamePhase = 'end_turn'
    return { newState: s, event: 'game:landed-go', data: { collected: goBonus } }
  }

  if (square.type === 'go_to_jail') {
    s = sendToJail(s, playerId)
    return { newState: s, event: 'game:go-to-jail', data: {} }
  }

  if (square.type === 'jail_visit') {
    s.gamePhase = 'end_turn'
    return { newState: s, event: 'game:landed-jail-visit', data: {} }
  }

  if (square.type === 'free_parking') {
    const collected = s.freeParkingMoney
    s.freeParkingMoney = 0
    if (collected > 0) {
      s.players = s.players.map(p =>
        p.id === playerId ? { ...p, money: p.money + collected } : p
      )
      s = addLog(s, `${player.name} erhält ${collected}€ aus der Freien Pause! ☕`, 'success')
    } else {
      s = addLog(s, `${player.name} macht eine Freie Pause. ☕`, 'info')
    }
    s.gamePhase = 'end_turn'
    return { newState: s, event: 'game:landed-free-parking', data: { collected } }
  }

  if (square.type === 'tax') {
    const amount = square.price || 0
    // Can't cover it even by liquidating everything → bankrupt to the bank.
    if (player.money < amount && netWorth(s, playerId) < amount) {
      s = declareBankruptcy(s, playerId, null, s.settings.bankruptcyMode)
      return { newState: s, event: 'game:player-bankrupt', data: { playerId } }
    }
    const paid = Math.min(amount, player.money)
    s.players = s.players.map(p =>
      p.id === playerId ? { ...p, money: p.money - paid } : p
    )
    s.freeParkingMoney += paid
    s = addLog(s, `${player.name} zahlt ${paid}€ Kopiergeld.`, 'warning')
    s.gamePhase = 'end_turn'
    return { newState: s, event: 'game:landed-tax', data: { amount: paid } }
  }

  if (square.type === 'chance') {
    const result = drawCard(s, playerId, 'chance')
    return { newState: result.newState, event: 'game:card-drawn', data: { cardType: 'chance', card: result.card } }
  }

  if (square.type === 'community') {
    const result = drawCard(s, playerId, 'community')
    return { newState: result.newState, event: 'game:card-drawn', data: { cardType: 'community', card: result.card } }
  }

  if (square.type === 'property' || square.type === 'railroad' || square.type === 'utility') {
    const propState = s.properties[player.position]
    if (!propState.ownerId) {
      s.gamePhase = 'buying'
      return { newState: s, event: 'game:landed-property', data: { propertyIndex: player.position, ownerId: null, rentDue: null, canBuy: player.money >= (square.price || 0) } }
    }
    if (propState.ownerId === playerId) {
      s.gamePhase = 'end_turn'
      return { newState: s, event: 'game:landed-property', data: { propertyIndex: player.position, ownerId: playerId, rentDue: null, canBuy: false } }
    }
    if (propState.isMortgaged) {
      s.gamePhase = 'end_turn'
      return { newState: s, event: 'game:landed-property', data: { propertyIndex: player.position, ownerId: propState.ownerId, rentDue: 0, canBuy: false } }
    }
    // Calculate rent
    const rent = calculateRent(s, player.position, s.currentDiceRoll?.total || 2)
    // Can't pay even after liquidating everything → bankrupt to the property owner.
    if (player.money < rent && netWorth(s, playerId) < rent) {
      const ownerId = propState.ownerId
      s = declareBankruptcy(s, playerId, ownerId, s.settings.bankruptcyMode)
      return { newState: s, event: 'game:player-bankrupt', data: { playerId, creditorId: ownerId } }
    }
    s = payRent(s, playerId, propState.ownerId, rent)
    s.gamePhase = 'end_turn'
    return { newState: s, event: 'game:landed-property', data: { propertyIndex: player.position, ownerId: propState.ownerId, rentDue: rent, canBuy: false } }
  }

  s.gamePhase = 'end_turn'
  return { newState: s, event: 'game:state-update', data: {} }
}

export function calculateRent(state: GameState, propertyIndex: number, diceTotal: number): number {
  const square = BOARD_SQUARES[propertyIndex]
  const propState = state.properties[propertyIndex]

  if (!propState.ownerId || propState.isMortgaged) return 0

  if (square.type === 'utility') {
    const owner = state.players.find(p => p.id === propState.ownerId)!
    const utilsOwned = UTILITY_INDICES.filter(i => state.properties[i].ownerId === owner.id).length
    return diceTotal * square.rent[utilsOwned - 1]
  }

  if (square.type === 'railroad') {
    const owner = state.players.find(p => p.id === propState.ownerId)!
    const rrOwned = RAILROAD_INDICES.filter(i => state.properties[i].ownerId === owner.id).length
    return square.rent[rrOwned - 1]
  }

  if (propState.hotel) return square.rent[5]
  if (propState.houses > 0) return square.rent[propState.houses]

  // Base rent – double if owner has full color group
  const groupIndices = COLOR_GROUPS[square.group!] || []
  const ownsAll = groupIndices.every(i => state.properties[i].ownerId === propState.ownerId)
  return ownsAll ? square.rent[0] * 2 : square.rent[0]
}

export function payRent(state: GameState, payerId: string, ownerId: string, amount: number): GameState {
  let s = { ...state }
  const payer = s.players.find(p => p.id === payerId)!
  const owner = s.players.find(p => p.id === ownerId)!
  const actual = Math.min(amount, payer.money)

  s.players = s.players.map(p => {
    if (p.id === payerId) return { ...p, money: p.money - actual }
    if (p.id === ownerId) return { ...p, money: p.money + actual }
    return p
  })
  s = addLog(s, `${payer.name} zahlt ${actual}€ Miete an ${owner.name} für ${BOARD_SQUARES[payer.position].name}.`, 'warning')
  return s
}

export function buyProperty(state: GameState, playerId: string, propertyIndex: number): GameState {
  let s = { ...state }
  const square = BOARD_SQUARES[propertyIndex]
  const price = square.price || 0

  s.players = s.players.map(p =>
    p.id === playerId ? { ...p, money: p.money - price, properties: [...p.properties, propertyIndex] } : p
  )
  s.properties = s.properties.map(p =>
    p.boardIndex === propertyIndex ? { ...p, ownerId: playerId } : p
  )
  const player = s.players.find(p => p.id === playerId)!
  s = addLog(s, `${player.name} kauft ${square.name} für ${price}€.`, 'success')
  s.gamePhase = 'end_turn'
  return s
}

export function sendToJail(state: GameState, playerId: string): GameState {
  let s = { ...state }
  s.players = s.players.map(p =>
    p.id === playerId ? { ...p, position: JAIL_INDEX, jailTurns: 1, doublesCount: 0 } : p
  )
  const player = s.players.find(p => p.id === playerId)!
  s = addLog(s, `${player.name} muss nachsitzen!`, 'warning')
  s.gamePhase = 'end_turn'
  return s
}

export function drawCard(
  state: GameState, playerId: string, type: 'chance' | 'community'
): { newState: GameState; card: Record<string, unknown> } {
  let s = { ...state }
  const deck = type === 'chance' ? [...s.chanceDeck] : [...s.communityDeck]
  const discard = type === 'chance' ? [...s.chanceDiscardPile] : [...s.communityDiscardPile]

  let cardId: string
  if (deck.length === 0) {
    // Reshuffle discard
    const newDeck = shuffle(discard)
    cardId = newDeck.shift()!
    if (type === 'chance') {
      s.chanceDeck = newDeck
      s.chanceDiscardPile = []
    } else {
      s.communityDeck = newDeck
      s.communityDiscardPile = []
    }
  } else {
    cardId = deck.shift()!
    if (type === 'chance') {
      s.chanceDeck = deck
      s.chanceDiscardPile = [...discard, cardId]
    } else {
      s.communityDeck = deck
      s.communityDiscardPile = [...discard, cardId]
    }
  }

  s.pendingCardAction = { id: cardId, type }
  s.gamePhase = 'card_drawn'
  const fullCard = ALL_CARDS[cardId]
  return { newState: s, card: fullCard as unknown as Record<string, unknown> }
}

export function applyCardEffect(state: GameState, playerId: string): GameState {
  if (!state.pendingCardAction) return { ...state, gamePhase: 'end_turn' }
  const card = ALL_CARDS[state.pendingCardAction.id as string]
  if (!card) return { ...state, pendingCardAction: null, gamePhase: 'end_turn' }

  let s: GameState = { ...state, pendingCardAction: null }
  const pIdx = s.players.findIndex(p => p.id === playerId)
  const player = s.players[pIdx]

  switch (card.action) {
    case 'ADVANCE_TO_GO': {
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, position: GO_INDEX, money: p.money + PASS_GO_AMOUNT } : p
      )
      s = addLog(s, `${player.name}: Karte – zu "Unterricht beginnt!" + ${PASS_GO_AMOUNT}€!`, 'success')
      break
    }
    case 'ADVANCE_TO': {
      const target = card.target!
      const passGo = target < player.position
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, position: target, money: p.money + (passGo ? PASS_GO_AMOUNT : 0) } : p
      )
      s = addLog(s, `${player.name}: Karte – zu ${BOARD_SQUARES[target].name}${passGo ? ` +${PASS_GO_AMOUNT}€` : ''}.`, 'info')
      // Check landing on the target (rent, etc.) - apply a landing at new position
      const { newState } = applyLanding(s, playerId)
      return newState
    }
    case 'ADVANCE_TO_RAILROAD': {
      const pos = player.position
      const next = RAILROAD_INDICES.find(i => i > pos) ?? RAILROAD_INDICES[0]
      const passGo = next < pos
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, position: next, money: p.money + (passGo ? PASS_GO_AMOUNT : 0) } : p
      )
      s = addLog(s, `${player.name}: Karte – zum nächsten Schulbus (${BOARD_SQUARES[next].name}).`, 'info')
      const { newState } = applyLanding(s, playerId)
      return newState
    }
    case 'ADVANCE_TO_UTILITY': {
      const pos = player.position
      const next = UTILITY_INDICES.find(i => i > pos) ?? UTILITY_INDICES[0]
      const passGo = next < pos
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, position: next, money: p.money + (passGo ? PASS_GO_AMOUNT : 0) } : p
      )
      s = addLog(s, `${player.name}: Karte – zum nächsten Versorgungswerk.`, 'info')
      const { newState } = applyLanding(s, playerId)
      return newState
    }
    case 'COLLECT': {
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, money: p.money + card.amount! } : p
      )
      s = addLog(s, `${player.name}: Karte – erhält ${card.amount}€!`, 'success')
      break
    }
    case 'PAY': {
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, money: p.money - card.amount! } : p
      )
      s = addLog(s, `${player.name}: Karte – zahlt ${card.amount}€.`, 'warning')
      break
    }
    case 'COLLECT_FROM_PLAYERS': {
      const amount = card.amount!
      const activePlayers = s.players.filter(p => p.id !== playerId && p.isActive && !p.isBankrupt)
      const total = activePlayers.length * amount
      s.players = s.players.map((p, i) => {
        if (i === pIdx) return { ...p, money: p.money + total }
        if (p.isActive && !p.isBankrupt) return { ...p, money: p.money - amount }
        return p
      })
      s = addLog(s, `${player.name}: Karte – erhält ${amount}€ von jedem Mitspieler!`, 'success')
      break
    }
    case 'PAY_PLAYERS': {
      const amount = card.amount!
      const activePlayers = s.players.filter(p => p.id !== playerId && p.isActive && !p.isBankrupt)
      s.players = s.players.map((p, i) => {
        if (i === pIdx) return { ...p, money: p.money - amount * activePlayers.length }
        if (p.isActive && !p.isBankrupt) return { ...p, money: p.money + amount }
        return p
      })
      s = addLog(s, `${player.name}: Karte – zahlt ${amount}€ an jeden Mitspieler.`, 'warning')
      break
    }
    case 'GO_TO_JAIL': {
      return sendToJail(s, playerId)
    }
    case 'GET_OUT_OF_JAIL_FREE': {
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, getOutOfJailCards: p.getOutOfJailCards + 1 } : p
      )
      s = addLog(s, `${player.name}: Befreiungskarte erhalten!`, 'success')
      break
    }
    case 'MOVE_BACK': {
      const newPos = ((player.position - card.amount!) + 40) % 40
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, position: newPos } : p
      )
      s = addLog(s, `${player.name}: Karte – ${card.amount} Felder zurück.`, 'info')
      const { newState } = applyLanding(s, playerId)
      return newState
    }
    case 'MOVE_FORWARD': {
      const oldPos = player.position
      const newPos = (oldPos + card.amount!) % 40
      const passGo = oldPos + card.amount! >= 40
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, position: newPos, money: p.money + (passGo ? PASS_GO_AMOUNT : 0) } : p
      )
      s = addLog(s, `${player.name}: Karte – ${card.amount} Felder vor${passGo ? ` +${PASS_GO_AMOUNT}€` : ''}.`, 'info')
      const { newState } = applyLanding(s, playerId)
      return newState
    }
    case 'PAY_FREE_PARKING': {
      const amount = card.amount!
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, money: p.money - amount } : p
      )
      s.freeParkingMoney += amount
      s = addLog(s, `${player.name}: Karte – zahlt ${amount}€ in die Freistunde. ☕`, 'warning')
      break
    }
    case 'PLAYERS_PAY_FREE_PARKING': {
      const amount = card.amount!
      const contributors = s.players.filter(p => p.isActive && !p.isBankrupt)
      s.players = s.players.map(p =>
        (p.isActive && !p.isBankrupt) ? { ...p, money: p.money - amount } : p
      )
      s.freeParkingMoney += amount * contributors.length
      s = addLog(s, `${player.name}: Karte – jeder Spieler zahlt ${amount}€ in die Freistunde. ☕`, 'warning')
      break
    }
    case 'COLLECT_FROM_RICHEST': {
      const amount = card.amount!
      const opponents = s.players.filter(p => p.id !== playerId && p.isActive && !p.isBankrupt)
      if (opponents.length === 0) {
        s = addLog(s, `${player.name}: Karte – kein Mitspieler vorhanden.`, 'info')
        break
      }
      const richest = opponents.reduce((a, b) => (b.money > a.money ? b : a))
      const paid = Math.min(amount, richest.money)
      s.players = s.players.map(p => {
        if (p.id === playerId) return { ...p, money: p.money + paid }
        if (p.id === richest.id) return { ...p, money: p.money - paid }
        return p
      })
      s = addLog(s, `${player.name}: Karte – erhält ${paid}€ von ${richest.name} (reichster Mitspieler).`, 'success')
      break
    }
    case 'SKIP_TURN': {
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, skipTurns: p.skipTurns + 1 } : p
      )
      s = addLog(s, `${player.name}: Karte – setzt eine Runde aus.`, 'warning')
      break
    }
    case 'EXTRA_TURN': {
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, extraTurn: true } : p
      )
      s = addLog(s, `${player.name}: Karte – ist erneut am Zug!`, 'success')
      break
    }
    case 'ROLL_OR_JAIL': {
      const rolls: DiceRoll[] = [rollDice(), rollDice(), rollDice()]
      const saved = rolls.some(r => r.isDouble)
      const detail = rolls.map(r => `${r.die1}+${r.die2}`).join(', ')
      if (saved) {
        s = addLog(s, `${player.name}: Blauer Brief – gewürfelt (${detail}), Pasch dabei – gerettet!`, 'success')
        break
      }
      s = addLog(s, `${player.name}: Blauer Brief – gewürfelt (${detail}), kein Pasch – ab in den Bildungsbunker!`, 'warning')
      return sendToJail(s, playerId)
    }
    case 'CLASSROOM_ROLL': {
      const amount = card.amount!
      const roll = rollDice()
      if (roll.total > 10) {
        s.players = s.players.map((p, i) =>
          i === pIdx ? { ...p, money: p.money + amount } : p
        )
        s = addLog(s, `${player.name}: Classroom – ${roll.die1}+${roll.die2}=${roll.total} (über 10), erhält ${amount}€!`, 'success')
      } else {
        s.players = s.players.map((p, i) =>
          i === pIdx ? { ...p, money: p.money - amount } : p
        )
        s.freeParkingMoney += amount
        s = addLog(s, `${player.name}: Classroom – ${roll.die1}+${roll.die2}=${roll.total} (10 oder weniger), zahlt ${amount}€ in die Freistunde.`, 'warning')
      }
      break
    }
    case 'BUILDING_REPAIRS': {
      const houseCount = player.properties.reduce((acc, pi) => acc + s.properties[pi].houses, 0)
      const hotelCount = player.properties.reduce((acc, pi) => acc + (s.properties[pi].hotel ? 1 : 0), 0)
      const total = houseCount * card.house! + hotelCount * card.hotel!
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, money: p.money - total } : p
      )
      s = addLog(s, `${player.name}: Gebäudereparatur – zahlt ${total}€.`, 'warning')
      break
    }
  }

  // End the player's action; the normal end-turn flow then handles doubles re-rolls.
  s.gamePhase = 'end_turn'
  return s
}

export function startAuction(state: GameState, propertyIndex: number): GameState {
  const activePlayers = state.players.filter(p => p.isActive && !p.isBankrupt)
  return {
    ...state,
    gamePhase: 'auctioning',
    auction: {
      propertyIndex,
      highestBid: 0,
      highestBidderId: null,
      bids: {},
      passedPlayers: [],
      isActive: true,
      timeRemaining: 30,
    },
  }
}

export function placeBid(state: GameState, playerId: string, amount: number): GameState {
  if (!state.auction) return state
  const player = state.players.find(p => p.id === playerId)!
  if (amount <= state.auction.highestBid || amount > player.money) return state

  const s = {
    ...state,
    auction: {
      ...state.auction,
      highestBid: amount,
      highestBidderId: playerId,
      bids: { ...state.auction.bids, [playerId]: amount },
    },
  }
  return addLog(s, `${player.name} bietet ${amount}€.`, 'info')
}

export function passAuction(state: GameState, playerId: string): GameState {
  if (!state.auction) return state
  const s = {
    ...state,
    auction: {
      ...state.auction,
      passedPlayers: [...state.auction.passedPlayers, playerId],
    },
  }
  return s
}

export function endAuction(state: GameState): GameState {
  if (!state.auction) return state
  let s = { ...state }
  const { highestBidderId, highestBid, propertyIndex } = s.auction!

  if (highestBidderId && highestBid > 0) {
    s.players = s.players.map(p =>
      p.id === highestBidderId
        ? { ...p, money: p.money - highestBid, properties: [...p.properties, propertyIndex] }
        : p
    )
    s.properties = s.properties.map(p =>
      p.boardIndex === propertyIndex ? { ...p, ownerId: highestBidderId } : p
    )
    const winner = s.players.find(p => p.id === highestBidderId)!
    s = addLog(s, `${winner.name} gewinnt die Auktion für ${BOARD_SQUARES[propertyIndex].name} mit ${highestBid}€!`, 'success')
  } else {
    s = addLog(s, `Auktion für ${BOARD_SQUARES[propertyIndex].name} endet ohne Gebot.`, 'info')
  }

  s.auction = null
  s.gamePhase = 'end_turn'
  return s
}

export function buyHouse(state: GameState, playerId: string, propertyIndex: number): GameState {
  let s = { ...state }
  const square = BOARD_SQUARES[propertyIndex]
  const prop = s.properties[propertyIndex]
  const player = s.players.find(p => p.id === playerId)!
  if (!square.houseCost || prop.hotel || s.bankHouses <= 0) return s

  const groupIndices = COLOR_GROUPS[square.group!] || []
  const ownsAll = groupIndices.every(i => s.properties[i].ownerId === playerId)
  if (!ownsAll) return s

  const maxHouses = Math.max(...groupIndices.map(i => s.properties[i].houses))
  if (prop.houses >= 4 || prop.houses >= maxHouses + 1) return s
  if (player.money < square.houseCost) return s

  s.players = s.players.map(p => p.id === playerId ? { ...p, money: p.money - square.houseCost! } : p)
  s.properties = s.properties.map(p => p.boardIndex === propertyIndex ? { ...p, houses: p.houses + 1 } : p)
  s.bankHouses -= 1
  s = addLog(s, `${player.name} baut einen Klassenraum auf ${square.name}.`, 'info')
  return s
}

export function buyHotel(state: GameState, playerId: string, propertyIndex: number): GameState {
  let s = { ...state }
  const square = BOARD_SQUARES[propertyIndex]
  const prop = s.properties[propertyIndex]
  const player = s.players.find(p => p.id === playerId)!
  if (!square.houseCost || prop.hotel || prop.houses < 4 || s.bankHotels <= 0) return s
  if (player.money < square.houseCost) return s

  s.players = s.players.map(p => p.id === playerId ? { ...p, money: p.money - square.houseCost! } : p)
  s.properties = s.properties.map(p => p.boardIndex === propertyIndex ? { ...p, houses: 0, hotel: true } : p)
  s.bankHouses += 4
  s.bankHotels -= 1
  s = addLog(s, `${player.name} baut ein Schulgebäude auf ${square.name}.`, 'success')
  return s
}

export function sellHouse(state: GameState, playerId: string, propertyIndex: number): GameState {
  let s = { ...state }
  const square = BOARD_SQUARES[propertyIndex]
  const prop = s.properties[propertyIndex]
  const player = s.players.find(p => p.id === playerId)!
  if (prop.ownerId !== playerId || prop.hotel || prop.houses <= 0) return s

  const refund = Math.floor((square.houseCost || 0) / 2)
  s.players = s.players.map(p => p.id === playerId ? { ...p, money: p.money + refund } : p)
  s.properties = s.properties.map(p => p.boardIndex === propertyIndex ? { ...p, houses: p.houses - 1 } : p)
  s.bankHouses += 1
  s = addLog(s, `${player.name} verkauft einen Klassenraum von ${square.name} für ${refund}€.`, 'info')
  return s
}

export function sellHotel(state: GameState, playerId: string, propertyIndex: number): GameState {
  let s = { ...state }
  const square = BOARD_SQUARES[propertyIndex]
  const prop = s.properties[propertyIndex]
  const player = s.players.find(p => p.id === playerId)!
  if (prop.ownerId !== playerId || !prop.hotel) return s

  const refund = Math.floor((square.houseCost || 0) / 2)
  s.players = s.players.map(p => p.id === playerId ? { ...p, money: p.money + refund } : p)
  s.properties = s.properties.map(p => p.boardIndex === propertyIndex ? { ...p, hotel: false, houses: 0 } : p)
  s.bankHotels += 1
  s = addLog(s, `${player.name} verkauft ein Schulgebäude von ${square.name} für ${refund}€.`, 'info')
  return s
}

export function mortgage(state: GameState, playerId: string, propertyIndex: number): GameState {
  let s = { ...state }
  const square = BOARD_SQUARES[propertyIndex]
  const prop = s.properties[propertyIndex]
  if (prop.ownerId !== playerId || prop.isMortgaged || prop.houses > 0 || prop.hotel) return s

  const mortValue = square.mortgageValue || 0
  s.players = s.players.map(p => p.id === playerId ? { ...p, money: p.money + mortValue } : p)
  s.properties = s.properties.map(p => p.boardIndex === propertyIndex ? { ...p, isMortgaged: true } : p)
  const player = s.players.find(p => p.id === playerId)!
  s = addLog(s, `${player.name} verpfändet ${square.name} für ${mortValue}€.`, 'info')
  return s
}

export function unmortgage(state: GameState, playerId: string, propertyIndex: number): GameState {
  let s = { ...state }
  const square = BOARD_SQUARES[propertyIndex]
  const prop = s.properties[propertyIndex]
  const player = s.players.find(p => p.id === playerId)!
  const unmortCost = Math.floor((square.mortgageValue || 0) * 1.1)
  if (prop.ownerId !== playerId || !prop.isMortgaged || player.money < unmortCost) return s

  s.players = s.players.map(p => p.id === playerId ? { ...p, money: p.money - unmortCost } : p)
  s.properties = s.properties.map(p => p.boardIndex === propertyIndex ? { ...p, isMortgaged: false } : p)
  s = addLog(s, `${player.name} löst ${square.name} für ${unmortCost}€ ein.`, 'info')
  return s
}

export function proposeTrade(state: GameState, offer: Omit<TradeOffer, 'id' | 'status' | 'confirmedBy'>): GameState {
  // The proposer implicitly confirms their own offer; the partner still has to confirm.
  const trade: TradeOffer = { ...offer, id: uuidv4(), status: 'pending', confirmedBy: [offer.fromPlayerId] }
  return { ...state, activeTrade: trade, gamePhase: 'trading' }
}

export function counterTrade(
  state: GameState,
  counterFromId: string,
  terms: { offeredProperties: number[]; requestedProperties: number[]; offeredMoney: number; requestedMoney: number }
): GameState {
  if (!state.activeTrade) return state
  const prev = state.activeTrade
  // The counter terms are from the counter-sender's perspective; they implicitly confirm,
  // the partner must confirm again (any change resets the other side's acceptance).
  const counter: TradeOffer = {
    id: prev.id,
    fromPlayerId: counterFromId,
    toPlayerId: prev.fromPlayerId === counterFromId ? prev.toPlayerId : prev.fromPlayerId,
    offeredProperties: terms.offeredProperties,
    requestedProperties: terms.requestedProperties,
    offeredMoney: terms.offeredMoney,
    requestedMoney: terms.requestedMoney,
    status: 'countered',
    confirmedBy: [counterFromId],
  }
  return { ...state, activeTrade: counter }
}

export function confirmTrade(state: GameState, playerId: string): GameState {
  if (!state.activeTrade) return state
  const trade = state.activeTrade
  const confirmedBy = [...new Set([...trade.confirmedBy, playerId])]
  const fromExists = state.players.find(p => p.id === trade.fromPlayerId && p.isActive)
  const toExists = state.players.find(p => p.id === trade.toPlayerId && p.isActive)
  if (fromExists && toExists && confirmedBy.includes(trade.fromPlayerId) && confirmedBy.includes(trade.toPlayerId)) {
    return acceptTrade(state, trade.id)
  }
  return { ...state, activeTrade: { ...trade, status: 'pending_confirm', confirmedBy } }
}

export function acceptTrade(state: GameState, tradeId: string): GameState {
  if (!state.activeTrade || state.activeTrade.id !== tradeId) return state
  let s = { ...state }
  const trade = s.activeTrade!
  const from = s.players.find(p => p.id === trade.fromPlayerId)!
  const to = s.players.find(p => p.id === trade.toPlayerId)!

  s.players = s.players.map(p => {
    if (p.id === trade.fromPlayerId) {
      return {
        ...p,
        money: p.money - trade.offeredMoney + trade.requestedMoney,
        properties: [
          ...p.properties.filter(i => !trade.offeredProperties.includes(i)),
          ...trade.requestedProperties,
        ],
      }
    }
    if (p.id === trade.toPlayerId) {
      return {
        ...p,
        money: p.money + trade.offeredMoney - trade.requestedMoney,
        properties: [
          ...p.properties.filter(i => !trade.requestedProperties.includes(i)),
          ...trade.offeredProperties,
        ],
      }
    }
    return p
  })

  s.properties = s.properties.map(p => {
    if (trade.offeredProperties.includes(p.boardIndex)) return { ...p, ownerId: trade.toPlayerId }
    if (trade.requestedProperties.includes(p.boardIndex)) return { ...p, ownerId: trade.fromPlayerId }
    return p
  })

  s = addLog(s, `Handel zwischen ${from.name} und ${to.name} abgeschlossen.`, 'success')
  s.activeTrade = null
  s.gamePhase = 'end_turn'
  return s
}

export function sellAllBuildings(state: GameState, playerId: string, propertyIndex: number): GameState {
  let s = { ...state }
  const prop = s.properties[propertyIndex]
  if (!prop || prop.ownerId !== playerId) return s
  if (prop.hotel) s = sellHotel(s, playerId, propertyIndex)
  while (s.properties[propertyIndex].houses > 0) {
    s = sellHouse(s, playerId, propertyIndex)
  }
  return s
}

export function declareBankruptcy(
  state: GameState,
  playerId: string,
  creditorId: string | null,
  mode: BankruptcyMode = 'auction',
  advanceAfter = true,
): GameState {
  let s = { ...state }
  const player = s.players.find(p => p.id === playerId)!
  const props = [...player.properties]
  const creditorName = creditorId ? (s.players.find(p => p.id === creditorId)?.name ?? 'Mitspieler') : null

  const releaseToBank = () => {
    s.properties = s.properties.map(p =>
      props.includes(p.boardIndex) ? { ...p, ownerId: null, houses: 0, hotel: false, isMortgaged: false } : p
    )
  }
  const giveMoneyToCreditor = () => {
    if (!creditorId) return
    s.players = s.players.map(p => p.id === creditorId ? { ...p, money: p.money + player.money } : p)
  }

  if (mode === 'creditorAll' && creditorId) {
    // Everything (cash + streets with buildings) goes to the creditor.
    s.players = s.players.map(p => p.id === creditorId
      ? { ...p, money: p.money + player.money, properties: [...p.properties, ...props] }
      : p)
    s.properties = s.properties.map(p => props.includes(p.boardIndex) ? { ...p, ownerId: creditorId } : p)
    s = addLog(s, `${player.name} ist bankrott! Gesamter Besitz geht an ${creditorName}.`, 'warning')
  } else if (mode === 'creditorMoney') {
    giveMoneyToCreditor()
    releaseToBank()
    s = addLog(s, `${player.name} ist bankrott! Geld geht an ${creditorName ?? 'die Bank'}, Grundstücke werden frei.`, 'warning')
  } else if (mode === 'auction') {
    giveMoneyToCreditor()
    releaseToBank()
    s.auctionQueue = [...s.auctionQueue, ...props.filter(i => {
      const t = BOARD_SQUARES[i]?.type
      return t === 'property' || t === 'railroad' || t === 'utility'
    })]
    s = addLog(s, `${player.name} ist bankrott! Die Grundstücke werden versteigert.`, 'warning')
  } else {
    // 'release' (or creditorAll without a creditor) → everything back to the bank.
    releaseToBank()
    s = addLog(s, `${player.name} ist bankrott! Vermögen geht an die Bank.`, 'warning')
  }

  s.players = s.players.map(p =>
    p.id === playerId ? { ...p, isBankrupt: true, isActive: false, money: 0, properties: [] } : p
  )

  const winner = checkWinCondition(s)
  if (winner) {
    s.winnerId = winner
    s.gamePhase = 'game_over'
    s = addLog(s, `${s.players.find(p => p.id === winner)!.name} hat gewonnen!`, 'success')
  } else if (advanceAfter) {
    s = advanceTurn(s)
  }
  return s
}

export function checkWinCondition(state: GameState): string | null {
  const active = state.players.filter(p => p.isActive && !p.isBankrupt)
  if (active.length === 1) return active[0].id
  return null
}

export function advanceTurn(state: GameState): GameState {
  let s = { ...state }
  const activePlayers = s.players.filter(p => p.isActive && !p.isBankrupt)
  if (activePlayers.length <= 1) return s

  const findNext = (from: number): number => {
    let idx = (from + 1) % s.players.length
    while (s.players[idx].isBankrupt || !s.players[idx].isActive) {
      idx = (idx + 1) % s.players.length
    }
    return idx
  }

  let nextIdx = findNext(s.currentPlayerIndex)
  // Players who drew "Update Time!" must sit a turn out – skip them (and burn one skip).
  while (s.players[nextIdx].skipTurns > 0) {
    const skipper = s.players[nextIdx]
    s.players = s.players.map((p, i) => i === nextIdx ? { ...p, skipTurns: p.skipTurns - 1 } : p)
    s = addLog(s, `${skipper.name} setzt diese Runde aus.`, 'info')
    const after = findNext(nextIdx)
    if (after === nextIdx) break // safety: no other eligible player
    nextIdx = after
  }

  s.currentPlayerIndex = nextIdx
  s.currentDiceRoll = null
  s.players = s.players.map(p => ({ ...p, doublesCount: 0 }))

  const nextPlayer = s.players[nextIdx]
  if (nextPlayer.jailTurns > 0) {
    s.gamePhase = 'jail_decision'
  } else {
    s.gamePhase = 'rolling'
  }
  s = addLog(s, `${nextPlayer.name} ist am Zug.`, 'info')
  return s
}

export function handleEndTurn(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex]
  const idx = state.currentPlayerIndex

  // "Tee-Stunde!" / extra-turn card: same player goes again with a fresh roll.
  if (currentPlayer.extraTurn && !currentPlayer.isBankrupt) {
    return {
      ...state,
      players: state.players.map((p, i) => i === idx ? { ...p, extraTurn: false, doublesCount: 0 } : p),
      gamePhase: 'rolling',
      currentDiceRoll: null,
    }
  }

  // Doubles grant another roll for the same player. The running count of
  // consecutive doubles (and the 3rd-double-goes-to-jail rule) is handled at
  // roll time in handleRollDice, so here we only need to hand back the dice.
  if (state.currentDiceRoll?.isDouble && currentPlayer.jailTurns === 0 && !currentPlayer.isBankrupt) {
    return { ...state, gamePhase: 'rolling', currentDiceRoll: null }
  }

  return advanceTurn(state)
}
