// ─────────────────────────────────────────────────────────────────────────────
// Ereigniskarten – zentrale, bearbeitbare Quelle
//
// Jede Karte ist getrennt in:
//   - title    : Titel (kurze Überschrift, wird im Kartenfenster angezeigt)
//   - content  : Inhalt (der Beschreibungstext)
//   - action   : Funktion (was die Karte bewirkt) + zugehörige Parameter
//
// deck: 'chance'    = Stundenplanwechsel (Ereignisfeld)
//       'community' = Klassenbuch
// ─────────────────────────────────────────────────────────────────────────────

export type EventDeck = 'chance' | 'community'

// ─────────────────────────────────────────────────────────────────────────────
// FUNKTIONEN (action) – so baust du neue Karten
//
// Jede Karte braucht: id, deck, title, content, action.
// Je nach action kommen bestimmte Zusatz-Felder dazu:
//
//  'ADVANCE_TO_GO'
//      Spieler geht direkt zu Schulbeginn (Feld 0) und erhält 200€.
//      Zusatzfelder: keine.
//
//  'ADVANCE_TO'         (braucht: target)
//      Spieler rückt zum Feld `target` (0–39) vor. Wird dabei Schulbeginn
//      überquert, gibt es 200€. Auf dem Zielfeld wird normal gelandet
//      (Miete/Kaufen). Beispiel: target: 20 = Freistunde.
//
//  'ADVANCE_TO_RAILROAD'  (optional: nearest, doubleRent)
//      Spieler rückt zum nächsten Schulbus (Bahnhof) vor.
//      nearest: true   → nimm den nächstgelegenen.
//      doubleRent: true→ zahlt dort die doppelte Miete.
//
//  'ADVANCE_TO_UTILITY'   (optional: nearest, doubleRent)
//      Wie oben, aber zum nächsten Werk (Makerspace / Schultoilette).
//
//  'MOVE_BACK'          (braucht: amount)
//      Spieler geht `amount` Felder zurück und landet dort normal.
//      Beispiel: amount: 3 = drei Felder zurück.
//
//  'COLLECT'            (braucht: amount)
//      Spieler erhält `amount` € von der Bank.
//
//  'PAY'                (braucht: amount)
//      Spieler zahlt `amount` € an die Bank.
//
//  'COLLECT_FROM_PLAYERS' (braucht: amount)
//      JEDER Mitspieler zahlt `amount` € an den Spieler.
//
//  'PAY_PLAYERS'        (braucht: amount)
//      Spieler zahlt `amount` € an JEDEN Mitspieler.
//
//  'GO_TO_JAIL'
//      Spieler kommt direkt in den Bildungsbunker (Gefängnis), ohne 200€.
//      Zusatzfelder: keine.
//
//  'GET_OUT_OF_JAIL_FREE'
//      Spieler erhält eine Befreiungskarte (zum Aufbewahren).
//      Zusatzfelder: keine.
//
//  'BUILDING_REPAIRS'   (braucht: house, hotel)
//      Spieler zahlt pro Klassenraum `house` € und pro Schulgebäude `hotel` €.
//      Beispiel: house: 25, hotel: 100.
//
// Felder-Übersicht (Zusatzparameter):
//   target  : Zielfeld 0–39          (nur ADVANCE_TO)
//   amount  : Geldbetrag oder Felder  (COLLECT/PAY/.../MOVE_BACK)
//   house   : € pro Klassenraum       (nur BUILDING_REPAIRS)
//   hotel   : € pro Schulgebäude      (nur BUILDING_REPAIRS)
//   nearest : nächstgelegenes Feld    (ADVANCE_TO_RAILROAD/UTILITY)
//   doubleRent : doppelte Miete       (ADVANCE_TO_RAILROAD/UTILITY)
// ─────────────────────────────────────────────────────────────────────────────
export type EventAction =
  | 'ADVANCE_TO_GO'          // → Schulbeginn + 200€
  | 'ADVANCE_TO'             // → Feld `target` (überquert Los = +200€)
  | 'ADVANCE_TO_RAILROAD'    // → nächster Schulbus (optional doppelte Miete)
  | 'ADVANCE_TO_UTILITY'     // → nächstes Werk (optional doppelte Miete)
  | 'MOVE_BACK'              // ← `amount` Felder zurück
  | 'COLLECT'                // + `amount` € von der Bank
  | 'PAY'                    // − `amount` € an die Bank
  | 'COLLECT_FROM_PLAYERS'   // + `amount` € von jedem Mitspieler
  | 'PAY_PLAYERS'            // − `amount` € an jeden Mitspieler
  | 'GO_TO_JAIL'             // → Bildungsbunker (ohne 200€)
  | 'GET_OUT_OF_JAIL_FREE'   // + Befreiungskarte
  | 'BUILDING_REPAIRS'       // − `house` €/Klassenraum, `hotel` €/Schulgebäude

