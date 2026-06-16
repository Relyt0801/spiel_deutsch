import type { GameCard } from './cardTypes'

// Editable Ereigniskarten (Stundenplanwechsel) – 16 Karten
export const CHANCE_CARDS: GameCard[] = [
  { id: 'C1',  text: 'Gehe zu Schulbeginn. Erhalte 200€.', action: 'ADVANCE_TO_GO' },
  { id: 'C2',  text: 'Fahre direkt zum SV-Raum.', action: 'ADVANCE_TO', target: 39 },
  { id: 'C3',  text: 'Fahre direkt zur BASE.', action: 'ADVANCE_TO', target: 37 },
  { id: 'C4',  text: 'Fahre zum nächsten Schulbus. Zahle doppelte Miete.', action: 'ADVANCE_TO_RAILROAD', nearest: true, doubleRent: true },
  { id: 'C5',  text: 'Fahre zum nächsten Schulbus. Zahle doppelte Miete.', action: 'ADVANCE_TO_RAILROAD', nearest: true, doubleRent: true },
  { id: 'C6',  text: 'Jeder Mitschüler zahlt dir 50€.', action: 'COLLECT_FROM_PLAYERS', amount: 50 },
  { id: 'C7',  text: 'Schülerzeitung verkauft! Erhalte 150€.', action: 'COLLECT', amount: 150 },
  { id: 'C8',  text: 'Gehe 3 Felder zurück.', action: 'MOVE_BACK', amount: 3 },
  { id: 'C9',  text: 'Du musst in den Bildungsbunker! Gehe direkt zum Bildungsbunker.', action: 'GO_TO_JAIL' },
  { id: 'C10', text: 'Gebäudereparaturen: 25€ pro Klassenraum, 100€ pro Schulgebäude.', action: 'BUILDING_REPAIRS', house: 25, hotel: 100 },
  { id: 'C11', text: 'Schulgeld: Zahle 15€.', action: 'PAY', amount: 15 },
  { id: 'C12', text: 'Befreiung aus dem Bildungsbunker. Diese Karte aufbewahren.', action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'C13', text: 'Freistunde! Fahre zur Freistunde.', action: 'ADVANCE_TO', target: 20 },
  { id: 'C14', text: 'Klassensprecher: Zahle 50€ an jeden Mitspieler.', action: 'PAY_PLAYERS', amount: 50 },
  { id: 'C15', text: 'Bester Aufsatz! Erhalte 100€.', action: 'COLLECT', amount: 100 },
  { id: 'C16', text: 'Fahre zum nächsten Makerspace oder Schultoilette. Zahle doppelte Miete.', action: 'ADVANCE_TO_UTILITY', nearest: true, doubleRent: true },
]
