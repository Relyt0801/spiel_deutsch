import type { GameCard } from '../types/game'

// Editable Gemeinschaftskarten (Klassenbuch) – 16 Karten
export const COMMUNITY_CARDS: GameCard[] = [
  { id: 'K1',  text: 'Zeugnis! Gehe zu Schulbeginn und erhalte 200€.', action: 'ADVANCE_TO_GO' },
  { id: 'K2',  text: 'Fehler korrigiert! Erhalte 200€.', action: 'COLLECT', amount: 200 },
  { id: 'K3',  text: 'Schüleraustausch: Zahle 50€.', action: 'PAY', amount: 50 },
  { id: 'K4',  text: 'Befreiung aus dem Bildungsbunker. Diese Karte aufbewahren.', action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'K5',  text: 'Bestes Referat! Erhalte 100€.', action: 'COLLECT', amount: 100 },
  { id: 'K6',  text: 'Nachhilfestunden: Zahle 100€.', action: 'PAY', amount: 100 },
  { id: 'K7',  text: 'Nachgesessen! Gehe in den Bildungsbunker.', action: 'GO_TO_JAIL' },
  { id: 'K8',  text: 'Schulspende: Jeder Mitspieler zahlt dir 10€.', action: 'COLLECT_FROM_PLAYERS', amount: 10 },
  { id: 'K9',  text: 'Schularzt-Untersuchung: Zahle 50€.', action: 'PAY', amount: 50 },
  { id: 'K10', text: 'Klassenkasse aufgebessert! Erhalte 20€.', action: 'COLLECT', amount: 20 },
  { id: 'K11', text: 'Schulreise-Erstattung! Erhalte 100€.', action: 'COLLECT', amount: 100 },
  { id: 'K12', text: 'Schulgeld-Rückerstattung! Erhalte 25€.', action: 'COLLECT', amount: 25 },
  { id: 'K13', text: 'Gebäudeschäden: 40€ pro Klassenraum, 115€ pro Schulgebäude.', action: 'BUILDING_REPAIRS', house: 40, hotel: 115 },
  { id: 'K14', text: 'Geburtstag! Jeder Mitspieler zahlt dir 10€.', action: 'COLLECT_FROM_PLAYERS', amount: 10 },
  { id: 'K15', text: 'Stipendium! Erhalte 150€.', action: 'COLLECT', amount: 150 },
  { id: 'K16', text: 'Schulbücher zurückgegeben! Erhalte 50€.', action: 'COLLECT', amount: 50 },
]
