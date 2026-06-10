import { useGameStore } from '../../../store/gameStore'
import { useUiStore } from '../../../store/uiStore'
import { Die } from './Die'

export function DiceContainer() {
  const roll = useGameStore(s => s.gameState?.currentDiceRoll)
  const diceAnimating = useUiStore(s => s.diceAnimating)
  const setDiceAnimating = useUiStore(s => s.setDiceAnimating)

  if (!roll && !diceAnimating) return null

  const die1 = roll?.die1 || 1
  const die2 = roll?.die2 || 1

  return (
    <group position={[0, 1.5, 1]}>
      <Die
        value={die1}
        isRolling={diceAnimating}
        position={[-0.5, 0, 0]}
        onAnimationEnd={() => setDiceAnimating(false)}
      />
      <Die
        value={die2}
        isRolling={diceAnimating}
        position={[0.5, 0, 0]}
      />
    </group>
  )
}
