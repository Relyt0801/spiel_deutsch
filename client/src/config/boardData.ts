import type { GameCard } from '../types/game'

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
  // --- Untere Reihe (0-9, links nach rechts) ---
  { id: 0, name: 'Schulbeginn', type: 'go', color: null, rent: [] },
  { id: 1, name: 'Schulgarten', type: 'property', color: 'brown', price: 60, houseCost: 50, rent: [2, 10, 30, 90, 160, 250], mortgageValue: 30, group: 'brown' },
  { id: 2, name: 'Klassenbuch', type: 'community', color: null, rent: [] },
  { id: 3, name: 'Herr Schmieders Home', type: 'property', color: 'brown', price: 60, houseCost: 50, rent: [4, 20, 60, 180, 320, 450], mortgageValue: 30, group: 'brown' },
  { id: 4, name: 'Entfall', type: 'tax', color: null, price: 200, rent: [] },
  { id: 5, name: 'Aldi', type: 'railroad', color: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgageValue: 100, group: 'railroad' },
  { id: 6, name: 'K-Trackt', type: 'property', color: 'light_blue', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550], mortgageValue: 50, group: 'light_blue' },
  { id: 7, name: 'Ereignisfeld', type: 'chance', color: null, rent: [] },
  { id: 8, name: 'H-Trackt', type: 'property', color: 'light_blue', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550], mortgageValue: 50, group: 'light_blue' },
  { id: 9, name: 'C-Trackt', type: 'property', color: 'light_blue', price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600], mortgageValue: 60, group: 'light_blue' },

  // --- Linke Spalte (10-19, unten nach oben) ---
  { id: 10, name: 'Bildungsbunker', type: 'jail_visit', color: null, rent: [] },
  { id: 11, name: 'S(Y)LT', type: 'property', color: 'pink', price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750], mortgageValue: 70, group: 'pink' },
  { id: 12, name: 'Makerspace', type: 'utility', color: 'utility', price: 150, rent: [4, 10], mortgageValue: 75, group: 'utility' },
  { id: 13, name: 'Käsepalast', type: 'property', color: 'pink', price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750], mortgageValue: 70, group: 'pink' },
  { id: 14, name: "Schlettert's Tee", type: 'property', color: 'pink', price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900], mortgageValue: 80, group: 'pink' },
  { id: 15, name: 'Schulbüro', type: 'railroad', color: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgageValue: 100, group: 'railroad' },
  { id: 16, name: 'Spielverleih', type: 'property', color: 'orange', price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950], mortgageValue: 90, group: 'orange' },
  { id: 17, name: 'Klassenbuch', type: 'community', color: null, rent: [] },
  { id: 18, name: 'Wasserspender', type: 'property', color: 'orange', price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950], mortgageValue: 90, group: 'orange' },
  { id: 19, name: 'Snackautomat', type: 'property', color: 'orange', price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000], mortgageValue: 100, group: 'orange' },

  // --- Obere Reihe (20-29, rechts nach links) ---
  { id: 20, name: 'Freistunde', type: 'free_parking', color: null, rent: [] },
  { id: 21, name: 'Schulkeller', type: 'property', color: 'red', price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050], mortgageValue: 110, group: 'red' },
  { id: 22, name: 'Ereignisfeld', type: 'chance', color: null, rent: [] },
  { id: 23, name: 'A-21', type: 'property', color: 'red', price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050], mortgageValue: 110, group: 'red' },
  { id: 24, name: "Fr. Prangenbergs Büro", type: 'property', color: 'red', price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100], mortgageValue: 120, group: 'red' },
  { id: 25, name: 'Sporthalle', type: 'railroad', color: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgageValue: 100, group: 'railroad' },
  { id: 26, name: 'Tischtennispl.', type: 'property', color: 'yellow', price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150], mortgageValue: 130, group: 'yellow' },
  { id: 27, name: 'Klettergerüst', type: 'property', color: 'yellow', price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150], mortgageValue: 130, group: 'yellow' },
  { id: 28, name: 'Schultoilette', type: 'utility', color: 'utility', price: 150, rent: [4, 10], mortgageValue: 75, group: 'utility' },
  { id: 29, name: 'Trampolin', type: 'property', color: 'yellow', price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200], mortgageValue: 140, group: 'yellow' },

  // --- Rechte Spalte (30-39, oben nach unten) ---
  { id: 30, name: 'Bildungsbunker!', type: 'go_to_jail', color: null, rent: [] },
  { id: 31, name: 'Lehrertoiletten', type: 'property', color: 'green', price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275], mortgageValue: 150, group: 'green' },
  { id: 32, name: 'M-Trackt', type: 'property', color: 'green', price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275], mortgageValue: 150, group: 'green' },
  { id: 33, name: 'Klassenbuch', type: 'community', color: null, rent: [] },
  { id: 34, name: 'Aula', type: 'property', color: 'green', price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400], mortgageValue: 160, group: 'green' },
  { id: 35, name: 'Lehrerzimmer', type: 'railroad', color: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgageValue: 100, group: 'railroad' },
  { id: 36, name: 'Ereignisfeld', type: 'chance', color: null, rent: [] },
  { id: 37, name: 'BASE', type: 'property', color: 'dark_blue', price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500], mortgageValue: 175, group: 'dark_blue' },
  { id: 38, name: 'Vertretung', type: 'tax', color: null, price: 100, rent: [] },
  { id: 39, name: 'SV-Raum', type: 'property', color: 'dark_blue', price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000], mortgageValue: 200, group: 'dark_blue' },
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

