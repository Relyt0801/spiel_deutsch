import type { GameCard } from './cardTypes'

// Ereigniskarten (Ereignisfeld) – 27 Karten.
// Doku aller action-Funktionen: client/src/config/events.ts
export const CHANCE_CARDS: GameCard[] = [
  { id: 'C1',  text: 'Du wurdest beim spicken erwischt. Gehe direkt zu Frau Prangenberg’s Büro und gehe nicht über Los.', action: 'ADVANCE_TO', target: 39 },
  { id: 'C2',  text: 'Herr Plitt weist dich freundlich darauf hin, dein I-Pad auf den neusten Stand zu aktualisieren. Setze eine Runde aus.', action: 'SKIP_TURN' },
  { id: 'C3',  text: 'Du hast Vertretung und keine Aufgaben bekommen. Du bekommst eine „Komme aus Bildungsbunker Frei-Karte“.', action: 'GET_OUT_OF_JAIL_FREE' },
  { id: 'C4',  text: 'Du hast den 1. Platz im Känguru-Wettbewerb erreicht! Ziehe 100 ein.', action: 'COLLECT', amount: 100 },
  { id: 'C5',  text: 'Deine Großeltern sind stolz auf dein Zeugnis und geben dir Zeugnisgeld. Ziehe 200 ein.', action: 'COLLECT', amount: 200 },
  { id: 'C6',  text: 'Du bist aufgrund Fehlverhaltens negativ aufgefallen. Gehe sofort in den Bildungsbunker und gehe nicht über Los.', action: 'GO_TO_JAIL' },
  { id: 'C7',  text: 'Du bist versetzungsgefährdet! Würfel 3 Mal, wenn du einen Pasch würfelst, bekommst du die 1! Ansonsten gehe sofort in den Bildungsbunker und gehe nicht über Los.', action: 'GO_TO_JAIL' },
  { id: 'C8',  text: 'Ihr genießt einen leckeren Tee und die Zeit vergeht wie im Flug. Rücke 3 Felder vor.', action: 'MOVE_FORWARD', amount: 3 },
  { id: 'C9',  text: 'ChatGPT hat dich durch das Schuljahr gecarried! Rücke vor bis auf Los.', action: 'ADVANCE_TO_GO' },
  { id: 'C10', text: 'Der Lehrer beobachtet, was ihr auf euren I-Pads macht. Würfelt der Reihe nach. Wenn du über 10 würfelst, erhälst du 100. Sonst zahle 100 in die Freistunde.', action: 'CLASSROOM_GAMBLE', amount: 100 },
  { id: 'C11', text: 'Eure Klasse verbringt eine schöne Zeit während des Ausflugs. Rücke 3 Felder vor.', action: 'MOVE_FORWARD', amount: 3 },
  { id: 'C12', text: 'Du stehst zwischen einer 3- und einer 4+, aber der Lehrer gibt dir die 4+ damit du nächstes Jahr motiviert in das Schuljahr startest. Rücke 3 Felder zurück.', action: 'MOVE_BACK', amount: 3 },
  { id: 'C13', text: 'Herr Feldberg bereitet dich auf die Oberstufe, das Studium, dein Leben und den Tod vor. Rücke vor bis zum nächsten Bahnhof. Wenn du über Los kommst, ziehe 200 ein.', action: 'ADVANCE_TO_RAILROAD', nearest: true },
  { id: 'C14', text: '„Ach ich freestyle das schon“ hat wohl nicht funktioniert und du benötigst Nachhilfe. Zahle 50 in die Freistunde.', action: 'PAY_PARKING', amount: 50 },
  { id: 'C15', text: 'Herr Schilberg fragt dich ob du nicht der Schach-AG beitreten möchtest. Renn so schnell du kannst über Los und ziehe 200 ein.', action: 'ADVANCE_TO_GO' },
  { id: 'C16', text: 'Eure Klasse legt sich ein neues Buch für das Leseband zu. Jeder Spieler zahlt 20 in die Freistunde.', action: 'EACH_PAY_PARKING', amount: 20 },
  { id: 'C17', text: 'Du möchtest dir was zu Essen kaufen und bittest deine Freunde um Geld. Zahle an jeden Spieler 10.', action: 'PAY_PLAYERS', amount: 10 },
  { id: 'C18', text: 'Du hast mit deinen Freunden eine Wette abgeschlossen und hast die beste Note bekommen! Du erhälst zur Belohnung von jedem Spieler 50.', action: 'COLLECT_FROM_PLAYERS', amount: 50 },
  { id: 'C19', text: 'Du hast „May I“ statt „Can I“ gesagt und darfst zur Belohnung zur Toilette gehen. Rücke vor bis zu den Lehrertoiletten.', action: 'ADVANCE_TO', target: 31 },
  { id: 'C20', text: 'Die SV lädt dich zu einer wichtigen Sitzung ein. Rücke vor bis zum SV-Raum.', action: 'ADVANCE_TO', target: 24 },
  { id: 'C21', text: 'Das Schul-Wlan ist erneut ausgefallen und muss erneuert werden. Zahle für jedes Haus 30 und für jedes Schloss 100.', action: 'BUILDING_REPAIRS', house: 30, hotel: 100 },
  { id: 'C22', text: 'Dein Buch hatte einen Wasserschaden. Zahle 100 in die Freistunde.', action: 'PAY_PARKING', amount: 100 },
  { id: 'C23', text: 'Du hast deinem Freund Geld für ein Schnitzelbrötchen geliehen und verlangst Zinsen. Wähle einen Spieler aus, von dem du 100 erhälst.', action: 'COLLECT_FROM_ONE', amount: 100 },
  { id: 'C24', text: 'Die eigentliche Aufgabe war es, ein Grammatik Spiel für euch zu erstellen. Diese Aufgabe wurde gekonnt ignoriert. Rücke vor bis zur Freistunde.', action: 'ADVANCE_TO', target: 20 },
  { id: 'C25', text: 'Du wurdest gegen deinen Willen von deinen Freunden als Klassensprecher vorgeschlagen. Als Rache klaust du deren Pausengeld. Du erhälst von jedem Spieler 25.', action: 'COLLECT_FROM_PLAYERS', amount: 25 },
  { id: 'C26', text: 'Frau Schlettert lädt dich zum Tee-Trinken ein. Du bist erneut am Zug.', action: 'EXTRA_TURN' },
  { id: 'C27', text: 'Du hast ein cooles Spielzeug, welches du 3D-Drucken möchtest. Rücke vor bis zum Makerspace.', action: 'ADVANCE_TO', target: 12 },
]
