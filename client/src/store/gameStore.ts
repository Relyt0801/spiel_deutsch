import { create } from 'zustand'
import type { GameState, GameSettings } from '../types/game'
import { DEFAULT_SETTINGS } from '../types/game'

export type LobbyPlayerEntry = {
  id: string
  name: string
  color: string
  piece: string
  isBot?: boolean
  isReady?: boolean
}

interface GameStore {
  gameState: GameState | null
  lobbyPlayers: LobbyPlayerEntry[]
  lobbyAllReady: boolean
  lobbySettings: GameSettings
  setGameState: (state: GameState) => void
  setLobbyPlayers: (players: LobbyPlayerEntry[]) => void
  setLobbyAllReady: (v: boolean) => void
  setLobbySettings: (s: GameSettings) => void
  addLobbyPlayer: (player: LobbyPlayerEntry) => void
  removeLobbyPlayer: (id: string) => void
  clearGame: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  lobbyPlayers: [],
  lobbyAllReady: false,
  lobbySettings: { ...DEFAULT_SETTINGS },
  setGameState: (state) => set({ gameState: state }),
  setLobbyPlayers: (players) => set({ lobbyPlayers: players }),
  setLobbyAllReady: (v) => set({ lobbyAllReady: v }),
  setLobbySettings: (s) => set({ lobbySettings: s }),
  addLobbyPlayer: (player) => set((s) => (
    s.lobbyPlayers.some(p => p.id === player.id)
      ? {}
      : { lobbyPlayers: [...s.lobbyPlayers, player] }
  )),
  removeLobbyPlayer: (id) => set((s) => ({ lobbyPlayers: s.lobbyPlayers.filter(p => p.id !== id) })),
  clearGame: () => set({ gameState: null, lobbyPlayers: [], lobbyAllReady: false }),
}))
