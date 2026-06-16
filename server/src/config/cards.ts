export type { GameCard } from './cardTypes'
export { CHANCE_CARDS } from './chanceCards'
export { COMMUNITY_CARDS } from './communityCards'

import { CHANCE_CARDS } from './chanceCards'
import { COMMUNITY_CARDS } from './communityCards'
import type { GameCard } from './cardTypes'

export const ALL_CARDS: Record<string, GameCard> = Object.fromEntries(
  [...CHANCE_CARDS, ...COMMUNITY_CARDS].map(c => [c.id, c])
)
