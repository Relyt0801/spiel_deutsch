import type { GameCard } from './cardTypes'
import { EVENT_CARDS } from './events'

// Ereigniskarten (Stundenplanwechsel). Quelle: events.ts (Titel/Inhalt/Funktion getrennt).
export const CHANCE_CARDS: GameCard[] = EVENT_CARDS
  .filter(c => c.deck === 'chance')
  .map(({ id, content, action, target, amount, house, hotel, nearest, doubleRent }) => ({
    id, text: content, action, target, amount, house, hotel, nearest, doubleRent,
  }))
