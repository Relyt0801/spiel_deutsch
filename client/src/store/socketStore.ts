import { create } from 'zustand'

interface SocketStore {
  myPlayerId: string | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  roomCode: string | null
  isHost: boolean
  setMyPlayerId: (id: string | null) => void
  setConnectionStatus: (s: SocketStore['connectionStatus']) => void
  setRoomCode: (code: string | null) => void
  setIsHost: (v: boolean) => void
}

export const useSocketStore = create<SocketStore>((set) => ({
  myPlayerId: null,
  connectionStatus: 'disconnected',
  roomCode: null,
  isHost: false,
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  setRoomCode: (code) => set({ roomCode: code }),
  setIsHost: (v) => set({ isHost: v }),
}))
