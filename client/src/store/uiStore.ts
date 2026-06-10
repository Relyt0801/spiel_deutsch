import { create } from 'zustand'
import type { GameCard } from '../types/game'

export type ModalType =
  | 'property'
  | 'card'
  | 'jail'
  | 'auction'
  | 'trade'
  | 'bankruptcy'
  | 'winner'
  | null

interface PropertyModalData {
  propertyIndex: number
  ownerId: string | null
  rentDue: number | null
  canBuy: boolean
}

interface CardModalData {
  cardType: 'chance' | 'community'
  card: GameCard
}

interface UiStore {
  appPhase: 'menu' | 'lobby' | 'game'
  activeModal: ModalType
  modalData: PropertyModalData | CardModalData | Record<string, unknown> | null
  cameraTarget: number | null
  isAnimating: boolean
  diceAnimating: boolean
  selectedPropertyIndex: number | null
  errorMessage: string | null

  setAppPhase: (p: UiStore['appPhase']) => void
  openModal: (modal: ModalType, data?: unknown) => void
  closeModal: () => void
  setCameraTarget: (idx: number | null) => void
  setIsAnimating: (v: boolean) => void
  setDiceAnimating: (v: boolean) => void
  setSelectedProperty: (idx: number | null) => void
  setError: (msg: string | null) => void
}

export const useUiStore = create<UiStore>((set) => ({
  appPhase: 'menu',
  activeModal: null,
  modalData: null,
  cameraTarget: null,
  isAnimating: false,
  diceAnimating: false,
  selectedPropertyIndex: null,
  errorMessage: null,

  setAppPhase: (p) => set({ appPhase: p }),
  openModal: (modal, data = null) => set({ activeModal: modal, modalData: data as UiStore['modalData'] }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  setCameraTarget: (idx) => set({ cameraTarget: idx }),
  setIsAnimating: (v) => set({ isAnimating: v }),
  setDiceAnimating: (v) => set({ diceAnimating: v }),
  setSelectedProperty: (idx) => set({ selectedPropertyIndex: idx }),
  setError: (msg) => set({ errorMessage: msg }),
}))
