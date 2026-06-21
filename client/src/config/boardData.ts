import { SQUARE_NAMES } from './squareNames'
import { STREETS } from './streets'
export { CHANCE_CARDS } from './chanceCards'
export { COMMUNITY_CARDS } from './communityCards'
export { STREETS, STREETS_BY_COLOR } from './streets'

export type SquareType =
  | 'go'
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'community'
  | 'jail_visit'
  | 'free_parking'
  | 'go_to_jail'

export type PropertyColor =
  | 'brown'
  | 'light_blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dark_blue'
  | 'railroad'
  | 'utility'
  | null

export interface BoardSquare {
  id: number
  name: string
  type: SquareType
  color: PropertyColor
  price?: number
  houseCost?: number
  rent: number[]
  mortgageValue?: number
  group?: string
}

// Ownable squares (Straßen, Schulbusse, Werke) are built from streets.ts so all
// property data lives in one structured, colour-sorted place.
function street(id: number): BoardSquare {
  const s = STREETS[id]
  return {
    id,
    name: s.name,
    type: s.kind,
    color: s.color,
    price: s.price,
    houseCost: s.houseCost,
    rent: s.rent,
    mortgageValue: s.mortgage,
    group: s.color,
  }
}

export const BOARD_SQUARES: BoardSquare[] = [
  { id: 0,  name: SQUARE_NAMES[0],  type: 'go',           color: null, rent: [] },
  street(1),
  { id: 2,  name: SQUARE_NAMES[2],  type: 'community',    color: null, rent: [] },
  street(3),
  { id: 4,  name: SQUARE_NAMES[4],  type: 'tax',          color: null, price: 200, rent: [] },
  street(5),
  street(6),
  { id: 7,  name: SQUARE_NAMES[7],  type: 'chance',       color: null, rent: [] },
  street(8),
  street(9),
  { id: 10, name: SQUARE_NAMES[10], type: 'jail_visit',   color: null, rent: [] },
  street(11),
  street(12),
  street(13),
  street(14),
  street(15),
  street(16),
  { id: 17, name: SQUARE_NAMES[17], type: 'community',    color: null, rent: [] },
  street(18),
  street(19),
  { id: 20, name: SQUARE_NAMES[20], type: 'free_parking', color: null, rent: [] },
  street(21),
  { id: 22, name: SQUARE_NAMES[22], type: 'chance',       color: null, rent: [] },
  street(23),
  street(24),
  street(25),
  street(26),
  street(27),
  street(28),
  street(29),
  { id: 30, name: SQUARE_NAMES[30], type: 'go_to_jail',   color: null, rent: [] },
  street(31),
  street(32),
  { id: 33, name: SQUARE_NAMES[33], type: 'community',    color: null, rent: [] },
  street(34),
  street(35),
  { id: 36, name: SQUARE_NAMES[36], type: 'chance',       color: null, rent: [] },
  street(37),
  { id: 38, name: SQUARE_NAMES[38], type: 'tax',          color: null, price: 100, rent: [] },
  street(39),
]

export const COLOR_GROUPS: Record<string, number[]> = {
  brown: [1, 3],
  light_blue: [6, 8, 9],
  pink: [11, 13, 14],
  orange: [16, 18, 19],
  red: [21, 23, 24],
  yellow: [26, 27, 29],
  green: [31, 32, 34],
  dark_blue: [37, 39],
  railroad: [5, 15, 25, 35],
  utility: [12, 28],
}

export const PROPERTY_COLOR_HEX: Record<string, string> = {
  brown: '#8B4513',
  light_blue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FF8C00',
  red: '#CC0000',
  yellow: '#FFD700',
  green: '#228B22',
  dark_blue: '#00008B',
  railroad: '#333333',
  utility: '#999999',
}

