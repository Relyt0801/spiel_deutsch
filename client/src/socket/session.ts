// Persists a stable per-browser token + the current room code so a reload can
// silently rejoin the same game within the server's grace period.
const TOKEN_KEY = 'remi_clientToken'
const ROOM_KEY = 'remi_roomCode'

export function getClientToken(): string {
  let t = localStorage.getItem(TOKEN_KEY)
  if (!t) {
    t = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    localStorage.setItem(TOKEN_KEY, t)
  }
  return t
}

export function saveRoomCode(code: string): void {
  localStorage.setItem(ROOM_KEY, code)
}

export function getSavedRoomCode(): string | null {
  return localStorage.getItem(ROOM_KEY)
}

export function clearSavedRoom(): void {
  localStorage.removeItem(ROOM_KEY)
}
