import type { Server } from 'socket.io'
import { RoomManager } from '../rooms/RoomManager'
import { logger } from '../utils/logger'

export function setupSocketHandlers(io: Server): void {
  const roomManager = new RoomManager(io)

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`)

    // ─── ROOM MANAGEMENT ────────────────────────────────────────────────
    socket.on('room:create', ({ playerName, color, piece }) => {
      const room = roomManager.createRoom(socket.id, playerName, color, piece)
      socket.join(room.code)
      socket.emit('room:created', { roomCode: room.code, gameState: room.state })
    })

    socket.on('room:join', ({ roomCode, playerName, color, piece }) => {
      const room = roomManager.joinRoom(roomCode, socket.id, playerName, color, piece)
      if (!room) {
        socket.emit('room:error', { message: 'Raum nicht gefunden oder voll.' })
        return
      }
      socket.join(room.code)
      socket.emit('room:joined', { gameState: room.state })
      socket.to(room.code).emit('room:player-joined', {
        player: room.lobbyPlayers.find(p => p.id === socket.id),
        gameState: room.state,
      })
    })

    socket.on('room:leave', () => {
      const room = roomManager.leaveRoom(socket.id)
      if (room) {
        socket.leave(room.code)
        socket.to(room.code).emit('room:player-left', { playerId: socket.id, gameState: room.state })
      }
    })

    socket.on('room:start-game', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      if (!room || room.hostId !== socket.id) return
      if (room.lobbyPlayers.length < 2) {
        socket.emit('room:error', { message: 'Mindestens 2 Spieler benötigt.' })
        return
      }
      room.startGame()
      io.to(room.code).emit('room:game-started', { gameState: room.state })
    })

    // ─── GAME ACTIONS ────────────────────────────────────────────────────
    socket.on('game:roll-dice', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleRollDice(socket.id)
    })

    socket.on('game:movement-complete', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleMovementComplete(socket.id)
    })

    socket.on('game:buy-property', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleBuyProperty(socket.id)
    })

    socket.on('game:decline-property', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleDeclineProperty(socket.id)
    })

    socket.on('game:end-turn', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleEndTurn(socket.id)
    })

    socket.on('game:jail-pay', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleJailAction(socket.id, 'pay')
    })

    socket.on('game:jail-use-card', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleJailAction(socket.id, 'card')
    })

    socket.on('game:jail-roll', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleJailAction(socket.id, 'roll')
    })

    socket.on('game:buy-house', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleBuyHouse(socket.id, propertyIndex)
    })

    socket.on('game:buy-hotel', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleBuyHotel(socket.id, propertyIndex)
    })

    socket.on('game:mortgage', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleMortgage(socket.id, propertyIndex)
    })

    socket.on('game:unmortgage', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleUnmortgage(socket.id, propertyIndex)
    })

    // ─── AUCTION ─────────────────────────────────────────────────────────
    socket.on('auction:bid', ({ amount }) => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleAuctionBid(socket.id, amount)
    })

    socket.on('auction:pass', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleAuctionPass(socket.id)
    })

    // ─── TRADING ─────────────────────────────────────────────────────────
    socket.on('trade:propose', (offer) => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleProposeTrade(socket.id, offer)
    })

    socket.on('trade:accept', ({ tradeId }) => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleAcceptTrade(socket.id, tradeId)
    })

    socket.on('trade:reject', ({ tradeId }) => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleRejectTrade(socket.id, tradeId)
    })

    // ─── BANKRUPTCY ──────────────────────────────────────────────────────
    socket.on('game:declare-bankruptcy', () => {
      const room = roomManager.getRoomBySocket(socket.id)
      room?.handleDeclareBankruptcy(socket.id)
    })

    // ─── DISCONNECT ──────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`)
      const room = roomManager.leaveRoom(socket.id)
      if (room) {
        socket.to(room.code).emit('room:player-left', { playerId: socket.id, gameState: room.state })
      }
    })
  })
}