export interface EventCard {
  id: string
  deck: EventDeck
  title: string
  content: string
  action: EventAction
  target?: number
  amount?: number
  house?: number
  hotel?: number
  nearest?: boolean
  doubleRent?: boolean
}

export const EVENT_CARDS: EventCard[] = [
  // ── Stundenplanwechsel (Chance) ──────────────────────────────────────────
  { id: 'C1',  deck: 'chance', title: 'Zur Schule!',          content: 'Gehe zu Schulbeginn. Erhalte 200€.',                                          action: 'ADVANCE_TO_GO' },
  { id: 'C2',  deck: 'chance', title: 'Zum SV-Raum',          content: 'Fahre direkt zum SV-Raum.',                                                   action: 'ADVANCE_TO', target: 39 },
  { id: 'C3',  deck: 'chance', title: 'Zur BASE',             content: 'Fahre direkt zur BASE.',                                                      action: 'ADVANCE_TO', target: 37 },
  { id: 'C4',  deck: 'chance', title: 'Nächster Schulbus',    content: 'Fahre zum nächsten Schulbus. Zahle doppelte Miete.',                          action: 'ADVANCE_TO_RAILROAD', nearest: true, doubleRent: true },
  { id: 'C5',  deck: 'chance', title: 'Nächster Schulbus',    content: 'Fahre zum nächsten Schulbus. Zahle doppelte Miete.',                          action: 'ADVANCE_TO_RAILROAD', nearest: true, doubleRent: true },
  { id: 'C6',  deck: 'chance', title: 'Sammelaktion',         content: 'Jeder Mitschüler zahlt dir 50€.',                                             action: 'COLLECT_FROM_PLAYERS', amount: 50 },
  { id: 'C7',  deck: 'chance', title: 'Schülerzeitung',       content: 'Schülerzeitung verkauft! Erhalte 150€.',                                      action: 'COLLECT', amount: 150 },
  { id: 'C8',  deck: 'chance', title: 'Drei Felder zurück',   content: 'Gehe 3 Felder zurück.',                                                       action: 'MOVE_BACK', amount: 3 },
  { id: 'C9',  deck: 'chance', title: 'Ab in den Bunker',     content: 'Du musst in den Bildungsbunker! Gehe direkt zum Bildungsbunker.',              action: 'GO_TO_JAIL' },
  { id: 'C10', deck: 'chance', title: 'Gebäudereparaturen',   content: 'Gebäudereparaturen: 25€ pro Klassenraum, 100€ pro Schulgebäude.',              action: 'BUILDING_REPAIRS', house: 25, hotel: 100 },
  { id: 'C11', deck: 'chance', title: 'Schulgeld',            content: 'Schulgeld: Zahle 15€.',                                                       action: 'PAY', amount: 15 },
  { id: 'C12', deck: 'chance', title: 'Befreiungskarte',      content: 'Befreiung aus dem Bildungsbunker. Diese Karte aufbewahren.',                   action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'C13', deck: 'chance', title: 'Freistunde',           content: 'Freistunde! Fahre zur Freistunde.',                                           action: 'ADVANCE_TO', target: 20 },
  { id: 'C14', deck: 'chance', title: 'Klassensprecher',      content: 'Klassensprecher: Zahle 50€ an jeden Mitspieler.',                             action: 'PAY_PLAYERS', amount: 50 },
  { id: 'C15', deck: 'chance', title: 'Bester Aufsatz',       content: 'Bester Aufsatz! Erhalte 100€.',                                               action: 'COLLECT', amount: 100 },
  { id: 'C16', deck: 'chance', title: 'Nächstes Werk',        content: 'Fahre zum nächsten Makerspace oder Schultoilette. Zahle doppelte Miete.',      action: 'ADVANCE_TO_UTILITY', nearest: true, doubleRent: true },

  // ── Klassenbuch (Community) ──────────────────────────────────────────────
  { id: 'K1',  deck: 'community', title: 'Zeugnis',           content: 'Zeugnis! Gehe zu Schulbeginn und erhalte 200€.',                              action: 'ADVANCE_TO_GO' },
  { id: 'K2',  deck: 'community', title: 'Fehler korrigiert', content: 'Fehler korrigiert! Erhalte 200€.',                                            action: 'COLLECT', amount: 200 },
  { id: 'K3',  deck: 'community', title: 'Schüleraustausch',  content: 'Schüleraustausch: Zahle 50€.',                                                action: 'PAY', amount: 50 },
  { id: 'K4',  deck: 'community', title: 'Befreiungskarte',   content: 'Befreiung aus dem Bildungsbunker. Diese Karte aufbewahren.',                   action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'K5',  deck: 'community', title: 'Bestes Referat',    content: 'Bestes Referat! Erhalte 100€.',                                               action: 'COLLECT', amount: 100 },
  { id: 'K6',  deck: 'community', title: 'Nachhilfestunden',  content: 'Nachhilfestunden: Zahle 100€.',                                               action: 'PAY', amount: 100 },
  { id: 'K7',  deck: 'community', title: 'Nachgesessen',      content: 'Nachgesessen! Gehe in den Bildungsbunker.',                                   action: 'GO_TO_JAIL' },
  { id: 'K8',  deck: 'community', title: 'Schulspende',       content: 'Schulspende: Jeder Mitspieler zahlt dir 10€.',                                action: 'COLLECT_FROM_PLAYERS', amount: 10 },
  { id: 'K9',  deck: 'community', title: 'Schularzt',         content: 'Schularzt-Untersuchung: Zahle 50€.',                                          action: 'PAY', amount: 50 },
  { id: 'K10', deck: 'community', title: 'Klassenkasse',      content: 'Klassenkasse aufgebessert! Erhalte 20€.',                                     action: 'COLLECT', amount: 20 },
  { id: 'K11', deck: 'community', title: 'Schulreise',        content: 'Schulreise-Erstattung! Erhalte 100€.',                                        action: 'COLLECT', amount: 100 },
  { id: 'K12', deck: 'community', title: 'Rückerstattung',    content: 'Schulgeld-Rückerstattung! Erhalte 25€.',                                      action: 'COLLECT', amount: 25 },
  { id: 'K13', deck: 'community', title: 'Gebäudeschäden',    content: 'Gebäudeschäden: 40€ pro Klassenraum, 115€ pro Schulgebäude.',                  action: 'BUILDING_REPAIRS', house: 40, hotel: 115 },
  { id: 'K14', deck: 'community', title: 'Geburtstag',        content: 'Geburtstag! Jeder Mitspieler zahlt dir 10€.',                                 action: 'COLLECT_FROM_PLAYERS', amount: 10 },
  { id: 'K15', deck: 'community', title: 'Stipendium',        content: 'Stipendium! Erhalte 150€.',                                                   action: 'COLLECT', amount: 150 },
  { id: 'K16', deck: 'community', title: 'Schulbücher zurück',content: 'Schulbücher zurückgegeben! Erhalte 50€.',                                     action: 'COLLECT', amount: 50 },
]

/** Schneller Zugriff auf den Titel einer Karte per id (z. B. fürs Kartenfenster). */
export const EVENT_TITLES: Record<string, string> =
  Object.fromEntries(EVENT_CARDS.map(c => [c.id, c.title]))
