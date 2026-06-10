# Remigianum Monopoly – Claude Code Guide

## Projekt
3D Online-Multiplayer Monopoly für das Remigianum Gymnasium.
Monorepo mit npm workspaces: `client` (React/Vite/R3F) und `server` (Node.js/Express/Socket.io).

## Befehle
- `npm run dev` (root) – startet Client (port 5173) und Server (port 3001) gleichzeitig
- `npm run dev --workspace=client` – nur Client
- `npm run dev --workspace=server` – nur Server
- `npm run build` (root) – baut beide Services für Production

## Architektur
- **Server ist einzige Quelle der Wahrheit** – Clients mutieren State nie lokal
- Alle Aktionen gehen über Socket.io zum Server, der validiert und `game:state-update` broadcastet
- Würfel werden server-seitig generiert (Schummelschutz)
- Figurenbewegung: Server sendet `game:piece-move-step` pro Feld → Client animiert, dann `game:movement-complete`
- Kamera-Übergänge: GSAP direkt auf Three.js camera object (nicht React State)
- Modal-Sichtbarkeit: `uiStore` (nicht `gameStore`)

## Themen-Mapping
| Original | Remigianum |
|----------|-----------|
| Houses | Klassenräume |
| Hotel | Schulgebäude |
| Go | Unterricht beginnt! |
| Jail | Nachsitz-Zimmer |
| Go to Jail | Nachsitzen! |
| Railroads | Schulbus 1–4 |
| Chance | Stundenplanwechsel |
| Community Chest | Klassenbuch |
| Free Parking | Freie Pause |

## Brand-Farben
- Rot: `#CC0000`
- Weiß: `#FFFFFF`
- Akzent: `#1a1a2e` (dunkelblau/schwarz für Text)

## Wichtige Dateien
- Board-Daten: `client/src/config/boardData.ts` (auch kopiert in `server/src/config/`)
- Game-Typen: `client/src/types/game.ts`
- Socket-Events: `client/src/types/socket.ts`
- Spiellogik (autoritativ): `server/src/game/GameEngine.ts`
- 3D-Szene: `client/src/components/three/Scene.tsx`

## Env-Variablen
### Development
- `client/.env`: `VITE_SOCKET_URL=http://localhost:3001`
- `server/.env`: `PORT=3001`, `CLIENT_ORIGIN=http://localhost:5173`

### Production (im Render Dashboard setzen)
- Server: `CLIENT_ORIGIN=https://remigianum-monopoly-client.onrender.com`
- Client: `VITE_SOCKET_URL=https://remigianum-monopoly-server.onrender.com`

## Lokal testen
1. `npm run dev` ausführen
2. Zwei Browser-Tabs auf `http://localhost:5173`
3. Tab 1: Room erstellen → Code notieren
4. Tab 2: Mit Code beitreten
5. Host klickt "Spiel starten"
