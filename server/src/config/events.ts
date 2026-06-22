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
//
//  'ADVANCE_TO'         (braucht: target)
//      Spieler rückt zum Feld `target` (0–39) vor. Wird dabei Schulbeginn
//      überquert, gibt es 200€. Auf dem Zielfeld wird normal gelandet.
//
//  'ADVANCE_TO_RAILROAD'  (optional: nearest, doubleRent)
//      Spieler rückt zum nächsten Schulbus (Bahnhof) vor.
//
//  'ADVANCE_TO_UTILITY'   (optional: nearest, doubleRent)
//      Wie oben, aber zum nächsten Werk (Makerspace / Schultoilette).
//
//  'MOVE_BACK'          (braucht: amount)
//      Spieler geht `amount` Felder zurück und landet dort normal.
//
//  'MOVE_FORWARD'       (braucht: amount)
//      Spieler rückt `amount` Felder vor und landet dort normal
//      (überquert er Los, gibt es 200€).
//
//  'COLLECT'            (braucht: amount)        + `amount` € von der Bank
//  'PAY'                (braucht: amount)        − `amount` € an die Bank
//  'PAY_FREE_PARKING'   (braucht: amount)        − `amount` € in die Freistunde (Topf)
//  'PLAYERS_PAY_FREE_PARKING' (braucht: amount)  jeder Spieler zahlt `amount` € in die Freistunde
//  'COLLECT_FROM_PLAYERS' (braucht: amount)      + `amount` € von jedem Mitspieler
//  'COLLECT_FROM_RICHEST' (braucht: amount)      + `amount` € vom reichsten Mitspieler
//  'PAY_PLAYERS'        (braucht: amount)        − `amount` € an jeden Mitspieler
//
//  'GO_TO_JAIL'              → Bildungsbunker (ohne 200€)
//  'GET_OUT_OF_JAIL_FREE'    + Befreiungskarte (zum Aufbewahren)
//  'SKIP_TURN'               Spieler setzt eine Runde aus
//  'EXTRA_TURN'              Spieler ist erneut am Zug
//  'ROLL_OR_JAIL'            Würfelt bis zu 3×; bei Pasch gerettet, sonst Bildungsbunker
//  'CLASSROOM_ROLL'  (amount) Würfelt: über 10 → +`amount`€, sonst `amount`€ in die Freistunde
//
//  'BUILDING_REPAIRS'   (braucht: house, hotel)
//      Spieler zahlt pro Klassenraum `house` € und pro Schulgebäude `hotel` €.
// ─────────────────────────────────────────────────────────────────────────────
export type EventAction =
  | 'ADVANCE_TO_GO'
  | 'ADVANCE_TO'
  | 'ADVANCE_TO_RAILROAD'
  | 'ADVANCE_TO_UTILITY'
  | 'MOVE_BACK'
  | 'MOVE_FORWARD'
  | 'COLLECT'
  | 'PAY'
  | 'PAY_FREE_PARKING'
  | 'PLAYERS_PAY_FREE_PARKING'
  | 'COLLECT_FROM_PLAYERS'
  | 'COLLECT_FROM_RICHEST'
  | 'PAY_PLAYERS'
  | 'GO_TO_JAIL'
  | 'GET_OUT_OF_JAIL_FREE'
  | 'SKIP_TURN'
  | 'EXTRA_TURN'
  | 'ROLL_OR_JAIL'
  | 'CLASSROOM_ROLL'
  | 'BUILDING_REPAIRS'

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
  // ── Stundenplanwechsel (Chance / Ereignisfeld) ────────────────────────────
  { id: 'C1',  deck: 'chance', title: 'Ist das ein Handy?!',
    content: 'Du wurdest beim Spicken erwischt. Gehe direkt zu Frau Prangenbergs Büro und gehe nicht über Los.',
    action: 'ADVANCE_TO', target: 39 },
  { id: 'C2',  deck: 'chance', title: 'Update Time!',
    content: 'Herr Plitt weist dich freundlich darauf hin, dein iPad auf den neusten Stand zu aktualisieren. Setze eine Runde aus.',
    action: 'SKIP_TURN' },
  { id: 'C3',  deck: 'chance', title: 'Tag der Ehrung',
    content: 'Du hast den 1. Platz im Känguru-Wettbewerb erreicht! Ziehe 100€ ein.',
    action: 'COLLECT', amount: 100 },
  { id: 'C4',  deck: 'chance', title: 'Schulverweis',
    content: 'Du bist aufgrund Fehlverhaltens negativ aufgefallen. Gehe sofort in den Bildungsbunker und gehe nicht über Los.',
    action: 'GO_TO_JAIL' },
  { id: 'C5',  deck: 'chance', title: 'Blauer Brief',
    content: 'Du bist versetzungsgefährdet! Würfle 3 Mal: Würfelst du einen Pasch, bist du gerettet. Ansonsten gehe sofort in den Bildungsbunker und gehe nicht über Los.',
    action: 'ROLL_OR_JAIL' },
  { id: 'C6',  deck: 'chance', title: 'Tee-Stunde!',
    content: 'Ihr genießt einen leckeren Tee und die Zeit vergeht wie im Flug. Rücke 3 Felder vor.',
    action: 'MOVE_FORWARD', amount: 3 },
  { id: 'C7',  deck: 'chance', title: 'Bester Freund',
    content: 'ChatGPT hat dich durch das Schuljahr gecarried! Rücke vor bis auf Los.',
    action: 'ADVANCE_TO_GO' },
  { id: 'C8',  deck: 'chance', title: 'Classroom',
    content: 'Der Lehrer beobachtet, was ihr auf euren iPads macht. Würfelst du über 10, erhältst du 100€. Sonst zahle 100€ in die Freistunde.',
    action: 'CLASSROOM_ROLL', amount: 100 },
  { id: 'C9',  deck: 'chance', title: 'Wandertag',
    content: 'Eure Klasse verbringt eine schöne Zeit während des Ausflugs. Rücke 3 Felder vor.',
    action: 'MOVE_FORWARD', amount: 3 },
  { id: 'C10', deck: 'chance', title: 'Vorbereitung',
    content: 'Herr Feldberg bereitet dich auf die Oberstufe, das Studium, dein Leben und den Tod vor. Rücke vor bis zum nächsten Schulbus. Wenn du über Los kommst, ziehe 200€ ein.',
    action: 'ADVANCE_TO_RAILROAD', nearest: true },
  { id: 'C11', deck: 'chance', title: 'Salve discipuli discipulaeque',
    content: 'Herr Schilberg fragt dich, ob du nicht der Schach-AG beitreten möchtest. Renn so schnell du kannst über Los und ziehe 200€ ein.',
    action: 'ADVANCE_TO_GO' },
  { id: 'C12', deck: 'chance', title: 'May I go to the toilette please?',
    content: 'Du hast „May I“ statt „Can I“ gesagt und darfst zur Belohnung zur Toilette gehen. Rücke vor bis zu den Lehrertoiletten.',
    action: 'ADVANCE_TO', target: 31 },
  { id: 'C13', deck: 'chance', title: 'SV-Meeting',
    content: 'Die SV lädt dich zu einer wichtigen Sitzung ein. Rücke vor bis zum SV-Raum.',
    action: 'ADVANCE_TO', target: 24 },
  { id: 'C14', deck: 'chance', title: '3D-Drucker',
    content: 'Du hast ein cooles Spielzeug, welches du 3D-drucken möchtest. Rücke vor bis zum Makerspace.',
    action: 'ADVANCE_TO', target: 12 },

  // ── Klassenbuch (Community) ───────────────────────────────────────────────
  { id: 'K1',  deck: 'community', title: 'Vertretungsstunde',
    content: 'Du hast Vertretung und keine Aufgaben bekommen. Du bekommst eine „Komme aus dem Bildungsbunker frei“-Karte.',
    action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'K2',  deck: 'community', title: 'Zeugnisgeld',
    content: 'Deine Großeltern sind stolz auf dein Zeugnis und geben dir Zeugnisgeld. Ziehe 200€ ein.',
    action: 'COLLECT', amount: 200 },
  { id: 'K3',  deck: 'community', title: 'Motivation!',
    content: 'Du stehst zwischen einer 3- und einer 4+, aber der Lehrer gibt dir die 4+, damit du nächstes Jahr motiviert in das Schuljahr startest. Rücke 3 Felder zurück.',
    action: 'MOVE_BACK', amount: 3 },
  { id: 'K4',  deck: 'community', title: 'Prüfungstag',
    content: '„Ach, ich freestyle das schon“ hat wohl nicht funktioniert und du benötigst Nachhilfe. Zahle 50€ in die Freistunde.',
    action: 'PAY_FREE_PARKING', amount: 50 },
  { id: 'K5',  deck: 'community', title: 'Leseband',
    content: 'Eure Klasse legt sich ein neues Buch für das Leseband zu. Jeder Spieler zahlt 20€ in die Freistunde.',
    action: 'PLAYERS_PAY_FREE_PARKING', amount: 20 },
  { id: 'K6',  deck: 'community', title: 'Hast du einen Euro?',
    content: 'Du möchtest dir etwas zu essen kaufen und bittest deine Freunde um Geld. Zahle an jeden Spieler 10€.',
    action: 'PAY_PLAYERS', amount: 10 },
  { id: 'K7',  deck: 'community', title: 'Bestleistung!',
    content: 'Du hast mit deinen Freunden eine Wette abgeschlossen und die beste Note bekommen! Du erhältst zur Belohnung von jedem Spieler 50€.',
    action: 'COLLECT_FROM_PLAYERS', amount: 50 },
  { id: 'K8',  deck: 'community', title: 'Kaputte Technik',
    content: 'Das Schul-WLAN ist erneut ausgefallen und muss erneuert werden. Zahle für jeden Klassenraum 30€ und für jedes Schulgebäude 100€.',
    action: 'BUILDING_REPAIRS', house: 30, hotel: 100 },
  { id: 'K9',  deck: 'community', title: 'Bücherrückgabe',
    content: 'Dein Buch hatte einen Wasserschaden. Zahle 100€ in die Freistunde.',
    action: 'PAY_FREE_PARKING', amount: 100 },
  { id: 'K10', deck: 'community', title: 'Zahltag',
    content: 'Du hast deinem Freund Geld für ein Schnitzelbrötchen geliehen und verlangst Zinsen. Du erhältst 100€ vom reichsten Mitspieler.',
    action: 'COLLECT_FROM_RICHEST', amount: 100 },
  { id: 'K11', deck: 'community', title: 'AAS — Alles außer Schule',
    content: 'Die eigentliche Aufgabe war es, ein Grammatik-Spiel für euch zu erstellen. Diese Aufgabe wurde gekonnt ignoriert. Rücke vor bis zur Freistunde.',
    action: 'ADVANCE_TO', target: 20 },
  { id: 'K12', deck: 'community', title: 'Klassensprecherwahl',
    content: 'Du wurdest gegen deinen Willen von deinen Freunden als Klassensprecher vorgeschlagen. Als Rache klaust du deren Pausengeld. Du erhältst von jedem Spieler 25€.',
    action: 'COLLECT_FROM_PLAYERS', amount: 25 },
  { id: 'K13', deck: 'community', title: 'Tee-Stunde!',
    content: 'Frau Schlettert lädt dich zum Tee-Trinken ein. Du bist erneut am Zug.',
    action: 'EXTRA_TURN' },
]

/** Schneller Zugriff auf den Titel einer Karte per id (z. B. fürs Kartenfenster). */
export const EVENT_TITLES: Record<string, string> =
  Object.fromEntries(EVENT_CARDS.map(c => [c.id, c.title]))
