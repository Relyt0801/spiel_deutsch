import type { Server } from 'socket.io'
import {
  GameState, Player, initGameState, rollDice, movePlayer, applyLanding,
  buyProperty, startAuction, placeBid, passAuction, endAuction,
  buyHouse, buyHotel, sellHouse, sellHotel, mortgage, unmortgage, proposeTrade,
  counterTrade, confirmTrade,
  declareBankruptcy, handleEndTurn, advanceTurn, applyCardEffect, sendToJail,
} from './GameEngine'
import type { TradeOffer, DiceRoll } from './GameEngine'
import { BOARD_SQUARES, COLOR_GROUPS, DOUBLE_IN_ROW_JAIL } from '../config/boardData'
import { logger } from '../utils/logger'

export type LobbyPlayer = {
  id: string
  name: string
  color: string
  piece: string
  isBot: boolean
}

export class GameRoom {
  code: string
  hostId: string
  state: GameState | null = null
  lobbyPlayers: LobbyPlayer[] = []
  readyPlayers: Set<string> = new Set()
  auctionTimer: NodeJS.Timeout | null = null
  private io: Server
  private pendingBotTimers: Set<ReturnType<typeof setTimeout>> = new Set()

  constructor(code: string, hostId: string, io: Server) {
    this.code = code
    this.hostId = hostId
    this.io = io
  }

  // ─── Lobby management ────────────────────────────────────────────────────

  addLobbyPlayer(id: string, name: string, color: string, piece: string): void {
    this.lobbyPlayers.push({ id, name, color, piece, isBot: false })
    this.broadcastLobbyUpdate()
  }

