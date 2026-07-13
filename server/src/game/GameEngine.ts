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
  skipTurns: number
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
  | 'trading' | 'building' | 'end_turn' | 'game_over' | 'debt_settlement'

/** An open debt the current player must cover by selling/mortgaging before continuing. */
export interface DebtInfo {
  debtorId: string
  amount: number
  creditorId: string | null // null → bank / free-parking pot
  toParkingPot: boolean
  reason: string
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
  debt: DebtInfo | null
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
    debt: null,
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

/**
 * Force-liquidate a player's assets until they hold at least `target` cash (or have
 * nothing left to sell). Buildings are sold first (half the build cost), then streets
 * are mortgaged. Used to settle a debt the player can cover on paper but not in cash –
 * this is what actually forces the sale of houses/streets instead of letting the player
 * limp on at 0 €.
 */
export function raiseCash(state: GameState, playerId: string, target: number): GameState {
  let s = { ...state }
  const cash = () => s.players.find(p => p.id === playerId)?.money ?? 0

  // 1) Sell buildings, always taking from the property with the most on it first.
  while (cash() < target) {
    const player = s.players.find(p => p.id === playerId)!
    let bestIdx = -1
    let bestLevel = 0
    for (const idx of player.properties) {
      const prop = s.properties[idx]
      const level = prop.hotel ? 5 : prop.houses
      if (level > bestLevel) { bestLevel = level; bestIdx = idx }
    }
    if (bestIdx < 0) break
    s = s.properties[bestIdx].hotel ? sellHotel(s, playerId, bestIdx) : sellHouse(s, playerId, bestIdx)
  }

  // 2) Mortgage building-free streets until the target is met.
  if (cash() < target) {
    const player = s.players.find(p => p.id === playerId)!
    for (const idx of [...player.properties]) {
      if (cash() >= target) break
      const prop = s.properties[idx]
      if (!prop.isMortgaged && prop.houses === 0 && !prop.hotel) {
        s = mortgage(s, playerId, idx)
      }
    }
  }
  return s
}

/** Move `amount` from the debtor to a creditor (or the free-parking pot / bank). */
function applyPayment(
  state: GameState, debtorId: string, amount: number,
  creditorId: string | null, toParkingPot: boolean,
): GameState {
  const s = { ...state }
  s.players = s.players.map(p => {
    if (p.id === debtorId) return { ...p, money: p.money - amount }
    if (creditorId && p.id === creditorId) return { ...p, money: p.money + amount }
    return p
  })
  if (toParkingPot) s.freeParkingMoney += amount
  return s
}

/**
 * Require `debtorId` to pay `amount`. Pays immediately when they hold the cash; bots and
 * insolvent players are resolved automatically (auto-liquidate / bankruptcy); a solvent
 * human who is short on cash is put into 'debt_settlement' so THEY choose what to sell.
 */
export function beginPayment(
  state: GameState, debtorId: string, amount: number,
  creditorId: string | null, toParkingPot: boolean, reason: string,
): { state: GameState; status: 'paid' | 'settle' | 'bankrupt' } {
  let s = { ...state }
  if (amount <= 0) return { state: s, status: 'paid' }
  const debtor = s.players.find(p => p.id === debtorId)!
  if (netWorth(s, debtorId) < amount) {
    s = declareBankruptcy(s, debtorId, creditorId, s.settings.bankruptcyMode)
    return { state: s, status: 'bankrupt' }
  }
  if (debtor.money >= amount) {
    return { state: applyPayment(s, debtorId, amount, creditorId, toParkingPot), status: 'paid' }
  }
  if (debtor.isBot) {
    // Bots liquidate automatically – no dialog.
    s = raiseCash(s, debtorId, amount)
    return { state: applyPayment(s, debtorId, amount, creditorId, toParkingPot), status: 'paid' }
  }
  // Solvent human, short on cash → let them sell/mortgage themselves.
  s = { ...s, debt: { debtorId, amount, creditorId, toParkingPot, reason }, gamePhase: 'debt_settlement' }
  return { state: s, status: 'settle' }
}

/**
 * Pay to the bank / free-parking pot, auto-liquidating first. Used by card effects,
 * where opening a manual dialog mid-card would be awkward. Returns whether the player
 * went bankrupt.
 */
export function payToBank(
  state: GameState,
  playerId: string,
  amount: number,
  toParkingPot: boolean,
): { state: GameState; bankrupt: boolean } {
  const res = beginPayment(state, playerId, amount, null, toParkingPot, 'Karte')
  if (res.status === 'settle') {
    // Card debts are never left open – liquidate immediately.
    return { state: forceSettleDebt(res.state), bankrupt: false }
  }
  return { state: res.state, bankrupt: res.status === 'bankrupt' }
}

/** Finalize a manual debt settlement once the debtor has raised enough cash. */
export function settleDebt(state: GameState): GameState {
  const d = state.debt
  if (!d) return state
  let s = applyPayment(state, d.debtorId, d.amount, d.creditorId, d.toParkingPot)
  const debtor = s.players.find(p => p.id === d.debtorId)
  const creditor = d.creditorId ? s.players.find(p => p.id === d.creditorId) : null
  const to = creditor ? `an ${creditor.name}` : d.toParkingPot ? 'in die Freie Pause' : 'an die Bank'
  s = addLog(s, `${debtor?.name} zahlt ${d.amount}€ ${to} (${d.reason}).`, 'warning')
  return { ...s, debt: null, gamePhase: 'end_turn' }
}

/** Auto-liquidate then settle (fallback for a timeout or a disconnected debtor). */
export function forceSettleDebt(state: GameState): GameState {
  const d = state.debt
  if (!d) return state
  let s = { ...state }
  if (netWorth(s, d.debtorId) < d.amount) {
    s = declareBankruptcy(s, d.debtorId, d.creditorId, s.settings.bankruptcyMode)
    return { ...s, debt: null }
  }
  s = raiseCash(s, d.debtorId, d.amount)
  return settleDebt(s)
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
    const reason = `Steuer (${square.name})`
    const pay = beginPayment(s, playerId, amount, null, true, reason)
    s = pay.state
    if (pay.status === 'bankrupt') {
      return { newState: s, event: 'game:player-bankrupt', data: { playerId } }
    }
    if (pay.status === 'settle') {
      // Short on cash but solvent → player must sell/mortgage before continuing.
      return { newState: s, event: 'game:debt-due', data: { debtorId: playerId, amount, creditorId: null, reason } }
    }
    s = addLog(s, `${player.name} zahlt ${amount}€ Steuer (${square.name}).`, 'warning')
    s.gamePhase = 'end_turn'
    return { newState: s, event: 'game:landed-tax', data: { amount } }
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
    const ownerId = propState.ownerId
    const reason = `Miete für ${square.name}`
    const pay = beginPayment(s, playerId, rent, ownerId, false, reason)
    s = pay.state
    if (pay.status === 'bankrupt') {
      return { newState: s, event: 'game:player-bankrupt', data: { playerId, creditorId: ownerId } }
    }
    if (pay.status === 'settle') {
      // Short on cash but solvent → player must sell/mortgage before paying.
      return { newState: s, event: 'game:debt-due', data: { debtorId: playerId, amount: rent, creditorId: ownerId, reason } }
    }
    const owner = s.players.find(p => p.id === ownerId)
    s = addLog(s, `${player.name} zahlt ${rent}€ Miete an ${owner?.name} für ${square.name}.`, 'warning')
    s.gamePhase = 'end_turn'
    return { newState: s, event: 'game:landed-property', data: { propertyIndex: player.position, ownerId, rentDue: rent, canBuy: false } }
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
      const res = payToBank(s, playerId, card.amount!, false)
      s = res.state
      if (res.bankrupt) return s
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
      const total = amount * activePlayers.length
      if (netWorth(s, playerId) < total) {
        // Can't pay everyone even after liquidating → bankrupt to the bank.
        s = declareBankruptcy(s, playerId, null, s.settings.bankruptcyMode)
        return s
      }
      if (s.players[pIdx].money < total) s = raiseCash(s, playerId, total)
      s.players = s.players.map((p, i) => {
        if (i === pIdx) return { ...p, money: p.money - total }
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
    case 'BUILDING_REPAIRS': {
      const houseCount = player.properties.reduce((acc, pi) => acc + s.properties[pi].houses, 0)
      const hotelCount = player.properties.reduce((acc, pi) => acc + (s.properties[pi].hotel ? 1 : 0), 0)
      const total = houseCount * card.house! + hotelCount * card.hotel!
      const res = payToBank(s, playerId, total, false)
      s = res.state
      if (res.bankrupt) return s
      s = addLog(s, `${player.name}: Gebäudereparatur – zahlt ${total}€.`, 'warning')
      break
    }
    case 'MOVE_FORWARD': {
      const newPos = (player.position + card.amount!) % 40
      const passedGo = newPos < player.position
      s.players = s.players.map((p, i) =>
        i === pIdx ? { ...p, position: newPos, money: p.money + (passedGo ? PASS_GO_AMOUNT : 0) } : p
      )
      s = addLog(s, `${player.name}: Karte – ${card.amount} Felder vor${passedGo ? ` (+${PASS_GO_AMOUNT}€)` : ''}.`, 'info')
      const { newState } = applyLanding(s, playerId)
      return newState
    }
    case 'PAY_PARKING': {
      const res = payToBank(s, playerId, card.amount!, true)
      s = res.state
      if (res.bankrupt) return s
      s = addLog(s, `${player.name}: Karte – zahlt ${card.amount}€ in die Freie Pause.`, 'warning')
      break
    }
    case 'EACH_PAY_PARKING': {
      const amt = card.amount!
      let pot = 0
      s.players = s.players.map(p => {
        if (p.isActive && !p.isBankrupt) {
          const paid = Math.min(amt, p.money)
          pot += paid
          return { ...p, money: p.money - paid }
        }
        return p
      })
      s.freeParkingMoney += pot
      s = addLog(s, `${player.name}: Karte – jeder zahlt ${amt}€ in die Freie Pause.`, 'warning')
      break
    }
    case 'COLLECT_FROM_ONE': {
      const amt = card.amount!
      const opponents = s.players.filter(p => p.id !== playerId && p.isActive && !p.isBankrupt)
      if (opponents.length > 0) {
        const richest = opponents.reduce((a, b) => (b.money > a.money ? b : a))
        const paid = Math.min(amt, richest.money)
        s.players = s.players.map(p =>
          p.id === playerId ? { ...p, money: p.money + paid }
            : p.id === richest.id ? { ...p, money: p.money - paid } : p
        )
        s = addLog(s, `${player.name}: Karte – erhält ${paid}€ von ${richest.name}.`, 'success')
      }
      break
    }
    case 'CLASSROOM_GAMBLE': {
      const amt = card.amount ?? 100
      const total = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1)
      if (total > 10) {
        s.players = s.players.map((p, i) => i === pIdx ? { ...p, money: p.money + amt } : p)
        s = addLog(s, `${player.name}: Würfelt ${total} (>10) – erhält ${amt}€!`, 'success')
      } else {
        const res = payToBank(s, playerId, amt, true)
        s = res.state
        if (res.bankrupt) return s
        s = addLog(s, `${player.name}: Würfelt ${total} (≤10) – zahlt ${amt}€ in die Freie Pause.`, 'warning')
      }
      break
    }
    case 'SKIP_TURN': {
      s.players = s.players.map((p, i) => i === pIdx ? { ...p, skipTurns: p.skipTurns + 1 } : p)
      s = addLog(s, `${player.name}: Karte – muss eine Runde aussetzen.`, 'warning')
      break
    }
    case 'EXTRA_TURN': {
      s = addLog(s, `${player.name}: Karte – ist gleich nochmal am Zug!`, 'success')
      return { ...s, gamePhase: 'rolling', currentDiceRoll: null }
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
  advanceTurnAfter: boolean = true,
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

  // A pending trade the bankrupt player was part of can never complete → drop it so
  // the game doesn't hang waiting on a player who is no longer around.
  if (s.activeTrade && (s.activeTrade.fromPlayerId === playerId || s.activeTrade.toPlayerId === playerId)) {
    s.activeTrade = null
    if (s.gamePhase === 'trading') s.gamePhase = 'end_turn'
  }
  // Likewise clear this player's open debt – there's nothing left to settle once
  // they're bankrupt (prevents a dangling debt_settlement state after a drop).
  if (s.debt?.debtorId === playerId) {
    s.debt = null
    if (s.gamePhase === 'debt_settlement') s.gamePhase = 'end_turn'
  }

  const winner = checkWinCondition(s)
  if (winner) {
    s.winnerId = winner
    s.gamePhase = 'game_over'
    s = addLog(s, `${s.players.find(p => p.id === winner)!.name} hat gewonnen!`, 'success')
  } else if (advanceTurnAfter) {
    // Only advance when the bankrupt player was the one on turn. If a *different*
    // player drops out (e.g. disconnect), the current player keeps their turn.
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

  let nextIdx = (s.currentPlayerIndex + 1) % s.players.length
  let guard = 0
  const maxSteps = s.players.length * 3
  while (guard++ < maxSteps) {
    const np = s.players[nextIdx]
    if (np.isBankrupt || !np.isActive) {
      nextIdx = (nextIdx + 1) % s.players.length
      continue
    }
    if (np.skipTurns > 0) {
      // This player must sit a turn out – consume one and move on.
      s.players = s.players.map((p, i) => i === nextIdx ? { ...p, skipTurns: p.skipTurns - 1 } : p)
      s = addLog(s, `${np.name} setzt eine Runde aus.`, 'warning')
      nextIdx = (nextIdx + 1) % s.players.length
      continue
    }
    break
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

  // Doubles grant another roll for the same player. The running count of
  // consecutive doubles (and the 3rd-double-goes-to-jail rule) is handled at
  // roll time in handleRollDice, so here we only need to hand back the dice.
  if (state.currentDiceRoll?.isDouble && currentPlayer.jailTurns === 0 && !currentPlayer.isBankrupt) {
    return { ...state, gamePhase: 'rolling', currentDiceRoll: null }
  }

  return advanceTurn(state)
}
