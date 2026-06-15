import { useEffect, useState, useRef } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useGameStore } from '../../store/gameStore'
import styles from './DiceOverlay.module.css'

// Die face dot patterns: which of 9 positions (row-major) are filled
const DIE_PATTERNS: Record<number, boolean[]> = {
  1: [false,false,false, false,true,false, false,false,false],
  2: [true,false,false,  false,false,false, false,false,true],
  3: [true,false,false,  false,true,false, false,false,true],
  4: [true,false,true,  false,false,false, true,false,true],
  5: [true,false,true,  false,true,false, true,false,true],
  6: [true,false,true,  true,false,true,  true,false,true],
}

interface DieProps {
  value: number
  rolling: boolean
}

function Die({ value, rolling }: DieProps) {
  const pattern = DIE_PATTERNS[value] || DIE_PATTERNS[1]
  return (
    <div className={`${styles.die} ${rolling ? styles.rolling : ''}`}>
      {pattern.map((filled, i) => (
        <span key={i} className={filled ? styles.dot : styles.dotEmpty} />
      ))}
    </div>
  )
}

export function DiceOverlay() {
  const diceAnimating = useUiStore(s => s.diceAnimating)
  const gameState = useGameStore(s => s.gameState)
  const [displayDie1, setDisplayDie1] = useState(1)
  const [displayDie2, setDisplayDie2] = useState(1)
  const [settled, setSettled] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef1 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutRef2 = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!diceAnimating) {
      setSettled(false)
      return
    }
    setSettled(false)
    // Randomly cycle for 1500ms
    intervalRef.current = setInterval(() => {
      setDisplayDie1(Math.floor(Math.random() * 6) + 1)
      setDisplayDie2(Math.floor(Math.random() * 6) + 1)
    }, 100)

    // After 1500ms freeze on actual result
    timeoutRef1.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      const d = gameState?.currentDiceRoll
      setDisplayDie1(d?.die1 ?? 1)
      setDisplayDie2(d?.die2 ?? 1)
      setSettled(true)
    }, 1500)

    // After 2000ms hide overlay
    timeoutRef2.current = setTimeout(() => {
      useUiStore.getState().setDiceAnimating(false)
    }, 2000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef1.current) clearTimeout(timeoutRef1.current)
      if (timeoutRef2.current) clearTimeout(timeoutRef2.current)
    }
  }, [diceAnimating])

  if (!diceAnimating) return null

  const total = displayDie1 + displayDie2

  return (
    <div className={styles.overlay}>
      <div className={styles.diceRow}>
        <Die value={displayDie1} rolling={!settled} />
        <Die value={displayDie2} rolling={!settled} />
      </div>
      {settled && (
        <div className={styles.resultText}>
          {displayDie1} + {displayDie2} = {total} 🎲
        </div>
      )}
    </div>
  )
}
