// ─────────────────────────────────────────────────────────────────────────────
// Ereigniskarten – zentrale, bearbeitbare Quelle
//
// Jede Karte ist getrennt in:
//   - title    : Titel (kurze Überschrift, wird im Kartenfenster angezeigt)
//   - content  : Inhalt (der Beschreibungstext)
//   - action   : Funktion (was die Karte bewirkt) + zugehörige Parameter
//
// deck: 'chance'    = Ereignisfeld (Ereigniskarten)
//       'community' = Klassenbuch
// ─────────────────────────────────────────────────────────────────────────────
//
// FUNKTIONEN (action) – so baust du neue Karten:
//
//  'ADVANCE_TO_GO'              Gehe direkt auf Los (Feld 0) und erhalte 200€.
//  'ADVANCE_TO'        target   Rücke zu Feld `target` (0–39) vor. Über Los = +200€,
//                               auf dem Zielfeld wird normal gelandet (Miete/Kaufen).
//  'ADVANCE_TO_RAILROAD' nearest, doubleRent
//                               Rücke zum nächsten Schulbus. Über Los = +200€.
//                               doubleRent: true → doppelte Miete dort.
//  'ADVANCE_TO_UTILITY'  nearest, doubleRent
//                               Rücke zum nächsten Werk (Makerspace/Schultoilette).
//  'MOVE_FORWARD'      amount   Gehe `amount` Felder VOR und lande dort. Über Los = +200€.
//  'MOVE_BACK'         amount   Gehe `amount` Felder ZURÜCK und lande dort.
//  'COLLECT'           amount   Erhalte `amount` € von der Bank.
//  'PAY'               amount   Zahle `amount` € an die Bank.
//  'PAY_PARKING'       amount   Zahle `amount` € in die Freie Pause (Freistunde-Topf).
//  'EACH_PAY_PARKING'  amount   JEDER Spieler zahlt `amount` € in die Freie Pause.
//  'COLLECT_FROM_PLAYERS' amount  Jeder Mitspieler zahlt dir `amount` €.
//  'PAY_PLAYERS'       amount   Du zahlst jedem Mitspieler `amount` €.
//  'COLLECT_FROM_ONE'  amount   Erhalte `amount` € vom reichsten Mitspieler.
//  'GO_TO_JAIL'                 Gehe in den Bildungsbunker (kein Los-Geld). Dort gilt
//                               die 3-Versuche-für-Pasch-Regel automatisch.
//  'GET_OUT_OF_JAIL_FREE'       Erhalte eine „Aus Bildungsbunker frei“-Karte.
//  'SKIP_TURN'                  Du setzt eine Runde aus.
//  'EXTRA_TURN'                 Du bist sofort nochmal am Zug.
//  'CLASSROOM_GAMBLE'  amount   Würfelt: über 10 → +`amount` €, sonst `amount` € in die
//                               Freie Pause.
//  'BUILDING_REPAIRS'  house, hotel
//                               Zahle `house` € je Klassenraum und `hotel` € je
//                               Schulgebäude (Schloss).
//
// Felder: target (0–39) · amount (€/Felder) · house & hotel (€) · nearest/doubleRent (true)
// ─────────────────────────────────────────────────────────────────────────────

export type EventDeck = 'chance' | 'community'

