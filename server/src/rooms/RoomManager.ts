import type { Server } from 'socket.io'
import { GameRoom } from '../game/GameRoom'
import { generateRoomCode } from '../utils/codeGenerator'
import { logger } from '../utils/logger'

export class RoomManager {
  private rooms = new Map<string, GameRoom>()
  private socketToRoom = new Map<string, string>()
  private io: Server

  constructor(io: Server) {
    this.io = io
  }

  createRoom(socketId: string, name: string, color: string, piece: string): GameRoom {
    let code = generateRoomCode()
    while (this.rooms.has(code)) code = generateRoomCode()

    const room = new GameRoom(code, socketId, this.io)
    room.addLobbyPlayer(socketId, name, color, piece)
    this.rooms.set(code, room)
    this.socketToRoom.set(socketId, code)
    logger.info(`Room created: ${code} by ${name}`)
    return room
  }

  joinRoom(roomCode: string, socketId: string, name: string, color: string, piece: string): GameRoom | null {
    const room = this.rooms.get(roomCode.toUpperCase())
    if (!room) return null
    if (room.state) return null // game already started
    if (room.lobbyPlayers.length >= 8) return null

    room.addLobbyPlayer(socketId, name, color, piece)
    this.socketToRoom.set(socketId, roomCode.toUpperCase())
    logger.info(`${name} joined room ${roomCode}`)
    return room
  }

  leaveRoom(socketId: string): GameRoom | null {
    const code = this.socketToRoom.get(socketId)
    if (!code) return null
    const room = this.rooms.get(code)
    if (!room) return null

    room.removeLobbyPlayer(socketId)
    this.socketToRoom.delete(socketId)

    // Clean up empty rooms
    if (room.lobbyPlayers.length === 0 && (!room.state || room.state.players.every(p => !p.isActive))) {
      this.rooms.delete(code)
      logger.info(`Room ${code} deleted (empty)`)
    }
    return room
  }

  getRoomBySocket(socketId: string): GameRoom | null {
    const code = this.socketToRoom.get(socketId)
    if (!code) return null
    return this.rooms.get(code) || null
  }

  getRoomByCode(code: string): GameRoom | null {
    return this.rooms.get(code.toUpperCase()) || null
  }
}
