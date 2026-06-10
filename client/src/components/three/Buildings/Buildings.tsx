import { useGameStore } from '../../../store/gameStore'
import { BOARD_SQUARES } from '../../../config/boardData'
import { getSquareWorldPosition } from '../Camera/cameraUtils'
import * as THREE from 'three'

function getSquareSide(idx: number): 'bottom' | 'left' | 'top' | 'right' | 'corner' {
  if (idx === 0 || idx === 10 || idx === 20 || idx === 30) return 'corner'
  if (idx >= 1 && idx <= 9) return 'bottom'
  if (idx >= 11 && idx <= 19) return 'left'
  if (idx >= 21 && idx <= 29) return 'top'
  return 'right'
}

// Offset buildings toward the center of the board from the property strip
function getBuildingOffset(idx: number): [number, number] {
  const side = getSquareSide(idx)
  if (side === 'bottom') return [0, -0.3]
  if (side === 'left') return [0.3, 0]
  if (side === 'top') return [0, 0.3]
  if (side === 'right') return [-0.3, 0]
  return [0, 0]
}

export function Buildings() {
  const properties = useGameStore(s => s.gameState?.properties)
  if (!properties) return null

  return (
    <group>
      {properties.map(prop => {
        if (!prop.ownerId) return null
        const count = prop.hotel ? 0 : prop.houses
        const hasHotel = prop.hotel
        if (count === 0 && !hasHotel) return null

        const [bx, , bz] = getSquareWorldPosition(prop.boardIndex)
        const [ox, oz] = getBuildingOffset(prop.boardIndex)

        if (hasHotel) {
          return (
            <group key={prop.boardIndex} position={[bx + ox, 0, bz + oz]}>
              <mesh position={[0, 0.25, 0]} castShadow>
                <boxGeometry args={[0.35, 0.5, 0.25]} />
                <meshStandardMaterial color="#CC0000" roughness={0.4} />
              </mesh>
              {/* Roof */}
              <mesh position={[0, 0.55, 0]} castShadow>
                <coneGeometry args={[0.25, 0.2, 4]} />
                <meshStandardMaterial color="#990000" roughness={0.4} />
              </mesh>
            </group>
          )
        }

        // Houses – spread along the strip
        const spacing = 0.22
        const totalW = (count - 1) * spacing
        return (
          <group key={prop.boardIndex}>
            {Array.from({ length: count }).map((_, i) => {
              const side = getSquareSide(prop.boardIndex)
              const houseX = side === 'left' || side === 'right'
                ? bx + ox
                : bx + ox + (-totalW / 2 + i * spacing)
              const houseZ = side === 'bottom' || side === 'top'
                ? bz + oz
                : bz + oz + (-totalW / 2 + i * spacing)

              return (
                <group key={i} position={[houseX, 0, houseZ]}>
                  <mesh position={[0, 0.12, 0]} castShadow>
                    <boxGeometry args={[0.16, 0.22, 0.16]} />
                    <meshStandardMaterial color="#009900" roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 0.28, 0]} castShadow>
                    <coneGeometry args={[0.13, 0.14, 4]} />
                    <meshStandardMaterial color="#006600" roughness={0.4} />
                  </mesh>
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
