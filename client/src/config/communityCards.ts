import type { GameCard } from '../types/game'
import { EVENT_CARDS } from './events'

// Gemeinschaftskarten (Klassenbuch). Quelle: events.ts (Titel/Inhalt/Funktion getrennt).
export const COMMUNITY_CARDS: GameCard[] = EVENT_CARDS
  .filter(c => c.deck === 'community')
  .map(({ id, content, action, target, amount, house, hotel, nearest, doubleRent }) => ({
    id, text: content, action, target, amount, house, hotel, nearest, doubleRent,
  }))
