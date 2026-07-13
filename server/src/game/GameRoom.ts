import type { Server } from 'socket.io'
import {
  GameState, Player, initGameState, rollDice, movePlayer, applyLanding,
  buyProperty, startAuction, placeBid, passAuction, endAuction,
  buyHouse, buyHotel, sellHouse, sellHotel, sellAllBuildings, mortgage, unmortgage, proposeTrade,
  counterTrade, confirmTrade,
  declareBankruptcy, handleEndTurn, advanceTurn, applyCardEffect, sendToJail,
  settleDebt, forceSettleDebt,
  DEFAULT_SETTINGS,
} from './GameEngine'
import type { TradeOffer, DiceRoll, GameSettings, GamePhase } from './GameEngine'
import { BOARD_SQUARES, COLOR_GROUPS, DOUBLE_IN_ROW_JAIL, RAILROAD_INDICES, UTILITY_INDICES } from '../config/boardData'
import { ALL_CARDS } from '../config/cards'
import { logger } from '../utils/logger'
import { generateBotName } from '../utils/botNames'

export type LobbyPlayer = {
  id: string
  name: string
  color: string
  piece: string
  isBot: boolean
  token?: string
  disconnected?: boolean
}

/** Grace period (ms) a reloading player has to rejoin before being removed. */
export const RECONNECT_GRACE_MS = 45_000
/** How long a connected player may take to sell/mortgage before the server auto-settles. */
export const DEBT_GRACE_MS = 90_000

export class GameRoom {
  code: string
  hostId: string
  state: GameState | null = null
  /** Set by RoomManager to clean up the room once the last human is gone. */
  onEmpty?: () => void
  lobbyPlayers: LobbyPlayer[] = []
  readyPlayers: Set<string> = new Set()
  settings: GameSettings = { ...DEFAULT_SETTINGS }
  auctionTimer: NodeJS.Timeout | null = null
  private io: Server
  private pendingBotTimers: Set<ReturnType<typeof setTimeout>> = new Set()
  private savedPhaseBeforeQueue: GamePhase | null = null
  private turnTimer: NodeJS.Timeout | null = null
  private turnTimerPlayerId: string | null = null
  private tradeTimer: NodeJS.Timeout | null = null
  private debtTimer: ReturnType<typeof setTimeout> | null = null
  private botAuctionVals: Record<string, number> = {}
  private botAuctionPending: Set<string> = new Set()
  private tradeCounterRounds = 0
  // Reconnect support: stable client token ⇄ current playerId, plus per-player grace timers.
  private tokenByPlayer: Map<string, string> = new Map()
  private playerByToken: Map<string, string> = new Map()
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor(code: string, hostId: string, io: Server) {
    this.code = code
    this.hostId = hostId
    this.io = io
  }

  private setToken(playerId: string, token?: string): void {
    if (!token) return
    this.tokenByPlayer.set(playerId, token)
    this.playerByToken.set(token, playerId)
  }

  // ─── Lobby management ────────────────────────────────────────────────────

  addLobbyPlayer(id: string, name: string, color: string, piece: string, token?: string): void {
    this.lobbyPlayers.push({ id, name, color, piece, isBot: false })
    this.setToken(id, token)
    this.broadcastLobbyUpdate()
  }