export const CHANCE_CARDS: GameCard[] = [
  { id: 'C1', text: 'Gehe zu Schulbeginn. Erhalte 200€.', action: 'ADVANCE_TO_GO' },
  { id: 'C2', text: 'Fahre direkt zum SV-Raum.', action: 'ADVANCE_TO', target: 39 },
  { id: 'C3', text: 'Fahre direkt zur BASE.', action: 'ADVANCE_TO', target: 37 },
  { id: 'C4', text: 'Fahre zum nächsten Schulbus. Zahle doppelte Miete.', action: 'ADVANCE_TO_RAILROAD', nearest: true, doubleRent: true },
  { id: 'C5', text: 'Fahre zum nächsten Schulbus. Zahle doppelte Miete.', action: 'ADVANCE_TO_RAILROAD', nearest: true, doubleRent: true },
  { id: 'C6', text: 'Jeder Mitschüler zahlt dir 50€.', action: 'COLLECT_FROM_PLAYERS', amount: 50 },
  { id: 'C7', text: 'Schülerzeitung verkauft! Erhalte 150€.', action: 'COLLECT', amount: 150 },
  { id: 'C8', text: 'Gehe 3 Felder zurück.', action: 'MOVE_BACK', amount: 3 },
  { id: 'C9', text: 'Du musst in den Bildungsbunker! Gehe direkt zum Bildungsbunker.', action: 'GO_TO_JAIL' },
  { id: 'C10', text: 'Gebäudereparaturen: 25€ pro Klassenraum, 100€ pro Schulgebäude.', action: 'BUILDING_REPAIRS', house: 25, hotel: 100 },
  { id: 'C11', text: 'Schulgeld: Zahle 15€.', action: 'PAY', amount: 15 },
  { id: 'C12', text: 'Befreiung aus dem Bildungsbunker. Diese Karte aufbewahren.', action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'C13', text: 'Freistunde! Fahre zur Freistunde.', action: 'ADVANCE_TO', target: 20 },
  { id: 'C14', text: 'Klassensprecher: Zahle 50€ an jeden Mitspieler.', action: 'PAY_PLAYERS', amount: 50 },
  { id: 'C15', text: 'Bester Aufsatz! Erhalte 100€.', action: 'COLLECT', amount: 100 },
  { id: 'C16', text: 'Fahre zum nächsten Makerspace oder Schultoilette. Zahle doppelte Miete.', action: 'ADVANCE_TO_UTILITY', nearest: true, doubleRent: true },
]

export const COMMUNITY_CARDS: GameCard[] = [
  { id: 'K1', text: 'Zeugnis! Gehe zu Schulbeginn und erhalte 200€.', action: 'ADVANCE_TO_GO' },
  { id: 'K2', text: 'Fehler korrigiert! Erhalte 200€.', action: 'COLLECT', amount: 200 },
  { id: 'K3', text: 'Schüleraustausch: Zahle 50€.', action: 'PAY', amount: 50 },
  { id: 'K4', text: 'Befreiung aus dem Bildungsbunker. Diese Karte aufbewahren.', action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'K5', text: 'Bestes Referat! Erhalte 100€.', action: 'COLLECT', amount: 100 },
  { id: 'K6', text: 'Nachhilfestunden: Zahle 100€.', action: 'PAY', amount: 100 },
  { id: 'K7', text: 'Nachgesessen! Gehe in den Bildungsbunker.', action: 'GO_TO_JAIL' },
  { id: 'K8', text: 'Schulspende: Jeder Mitspieler zahlt dir 10€.', action: 'COLLECT_FROM_PLAYERS', amount: 10 },
  { id: 'K9', text: 'Schularzt-Untersuchung: Zahle 50€.', action: 'PAY', amount: 50 },
  { id: 'K10', text: 'Klassenkasse aufgebessert! Erhalte 20€.', action: 'COLLECT', amount: 20 },
  { id: 'K11', text: 'Schulreise-Erstattung! Erhalte 100€.', action: 'COLLECT', amount: 100 },
  { id: 'K12', text: 'Schulgeld-Rückerstattung! Erhalte 25€.', action: 'COLLECT', amount: 25 },
  { id: 'K13', text: 'Gebäudeschäden: 40€ pro Klassenraum, 115€ pro Schulgebäude.', action: 'BUILDING_REPAIRS', house: 40, hotel: 115 },
  { id: 'K14', text: 'Geburtstag! Jeder Mitspieler zahlt dir 10€.', action: 'COLLECT_FROM_PLAYERS', amount: 10 },
  { id: 'K15', text: 'Stipendium! Erhalte 150€.', action: 'COLLECT', amount: 150 },
  { id: 'K16', text: 'Schulbücher zurückgegeben! Erhalte 50€.', action: 'COLLECT', amount: 50 },
]
