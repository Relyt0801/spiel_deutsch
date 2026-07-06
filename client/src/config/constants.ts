// In dev the server runs separately on :3001. In a production build the client is
// served BY the server (single link), so we connect to the same origin ('' → same
// host). An explicit VITE_SOCKET_URL always wins (e.g. a split Render deployment).
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

export const REMI_COLORS = {
  red: '#CC0000',
  redDark: '#990000',
  white: '#FFFFFF',
  black: '#1a1a2e',
  gray: '#f5f5f5',
  border: '#e0e0e0',
}

export const BOARD = {
  SIZE: 11.5,
  SQUARE_NORMAL_W: 1.0,
  SQUARE_NORMAL_D: 1.5,
  CORNER_SIZE: 1.5,
  HEIGHT: 0.1,
} as const

export const CAMERA = {
  OVERVIEW: { position: [0, 15, 8] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] },
  DICE: { position: [0, 8, 5] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] },
  SQUARE_HEIGHT: 5,
  SQUARE_OFFSET_Z: 4,
  TRANSITION_DURATION: 1.2,
} as const

export const DICE = {
  SIZE: 0.8,
  ROLL_DURATION: 1.8,
  SPIN_REVOLUTIONS: 6,
} as const

export const PIECE = {
  Y_RESTING: 0.2,
  Y_HOP: 0.8,
  HOP_DURATION: 0.3,
  CAMERA_FOLLOW_DELAY: 0.1,
} as const

export const JAIL_INDEX = 10
export const GO_TO_JAIL_INDEX = 30
export const FREE_PARKING_INDEX = 20
export const GO_INDEX = 0
export const JAIL_TURNS_MAX = 3
export const JAIL_BAIL = 50
export const PASS_GO_AMOUNT = 200
export const STARTING_MONEY = 1500
export const BANK_HOUSES = 32
export const BANK_HOTELS = 12
export const DOUBLE_IN_ROW_JAIL = 3
export const RAILROAD_INDICES = [5, 15, 25, 35]
export const UTILITY_INDICES = [12, 28]
