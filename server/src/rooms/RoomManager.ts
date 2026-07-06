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

  createRoom(socketId: string, name: string, color: string, piece: string, token?: string): GameRoom {
    let code = generateRoomCode()
    while (this.rooms.has(code)) code = generateRoomCode()

    const room = new GameRoom(code, socketId, this.io)
    room.onEmpty = () => this.deleteRoom(code)
    room.addLobbyPlayer(socketId, name, color, piece, token)
    this.rooms.set(code, room)
    this.socketToRoom.set(socketId, code)
    logger.info(`Room created: ${code} by ${name}`)
    return room
  }

  joinRoom(roomCode: string, socketId: string, name: string, color: string, piece: string, token?: string): GameRoom | null {
    const room = this.rooms.get(roomCode.toUpperCase())
    if (!room) return null
    if (room.state) return null // game already started
    if (room.lobbyPlayers.length >= 9) return null

    room.addLobbyPlayer(socketId, name, color, piece, token)
    this.socketToRoom.set(socketId, roomCode.toUpperCase())
    logger.info(`${name} joined room ${roomCode}`)
    return room
  }

  /** Map a (re)connected socket to a room without adding a new player. */
  attachSocket(socketId: string, code: string): void {
    this.socketToRoom.set(socketId, code.toUpperCase())
  }

  /** Forget a socket id (on disconnect/leave) without touching the room's players. */
  detachSocket(socketId: string): void {
    this.socketToRoom.delete(socketId)
  }

  private deleteRoom(code: string): void {
    this.rooms.delete(code.toUpperCase())
    for (const [sid, c] of this.socketToRoom) {
      if (c === code.toUpperCase()) this.socketToRoom.delete(sid)
    }
    logger.info(`Room ${code} deleted (empty)`)
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
