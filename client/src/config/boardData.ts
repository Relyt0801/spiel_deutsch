import { SQUARE_NAMES } from './squareNames'
export { CHANCE_CARDS } from './chanceCards'
export { COMMUNITY_CARDS } from './communityCards'

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

export const BOARD_SQUARES: BoardSquare[] = [
  { id: 0,  name: SQUARE_NAMES[0],  type: 'go',           color: null,       rent: [] },
  { id: 1,  name: SQUARE_NAMES[1],  type: 'property',     color: 'brown',    price: 60,  houseCost: 50,  rent: [2, 10, 30, 90, 160, 250],       mortgageValue: 30,  group: 'brown' },
  { id: 2,  name: SQUARE_NAMES[2],  type: 'community',    color: null,       rent: [] },
  { id: 3,  name: SQUARE_NAMES[3],  type: 'property',     color: 'brown',    price: 60,  houseCost: 50,  rent: [4, 20, 60, 180, 320, 450],       mortgageValue: 30,  group: 'brown' },
  { id: 4,  name: SQUARE_NAMES[4],  type: 'tax',          color: null,       price: 200, rent: [] },
  { id: 5,  name: SQUARE_NAMES[5],  type: 'railroad',     color: 'railroad', price: 200, rent: [25, 50, 100, 200],                               mortgageValue: 100, group: 'railroad' },
  { id: 6,  name: SQUARE_NAMES[6],  type: 'property',     color: 'light_blue', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550],      mortgageValue: 50,  group: 'light_blue' },
  { id: 7,  name: SQUARE_NAMES[7],  type: 'chance',       color: null,       rent: [] },
  { id: 8,  name: SQUARE_NAMES[8],  type: 'property',     color: 'light_blue', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550],      mortgageValue: 50,  group: 'light_blue' },
  { id: 9,  name: SQUARE_NAMES[9],  type: 'property',     color: 'light_blue', price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600],     mortgageValue: 60,  group: 'light_blue' },
  { id: 10, name: SQUARE_NAMES[10], type: 'jail_visit',   color: null,       rent: [] },
  { id: 11, name: SQUARE_NAMES[11], type: 'property',     color: 'pink',     price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750],     mortgageValue: 70,  group: 'pink' },
  { id: 12, name: SQUARE_NAMES[12], type: 'utility',      color: 'utility',  price: 150, rent: [4, 10],                                          mortgageValue: 75,  group: 'utility' },
  { id: 13, name: SQUARE_NAMES[13], type: 'property',     color: 'pink',     price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750],     mortgageValue: 70,  group: 'pink' },
  { id: 14, name: SQUARE_NAMES[14], type: 'property',     color: 'pink',     price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900],     mortgageValue: 80,  group: 'pink' },
  { id: 15, name: SQUARE_NAMES[15], type: 'railroad',     color: 'railroad', price: 200, rent: [25, 50, 100, 200],                               mortgageValue: 100, group: 'railroad' },
  { id: 16, name: SQUARE_NAMES[16], type: 'property',     color: 'orange',   price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950],     mortgageValue: 90,  group: 'orange' },
  { id: 17, name: SQUARE_NAMES[17], type: 'community',    color: null,       rent: [] },
  { id: 18, name: SQUARE_NAMES[18], type: 'property',     color: 'orange',   price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950],     mortgageValue: 90,  group: 'orange' },
  { id: 19, name: SQUARE_NAMES[19], type: 'property',     color: 'orange',   price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000],    mortgageValue: 100, group: 'orange' },
  { id: 20, name: SQUARE_NAMES[20], type: 'free_parking', color: null,       rent: [] },
  { id: 21, name: SQUARE_NAMES[21], type: 'property',     color: 'red',      price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050],    mortgageValue: 110, group: 'red' },
  { id: 22, name: SQUARE_NAMES[22], type: 'chance',       color: null,       rent: [] },
  { id: 23, name: SQUARE_NAMES[23], type: 'property',     color: 'red',      price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050],    mortgageValue: 110, group: 'red' },
  { id: 24, name: SQUARE_NAMES[24], type: 'property',     color: 'red',      price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100],   mortgageValue: 120, group: 'red' },
  { id: 25, name: SQUARE_NAMES[25], type: 'railroad',     color: 'railroad', price: 200, rent: [25, 50, 100, 200],                               mortgageValue: 100, group: 'railroad' },
  { id: 26, name: SQUARE_NAMES[26], type: 'property',     color: 'yellow',   price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150],   mortgageValue: 130, group: 'yellow' },
  { id: 27, name: SQUARE_NAMES[27], type: 'property',     color: 'yellow',   price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150],   mortgageValue: 130, group: 'yellow' },
  { id: 28, name: SQUARE_NAMES[28], type: 'utility',      color: 'utility',  price: 150, rent: [4, 10],                                          mortgageValue: 75,  group: 'utility' },
  { id: 29, name: SQUARE_NAMES[29], type: 'property',     color: 'yellow',   price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200],  mortgageValue: 140, group: 'yellow' },
  { id: 30, name: SQUARE_NAMES[30], type: 'go_to_jail',   color: null,       rent: [] },
  { id: 31, name: SQUARE_NAMES[31], type: 'property',     color: 'green',    price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275],  mortgageValue: 150, group: 'green' },
  { id: 32, name: SQUARE_NAMES[32], type: 'property',     color: 'green',    price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275],  mortgageValue: 150, group: 'green' },
  { id: 33, name: SQUARE_NAMES[33], type: 'community',    color: null,       rent: [] },
  { id: 34, name: SQUARE_NAMES[34], type: 'property',     color: 'green',    price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400], mortgageValue: 160, group: 'green' },
  { id: 35, name: SQUARE_NAMES[35], type: 'railroad',     color: 'railroad', price: 200, rent: [25, 50, 100, 200],                               mortgageValue: 100, group: 'railroad' },
  { id: 36, name: SQUARE_NAMES[36], type: 'chance',       color: null,       rent: [] },
  { id: 37, name: SQUARE_NAMES[37], type: 'property',     color: 'dark_blue', price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500], mortgageValue: 175, group: 'dark_blue' },
  { id: 38, name: SQUARE_NAMES[38], type: 'tax',          color: null,       price: 100, rent: [] },
  { id: 39, name: SQUARE_NAMES[39], type: 'property',     color: 'dark_blue', price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000], mortgageValue: 200, group: 'dark_blue' },
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