export type EventAction =
  | 'ADVANCE_TO_GO'
  | 'ADVANCE_TO'
  | 'ADVANCE_TO_RAILROAD'
  | 'ADVANCE_TO_UTILITY'
  | 'MOVE_FORWARD'
  | 'MOVE_BACK'
  | 'COLLECT'
  | 'PAY'
  | 'PAY_PARKING'
  | 'EACH_PAY_PARKING'
  | 'COLLECT_FROM_PLAYERS'
  | 'PAY_PLAYERS'
  | 'COLLECT_FROM_ONE'
  | 'GO_TO_JAIL'
  | 'GET_OUT_OF_JAIL_FREE'
  | 'SKIP_TURN'
  | 'EXTRA_TURN'
  | 'CLASSROOM_GAMBLE'
  | 'BUILDING_REPAIRS'
  | 'ROLL_OR_JAIL'
  | 'SWAP_POSITION'

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
  // ── Ereignisfeld (chance) – 27 Karten ────────────────────────────────────
  { id: 'C1',  deck: 'chance', title: 'Ist das ein Handy?!',               content: 'Du wurdest beim spicken erwischt. Gehe direkt zu Frau Prangenberg’s Büro und gehe nicht über Los.', action: 'ADVANCE_TO', target: 39 },
  { id: 'C2',  deck: 'chance', title: 'Update Time!',                      content: 'Herr Plitt weist dich freundlich darauf hin, dein I-Pad auf den neusten Stand zu aktualisieren. Setze eine Runde aus.', action: 'SKIP_TURN' },
  { id: 'C3',  deck: 'chance', title: 'Vertretungsstunde',                 content: 'Du hast Vertretung und keine Aufgaben bekommen. Du bekommst eine „Komme aus Bildungsbunker Frei-Karte“.', action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'C4',  deck: 'chance', title: 'Tag der Ehrung',                    content: 'Du hast den 1. Platz im Känguru-Wettbewerb erreicht! Ziehe 100 ein.', action: 'COLLECT', amount: 100 },
  { id: 'C5',  deck: 'chance', title: 'Zeugnisgeld',                       content: 'Deine Großeltern sind stolz auf dein Zeugnis und geben dir Zeugnisgeld. Ziehe 200 ein.', action: 'COLLECT', amount: 200 },
  { id: 'C6',  deck: 'chance', title: 'Schulverweis',                      content: 'Du bist aufgrund Fehlverhaltens negativ aufgefallen. Gehe sofort in den Bildungsbunker und gehe nicht über Los.', action: 'GO_TO_JAIL' },
  { id: 'C7',  deck: 'chance', title: 'Blauer Brief',                      content: 'Du bist versetzungsgefährdet! Würfel 3 Mal, wenn du einen Pasch würfelst, bekommst du die 1! Ansonsten gehe sofort in den Bildungsbunker und gehe nicht über Los.', action: 'GO_TO_JAIL' },
  { id: 'C8',  deck: 'chance', title: 'Tee-Stunde!',                       content: 'Ihr genießt einen leckeren Tee und die Zeit vergeht wie im Flug. Rücke 3 Felder vor.', action: 'MOVE_FORWARD', amount: 3 },
  { id: 'C9',  deck: 'chance', title: 'Bester Freund',                     content: 'ChatGPT hat dich durch das Schuljahr gecarried! Rücke vor bis auf Los.', action: 'ADVANCE_TO_GO' },
  { id: 'C10', deck: 'chance', title: 'Classroom',                         content: 'Der Lehrer beobachtet, was ihr auf euren I-Pads macht. Würfelt der Reihe nach. Wenn du über 10 würfelst, erhälst du 100. Sonst zahle 100 in die Freistunde.', action: 'CLASSROOM_GAMBLE', amount: 100 },
  { id: 'C11', deck: 'chance', title: 'Wandertag',                         content: 'Eure Klasse verbringt eine schöne Zeit während des Ausflugs. Rücke 3 Felder vor.', action: 'MOVE_FORWARD', amount: 3 },
  { id: 'C12', deck: 'chance', title: 'Motivation!',                       content: 'Du stehst zwischen einer 3- und einer 4+, aber der Lehrer gibt dir die 4+ damit du nächstes Jahr motiviert in das Schuljahr startest. Rücke 3 Felder zurück.', action: 'MOVE_BACK', amount: 3 },
  { id: 'C13', deck: 'chance', title: 'Vorbereitung',                      content: 'Herr Feldberg bereitet dich auf die Oberstufe, das Studium, dein Leben und den Tod vor. Rücke vor bis zum nächsten Bahnhof. Wenn du über Los kommst, ziehe 200 ein.', action: 'ADVANCE_TO_RAILROAD', nearest: true },
  { id: 'C14', deck: 'chance', title: 'Prüfungstag',                       content: '„Ach ich freestyle das schon“ hat wohl nicht funktioniert und du benötigst Nachhilfe. Zahle 50 in die Freistunde.', action: 'PAY_PARKING', amount: 50 },
  { id: 'C15', deck: 'chance', title: 'Salve discipuli discipulaeque',     content: 'Herr Schilberg fragt dich ob du nicht der Schach-AG beitreten möchtest. Renn so schnell du kannst über Los und ziehe 200 ein.', action: 'ADVANCE_TO_GO' },
  { id: 'C16', deck: 'chance', title: 'Leseband',                          content: 'Eure Klasse legt sich ein neues Buch für das Leseband zu. Jeder Spieler zahlt 20 in die Freistunde.', action: 'EACH_PAY_PARKING', amount: 20 },
  { id: 'C17', deck: 'chance', title: 'Hast du einen Euro?',               content: 'Du möchtest dir was zu Essen kaufen und bittest deine Freunde um Geld. Zahle an jeden Spieler 10.', action: 'PAY_PLAYERS', amount: 10 },
  { id: 'C18', deck: 'chance', title: 'Bestleistung!',                     content: 'Du hast mit deinen Freunden eine Wette abgeschlossen und hast die beste Note bekommen! Du erhälst zur Belohnung von jedem Spieler 50.', action: 'COLLECT_FROM_PLAYERS', amount: 50 },
  { id: 'C19', deck: 'chance', title: 'May I go to the toilette please?',  content: 'Du hast „May I“ statt „Can I“ gesagt und darfst zur Belohnung zur Toilette gehen. Rücke vor bis zu den Lehrertoiletten.', action: 'ADVANCE_TO', target: 31 },
  { id: 'C20', deck: 'chance', title: 'SV-Meeting',                        content: 'Die SV lädt dich zu einer wichtigen Sitzung ein. Rücke vor bis zum SV-Raum.', action: 'ADVANCE_TO', target: 24 },
  { id: 'C21', deck: 'chance', title: 'Kaputte Technik',                   content: 'Das Schul-Wlan ist erneut ausgefallen und muss erneuert werden. Zahle für jedes Haus 30 und für jedes Schloss 100.', action: 'BUILDING_REPAIRS', house: 30, hotel: 100 },
  { id: 'C22', deck: 'chance', title: 'Bücherrückgabe',                    content: 'Dein Buch hatte einen Wasserschaden. Zahle 100 in die Freistunde.', action: 'PAY_PARKING', amount: 100 },
  { id: 'C23', deck: 'chance', title: 'Zahltag',                           content: 'Du hast deinem Freund Geld für ein Schnitzelbrötchen geliehen und verlangst Zinsen. Wähle einen Spieler aus, von dem du 100 erhälst.', action: 'COLLECT_FROM_ONE', amount: 100 },
  { id: 'C24', deck: 'chance', title: 'AAS — Alles außer Schule',         content: 'Die eigentliche Aufgabe war es, ein Grammatik Spiel für euch zu erstellen. Diese Aufgabe wurde gekonnt ignoriert. Rücke vor bis zur Freistunde.', action: 'ADVANCE_TO', target: 20 },
  { id: 'C25', deck: 'chance', title: 'Klassensprecherwahl',               content: 'Du wurdest gegen deinen Willen von deinen Freunden als Klassensprecher vorgeschlagen. Als Rache klaust du deren Pausengeld. Du erhälst von jedem Spieler 25.', action: 'COLLECT_FROM_PLAYERS', amount: 25 },
  { id: 'C26', deck: 'chance', title: 'Tee-Stunde!',                       content: 'Frau Schlettert lädt dich zum Tee-Trinken ein. Du bist erneut am Zug.', action: 'EXTRA_TURN' },
  { id: 'C27', deck: 'chance', title: '3D – Drucker',                      content: 'Du hast ein cooles Spielzeug, welches du 3D-Drucken möchtest. Rücke vor bis zum Makerspace.', action: 'ADVANCE_TO', target: 12 },
  { id: 'C28', deck: 'chance', title: 'Raumvertretung',                   content: 'Untis zeigt an, dass du und dein Freund kurzfristig die Klassenräume tauscht. Wähle einen Mitspieler aus, mit dem du den Platz wechseln möchtest.', action: 'SWAP_POSITION' },

  // ── Klassenbuch (community) – 16 Karten ──────────────────────────────────
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
