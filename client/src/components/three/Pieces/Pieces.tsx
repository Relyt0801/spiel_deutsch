import { useGameStore } from '../../../store/gameStore'
import { PlayerPiece } from './PlayerPiece'

export function Pieces() {
  const players = useGameStore(s => s.gameState?.players || [])
  const activePlayers = players.filter(p => !p.isBankrupt)

  return (
    <group>
      {activePlayers.map((player, i) => (
        <PlayerPiece
          key={player.id}
          player={player}
          playerIndex={i}
          totalPlayers={activePlayers.length}
        />
      ))}
    </group>
  )
}