  addBot(): void {
    if (this.lobbyPlayers.length >= 8) return
    const botColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
    const botPieces = ['Radiergummi', 'Lineal', 'Bleistift', 'Spitzer', 'Tintenfüller', 'Buch', 'Schere', 'Globus']
    const takenColors = this.lobbyPlayers.map(p => p.color)
    const takenPieces = this.lobbyPlayers.map(p => p.piece)
    const color = botColors.find(c => !takenColors.includes(c)) ?? 'blue'
    const piece = botPieces.find(p => !takenPieces.includes(p)) ?? 'Radiergummi'
    const name = generateBotName(this.lobbyPlayers.map(p => p.name))
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 100000)}`
    this.lobbyPlayers.push({ id: botId, name, color, piece, isBot: true })
    this.readyPlayers.add(botId)
    this.broadcastLobbyUpdate()
  }

  kickPlayer(playerId: string): void {
    const player = this.lobbyPlayers.find(p => p.id === playerId)
    if (!player) return
    this.lobbyPlayers = this.lobbyPlayers.filter(p => p.id !== playerId)
    this.readyPlayers.delete(playerId)
    if (!player.isBot) {
      this.io.to(playerId).emit('room:kicked')
    }
    this.broadcastLobbyUpdate()
  }

  toggleReady(socketId: string): void {
    if (this.readyPlayers.has(socketId)) {
      this.readyPlayers.delete(socketId)
    } else {
      this.readyPlayers.add(socketId)
    }
    this.broadcastLobbyUpdate()
  }

  areAllHumansReady(): boolean {
    const nonHostHumans = this.lobbyPlayers.filter(p => !p.isBot && p.id !== this.hostId)
    return nonHostHumans.every(p => this.readyPlayers.has(p.id))
  }

  getLobbyWithStatus(): Array<Omit<LobbyPlayer, 'token'> & { isReady: boolean }> {
    // Never expose the private reconnect token to clients.
    return this.lobbyPlayers.map(({ token, ...p }) => ({
      ...p,
      isReady: p.isBot || this.readyPlayers.has(p.id),
    }))
  }

  private forgetToken(playerId: string): void {
    const token = this.tokenByPlayer.get(playerId)
    if (token) this.playerByToken.delete(token)
    this.tokenByPlayer.delete(playerId)
  }

  private clearDisconnectTimer(playerId: string): void {
    const t = this.disconnectTimers.get(playerId)
    if (t) { clearTimeout(t); this.disconnectTimers.delete(playerId) }
  }

  removeLobbyPlayer(id: string): void {
    this.lobbyPlayers = this.lobbyPlayers.filter(p => p.id !== id)
    this.readyPlayers.delete(id)
    this.clearDisconnectTimer(id)
    this.forgetToken(id)
    if (this.state) {
      this.state.players = this.state.players.map(p =>
        p.id === id ? { ...p, isActive: false } : p
      )
    }
    this.broadcastLobbyUpdate()
  }

  updateSettings(socketId: string, settings: Partial<GameSettings>): void {
    if (socketId !== this.hostId) return
    this.settings = { ...this.settings, ...settings }
    this.broadcast('room:settings-update', { settings: this.settings })
  }

  startGame(): void {
    this.state = initGameState(this.lobbyPlayers, this.code, this.hostId, this.settings)
    this.broadcastState() // manageTurnTimer() inside starts the clock when time-limit is on
  }

  // ─── Disconnect / reconnect grace ─────────────────────────────────────────

  /** A socket dropped (reload/network). Keep the slot alive for RECONNECT_GRACE_MS. */
  handleDisconnect(playerId: string): void {
    const lobbyP = this.lobbyPlayers.find(p => p.id === playerId)
    if (lobbyP?.isBot) return
    const inState = this.state?.players.some(p => p.id === playerId) ?? false
    if (!lobbyP && !inState) return
    // No reconnect token → can't be restored, drop right away.
    if (!this.tokenByPlayer.has(playerId)) { this.dropPlayer(playerId); return }

    if (lobbyP) lobbyP.disconnected = true
    if (this.state) {
      this.state.players = this.state.players.map(p =>
        p.id === playerId ? { ...p, disconnected: true } : p)
    }
    this.clearDisconnectTimer(playerId)
    this.disconnectTimers.set(playerId, setTimeout(() => {
      this.disconnectTimers.delete(playerId)
      this.dropPlayer(playerId)
    }, RECONNECT_GRACE_MS))

    if (this.state) {
      // If they dropped mid-move, finish the move server-side; otherwise broadcastState
      // hands the turn to the server-driven auto-player so nothing freezes.
      const cp = this.state.players[this.state.currentPlayerIndex]
      if (cp?.id === playerId && this.state.gamePhase === 'moving') {
        this.handleMovementComplete(playerId)
      } else {
        this.broadcastState()
      }
    } else {
      this.broadcastLobbyUpdate()
    }
  }

  /** Re-attach a reloaded client (new socket id) to its old slot via the stable token. */
  reconnectPlayer(newSocketId: string, token: string): { isHost: boolean; inGame: boolean } | null {
    const oldId = this.playerByToken.get(token)
    if (!oldId) return null
    const present = this.lobbyPlayers.some(p => p.id === oldId) ||
      (this.state?.players.some(p => p.id === oldId) ?? false)
    if (!present) return null

    this.clearDisconnectTimer(oldId)
    if (oldId !== newSocketId) this.reassignPlayerId(oldId, newSocketId)

    const lp = this.lobbyPlayers.find(p => p.id === newSocketId)
    if (lp) lp.disconnected = false
    if (this.state) {
      this.state.players = this.state.players.map(p =>
        p.id === newSocketId ? { ...p, disconnected: false } : p)
    }

    if (this.state) this.broadcastState()
    else this.broadcastLobbyUpdate()
    return { isHost: this.hostId === newSocketId, inGame: !!this.state }
  }

  /** Explicit "Verlassen" – out immediately, no grace. */
  handleExplicitLeave(playerId: string): void {
    this.dropPlayer(playerId)
  }

  /** Remove a player for good: bankruptcy (in game, per chosen mode) or lobby removal. */
  private dropPlayer(playerId: string): void {
    this.clearDisconnectTimer(playerId)
    if (this.state && this.state.gamePhase !== 'game_over') {
      const player = this.state.players.find(p => p.id === playerId)
      if (player && player.isActive && !player.isBankrupt) {
        const isCurrent = this.state.players[this.state.currentPlayerIndex]?.id === playerId
        const droppedTrade = this.tradeSnapshotInvolving(playerId)
        this.state = declareBankruptcy(this.state, playerId, null, this.settings.bankruptcyMode, isCurrent)
        if (droppedTrade) this.notifyTradeCancelled(droppedTrade)
        this.broadcast('game:player-bankrupt', { playerId, gameState: this.state })
        if (this.state.gamePhase === 'game_over') {
          this.broadcast('game:over', { winnerId: this.state.winnerId, gameState: this.state })
        }
      }
      this.lobbyPlayers = this.lobbyPlayers.filter(p => p.id !== playerId)
      this.readyPlayers.delete(playerId)
      this.forgetToken(playerId)
      this.ensureHost()
      this.broadcastState()
      this.processAuctionQueue()
    } else {
      this.removeLobbyPlayer(playerId) // also forgets token + timer
      this.ensureHost()
      this.broadcastLobbyUpdate()
    }
    this.maybeCleanupEmpty()
  }

  /** Hand the host role to another human if the current host is gone. */
  private ensureHost(): void {
    if (this.lobbyPlayers.some(p => p.id === this.hostId)) return
    const newHost = this.lobbyPlayers.find(p => !p.isBot) ?? this.lobbyPlayers[0]
    if (newHost) {
      this.hostId = newHost.id
      if (this.state) this.state.hostId = newHost.id
    }
  }

  private maybeCleanupEmpty(): void {
    const humans = this.lobbyPlayers.filter(p => !p.isBot)
    if (humans.length === 0) this.onEmpty?.()
  }

  /** Restart in the SAME lobby after a game (host only). */
  resetToLobby(socketId: string): void {
    if (socketId !== this.hostId || !this.state) return
    if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
    this.clearTurnTimer()
    this.clearTradeTimer()
    this.clearDebtTimer()
    for (const t of this.pendingBotTimers) clearTimeout(t)
    this.pendingBotTimers.clear()
    for (const t of this.disconnectTimers.values()) clearTimeout(t)
    this.disconnectTimers.clear()
    this.state = null
    this.savedPhaseBeforeQueue = null
    // Keep everyone still in the lobby; bots stay ready.
    this.lobbyPlayers = this.lobbyPlayers.map(p => ({ ...p, disconnected: false }))
    this.broadcast('room:returned-to-lobby', {})
    this.broadcastLobbyUpdate()
  }

  /** Rewrite a player's id everywhere when their socket id changes on reconnect. */
  private reassignPlayerId(oldId: string, newId: string): void {
    const token = this.tokenByPlayer.get(oldId)
    if (token) { this.tokenByPlayer.delete(oldId); this.tokenByPlayer.set(newId, token); this.playerByToken.set(token, newId) }
    const t = this.disconnectTimers.get(oldId)
    if (t) { this.disconnectTimers.delete(oldId); this.disconnectTimers.set(newId, t) }
    if (this.hostId === oldId) this.hostId = newId
    if (this.turnTimerPlayerId === oldId) this.turnTimerPlayerId = newId
    this.lobbyPlayers = this.lobbyPlayers.map(p => p.id === oldId ? { ...p, id: newId } : p)
    if (this.readyPlayers.has(oldId)) { this.readyPlayers.delete(oldId); this.readyPlayers.add(newId) }

    const s = this.state
    if (!s) return
    if (s.hostId === oldId) s.hostId = newId
    if (s.winnerId === oldId) s.winnerId = newId
    s.players = s.players.map(p => p.id === oldId ? { ...p, id: newId } : p)
    s.playerOrder = s.playerOrder.map(id => id === oldId ? newId : id)
    s.properties = s.properties.map(pr => pr.ownerId === oldId ? { ...pr, ownerId: newId } : pr)
    if (s.activeTrade) {
      const tr = s.activeTrade
      s.activeTrade = {
        ...tr,
        fromPlayerId: tr.fromPlayerId === oldId ? newId : tr.fromPlayerId,
        toPlayerId: tr.toPlayerId === oldId ? newId : tr.toPlayerId,
        confirmedBy: tr.confirmedBy.map(id => id === oldId ? newId : id),
      }
    }
    if (s.auction) {
      const a = s.auction
      const bids: Record<string, number> = {}
      for (const [k, v] of Object.entries(a.bids)) bids[k === oldId ? newId : k] = v
      s.auction = {
        ...a,
        highestBidderId: a.highestBidderId === oldId ? newId : a.highestBidderId,
        bids,
        passedPlayers: a.passedPlayers.map(id => id === oldId ? newId : id),
      }
    }
  }

  // ─── Broadcasts ──────────────────────────────────────────────────────────

  broadcastLobbyUpdate(): void {
    this.io.to(this.code).emit('room:lobby-update', {
      lobbyPlayers: this.getLobbyWithStatus(),
      hostId: this.hostId,
      allReady: this.areAllHumansReady(),
      settings: this.settings,
    })
  }

  private broadcast(event: string, data: Record<string, unknown>): void {
    this.io.to(this.code).emit(event, data)
  }

  broadcastState(): void {
    this.broadcast('game:state-update', { gameState: this.state })
    this.manageTurnTimer()
    this.manageDebtTimer()
    this.scheduleBotAction()
  }

  // ─── Debt settlement (forced sell/mortgage) ───────────────────────────────

  /** While a human owes money, give them time to sell; auto-settle on timeout. */
  private manageDebtTimer(): void {
    if (!this.state || this.state.gamePhase !== 'debt_settlement' || !this.state.debt) {
      this.clearDebtTimer()
      return
    }
    const debtor = this.state.players.find(p => p.id === this.state!.debt!.debtorId)
    // Bots and disconnected players are settled by the server-driven auto-player.
    if (debtor?.isBot || debtor?.disconnected) return
    if (!this.debtTimer) {
      this.debtTimer = setTimeout(() => {
        this.debtTimer = null
        if (this.state?.gamePhase === 'debt_settlement') {
          this.state = forceSettleDebt(this.state)
          this.broadcastState()
          this.processAuctionQueue()
        }
      }, DEBT_GRACE_MS)
    }
  }

  private clearDebtTimer(): void {
    if (this.debtTimer) { clearTimeout(this.debtTimer); this.debtTimer = null }
  }

  /** Debtor confirms payment once they have raised enough cash. */
  handleSettleDebt(socketId: string): void {
    if (!this.state || this.state.gamePhase !== 'debt_settlement') return
    const d = this.state.debt
    if (!d || d.debtorId !== socketId) return
    const debtor = this.state.players.find(p => p.id === socketId)
    if (!debtor || debtor.money < d.amount) return // not enough yet – keep selling
    this.clearDebtTimer()
    this.state = settleDebt(this.state)
    this.broadcastState()
    this.processAuctionQueue()
  }

  // ─── Bot AI ───────────────────────────────────────────────────────────────

  private scheduleBotAction(): void {
    if (!this.state) return
    const cp = this.state.players[this.state.currentPlayerIndex]
    // Bots AND disconnected humans are driven by the server so a turn never stalls.
    const serverDriven = !!cp && (cp.isBot || (cp.disconnected && !cp.isBankrupt))
    if (!serverDriven) return
    if (this.state.gamePhase === 'moving') return

    const botId = cp.id
    const phase = this.state.gamePhase
    // Linger briefly on a drawn card so everyone can read it before it is acknowledged
    // (observers can already flick it away themselves, so this can stay snappy).
    const delay = phase === 'rolling' ? 1500 : phase === 'card_drawn' ? 2600 : 1000

    const timer = setTimeout(() => {
      this.pendingBotTimers.delete(timer)
      if (!this.state) return
      const current = this.state.players[this.state.currentPlayerIndex]
      if (current?.id !== botId) return
      // A disconnected human plays a safe minimal turn (never buys, never trades).
      if (current.disconnected && !current.isBot) {
        this.autoResolveDisconnectedTurn(botId)
        return
      }

      switch (this.state.gamePhase) {
        case 'rolling': {
          // handleRollDice → startMovement schedules the bot's movement completion itself.
          this.handleRollDice(botId)
          break
        }
        case 'buying': {
          if (this.botShouldBuy(botId, current.position)) {
            this.handleBuyProperty(botId)
          } else {
            this.handleDeclineProperty(botId)
          }
          break
        }
        case 'end_turn': {
          // 35% chance to try a trade before ending turn
          if (Math.random() < 0.35) {
            const tradeOffer = this.findBotTradeOpportunity(botId)
            if (tradeOffer) {
              this.state = proposeTrade(this.state, tradeOffer)
              this.broadcast('trade:proposed', { trade: this.state.activeTrade })
              this.broadcastState()
              const receiver = this.state.players.find(p => p.id === tradeOffer.toPlayerId)
              if (receiver?.isBot) {
                this.scheduleBotTradeResponse(receiver.id, this.state.activeTrade!.id)
              }
              break
            }
          }
          this.handleEndTurn(botId)
          break
        }
        case 'jail_decision':
          if (current.getOutOfJailCards > 0) {
            this.handleJailAction(botId, 'card')
          } else if (current.money >= 50) {
            this.handleJailAction(botId, 'pay')
          } else {
            this.handleJailAction(botId, 'roll')
          }
          break
        case 'card_drawn':
          this.handleCardAcknowledge(botId)
          break
      }
    }, delay)
    this.pendingBotTimers.add(timer)
  }

  // ─── Bot decision helpers ────────────────────────────────────────────────

  /** How much a player values OWNING a square — face price weighted by set/railroad synergy. */
  private propertyStrategicValue(playerId: string, idx: number): number {
    const sq = BOARD_SQUARES[idx]
    if (!sq || !this.state) return 0
    const base = sq.price ?? 0
    if (sq.type === 'property' && sq.group) {
      const group = COLOR_GROUPS[sq.group] ?? []
      const owned = group.filter(i => this.state!.properties[i]?.ownerId === playerId).length
      const byOther = group.filter(i => {
        const o = this.state!.properties[i]?.ownerId
        return o && o !== playerId
      }).length
      if (owned + 1 === group.length && byOther === 0) return base * 2.4 // completes the set
      if (byOther === 0 && owned >= 1) return base * 1.5                  // building toward a set
      if (byOther >= 1 && owned >= 1) return base * 1.1                   // contested
      return base
    }
    if (sq.type === 'railroad') {
      const rr = RAILROAD_INDICES.filter(i => this.state!.properties[i]?.ownerId === playerId).length
      return base * (1 + rr * 0.35)
    }
    if (sq.type === 'utility') {
      const ut = UTILITY_INDICES.filter(i => this.state!.properties[i]?.ownerId === playerId).length
      return base * (0.85 + ut * 0.3)
    }
    return base
  }

  /** Spending appetite 0.4–1.3 based on cash on hand, plus a random mood. */
  private botAggression(bot: Player): number {
    const cash = bot.money
    const base = cash > 1500 ? 1.05 : cash > 800 ? 0.9 : cash > 400 ? 0.7 : 0.5
    return base * (0.82 + Math.random() * 0.42)
  }

  /** Property the bot owns that it can't realistically turn into a set (safe to trade away). */
  private isSpareProperty(playerId: string, idx: number): boolean {
    const sq = BOARD_SQUARES[idx]
    if (!sq || sq.type !== 'property' || !sq.group || !this.state) return false
    const group = COLOR_GROUPS[sq.group] ?? []
    const owned = group.filter(i => this.state!.properties[i]?.ownerId === playerId).length
    const byOther = group.filter(i => {
      const o = this.state!.properties[i]?.ownerId
      return o && o !== playerId
    }).length
    // Spare only if an opponent already blocks the set AND the bot isn't itself
    // holding several of the colour (≥2 = building/blocking a set → keep it!).
    return byOther >= 1 && owned <= 1
  }

  /**
   * A street the bot must NEVER give away in a trade: it owns ≥2 of the colour
   * group (a near-complete or complete set), or ≥2 railroads / both works. Giving
   * these up throws away a monopoly – and would often hand the opponent theirs.
   */
  private isProtectedSetProperty(playerId: string, idx: number): boolean {
    const sq = BOARD_SQUARES[idx]
    if (!sq || !this.state) return false
    if (sq.type === 'property' && sq.group) {
      const group = COLOR_GROUPS[sq.group] ?? []
      const owned = group.filter(i => this.state!.properties[i]?.ownerId === playerId).length
      return owned >= 2
    }
    if (sq.type === 'railroad') {
      return RAILROAD_INDICES.filter(i => this.state!.properties[i]?.ownerId === playerId).length >= 2
    }
    if (sq.type === 'utility') {
      return UTILITY_INDICES.filter(i => this.state!.properties[i]?.ownerId === playerId).length >= 2
    }
    return false
  }

  private botShouldBuy(botId: string, idx: number): boolean {
    if (!this.state) return false
    const bot = this.state.players.find(p => p.id === botId)
    const sq = BOARD_SQUARES[idx]
    if (!bot || !sq) return false
    const price = sq.price ?? 0
    if (bot.money < price) return false

    const reserveAfter = bot.money - price
    const stratVal = this.propertyStrategicValue(botId, idx)
    const important = stratVal >= price * 1.4 // completes / strongly helps a set
    // Land grab: the fewer streets the bot has, the keener it is to buy (esp. early).
    const owned = bot.properties.length
    const eager = owned < 4 ? 1.4 : owned < 8 ? 1.2 : 1.0

    // Only a thin cash cushion blocks a buy; important streets ignore the cushion.
    if (reserveAfter < 0) return false
    if (reserveAfter < 60 && !important) return false
    if (reserveAfter < 200 && !important && Math.random() < 0.25) return false

    const willingness = stratVal * this.botAggression(bot) * eager
    // Low threshold → unowned streets are usually bought when affordable.
    return willingness >= price * (0.55 + Math.random() * 0.22)
  }

  /** Total worth of a bundle to the bot (cash at face + strategic value of streets). */
  private bundleValue(botId: string, props: number[], money: number): number {
    return money + props.reduce((s, i) => s + this.propertyStrategicValue(botId, i), 0)
  }

  /**
   * Build a flexible counter-offer for `botId` (the receiver of `trade`):
   * keeps streets it really wants, drops the ones it won't give, may add a spare
   * street, and balances the rest with cash. Terms are from the bot's perspective.
   */
  private buildBotCounter(botId: string, trade: TradeOffer):
    { offeredProperties: number[]; requestedProperties: number[]; offeredMoney: number; requestedMoney: number } {
    const bot = this.state!.players.find(p => p.id === botId)!
    const human = this.state!.players.find(p => p.id === trade.fromPlayerId)
    const humanMoney = human?.money ?? 0
    const face = (arr: number[]) => arr.reduce((s, i) => s + (BOARD_SQUARES[i]?.price ?? 0), 0)
    const tradeable = (i: number) => {
      const p = this.state!.properties[i]
      return p && !p.houses && !p.hotel && !p.isMortgaged
    }

    const wants: number[] = trade.offeredProperties // streets the bot would receive
    // Refuse to hand over set-builders: never give a near/complete set (≥2 of a
    // colour) away, and keep streets the bot strongly values.
    const give = trade.requestedProperties.filter(i => {
      if (this.isProtectedSetProperty(botId, i)) return false
      const sv = this.propertyStrategicValue(botId, i)
      return !(sv >= (BOARD_SQUARES[i]?.price ?? 0) * 1.5)
    })

    // If the bot is now getting much more in streets than it gives, sweeten with a spare + cash.
    let streetGap = face(wants) - face(give) // >0 → bot getting more streets
    if (streetGap > 180 && Math.random() < 0.6) {
      const spare = bot.properties.find(i =>
        this.isSpareProperty(botId, i) && !give.includes(i) && !wants.includes(i) && tradeable(i))
      if (spare !== undefined) { give.push(spare); streetGap = face(wants) - face(give) }
    }

    let offeredMoney = 0
    let requestedMoney = 0
    if (streetGap > 0) {
      // Getting more streets → offer some cash to make it attractive.
      offeredMoney = Math.max(0, Math.min(bot.money - 150, Math.floor(streetGap * (0.55 + Math.random() * 0.35))))
    } else {
      // Giving more streets → ask for cash, but never more than the human has.
      requestedMoney = Math.max(0, Math.min(humanMoney, Math.floor(-streetGap * (0.55 + Math.random() * 0.35))))
    }

    return { offeredProperties: give, requestedProperties: wants, offeredMoney, requestedMoney }
  }

  private findBotTradeOpportunity(botId: string): Omit<TradeOffer, 'id' | 'status' | 'confirmedBy'> | null {
    if (!this.state) return null
    const bot = this.state.players.find(p => p.id === botId)
    if (!bot) return null

    type Cand = Omit<TradeOffer, 'id' | 'status' | 'confirmedBy'> & { score: number }
    const candidates: Cand[] = []

    for (const [group, indices] of Object.entries(COLOR_GROUPS)) {
      if (group === 'railroad' || group === 'utility') continue // focus on buildable colour sets
      const botOwns = indices.filter(i => this.state!.properties[i]?.ownerId === botId)
      if (botOwns.length === 0) continue
      const needed = indices.filter(i => {
        const owner = this.state!.properties[i]?.ownerId
        return owner && owner !== botId
      })
      // Want to grab the 1–2 missing streets, and only if a SINGLE opponent holds them all.
      if (needed.length === 0 || needed.length > 2) continue
      const owners = new Set(needed.map(i => this.state!.properties[i]?.ownerId))
      if (owners.size !== 1) continue
      const targetOwnerId = [...owners][0]!
      const target = this.state.players.find(p => p.id === targetOwnerId)
      if (!target || target.isBankrupt || !target.isActive) continue
      // None of the needed streets may carry buildings (can't be traded then).
      if (needed.some(i => this.state!.properties[i]?.houses > 0 || this.state!.properties[i]?.hotel)) continue

      const totalPrice = needed.reduce((s, i) => s + (BOARD_SQUARES[i]?.price ?? 0), 0)
      // Situational pricing: pay more to rich/comfortable owners, squeeze cash-strapped ones.
      let factor = 1.25 + Math.random() * 0.45
      if (target.money < 300) factor -= 0.2
      if (target.money > 1200) factor += 0.25
      let offerMoney = Math.floor(totalPrice * factor)

      // Sometimes sweeten with a spare street so it isn't pure cash.
      const offeredProps: number[] = []
      const spare = bot.properties.find(i =>
        this.isSpareProperty(botId, i) && !this.state!.properties[i]?.houses && !this.state!.properties[i]?.hotel)
      if (spare !== undefined && Math.random() < 0.45) {
        offeredProps.push(spare)
        offerMoney = Math.max(0, offerMoney - Math.floor((BOARD_SQUARES[spare]?.price ?? 0) * 0.6))
      }

      // Keep a safety reserve.
      if (bot.money - offerMoney < 150) offerMoney = bot.money - 150
      if (offerMoney < 0) continue

      const score = needed.reduce((s, i) => s + this.propertyStrategicValue(botId, i), 0) - offerMoney * 0.3
      candidates.push({
        fromPlayerId: botId,
        toPlayerId: targetOwnerId,
        offeredProperties: offeredProps,
        requestedProperties: needed,
        offeredMoney: offerMoney,
        requestedMoney: 0,
        score,
      })
    }

    if (candidates.length === 0) return null
    candidates.sort((a, b) => b.score - a.score)
    const best = candidates[0]
    return {
      fromPlayerId: best.fromPlayerId,
      toPlayerId: best.toPlayerId,
      offeredProperties: best.offeredProperties,
      requestedProperties: best.requestedProperties,
      offeredMoney: best.offeredMoney,
      requestedMoney: best.requestedMoney,
    }
  }

  private scheduleBotTradeResponse(botId: string, tradeId: string): void {
    const delay = 2000 + Math.random() * 1500
    const timer = setTimeout(() => {
      this.pendingBotTimers.delete(timer)
      if (!this.state?.activeTrade || this.state.activeTrade.id !== tradeId) return
      const trade = this.state.activeTrade
      // Only respond if the bot is actually part of this trade and hasn't confirmed yet.
      if (trade.fromPlayerId !== botId && trade.toPlayerId !== botId) return
      if (trade.confirmedBy.includes(botId)) return
      const bot = this.state.players.find(p => p.id === botId)
      if (!bot) return

      // Evaluate from the bot's perspective regardless of who currently "owns" the offer.
      const botIsFrom = trade.fromPlayerId === botId
      const getProps = botIsFrom
        ? { recv: trade.requestedProperties, give: trade.offeredProperties }
        : { recv: trade.offeredProperties, give: trade.requestedProperties }
      const recvMoney = botIsFrom ? trade.requestedMoney : trade.offeredMoney
      const giveMoney = botIsFrom ? trade.offeredMoney : trade.requestedMoney

      const receives = this.bundleValue(botId, getProps.recv, recvMoney)
      const gives = this.bundleValue(botId, getProps.give, giveMoney)
      const cashOut = giveMoney - recvMoney
      const ratio = receives / Math.max(1, gives)

      // Hard guards — a bot must never lose value, bleed cash for nothing, or give
      // away a near/complete set (≥2 of a colour).
      const losesCashForNothing = cashOut > 0 && getProps.recv.length === 0
      const givesProtectedSet = getProps.give.some(i => this.isProtectedSetProperty(botId, i))
      const reserveOk = bot.money - Math.max(0, cashOut) >= 120
      // Accept only when the total value coming back is fair-or-better (small random margin).
      // (Set-completing streets are already valued ~2.4× by bundleValue, so the bot will
      //  still pay a premium for them — but it won't accept a plain money loss.)
      const fair = receives >= gives * (0.98 + Math.random() * 0.06)

      const canCounter = !botIsFrom && this.tradeCounterRounds < 5

      if (fair && reserveOk && !losesCashForNothing && !givesProtectedSet) {
        this.handleConfirmTrade(botId, tradeId)
      } else if (canCounter && ratio >= 0.15 && !losesCashForNothing) {
        // Not completely off → make a flexible counter rather than flatly rejecting.
        const c = this.buildBotCounter(botId, trade)
        const counterReserveOk = bot.money - (c.offeredMoney - c.requestedMoney) >= 100
        const changed =
          c.offeredMoney !== giveMoney || c.requestedMoney !== recvMoney ||
          c.offeredProperties.length !== getProps.give.length ||
          c.requestedProperties.length !== getProps.recv.length
        if (counterReserveOk && changed) {
          this.handleCounterTrade(botId, c)
        } else {
          // Fallback: keep streets (minus any protected set), just rebalance with cash.
          const safeGive = trade.requestedProperties.filter(i => !this.isProtectedSetProperty(botId, i))
          const askExtra = Math.max(0, Math.floor((gives - receives) * (0.8 + Math.random() * 0.4)))
          this.handleCounterTrade(botId, {
            offeredProperties: safeGive,
            requestedProperties: trade.offeredProperties,
            offeredMoney: 0,
            requestedMoney: trade.offeredMoney + askExtra,
          })
        }
      } else {
        this.handleRejectTrade(botId, tradeId)
      }
    }, delay)
    this.pendingBotTimers.add(timer)
  }

  /** Each bot privately values the property up to a cap, then they bid each other up. */
  private startBotAuctionBidding(): void {
    if (!this.state?.auction) return
    this.botAuctionVals = {}
    this.botAuctionPending.clear()
    const idx = this.state.auction.propertyIndex
    for (const p of this.state.players) {
      if (!p.isBot || !p.isActive || p.isBankrupt) continue
      // propertyStrategicValue already boosts streets whose colour the bot owns / can complete.
      const strat = this.propertyStrategicValue(p.id, idx)
      const owned = p.properties.length
      const eager = owned < 4 ? 1.15 : owned < 8 ? 1.05 : 1.0
      // Bots bid up to 75–125% of the (boosted) value, so streets can't be sniped cheaply.
      // Cash-strapped bots hold back a bit; comfortable bots bid full value.
      const cashFactor = p.money > 800 ? 1.0 : p.money > 400 ? 0.85 : 0.6
      let val = strat * (0.75 + Math.random() * 0.5) * eager * cashFactor
      val = Math.min(val, p.money - 80)
      this.botAuctionVals[p.id] = Math.max(0, Math.floor(val))
    }
    this.scheduleBotAuctionRound(null)
  }

  private scheduleBotAuctionRound(exceptBotId: string | null): void {
    if (!this.state?.auction) return
    for (const p of this.state.players) {
      if (!p.isBot || !p.isActive || p.isBankrupt) continue
      if (p.id === exceptBotId) continue
      if (this.state.auction.passedPlayers.includes(p.id)) continue
      if (this.state.auction.highestBidderId === p.id) continue
      this.scheduleBotAuctionEval(p.id)
    }
  }

  private scheduleBotAuctionEval(botId: string): void {
    if (this.botAuctionPending.has(botId)) return
    this.botAuctionPending.add(botId)
    const delay = 700 + Math.random() * 1500
    const timer = setTimeout(() => {
      this.pendingBotTimers.delete(timer)
      this.botAuctionPending.delete(botId)
      if (!this.state?.auction) return
      const bot = this.state.players.find(p => p.id === botId)
      if (!bot || bot.isBankrupt || !bot.isActive) return
      const auction = this.state.auction
      if (auction.passedPlayers.includes(botId) || auction.highestBidderId === botId) return
      const val = this.botAuctionVals[botId] ?? 0
      const price = BOARD_SQUARES[auction.propertyIndex]?.price ?? 100
      const increment = Math.max(10, Math.round(price * 0.05 / 5) * 5)
      const nextBid = auction.highestBid + increment
      if (nextBid <= val && bot.money >= nextBid) {
        this.handleAuctionBid(botId, nextBid) // triggers the next round for the others
      } else {
        this.handleAuctionPass(botId)
      }
    }, delay)
    this.pendingBotTimers.add(timer)
  }

  // ─── Game event handlers ─────────────────────────────────────────────────

  handleRollDice(socketId: string): void {
    if (!this.state) return
    const cpIdx = this.state.currentPlayerIndex
    const currentPlayer = this.state.players[cpIdx]
    if (currentPlayer.id !== socketId) return
    if (this.state.gamePhase !== 'rolling') return

    const roll = rollDice()
    const newDoubles = roll.isDouble ? currentPlayer.doublesCount + 1 : 0
    this.state = {
      ...this.state,
      players: this.state.players.map((p, i) => i === cpIdx ? { ...p, doublesCount: newDoubles } : p),
    }

    // Third double in a row → straight to the Nachsitz-Zimmer, but only AFTER the
    // dice animation has played (otherwise the jail jump spoils the roll).
    if (roll.isDouble && newDoubles >= DOUBLE_IN_ROW_JAIL) {
      this.state = { ...this.state, currentDiceRoll: roll, gamePhase: 'moving' }
      this.broadcast('game:dice-rolled', { playerId: socketId, roll, gameState: this.state })
      this.broadcastState()
      const t = setTimeout(() => {
        this.pendingBotTimers.delete(t)
        if (!this.state) return
        this.state = sendToJail(this.state, socketId)
        this.broadcast('game:go-to-jail', { playerId: socketId, gameState: this.state })
        this.broadcastState()
      }, 2200)
      this.pendingBotTimers.add(t)
      return
    }

    this.startMovement(socketId, roll, currentPlayer.position)
  }

  /** Broadcasts the roll, animates the piece step-by-step, and (for bots) auto-completes movement. */
  private startMovement(socketId: string, roll: DiceRoll, startPos: number): void {
    if (!this.state) return
    this.state = { ...this.state, currentDiceRoll: roll, gamePhase: 'moving' }
    this.broadcast('game:dice-rolled', { playerId: socketId, roll, gameState: this.state })

    const steps = roll.total
    const DICE_ANIM_MS = 2000
    const STEP_MS = 380
    for (let i = 0; i < steps; i++) {
      const fromIndex = (startPos + i) % 40
      const toIndex = (startPos + i + 1) % 40
      setTimeout(() => {
        this.broadcast('game:piece-move-step', {
          playerId: socketId,
          fromIndex,
          toIndex,
          stepNumber: i + 1,
          totalSteps: steps,
        })
      }, DICE_ANIM_MS + i * STEP_MS)
    }

    // Bots (and disconnected humans) have no client to report movement completion,
    // so schedule it server-side.
    const mover = this.state.players.find(p => p.id === socketId)
    if (mover?.isBot || mover?.disconnected) {
      const moveTimer = setTimeout(() => {
        this.pendingBotTimers.delete(moveTimer)
        if (this.state?.gamePhase === 'moving') this.handleMovementComplete(socketId)
      }, DICE_ANIM_MS + steps * STEP_MS + 800)
      this.pendingBotTimers.add(moveTimer)
    }
  }

  handleMovementComplete(socketId: string): void {
    if (!this.state) return
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    if (currentPlayer.id !== socketId) return
    this.state = movePlayer(this.state, socketId, this.state.currentDiceRoll!)
    const { newState, event, data } = applyLanding(this.state, socketId)
    this.state = newState
    this.broadcast(event, { playerId: socketId, ...data, gameState: this.state })
    if (this.state.gamePhase === 'game_over') {
      this.broadcast('game:over', { winnerId: this.state.winnerId, gameState: this.state })
    }
    this.broadcastState()
    this.processAuctionQueue()
  }

  handleBuyProperty(socketId: string): void {
    if (!this.state) return
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    if (currentPlayer.id !== socketId || this.state.gamePhase !== 'buying') return
    this.state = buyProperty(this.state, socketId, currentPlayer.position)
    this.broadcastState()
  }

  handleDeclineProperty(socketId: string): void {
    if (!this.state) return
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    if (currentPlayer.id !== socketId || this.state.gamePhase !== 'buying') return
    const propertyIndex = currentPlayer.position
    this.state = startAuction(this.state, propertyIndex)
    this.startAuctionTimer()
    this.broadcast('auction:started', { auction: this.state.auction, gameState: this.state })
    this.broadcastState()
    this.autoPassBrokeBidders() // players with 0 € are out before it even starts
    if (this.resolveAuctionIfDone()) return
    this.startBotAuctionBidding()
  }

  // ─── Time-limit timers (optional modifier) ───────────────────────────────
  private manageTurnTimer(): void {
    if (!this.state || !this.settings.timeLimit) { this.clearTurnTimer(); return }
    const cp = this.state.players[this.state.currentPlayerIndex]
    const interactive = ['rolling', 'end_turn', 'buying', 'jail_decision', 'card_drawn'].includes(this.state.gamePhase)
    const eligible = cp && !cp.isBot && !cp.isBankrupt && interactive && !this.state.auction && !this.state.activeTrade
    if (eligible) {
      // (Re)start the clock when a new player's turn begins.
      if (!this.turnTimer || this.turnTimerPlayerId !== cp.id) this.startTurnTimer(cp.id)
    } else {
      this.clearTurnTimer()
    }
  }

  private startTurnTimer(playerId: string): void {
    this.clearTurnTimer()
    if (!this.state || !this.settings.timeLimit) return
    this.turnTimerPlayerId = playerId
    let remaining = 120
    this.broadcast('game:turn-tick', { timeRemaining: remaining })
    this.turnTimer = setInterval(() => {
      remaining -= 1
      this.broadcast('game:turn-tick', { timeRemaining: remaining })
      if (remaining <= 0) {
        this.clearTurnTimer()
        this.autoResolveTurn()
      }
    }, 1000)
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) { clearInterval(this.turnTimer); this.turnTimer = null }
    this.turnTimerPlayerId = null
  }

  private autoResolveTurn(): void {
    if (!this.state) return
    const cp = this.state.players[this.state.currentPlayerIndex]
    if (!cp || cp.isBot || cp.isBankrupt) return
    switch (this.state.gamePhase) {
      case 'rolling': this.handleRollDice(cp.id); break
      case 'jail_decision': this.handleJailAction(cp.id, cp.money >= 50 ? 'pay' : 'roll'); break
      case 'buying': this.handleDeclineProperty(cp.id); break
      case 'card_drawn': this.handleCardAcknowledge(cp.id); break
      case 'end_turn': this.handleEndTurn(cp.id); break
    }
  }

  /** Plays one safe step of a disconnected player's turn so the game keeps moving. */
  private autoResolveDisconnectedTurn(playerId: string): void {
    if (!this.state) return
    const player = this.state.players.find(p => p.id === playerId)
    if (!player) return
    switch (this.state.gamePhase) {
      case 'rolling': this.handleRollDice(playerId); break
      case 'buying': this.handleDeclineProperty(playerId); break // never auto-buy for an absent player
      case 'card_drawn': this.handleCardAcknowledge(playerId); break
      case 'jail_decision':
        this.handleJailAction(playerId, player.getOutOfJailCards > 0 ? 'card' : player.money >= 50 ? 'pay' : 'roll')
        break
      case 'debt_settlement':
        this.clearDebtTimer()
        this.state = forceSettleDebt(this.state)
        this.broadcastState()
        this.processAuctionQueue()
        break
      case 'end_turn': this.handleEndTurn(playerId); break
    }
  }

  private startTradeTimer(): void {
    this.clearTradeTimer()
    if (!this.state || !this.settings.timeLimit || !this.state.activeTrade) return
    const tradeId = this.state.activeTrade.id
    let remaining = 60
    this.broadcast('trade:tick', { timeRemaining: remaining })
    this.tradeTimer = setInterval(() => {
      remaining -= 1
      this.broadcast('trade:tick', { timeRemaining: remaining })
      if (remaining <= 0) {
        this.clearTradeTimer()
        if (this.state?.activeTrade?.id === tradeId) {
          const trade = this.state.activeTrade
          this.state = { ...this.state, activeTrade: null, gamePhase: 'end_turn' }
          this.broadcast('trade:rejected', { trade, byId: null })
          this.broadcastState()
        }
      }
    }, 1000)
  }

  private clearTradeTimer(): void {
    if (this.tradeTimer) { clearInterval(this.tradeTimer); this.tradeTimer = null }
  }

  private startAuctionTimer(): void {
    if (this.auctionTimer) clearInterval(this.auctionTimer)
    this.auctionTimer = setInterval(() => {
      if (!this.state?.auction) { clearInterval(this.auctionTimer!); return }
      this.state.auction.timeRemaining -= 1
      this.broadcast('auction:tick', { timeRemaining: this.state.auction.timeRemaining })
      if (this.state.auction.timeRemaining <= 0) {
        clearInterval(this.auctionTimer!)
        this.state = endAuction(this.state)
        this.broadcast('auction:ended', { winnerId: null, amount: 0, gameState: this.state })
        this.broadcastState()
        this.processAuctionQueue()
      }
    }, 1000)
  }

  handleAuctionBid(socketId: string, amount: number): void {
    if (!this.state?.auction) return
    const before = this.state.auction.highestBid
    this.state = placeBid(this.state, socketId, amount)
    if (this.state.auction && this.state.auction.highestBid !== before) {
      // Anti-snipe: a fresh bid in the final seconds bumps the clock back up to 10s.
      if (this.state.auction.timeRemaining < 10) {
        this.state.auction.timeRemaining = 10
        this.broadcast('auction:tick', { timeRemaining: 10 })
      }
      this.broadcast('auction:bid-placed', { playerId: socketId, amount, auction: this.state.auction })
      // Drop anyone who can no longer afford to outbid, then check if that decided it.
      this.autoPassBrokeBidders()
      // If everyone else has already passed, the bidder wins right away.
      if (this.resolveAuctionIfDone()) return
      // Let the other bots react to the new highest bid.
      this.scheduleBotAuctionRound(socketId)
    } else {
      this.broadcast('auction:bid-placed', { playerId: socketId, amount, auction: this.state.auction })
    }
  }

  handleAuctionPass(socketId: string): void {
    if (!this.state?.auction) return
    // Only players still in the auction can pass.
    if (this.state.auction.passedPlayers.includes(socketId)) return
    this.state = passAuction(this.state, socketId)
    if (!this.state.auction) return
    // Let everyone see the updated "passed" status, then check if the auction is decided.
    this.broadcast('auction:bid-placed', {
      playerId: socketId,
      amount: this.state.auction.highestBid,
      auction: this.state.auction,
    })
    this.broadcastState()
    this.resolveAuctionIfDone()
  }

  /**
   * Ends the auction only when it is genuinely decided:
   *  - everyone has passed (no winner), or
   *  - just one player remains AND that player already holds the highest bid.
   * This stops the player who *started* the auction (by declining) from ending it
   * for everyone simply by passing before anyone else got a chance to bid.
   */
  private resolveAuctionIfDone(): boolean {
    if (!this.state?.auction) return false
    const auction = this.state.auction
    const activePlayers = this.state.players.filter(p => p.isActive && !p.isBankrupt)
    const remaining = activePlayers.filter(p => !auction.passedPlayers.includes(p.id))
    const everyonePassed = remaining.length === 0
    const onlyLeaderLeft = remaining.length === 1 && auction.highestBidderId === remaining[0].id
    if (!everyonePassed && !onlyLeaderLeft) return false

    if (this.auctionTimer) clearInterval(this.auctionTimer)
    this.state = endAuction(this.state)
    this.broadcast('auction:ended', { winnerId: auction.highestBidderId, amount: auction.highestBid, gameState: this.state })
    this.broadcastState()
    this.processAuctionQueue()
    return true
  }

  /**
   * Auto-pass every active bidder who can no longer outbid the current high bid.
   * A player needs more than `highestBid` to place a valid bid, so anyone at or below
   * it is out anyway – this passes them automatically instead of forcing a manual click.
   */
  private autoPassBrokeBidders(): void {
    if (!this.state?.auction) return
    const broke = this.state.players.filter(p =>
      p.isActive && !p.isBankrupt &&
      p.id !== this.state!.auction!.highestBidderId &&
      !this.state!.auction!.passedPlayers.includes(p.id) &&
      // Can't outbid the current high bid, or isn't here to bid at all.
      (p.money <= this.state!.auction!.highestBid || p.disconnected)
    )
    for (const p of broke) {
      this.state = passAuction(this.state!, p.id)
      if (!this.state.auction) return
      this.broadcast('auction:bid-placed', {
        playerId: p.id,
        amount: this.state.auction.highestBid,
        auction: this.state.auction,
      })
    }
    if (broke.length > 0) this.broadcastState()
  }

  handleEndTurn(socketId: string): void {
    if (!this.state) return
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    if (currentPlayer.id !== socketId || this.state.gamePhase !== 'end_turn') return
    this.state = handleEndTurn(this.state)
    this.broadcastState()
  }

  handleCardAcknowledge(socketId: string): void {
    if (!this.state) return
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    if (currentPlayer.id !== socketId || this.state.gamePhase !== 'card_drawn') return
    this.state = applyCardEffect(this.state, socketId)
    // A movement card may have landed the player on ANOTHER card square (e.g. "3 Felder
    // zurück" → Klassenbuch), drawing a fresh card. Re-emit game:card-drawn so its modal
    // opens; otherwise the turn would hang in the card_drawn phase with no popup.
    if (this.state.gamePhase === 'card_drawn' && this.state.pendingCardAction) {
      const { id, type } = this.state.pendingCardAction
      this.broadcast('game:card-drawn', {
        playerId: socketId,
        card: ALL_CARDS[id as string],
        cardType: type,
        gameState: this.state,
      })
      this.broadcastState()
      return
    }
    // A movement card ("Rücke vor zu …") may have dropped the player on a buyable
    // property — emit the landing so the buy modal opens for them.
    if (this.state.gamePhase === 'buying') {
      const mover = this.state.players[this.state.currentPlayerIndex]
      const sq = BOARD_SQUARES[mover.position]
      this.broadcast('game:landed-property', {
        playerId: socketId,
        propertyIndex: mover.position,
        ownerId: null,
        rentDue: null,
        canBuy: mover.money >= (sq?.price ?? 0),
        gameState: this.state,
      })
    }
    this.broadcastState()
  }

  handleBuyHouse(socketId: string, propertyIndex: number): void {
    if (!this.state) return
    this.state = buyHouse(this.state, socketId, propertyIndex)
    this.broadcastState()
  }

  handleBuyHotel(socketId: string, propertyIndex: number): void {
    if (!this.state) return
    this.state = buyHotel(this.state, socketId, propertyIndex)
    this.broadcastState()
  }

  handleSellHouse(socketId: string, propertyIndex: number): void {
    if (!this.state) return
    this.state = sellHouse(this.state, socketId, propertyIndex)
    this.broadcastState()
  }

  handleSellHotel(socketId: string, propertyIndex: number): void {
    if (!this.state) return
    this.state = sellHotel(this.state, socketId, propertyIndex)
    this.broadcastState()
  }

  handleSellAllBuildings(socketId: string, propertyIndex: number): void {
    if (!this.state) return
    this.state = sellAllBuildings(this.state, socketId, propertyIndex)
    this.broadcastState()
  }

  handleMortgage(socketId: string, propertyIndex: number): void {
    if (!this.state) return
    this.state = mortgage(this.state, socketId, propertyIndex)
    this.broadcastState()
  }

  handleUnmortgage(socketId: string, propertyIndex: number): void {
    if (!this.state) return
    this.state = unmortgage(this.state, socketId, propertyIndex)
    this.broadcastState()
  }

  handleProposeTrade(socketId: string, offer: Omit<TradeOffer, 'id' | 'status' | 'confirmedBy'>): void {
    if (!this.state) return
    this.state = proposeTrade(this.state, offer)
    this.tradeCounterRounds = 0
    this.broadcast('trade:proposed', { trade: this.state.activeTrade })
    this.broadcastState()
    this.startTradeTimer()
    const receiver = this.state.players.find(p => p.id === offer.toPlayerId)
    if (receiver?.isBot && this.state.activeTrade) {
      this.scheduleBotTradeResponse(receiver.id, this.state.activeTrade.id)
    }
  }

  handleCounterTrade(socketId: string, terms: { offeredProperties: number[]; requestedProperties: number[]; offeredMoney: number; requestedMoney: number }): void {
    if (!this.state?.activeTrade) return
    const trade = this.state.activeTrade
    if (trade.toPlayerId !== socketId && trade.fromPlayerId !== socketId) return
    this.state = counterTrade(this.state, socketId, terms)
    this.tradeCounterRounds += 1
    this.broadcast('trade:countered', { trade: this.state.activeTrade })
    this.broadcastState()
    this.startTradeTimer()
    const newReceiver = this.state.players.find(p => p.id === this.state!.activeTrade!.toPlayerId)
    if (newReceiver?.isBot) {
      this.scheduleBotTradeResponse(newReceiver.id, this.state.activeTrade!.id)
    }
  }

  handleConfirmTrade(socketId: string, tradeId: string): void {
    if (!this.state?.activeTrade || this.state.activeTrade.id !== tradeId) return
    const active = this.state.activeTrade
    // Only the two trade partners may confirm.
    if (active.fromPlayerId !== socketId && active.toPlayerId !== socketId) return
    this.state = confirmTrade(this.state, socketId)
    if (!this.state.activeTrade) {
      this.clearTradeTimer()
      this.broadcast('trade:accepted', { trade: null, gameState: this.state })
      this.broadcastState()
    } else {
      this.broadcast('trade:confirm-update', { trade: this.state.activeTrade })
      this.broadcastState()
      const currentTrade = this.state.activeTrade
      const otherParty = currentTrade.fromPlayerId === socketId ? currentTrade.toPlayerId : currentTrade.fromPlayerId
      const otherPlayer = this.state.players.find(p => p.id === otherParty)
      // Let the bot re-evaluate (it may confirm, counter or reject) rather than blindly accept.
      if (otherPlayer?.isBot && !currentTrade.confirmedBy.includes(otherParty)) {
        this.scheduleBotTradeResponse(otherParty, tradeId)
      }
    }
  }

  /** Snapshot the active trade if `playerId` is part of it (before it gets cleared). */
  private tradeSnapshotInvolving(playerId: string): TradeOffer | null {
    const t = this.state?.activeTrade
    if (t && (t.fromPlayerId === playerId || t.toPlayerId === playerId)) return t
    return null
  }

  /** Close the trade UI for the remaining partner after a drop/bankruptcy killed the trade. */
  private notifyTradeCancelled(trade: TradeOffer): void {
    this.clearTradeTimer()
    this.broadcast('trade:rejected', { trade, byId: null })
  }

  handleRejectTrade(socketId: string, tradeId: string): void {
    if (!this.state?.activeTrade || this.state.activeTrade.id !== tradeId) return
    const trade = this.state.activeTrade
    // Only the two trade partners may cancel.
    if (trade.fromPlayerId !== socketId && trade.toPlayerId !== socketId) return
    this.clearTradeTimer()
    this.state = { ...this.state, activeTrade: null, gamePhase: 'end_turn' }
    this.broadcast('trade:rejected', { trade, byId: socketId })
    this.broadcastState()
  }

  handleDeclareBankruptcy(socketId: string): void {
    if (!this.state) return
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    // Prefer the open debt's creditor (rent/tax); fall back to the current square's owner.
    const debt = this.state.debt
    const creditorId = debt?.debtorId === socketId
      ? debt.creditorId
      : (this.state.properties[currentPlayer.position]?.ownerId || null)
    if (debt) { this.clearDebtTimer(); this.state = { ...this.state, debt: null } }
    const droppedTrade = this.tradeSnapshotInvolving(socketId)
    this.state = declareBankruptcy(this.state, socketId, creditorId, this.settings.bankruptcyMode)
    if (droppedTrade) this.notifyTradeCancelled(droppedTrade)
    this.broadcast('game:player-bankrupt', { playerId: socketId, gameState: this.state })
    if (this.state.gamePhase === 'game_over') {
      this.broadcast('game:over', { winnerId: this.state.winnerId, gameState: this.state })
    }
    this.broadcastState()
    this.processAuctionQueue()
  }

  /** Auction all unowned streets one after another (admin "speed up" button). */
  handleAuctionAll(socketId: string): void {
    if (!this.state || socketId !== this.hostId) return
    if (this.state.auction || this.state.activeTrade) return
    if (this.state.gamePhase !== 'rolling' && this.state.gamePhase !== 'end_turn') return
    const free = this.state.properties
      .filter(p => p.ownerId === null && ['property', 'railroad', 'utility'].includes(BOARD_SQUARES[p.boardIndex]?.type))
      .map(p => p.boardIndex)
    if (free.length === 0) return
    this.state = { ...this.state, auctionQueue: [...this.state.auctionQueue, ...free] }
    this.processAuctionQueue()
  }

  /** Starts the next queued auction, or restores the pre-queue phase when finished. */
  private processAuctionQueue(): void {
    if (!this.state || this.state.auction) return
    if (this.state.auctionQueue.length === 0) {
      if (this.savedPhaseBeforeQueue) {
        this.state = { ...this.state, gamePhase: this.savedPhaseBeforeQueue }
        this.savedPhaseBeforeQueue = null
        this.broadcastState()
      }
      return
    }
    if (this.savedPhaseBeforeQueue === null) this.savedPhaseBeforeQueue = this.state.gamePhase
    const [next, ...rest] = this.state.auctionQueue
    this.state = startAuction({ ...this.state, auctionQueue: rest }, next)
    this.startAuctionTimer()
    this.broadcast('auction:started', { auction: this.state.auction, gameState: this.state })
    this.broadcastState()
    this.autoPassBrokeBidders() // players with 0 € are out before it even starts
    if (this.resolveAuctionIfDone()) return
    this.startBotAuctionBidding()
  }

  handleJailAction(socketId: string, action: 'pay' | 'card' | 'roll'): void {
    if (!this.state) return
    const pIdx = this.state.players.findIndex(p => p.id === socketId)
    if (pIdx < 0) return
    const player = this.state.players[pIdx]
    if (player.jailTurns === 0) return

    if (action === 'pay') {
      if (player.money < 50) return
      this.state.players = this.state.players.map((p, i) =>
        i === pIdx ? { ...p, money: p.money - 50, jailTurns: 0 } : p
      )
      this.state.gamePhase = 'rolling'
    } else if (action === 'card') {
      if (player.getOutOfJailCards <= 0) return
      this.state.players = this.state.players.map((p, i) =>
        i === pIdx ? { ...p, getOutOfJailCards: p.getOutOfJailCards - 1, jailTurns: 0 } : p
      )
      this.state.gamePhase = 'rolling'
    } else if (action === 'roll') {
      const roll = rollDice()
      const JAIL_MAX = 3
      if (roll.isDouble) {
        // Freed by Pasch → move (startMovement shows the dice + animates). No bonus roll.
        this.state.players = this.state.players.map((p, i) =>
          i === pIdx ? { ...p, jailTurns: 0, doublesCount: 0 } : p
        )
        this.startMovement(socketId, { ...roll, isDouble: false }, player.position)
        return
      }
      if (player.jailTurns >= JAIL_MAX) {
        // Used up all 3 attempts → must pay the 50€ fine, then move the rolled amount.
        this.state.players = this.state.players.map((p, i) =>
          i === pIdx ? { ...p, money: p.money - 50, jailTurns: 0, doublesCount: 0 } : p
        )
        this.startMovement(socketId, { ...roll, isDouble: false }, player.position)
        return
      }
      // Failed attempt but chances remain: SHOW the dice, then stay locked up and
      // hand the turn on (no movement — the player does NOT leave jail).
      this.state = { ...this.state, currentDiceRoll: roll, gamePhase: 'moving' }
      this.state.players = this.state.players.map((p, i) =>
        i === pIdx ? { ...p, jailTurns: player.jailTurns + 1 } : p
      )
      this.broadcast('game:dice-rolled', { playerId: socketId, roll, gameState: this.state })
      this.broadcastState()
      const t = setTimeout(() => {
        this.pendingBotTimers.delete(t)
        if (!this.state) return
        this.state = advanceTurn(this.state)
        this.broadcastState()
      }, 2200)
      this.pendingBotTimers.add(t)
      return
    }
    this.broadcastState()
  }
}