  addBot(): void {
    if (this.lobbyPlayers.length >= 6) return
    const botColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
    const botPieces = ['Radiergummi', 'Lineal', 'Bleistift', 'Spitzer', 'Tintenfüller', 'Buch']
    const takenColors = this.lobbyPlayers.map(p => p.color)
    const takenPieces = this.lobbyPlayers.map(p => p.piece)
    const color = botColors.find(c => !takenColors.includes(c)) ?? 'blue'
    const piece = botPieces.find(p => !takenPieces.includes(p)) ?? 'Radiergummi'
    const botCount = this.lobbyPlayers.filter(p => p.isBot).length + 1
    const botId = `bot_${Date.now()}_${botCount}`
    this.lobbyPlayers.push({ id: botId, name: `Bot ${botCount}`, color, piece, isBot: true })
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

  getLobbyWithStatus(): Array<LobbyPlayer & { isReady: boolean }> {
    return this.lobbyPlayers.map(p => ({
      ...p,
      isReady: p.isBot || this.readyPlayers.has(p.id),
    }))
  }

  removeLobbyPlayer(id: string): void {
    this.lobbyPlayers = this.lobbyPlayers.filter(p => p.id !== id)
    this.readyPlayers.delete(id)
    if (this.state) {
      this.state.players = this.state.players.map(p =>
        p.id === id ? { ...p, isActive: false } : p
      )
    }
    this.broadcastLobbyUpdate()
  }

  startGame(): void {
    this.state = initGameState(this.lobbyPlayers, this.code, this.hostId)
    this.broadcastState()
  }

  // ─── Broadcasts ──────────────────────────────────────────────────────────

  broadcastLobbyUpdate(): void {
    this.io.to(this.code).emit('room:lobby-update', {
      lobbyPlayers: this.getLobbyWithStatus(),
      hostId: this.hostId,
      allReady: this.areAllHumansReady(),
    })
  }

  private broadcast(event: string, data: Record<string, unknown>): void {
    this.io.to(this.code).emit(event, data)
  }

  broadcastState(): void {
    this.broadcast('game:state-update', { gameState: this.state })
    this.scheduleBotAction()
  }

  // ─── Bot AI ───────────────────────────────────────────────────────────────

  private scheduleBotAction(): void {
    if (!this.state) return
    const cp = this.state.players[this.state.currentPlayerIndex]
    if (!cp?.isBot) return
    if (this.state.gamePhase === 'moving') return

    const botId = cp.id
    const phase = this.state.gamePhase
    const delay = phase === 'rolling' ? 1500 : 1000

    const timer = setTimeout(() => {
      this.pendingBotTimers.delete(timer)
      if (!this.state) return
      const current = this.state.players[this.state.currentPlayerIndex]
      if (current?.id !== botId) return

      switch (this.state.gamePhase) {
        case 'rolling': {
          // handleRollDice → startMovement schedules the bot's movement completion itself.
          this.handleRollDice(botId)
          break
        }
        case 'buying': {
          const sq = BOARD_SQUARES[current.position]
          if (current.money >= (sq?.price ?? Infinity)) {
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

  private findBotTradeOpportunity(botId: string): Omit<TradeOffer, 'id' | 'status' | 'confirmedBy'> | null {
    if (!this.state) return null
    const bot = this.state.players.find(p => p.id === botId)
    if (!bot) return null

    for (const indices of Object.values(COLOR_GROUPS)) {
      const botOwns = indices.filter(i => this.state!.properties[i]?.ownerId === botId)
      if (botOwns.length === 0) continue
      const needed = indices.filter(i => {
        const owner = this.state!.properties[i]?.ownerId
        return owner && owner !== botId
      })
      if (needed.length !== 1) continue

      const targetPropIdx = needed[0]
      const targetOwnerId = this.state.properties[targetPropIdx]?.ownerId
      if (!targetOwnerId) continue
      const targetPlayer = this.state.players.find(p => p.id === targetOwnerId)
      if (!targetPlayer || targetPlayer.isBankrupt) continue

      const propPrice = BOARD_SQUARES[targetPropIdx]?.price ?? 100
      const offerMoney = Math.floor(propPrice * 1.4)
      if (bot.money - offerMoney < 200) continue

      return {
        fromPlayerId: botId,
        toPlayerId: targetOwnerId,
        offeredProperties: [],
        requestedProperties: [targetPropIdx],
        offeredMoney: offerMoney,
        requestedMoney: 0,
      }
    }
    return null
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

      const getVal = (props: number[]) =>
        props.reduce((sum, i) => sum + (BOARD_SQUARES[i]?.price ?? 0), 0)

      // Evaluate from the bot's perspective regardless of who currently "owns" the offer.
      const botIsFrom = trade.fromPlayerId === botId
      const receives = botIsFrom
        ? getVal(trade.requestedProperties) + trade.requestedMoney
        : getVal(trade.offeredProperties) + trade.offeredMoney
      const gives = botIsFrom
        ? getVal(trade.offeredProperties) + trade.offeredMoney
        : getVal(trade.requestedProperties) + trade.requestedMoney

      if (receives >= gives * 0.92) {
        this.handleConfirmTrade(botId, tradeId)
      } else if (!botIsFrom && receives >= gives * 0.65 && bot.money > gives + 150) {
        const extraMoney = Math.floor((gives - receives) * 0.8)
        // Counter from the bot's perspective: it gives what was requested of it (+ money),
        // and asks for what was offered plus a little extra cash.
        this.handleCounterTrade(botId, {
          offeredProperties: trade.requestedProperties,
          requestedProperties: trade.offeredProperties,
          offeredMoney: trade.requestedMoney,
          requestedMoney: trade.offeredMoney + extraMoney,
        })
      } else {
        this.handleRejectTrade(botId, tradeId)
      }
    }, delay)
    this.pendingBotTimers.add(timer)
  }

  private scheduleBotAuctionBid(botId: string, botMoney: number, propertyPrice: number): void {
    const delay = 1500 + Math.random() * 1500
    const timer = setTimeout(() => {
      this.pendingBotTimers.delete(timer)
      if (!this.state?.auction) return
      const bot = this.state.players.find(p => p.id === botId)
      if (!bot || bot.isBankrupt) return
      const auction = this.state.auction
      if (auction.passedPlayers.includes(botId)) return
      const maxBid = Math.min(Math.floor(propertyPrice * 0.75), bot.money - 200)
      if (bot.money > auction.highestBid + 10 && auction.highestBid < maxBid) {
        this.handleAuctionBid(botId, auction.highestBid + 10)
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

    // Third double in a row → straight to the Nachsitz-Zimmer, no movement.
    if (roll.isDouble && newDoubles >= DOUBLE_IN_ROW_JAIL) {
      this.state = { ...this.state, currentDiceRoll: roll }
      this.broadcast('game:dice-rolled', { playerId: socketId, roll, gameState: this.state })
      this.state = sendToJail(this.state, socketId)
      this.broadcast('game:go-to-jail', { playerId: socketId, gameState: this.state })
      this.broadcastState()
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

    // Bots have no client to report movement completion, so schedule it server-side.
    const mover = this.state.players.find(p => p.id === socketId)
    if (mover?.isBot) {
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
    this.broadcastState()
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
    const sq = BOARD_SQUARES[propertyIndex]
    this.state = startAuction(this.state, propertyIndex)
    this.startAuctionTimer()
    this.broadcast('auction:started', { auction: this.state.auction, gameState: this.state })
    this.broadcastState()
    for (const player of this.state.players) {
      if (player.isBot && !player.isBankrupt && player.isActive) {
        this.scheduleBotAuctionBid(player.id, player.money, sq?.price ?? 100)
      }
    }
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
      }
    }, 1000)
  }

  handleAuctionBid(socketId: string, amount: number): void {
    if (!this.state?.auction) return
    this.state = placeBid(this.state, socketId, amount)
    this.broadcast('auction:bid-placed', { playerId: socketId, amount, auction: this.state.auction })
  }

  handleAuctionPass(socketId: string): void {
    if (!this.state?.auction) return
    this.state = passAuction(this.state, socketId)
    const activePlayers = this.state.players.filter(p => p.isActive && !p.isBankrupt)
    const auction = this.state.auction
    if (auction && auction.passedPlayers.length >= activePlayers.length - 1) {
      if (this.auctionTimer) clearInterval(this.auctionTimer)
      this.state = endAuction(this.state)
      this.broadcast('auction:ended', { winnerId: auction.highestBidderId, amount: auction.highestBid, gameState: this.state })
      this.broadcastState()
    }
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
    this.broadcast('trade:proposed', { trade: this.state.activeTrade })
    this.broadcastState()
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
    this.broadcast('trade:countered', { trade: this.state.activeTrade })
    this.broadcastState()
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

  handleRejectTrade(socketId: string, tradeId: string): void {
    if (!this.state?.activeTrade || this.state.activeTrade.id !== tradeId) return
    const trade = this.state.activeTrade
    // Only the two trade partners may cancel.
    if (trade.fromPlayerId !== socketId && trade.toPlayerId !== socketId) return
    this.state = { ...this.state, activeTrade: null, gamePhase: 'end_turn' }
    this.broadcast('trade:rejected', { trade, byId: socketId })
    this.broadcastState()
  }

  handleDeclareBankruptcy(socketId: string): void {
    if (!this.state) return
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    const creditorId = this.state.properties[currentPlayer.position]?.ownerId || null
    this.state = declareBankruptcy(this.state, socketId, creditorId)
    this.broadcast('game:player-bankrupt', { playerId: socketId, gameState: this.state })
    if (this.state.gamePhase === 'game_over') {
      this.broadcast('game:over', { winnerId: this.state.winnerId, gameState: this.state })
    }
    this.broadcastState()
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
      if (roll.isDouble) {
        this.state.players = this.state.players.map((p, i) =>
          i === pIdx ? { ...p, jailTurns: 0, doublesCount: 0 } : p
        )
        // Freed by Pasch: actually move the piece. Clear the double flag so the
        // end-of-turn logic does NOT grant a bonus roll for leaving jail.
        this.startMovement(socketId, { ...roll, isDouble: false }, player.position)
        return
      } else {
        const newJailTurns = player.jailTurns + 1
        if (newJailTurns > 3) {
          this.state.players = this.state.players.map((p, i) =>
            i === pIdx ? { ...p, money: p.money - 50, jailTurns: 0 } : p
          )
          this.state.gamePhase = 'rolling'
        } else {
          this.state.players = this.state.players.map((p, i) =>
            i === pIdx ? { ...p, jailTurns: newJailTurns } : p
          )
          this.state = advanceTurn(this.state)
        }
      }
    }
    this.broadcastState()
  }
}
