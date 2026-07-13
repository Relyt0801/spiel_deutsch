// ─────────────────────────────────────────────────────────────────────────────
// Straßen / Grundstücke – zentrale, bearbeitbare Quelle (nach Farben sortiert)
//
// Pro Eintrag getrennt:
//   - name            : Name der Straße
//   - color           : Farbgruppe
//   - positionInColor : Stelle innerhalb der Farbe (1, 2, 3 …)
//   - boardIndex      : Feldnummer auf dem Brett (0–39)
//   - price           : Kaufpreis
//   - houseCost       : Baukosten je Klassenraum (nur bei Farb-Straßen)
//   - mortgage        : Hypothekenwert
//   - rent            : Mieten
//        Farb-Straße:  [ ohne, 1 Klassenraum, 2, 3, 4, Schulgebäude ]
//        Schulbus:     [ 1 Bus, 2, 3, 4 ]
//        Werk:         [ Würfel×4, Würfel×10 ]
// ─────────────────────────────────────────────────────────────────────────────

export type StreetColor =
  | 'brown' | 'light_blue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'dark_blue'
  | 'railroad' | 'utility'

export type StreetKind = 'property' | 'railroad' | 'utility'

export interface StreetDef {
  boardIndex: number
  name: string
  color: StreetColor
  kind: StreetKind
  positionInColor: number
  price: number
  mortgage: number
  houseCost?: number
  rent: number[]
}

