import type { Server } from 'socket.io'
import {
  GameState, Player, initGameState, rollDice, movePlayer, applyLanding,
  buyProperty, startAuction, placeBid, passAuction, endAuction,
  buyHouse, buyHotel, sellHouse, sellHotel, mortgage, unmortgage, proposeTrade, acceptTrade,
  declareBankruptcy, handleEndTurn, advanceTurn, applyCardEffect,
} from './GameEngine'
import type { TradeOffer } from './GameEngine'
import { BOARD_SQUARES } from '../config/boardData'
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
          this.handleRollDice(botId)
          const steps = this.state?.currentDiceRoll?.total ?? 6
          const moveTimer = setTimeout(() => {
            this.pendingBotTimers.delete(moveTimer)
            if (this.state?.gamePhase === 'moving') {
              this.handleMovementComplete(botId)
            }
          }, 2200 + steps * 380 + 600)
          this.pendingBotTimers.add(moveTimer)
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
        case 'end_turn':
          this.handleEndTurn(botId)
          break
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
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    if (currentPlayer.id !== socketId) return
    if (this.state.gamePhase !== 'rolling') return

    const roll = rollDice()
    this.state = { ...this.state, currentDiceRoll: roll, gamePhase: 'moving' }
    this.broadcast('game:dice-rolled', { playerId: socketId, roll, gameState: this.state })

    const steps = roll.total
    const startPos = currentPlayer.position
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

  handleProposeTrade(socketId: string, offer: Omit<TradeOffer, 'id' | 'status'>): void {
    if (!this.state) return
    this.state = proposeTrade(this.state, offer)
    this.broadcast('trade:proposed', { trade: this.state.activeTrade })
    this.broadcastState()
  }

  handleAcceptTrade(socketId: string, tradeId: string): void {
    if (!this.state) return
    this.state = acceptTrade(this.state, tradeId)
    this.broadcast('trade:accepted', { trade: this.state.activeTrade, gameState: this.state })
    this.broadcastState()
  }

  handleRejectTrade(socketId: string, tradeId: string): void {
    if (!this.state?.activeTrade || this.state.activeTrade.id !== tradeId) return
    const trade = this.state.activeTrade
    this.state = { ...this.state, activeTrade: null, gamePhase: 'end_turn' }
    this.broadcast('trade:rejected', { trade })
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
          i === pIdx ? { ...p, jailTurns: 0 } : p
        )
        this.state = { ...this.state, currentDiceRoll: roll, gamePhase: 'moving' }
        this.broadcast('game:dice-rolled', { playerId: socketId, roll, gameState: this.state })
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
