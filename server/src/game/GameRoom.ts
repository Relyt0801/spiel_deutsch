import type { Server } from 'socket.io'
import {
  GameState, Player, initGameState, rollDice, movePlayer, applyLanding,
  buyProperty, sendToJail, startAuction, placeBid, passAuction, endAuction,
  buyHouse, buyHotel, mortgage, unmortgage, proposeTrade, acceptTrade,
  declareBankruptcy, handleEndTurn, advanceTurn,
} from './GameEngine'
import type { TradeOffer } from './GameEngine'
import { logger } from '../utils/logger'

export class GameRoom {
  code: string
  hostId: string
  state: GameState | null = null
  lobbyPlayers: Array<{ id: string; name: string; color: string; piece: string }> = []
  auctionTimer: NodeJS.Timeout | null = null
  private io: Server

  constructor(code: string, hostId: string, io: Server) {
    this.code = code
    this.hostId = hostId
    this.io = io
  }

  addLobbyPlayer(id: string, name: string, color: string, piece: string): void {
    this.lobbyPlayers.push({ id, name, color, piece })
  }

  removeLobbyPlayer(id: string): void {
    this.lobbyPlayers = this.lobbyPlayers.filter(p => p.id !== id)
    if (this.state) {
      this.state.players = this.state.players.map(p =>
        p.id === id ? { ...p, isActive: false } : p
      )
    }
  }

  startGame(): void {
    this.state = initGameState(this.lobbyPlayers, this.code, this.hostId)
    this.broadcastState()
  }

  private broadcast(event: string, data: Record<string, unknown>): void {
    this.io.to(this.code).emit(event, data)
  }

  broadcastState(): void {
    this.broadcast('game:state-update', { gameState: this.state })
  }

  handleRollDice(socketId: string): void {
    if (!this.state) return
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    if (currentPlayer.id !== socketId) return
    if (this.state.gamePhase !== 'rolling') return

    const roll = rollDice()
    this.state = { ...this.state, currentDiceRoll: roll, gamePhase: 'moving' }

    this.broadcast('game:dice-rolled', { playerId: socketId, roll, gameState: this.state })

    // Send step-by-step movement events
    const steps = roll.total
    const startPos = currentPlayer.position
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
      }, i * 350) // 350ms per step matches client animation
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
    this.state = startAuction(this.state, currentPlayer.position)
    this.startAuctionTimer()
    this.broadcast('auction:started', { auction: this.state.auction, gameState: this.state })
    this.broadcastState()
  }

  private startAuctionTimer(): void {
    if (this.auctionTimer) clearInterval(this.auctionTimer)
    this.auctionTimer = setInterval(() => {
      if (!this.state?.auction) {
        clearInterval(this.auctionTimer!)
        return
      }
      this.state.auction.timeRemaining -= 1
      this.broadcast('auction:tick', { timeRemaining: this.state.auction.timeRemaining })

      if (this.state.auction.timeRemaining <= 0) {
        clearInterval(this.auctionTimer!)
        this.state = endAuction(this.state)
        this.broadcast('auction:ended', {
          winnerId: null,
          amount: 0,
          gameState: this.state,
        })
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
      const winnerId = auction.highestBidderId
      const amount = auction.highestBid
      this.state = endAuction(this.state)
      this.broadcast('auction:ended', { winnerId, amount, gameState: this.state })
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
        // movement steps handled by client after dice animation
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
