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

export const CHANCE_CARDS: GameCard[] = [
  { id: 'C1', text: 'Gehe zu "Unterricht beginnt!". Erhalte 200€.', action: 'ADVANCE_TO_GO' },
  { id: 'C2', text: 'Fahre direkt zum Rektorat.', action: 'ADVANCE_TO', target: 39 },
  { id: 'C3', text: 'Fahre direkt zum Direktorenbüro.', action: 'ADVANCE_TO', target: 37 },
  { id: 'C4', text: 'Fahre zum nächsten Schulbus. Zahle doppelte Miete.', action: 'ADVANCE_TO_RAILROAD', nearest: true, doubleRent: true },
  { id: 'C5', text: 'Fahre zum nächsten Schulbus. Zahle doppelte Miete.', action: 'ADVANCE_TO_RAILROAD', nearest: true, doubleRent: true },
  { id: 'C6', text: 'Jeder Mitschüler zahlt dir 50€.', action: 'COLLECT_FROM_PLAYERS', amount: 50 },
  { id: 'C7', text: 'Schülerzeitung verkauft! Erhalte 150€.', action: 'COLLECT', amount: 150 },
  { id: 'C8', text: 'Gehe 3 Felder zurück.', action: 'MOVE_BACK', amount: 3 },
  { id: 'C9', text: 'Du musst nachsitzen! Gehe direkt ins Nachsitz-Zimmer.', action: 'GO_TO_JAIL' },
  { id: 'C10', text: 'Gebäudereparaturen: 25€ pro Klassenraum, 100€ pro Schulgebäude.', action: 'BUILDING_REPAIRS', house: 25, hotel: 100 },
  { id: 'C11', text: 'Schulgeld: Zahle 15€.', action: 'PAY', amount: 15 },
  { id: 'C12', text: 'Befreiung aus dem Nachsitz-Zimmer. Diese Karte aufbewahren.', action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'C13', text: 'Freistunde! Fahre zu Freie Pause.', action: 'ADVANCE_TO', target: 20 },
  { id: 'C14', text: 'Klassensprecher: Zahle 50€ an jeden Mitspieler.', action: 'PAY_PLAYERS', amount: 50 },
  { id: 'C15', text: 'Bester Aufsatz! Erhalte 100€.', action: 'COLLECT', amount: 100 },
  { id: 'C16', text: 'Fahre zum nächsten Hausmeister. Zahle doppelte Miete.', action: 'ADVANCE_TO_UTILITY', nearest: true, doubleRent: true },
]

export const COMMUNITY_CARDS: GameCard[] = [
  { id: 'K1', text: 'Zeugnis! Gehe zu "Unterricht beginnt!" und erhalte 200€.', action: 'ADVANCE_TO_GO' },
  { id: 'K2', text: 'Fehler korrigiert! Erhalte 200€.', action: 'COLLECT', amount: 200 },
  { id: 'K3', text: 'Schüleraustausch: Zahle 50€.', action: 'PAY', amount: 50 },
  { id: 'K4', text: 'Befreiung aus dem Nachsitz-Zimmer. Diese Karte aufbewahren.', action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'K5', text: 'Bestes Referat! Erhalte 100€.', action: 'COLLECT', amount: 100 },
  { id: 'K6', text: 'Nachhilfestunden: Zahle 100€.', action: 'PAY', amount: 100 },
  { id: 'K7', text: 'Nachgesessen! Gehe ins Nachsitz-Zimmer.', action: 'GO_TO_JAIL' },
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

export const ALL_CARDS: Record<string, GameCard> = Object.fromEntries(
  [...CHANCE_CARDS, ...COMMUNITY_CARDS].map(c => [c.id, c])
)