export const STREETS_BY_COLOR: Record<StreetColor, StreetDef[]> = {
  brown: [
    { boardIndex: 1,  name: 'Schulgarten',           color: 'brown', kind: 'property', positionInColor: 1, price: 60,  houseCost: 50,  mortgage: 30, rent: [2, 10, 30, 90, 160, 250] },
    { boardIndex: 3,  name: 'Herr Schmieders Home',  color: 'brown', kind: 'property', positionInColor: 2, price: 60,  houseCost: 50,  mortgage: 30, rent: [4, 20, 60, 180, 320, 450] },
  ],
  light_blue: [
    { boardIndex: 6,  name: 'K-Trackt',  color: 'light_blue', kind: 'property', positionInColor: 1, price: 100, houseCost: 50, mortgage: 50, rent: [6, 30, 90, 270, 400, 550] },
    { boardIndex: 8,  name: 'H-Trackt',  color: 'light_blue', kind: 'property', positionInColor: 2, price: 100, houseCost: 50, mortgage: 50, rent: [6, 30, 90, 270, 400, 550] },
    { boardIndex: 9,  name: 'C-Trackt',  color: 'light_blue', kind: 'property', positionInColor: 3, price: 120, houseCost: 50, mortgage: 60, rent: [8, 40, 100, 300, 450, 600] },
  ],
  pink: [
    { boardIndex: 11, name: 'Svenni & Lauris Hood', color: 'pink', kind: 'property', positionInColor: 1, price: 140, houseCost: 100, mortgage: 70, rent: [10, 50, 150, 450, 625, 750] },
    { boardIndex: 13, name: 'Kaffee-Küche',         color: 'pink', kind: 'property', positionInColor: 2, price: 140, houseCost: 100, mortgage: 70, rent: [10, 50, 150, 450, 625, 750] },
    { boardIndex: 14, name: "Schlettert's Tee",     color: 'pink', kind: 'property', positionInColor: 3, price: 160, houseCost: 100, mortgage: 80, rent: [12, 60, 180, 500, 700, 900] },
  ],
  orange: [
    { boardIndex: 16, name: 'Spielverleih',  color: 'orange', kind: 'property', positionInColor: 1, price: 180, houseCost: 100, mortgage: 90,  rent: [14, 70, 200, 550, 750, 950] },
    { boardIndex: 18, name: 'Wasserspender', color: 'orange', kind: 'property', positionInColor: 2, price: 180, houseCost: 100, mortgage: 90,  rent: [14, 70, 200, 550, 750, 950] },
    { boardIndex: 19, name: 'Snackautomat',  color: 'orange', kind: 'property', positionInColor: 3, price: 200, houseCost: 100, mortgage: 100, rent: [16, 80, 220, 600, 800, 1000] },
  ],
  red: [
    { boardIndex: 21, name: 'Schulkeller', color: 'red', kind: 'property', positionInColor: 1, price: 220, houseCost: 150, mortgage: 110, rent: [18, 90, 250, 700, 875, 1050] },
    { boardIndex: 23, name: 'A-21',        color: 'red', kind: 'property', positionInColor: 2, price: 220, houseCost: 150, mortgage: 110, rent: [18, 90, 250, 700, 875, 1050] },
    { boardIndex: 24, name: 'SV-Raum',     color: 'red', kind: 'property', positionInColor: 3, price: 240, houseCost: 150, mortgage: 120, rent: [20, 100, 300, 750, 925, 1100] },
  ],
  yellow: [
    { boardIndex: 26, name: 'Tischtennispl.', color: 'yellow', kind: 'property', positionInColor: 1, price: 260, houseCost: 150, mortgage: 130, rent: [22, 110, 330, 800, 975, 1150] },
    { boardIndex: 27, name: 'Klettergerüst',  color: 'yellow', kind: 'property', positionInColor: 2, price: 260, houseCost: 150, mortgage: 130, rent: [22, 110, 330, 800, 975, 1150] },
    { boardIndex: 29, name: 'Trampolin',      color: 'yellow', kind: 'property', positionInColor: 3, price: 280, houseCost: 150, mortgage: 140, rent: [24, 120, 360, 850, 1025, 1200] },
  ],
  green: [
    { boardIndex: 31, name: 'Lehrertoiletten', color: 'green', kind: 'property', positionInColor: 1, price: 300, houseCost: 200, mortgage: 150, rent: [26, 130, 390, 900, 1100, 1275] },
    { boardIndex: 32, name: 'M-Trackt',        color: 'green', kind: 'property', positionInColor: 2, price: 300, houseCost: 200, mortgage: 150, rent: [26, 130, 390, 900, 1100, 1275] },
    { boardIndex: 34, name: 'Aula',            color: 'green', kind: 'property', positionInColor: 3, price: 320, houseCost: 200, mortgage: 160, rent: [28, 150, 450, 1000, 1200, 1400] },
  ],
  dark_blue: [
    { boardIndex: 37, name: 'BASE',                   color: 'dark_blue', kind: 'property', positionInColor: 1, price: 350, houseCost: 200, mortgage: 175, rent: [35, 175, 500, 1100, 1300, 1500] },
    { boardIndex: 39, name: 'Fr. Prangenbergs Büro',  color: 'dark_blue', kind: 'property', positionInColor: 2, price: 400, houseCost: 200, mortgage: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
  ],
  railroad: [
    { boardIndex: 5,  name: 'Aldi',         color: 'railroad', kind: 'railroad', positionInColor: 1, price: 200, mortgage: 100, rent: [25, 50, 100, 200] },
    { boardIndex: 15, name: 'Schulbüro',    color: 'railroad', kind: 'railroad', positionInColor: 2, price: 200, mortgage: 100, rent: [25, 50, 100, 200] },
    { boardIndex: 25, name: 'Sporthalle',   color: 'railroad', kind: 'railroad', positionInColor: 3, price: 200, mortgage: 100, rent: [25, 50, 100, 200] },
    { boardIndex: 35, name: 'Lehrerzimmer', color: 'railroad', kind: 'railroad', positionInColor: 4, price: 200, mortgage: 100, rent: [25, 50, 100, 200] },
  ],
  utility: [
    { boardIndex: 12, name: 'Makerspace',    color: 'utility', kind: 'utility', positionInColor: 1, price: 150, mortgage: 75, rent: [4, 10] },
    { boardIndex: 28, name: 'Schultoilette', color: 'utility', kind: 'utility', positionInColor: 2, price: 150, mortgage: 75, rent: [4, 10] },
  ],
}

/** Flacher Zugriff per Feldnummer. */
export const STREETS: Record<number, StreetDef> = Object.fromEntries(
  Object.values(STREETS_BY_COLOR).flat().map(s => [s.boardIndex, s])
)
