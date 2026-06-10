import { create } from 'zustand'
import type { GameState } from '../types/game'

interface GameStore {
  gameState: GameState | null
  lobbyPlayers: Array<{ id: string; name: string; color: string; piece: string }>
  setGameState: (state: GameState) => void
  setLobbyPlayers: (players: Array<{ id: string; name: string; color: string; piece: string }>) => void
  addLobbyPlayer: (player: { id: string; name: string; color: string; piece: string }) => void
  removeLobbyPlayer: (id: string) => void
  clearGame: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  lobbyPlayers: [],
  setGameState: (state) => set({ gameState: state }),
  setLobbyPlayers: (players) => set({ lobbyPlayers: players }),
  addLobbyPlayer: (player) => set((s) => ({ lobbyPlayers: [...s.lobbyPlayers, player] })),
  removeLobbyPlayer: (id) => set((s) => ({ lobbyPlayers: s.lobbyPlayers.filter(p => p.id !== id) })),
  clearGame: () => set({ gameState: null, lobbyPlayers: [] }),
}))
