export interface GameCard {
  id: string
  text: string
  action: string
  target?: number
  amount?: number
  house?: number
  hotel?: number
  nearest?: boolean
  doubleRent?: boolean
}
