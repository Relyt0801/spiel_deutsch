import { BOARD_SQUARES, PROPERTY_COLOR_HEX } from '../../../config/boardData'
import { getSquareWorldPosition } from '../Camera/cameraUtils'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../../../store/gameStore'

const SQUARE_H = 0.08
const NORMAL_W = 1.0
const NORMAL_D = 1.5
const CORNER_SIZE = 1.5

// Which side each square is on (for rotation of text/strips)
function getSquareSide(idx: number): 'bottom' | 'left' | 'top' | 'right' | 'corner' {
  if (idx === 0 || idx === 10 || idx === 20 || idx === 30) return 'corner'
  if (idx >= 1 && idx <= 9) return 'bottom'
  if (idx >= 11 && idx <= 19) return 'left'
  if (idx >= 21 && idx <= 29) return 'top'
  return 'right'
}

function squareRotationY(idx: number): number {
  const side = getSquareSide(idx)
  if (side === 'bottom') return 0
  if (side === 'left') return Math.PI / 2
  if (side === 'top') return Math.PI
  if (side === 'right') return -Math.PI / 2
  if (idx === 0) return Math.PI / 4
  if (idx === 10) return -Math.PI / 4
  if (idx === 20) return -3 * Math.PI / 4
  return 3 * Math.PI / 4
}

const SQUARE_COLORS: Record<string, string> = {
  go: '#e8f5e9',
  jail_visit: '#e3f2fd',
  free_parking: '#fff9c4',
  go_to_jail: '#ffccbc',
  tax: '#fce4ec',
  chance: '#fff3e0',
  community: '#e8eaf6',
  property: '#fafafa',
  railroad: '#f5f5f5',
  utility: '#f5f5f5',
}

const ICON: Record<string, string> = {
  go: '▶',
  jail_visit: '🏠',
  free_parking: '☕',
  go_to_jail: '❌',
  tax: '💸',
  chance: '❓',
  community: '📋',
  railroad: '🚌',
  utility: '⚡',
}

export function Board() {
  const gameState = useGameStore(s => s.gameState)

  return (
    <group>
      {/* Board base */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[11.5, 0.12, 11.5]} />
        <meshStandardMaterial color="#f5f0e8" />
      </mesh>

      {/* Board border */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[12, 0.08, 12]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {BOARD_SQUARES.map((sq) => {
        const [x, , z] = getSquareWorldPosition(sq.id)
        const isCorner = sq.id % 10 === 0
        const w = isCorner ? CORNER_SIZE : NORMAL_W
        const d = isCorner ? CORNER_SIZE : NORMAL_D
        const side = getSquareSide(sq.id)

        const bgColor = SQUARE_COLORS[sq.type] || '#fafafa'
        const propState = gameState?.properties?.[sq.id]
        const hasProp = sq.color && sq.color !== 'railroad' && sq.color !== 'utility' && sq.color !== null
        const stripColor = sq.color ? (PROPERTY_COLOR_HEX[sq.color] || '#ccc') : null

        // Text rotation: make it face "inward" toward center
        let textRotX = -Math.PI / 2
        let textW = isCorner ? 1.2 : 0.8

        // For side squares, rotate the plane so text faces the center
        const groupRotY = ['left', 'top', 'right'].includes(side)
          ? side === 'left' ? Math.PI / 2
          : side === 'top' ? Math.PI
          : -Math.PI / 2
          : 0

        const isOwned = propState?.ownerId != null

        return (
          <group key={sq.id} position={[x, 0, z]}>
            {/* Square base */}
            <mesh position={[0, SQUARE_H / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, SQUARE_H, d]} />
              <meshStandardMaterial color={bgColor} />
            </mesh>

            {/* Property color strip */}
            {hasProp && stripColor && (
              <mesh position={[
                side === 'left' ? -(d / 2 - 0.15) : side === 'right' ? (d / 2 - 0.15) : 0,
                SQUARE_H + 0.02,
                side === 'bottom' ? (d / 2 - 0.15) : side === 'top' ? -(d / 2 - 0.15) : 0,
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[
                  side === 'left' || side === 'right' ? 0.3 : w * 0.9,
                  side === 'left' || side === 'right' ? w * 0.9 : 0.3,
                ]} />
                <meshStandardMaterial color={stripColor} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Mortgage overlay */}
            {propState?.isMortgaged && (
              <mesh position={[0, SQUARE_H + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w * 0.85, d * 0.85]} />
                <meshStandardMaterial color="#999" transparent opacity={0.5} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Square name text */}
            <Text
              position={[0, SQUARE_H + 0.05, 0]}
              rotation={[-Math.PI / 2, 0, isCorner ? Math.PI / 4 : groupRotY]}
              fontSize={0.09}
              maxWidth={isCorner ? 1.2 : 0.8}
              textAlign="center"
              color="#1a1a1a"
              anchorX="center"
              anchorY="middle"
              font={undefined}
            >
              {ICON[sq.type] ? `${ICON[sq.type]}\n` : ''}{sq.name.replace(/\n/g, '\n')}
            </Text>

            {/* Price text for properties */}
            {sq.price && !isCorner && (
              <Text
                position={[0, SQUARE_H + 0.05, side === 'bottom' ? -(d / 2 - 0.18) : side === 'top' ? (d / 2 - 0.18) : 0]}
                rotation={[-Math.PI / 2, 0, groupRotY]}
                fontSize={0.07}
                color="#CC0000"
                anchorX="center"
                anchorY="middle"
              >
                {sq.price}€
              </Text>
            )}
          </group>
        )
      })}

      {/* Center logo text */}
      <Text
        position={[0, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.45}
        color="#CC0000"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        REMIGIANUM
      </Text>
      <Text
        position={[0, 0.15, 0.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="#999"
        anchorX="center"
        anchorY="middle"
      >
        MONOPOLY
      </Text>
    </group>
  )
}
